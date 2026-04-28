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
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
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
    const fetchInvoices = useCallback(async (pg = 1, refresh = false) => {
        if (pg === 1) {
            refresh ? setRefreshing(true) : setLoading(true);
        }

        try {
            const params = new URLSearchParams({ page: pg, limit: 20 });

            if (filters.status && filters.status !== 'all') params.append('status', filters.status);
            if (SORT_MAP[filters.sortBy]) params.append('sortBy', SORT_MAP[filters.sortBy]);
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (filters.customerName) params.append('customerName', filters.customerName);
            if (filters.vehicleBrand) params.append('vehicleBrand', filters.vehicleBrand);
            if (filters.vehicleModel) params.append('vehicleModel', filters.vehicleModel);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const res = await axiosClient.get(`/api/manual-invoices?${params.toString()}`);
            const data = res.data;
            const items = data.data || data.invoices || [];
            setInvoices((prev) => (pg === 1 ? items : [...prev, ...items]));
            setHasMore(items.length === 20);
            setPage(pg);
        } catch (err) {
            console.error('Fetch invoices failed', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filters, debouncedSearch]);

    // Refresh on screen focus
    useFocusEffect(
        useCallback(() => {
            fetchInvoices(1);
        }, [fetchInvoices])
    );

    // Re-fetch when filters or search change
    useEffect(() => {
        fetchInvoices(1);
    }, [filters, debouncedSearch]);

    const handleRefresh = () => fetchInvoices(1, true);
    const handleLoadMore = () => { if (hasMore && !loading) fetchInvoices(page + 1); };

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

                {/* ── Invoice list ──────────────────────────────────────────── */}
                {loading && page === 1 ? (
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
                            loading && page > 1
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