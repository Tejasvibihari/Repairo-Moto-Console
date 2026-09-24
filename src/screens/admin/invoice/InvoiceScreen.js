// screens/admin/invoice/InvoiceScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import axiosClient from '../../../services/axiosClient';
import ManualInvoiceCard from '../../../components/admin/invoice/ManualInvoiceCard';
import ManualInvoiceFilter from '../../../components/admin/invoice/ManualInvoiceFilter';

const PAGE_SIZE = 20;

// ─── Sort param mapper ────────────────────────────────────────────────────────
const SORT_MAP = {
    newest: '-invoiceDate',
    oldest: 'invoiceDate',
    amount_high: '-total.finalPayable',
    amount_low: 'total.finalPayable',
};

const DEFAULT_FILTERS = {
    status: 'all',
    sortBy: 'newest',
    customerName: '',
    vehicleBrand: '',
    vehicleModel: '',
    startDate: '',
    endDate: '',
};

// ─── Active filter count badge ────────────────────────────────────────────────
const FilterButton = ({ onPress, count, C }) => (
    <TouchableOpacity
        onPress={onPress}
        style={[filterBtnS.btn, { backgroundColor: count > 0 ? C.primary : C.surfaceLow, borderColor: count > 0 ? C.primary : C.border }]}
        activeOpacity={0.78}
    >
        <Ionicons name="options-outline" size={17} color={count > 0 ? '#1a1a1a' : C.textSecondary} />
        {count > 0 && (
            <View style={[filterBtnS.badge, { backgroundColor: '#1a1a1a' }]}>
                <Text style={[filterBtnS.badgeText, { color: C.primary }]}>{count}</Text>
            </View>
        )}
    </TouchableOpacity>
);
const filterBtnS = StyleSheet.create({
    btn: {
        width: 38, height: 38, borderRadius: 12, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
    },
    badge: {
        position: 'absolute', top: -4, right: -4,
        width: 16, height: 16, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
    },
    badgeText: { fontSize: 9, fontWeight: '900' },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ hasFilters, onCreatePress, onResetPress, C }) => (
    <View style={emptyS.wrap}>
        <Ionicons name="receipt-outline" size={52} color={C.textMuted} />
        <Text style={[emptyS.title, { color: C.textPrimary }]}>
            {hasFilters ? 'No matches found' : 'No invoices yet'}
        </Text>
        <Text style={[emptyS.sub, { color: C.textMuted }]}>
            {hasFilters
                ? 'Try adjusting your filters or search'
                : 'Create your first manual invoice'}
        </Text>
        {hasFilters ? (
            <TouchableOpacity onPress={onResetPress} style={[emptyS.btn, { backgroundColor: C.surfaceLow, borderColor: C.border, borderWidth: 1 }]} activeOpacity={0.75}>
                <Ionicons name="refresh-outline" size={15} color={C.textSecondary} />
                <Text style={[emptyS.btnText, { color: C.textSecondary }]}>Reset Filters</Text>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity onPress={onCreatePress} style={[emptyS.btn, { backgroundColor: C.primary }]} activeOpacity={0.82}>
                <Ionicons name="add" size={16} color="#1a1a1a" />
                <Text style={[emptyS.btnText, { color: '#1a1a1a' }]}>Create Invoice</Text>
            </TouchableOpacity>
        )}
    </View>
);
const emptyS = StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
    title: { fontSize: 16, fontWeight: '800', marginTop: 4 },
    sub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, marginTop: 8 },
    btnText: { fontSize: 14, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function InvoiceScreen({ navigation }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;

    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');

    // Refs keep pagination race-free: onEndReached can fire several times
    // before React re-renders, so state alone can't guard against it.
    const invoicesRef = useRef([]);
    const hasMoreRef = useRef(true);
    const loadingMoreRef = useRef(false);
    const requestSeq = useRef(0);
    const [filterVisible, setFilterVisible] = useState(false);
    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });

    // Debounce search
    const searchTimer = useRef(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const handleSearchChange = (v) => {
        setSearch(v);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(v), 400);
    };

    // Count active (non-default) filters
    const activeFilterCount = [
        filters.status && filters.status !== 'all',
        filters.sortBy && filters.sortBy !== 'newest',
        filters.customerName,
        filters.vehicleBrand,
        filters.vehicleModel,
        filters.startDate,
        filters.endDate,
    ].filter(Boolean).length;

    const hasActiveFilters = activeFilterCount > 0 || debouncedSearch.length > 0;

    // ── Fetch ──────────────────────────────────────────────────────────────────
    // mode: 'initial' (spinner) | 'refresh' (pull-to-refresh) |
    //       'silent' (on screen focus, keeps the pages already loaded) |
    //       'more' (next page)
    const load = useCallback(async (mode = 'initial') => {
        if (mode === 'more') {
            if (loadingMoreRef.current || !hasMoreRef.current) return;
            loadingMoreRef.current = true;
            setLoadingMore(true);
        } else {
            requestSeq.current += 1; // invalidates anything still in flight
            if (mode === 'initial') setLoading(true);
            if (mode === 'refresh') setRefreshing(true);
        }
        const seq = requestSeq.current;

        try {
            const loaded = invoicesRef.current.length;
            const page = mode === 'more' ? Math.floor(loaded / PAGE_SIZE) + 1 : 1;
            const limit = mode === 'silent' ? Math.max(PAGE_SIZE, loaded) : PAGE_SIZE;

            const params = new URLSearchParams({ page, limit });
            if (filters.status && filters.status !== 'all') params.append('status', filters.status);
            if (SORT_MAP[filters.sortBy]) params.append('sortBy', SORT_MAP[filters.sortBy]);
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (filters.customerName) params.append('customerName', filters.customerName);
            if (filters.vehicleBrand) params.append('vehicleBrand', filters.vehicleBrand);
            if (filters.vehicleModel) params.append('vehicleModel', filters.vehicleModel);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const res = await axiosClient.get(`/api/manual-invoices?${params.toString()}`);
            if (seq !== requestSeq.current) return; // a newer reset superseded this one

            const items = res.data?.data || res.data?.invoices || [];
            const serverTotal = res.data?.pagination?.total;

            let next = items;
            if (mode === 'more') {
                const seen = new Set(invoicesRef.current.map((i) => i._id));
                next = [...invoicesRef.current, ...items.filter((i) => !seen.has(i._id))];
            }

            let more = typeof serverTotal === 'number' ? next.length < serverTotal : items.length === limit;
            if (mode === 'more' && next.length === loaded) more = false; // nothing new → stop

            invoicesRef.current = next;
            hasMoreRef.current = more;
            setInvoices(next);
            if (typeof serverTotal === 'number') setTotal(serverTotal);
        } catch (err) {
            console.error('Fetch invoices failed', err);
        } finally {
            if (mode === 'more') {
                loadingMoreRef.current = false;
                setLoadingMore(false);
            } else if (seq === requestSeq.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [filters, debouncedSearch]);

    const loadRef = useRef(load);
    loadRef.current = load;

    // First load, and again whenever filters / search change
    useEffect(() => { load('initial'); }, [load]);

    // Coming back to this screen (e.g. after editing an invoice): refresh in
    // place without losing the pages already scrolled through.
    const hasFocusedOnce = useRef(false);
    useFocusEffect(
        useCallback(() => {
            if (hasFocusedOnce.current) loadRef.current('silent');
            hasFocusedOnce.current = true;
        }, [])
    );

    const handleRefresh = () => load('refresh');
    const handleLoadMore = () => load('more');

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
    };

    const handleResetFilters = () => {
        setFilters({ ...DEFAULT_FILTERS });
        setSearch('');
        setDebouncedSearch('');
    };

    const handleCardPress = (invoice) => {
        navigation.navigate('AdminHome', {
            screen: 'ManualInvoiceDetail',
            params: { invoiceId: invoice._id },
        });
    };

    const handleCardEdit = (invoice) => {
        navigation.navigate('AdminEditManualInvoice', { invoiceId: invoice._id, invoice });
    };

    const renderItem = useCallback(({ item, index }) => (
        <ManualInvoiceCard
            invoice={item}
            onPress={handleCardPress}
            onEdit={handleCardEdit}
            index={index}
        />
    ), []);

    const keyExtractor = useCallback((item) => item._id, []);

    return (
        <ScreenWrapper
            title="Invoices"
            noPadding
            rightSlot={
                <TouchableOpacity
                    onPress={() => navigation.navigate('CreateInvoice')}
                    style={[hdrS.addBtn, { backgroundColor: C.primary }]}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={20} color="#1a1a1a" />
                </TouchableOpacity>
            }
        >
            <View style={[mainS.inner, { paddingHorizontal: 16 }]}>

                {/* ── Search + Filter row ───────────────────────────────────── */}
                <View style={mainS.searchRow}>
                    <View style={[mainS.searchWrap, { backgroundColor: C.surfaceLow, borderColor: C.border }]}>
                        <Ionicons name="search-outline" size={16} color={C.textMuted} />
                        <TextInput
                            value={search}
                            onChangeText={handleSearchChange}
                            placeholder="Search name, invoice #..."
                            placeholderTextColor={C.textMuted}
                            style={[mainS.searchInput, { color: C.textPrimary }]}
                            returnKeyType="search"
                        />
                        {search.length > 0 && (
                            <TouchableOpacity
                                onPress={() => { setSearch(''); setDebouncedSearch(''); }}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <Ionicons name="close-circle" size={16} color={C.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <FilterButton
                        onPress={() => setFilterVisible(true)}
                        count={activeFilterCount}
                        C={C}
                    />
                </View>

                {/* ── Active filter summary chips ───────────────────────────── */}
                {activeFilterCount > 0 && (
                    <View style={mainS.activeFilterRow}>
                        {filters.status !== 'all' && (
                            <View style={[mainS.activeChip, { backgroundColor: C.primary + '22', borderColor: C.primary + '44' }]}>
                                <Text style={[mainS.activeChipText, { color: C.primary }]}>
                                    {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                                </Text>
                            </View>
                        )}
                        {filters.customerName ? (
                            <View style={[mainS.activeChip, { backgroundColor: C.surfaceHigh, borderColor: C.border }]}>
                                <Text style={[mainS.activeChipText, { color: C.textSecondary }]} numberOfLines={1}>
                                    {filters.customerName}
                                </Text>
                            </View>
                        ) : null}
                        {filters.vehicleBrand ? (
                            <View style={[mainS.activeChip, { backgroundColor: C.surfaceHigh, borderColor: C.border }]}>
                                <Text style={[mainS.activeChipText, { color: C.textSecondary }]}>
                                    {filters.vehicleBrand}
                                </Text>
                            </View>
                        ) : null}
                        <TouchableOpacity
                            onPress={handleResetFilters}
                            style={[mainS.activeChip, { backgroundColor: C.error + '18', borderColor: C.error + '33' }]}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="close" size={10} color={C.error} />
                            <Text style={[mainS.activeChipText, { color: C.error }]}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!loading && total > 0 && (
                    <Text style={{ color: C.textMuted, fontSize: 11.5, fontWeight: '600', marginBottom: 6 }}>
                        Showing {invoices.length} of {total} invoices
                    </Text>
                )}

                {/* ── Invoice list ──────────────────────────────────────────── */}
                {loading ? (
                    <View style={mainS.loadingWrap}>
                        <ActivityIndicator size="large" color={C.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={invoices}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor={C.primary}
                                colors={[C.primary]}
                            />
                        }
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.4}
                        ListEmptyComponent={
                            <EmptyState
                                hasFilters={hasActiveFilters}
                                onCreatePress={() => navigation.navigate('CreateInvoice')}
                                onResetPress={handleResetFilters}
                                C={C}
                            />
                        }
                        ListFooterComponent={
                            loadingMore
                                ? <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 16 }} />
                                : null
                        }
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1, paddingTop: 4 }}
                    />
                )}
            </View>

            {/* ── Filter Sheet ──────────────────────────────────────────────── */}
            <ManualInvoiceFilter
                visible={filterVisible}
                onClose={() => setFilterVisible(false)}
                filters={filters}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
            />
        </ScreenWrapper>
    );
}

const hdrS = StyleSheet.create({
    addBtn: {
        width: 34, height: 34, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
});

const mainS = StyleSheet.create({
    inner: { flex: 1 },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    searchRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginTop: 14, marginBottom: 10,
    },
    searchWrap: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        borderRadius: 12, borderWidth: 1,
        paddingHorizontal: 12, paddingVertical: 10,
    },
    searchInput: { flex: 1, fontSize: 13 },
    activeFilterRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10,
    },
    activeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 9, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1,
    },
    activeChipText: { fontSize: 11, fontWeight: '600', maxWidth: 100 },
});