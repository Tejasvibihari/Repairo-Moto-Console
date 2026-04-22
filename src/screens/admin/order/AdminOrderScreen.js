// src/screens/admin/order/AdminOrderScreen.js
import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import AdminOrderCard from '../../../components/admin/order/AdminOrderCard';
import AdminOrderFilterSheet, { activeFilterCount } from '../../../components/admin/order/AdminOrderFilterSheet';
import useOrder from '../../../hooks/useOrder';
import { LightTheme, DarkTheme } from '../../../styles/Theme';

// ─── Status filter pills ──────────────────────────────────────────────────────
const STATUS_PILLS = [
    { key: '', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'mechanic assigned', label: 'Mechanic Assigned' },
    { key: 'mechanic arrived', label: 'Mechanic Arrived' },
    { key: 'in progress', label: 'In Progress' },
    { key: 'work completed', label: 'Work Completed' },
    { key: 'invoice generated', label: 'Invoice Generated' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
];

// ─── Search bar + filter trigger ──────────────────────────────────────────────
const SearchBar = ({ query, onQueryChange, onFilterPress, filterCount, theme }) => {
    const [focused, setFocused] = useState(false);
    return (
        <View style={sbStyles.row}>
            <View
                style={[
                    sbStyles.box,
                    {
                        backgroundColor: theme.colors.surfaceLow,
                        borderColor: focused ? theme.colors.primary : theme.colors.border,
                        flex: 1,
                    },
                ]}
            >
                <Ionicons
                    name="search-outline"
                    size={16}
                    color={focused ? theme.colors.primary : theme.colors.textMuted}
                />
                <TextInput
                    value={query}
                    onChangeText={onQueryChange}
                    placeholder="Search orders, customers…"
                    placeholderTextColor={theme.colors.textMuted}
                    style={[sbStyles.input, { color: theme.colors.textPrimary }]}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                />
                {query.length > 0 && (
                    <TouchableOpacity
                        onPress={() => onQueryChange('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity
                onPress={onFilterPress}
                activeOpacity={0.78}
                style={[
                    sbStyles.filterBtn,
                    {
                        backgroundColor: filterCount > 0 ? theme.colors.primary : theme.colors.surfaceLow,
                        borderColor: filterCount > 0 ? theme.colors.primary : theme.colors.border,
                    },
                ]}
            >
                <Ionicons
                    name="options-outline"
                    size={18}
                    color={filterCount > 0 ? '#1a1a1a' : theme.colors.textSecondary}
                />
                {filterCount > 0 && (
                    <View style={sbStyles.badge}>
                        <Text style={sbStyles.badgeText}>{filterCount}</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};
const sbStyles = StyleSheet.create({
    row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
    box: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    },
    input: { flex: 1, fontSize: 14, padding: 0, margin: 0 },
    filterBtn: {
        width: 46, height: 46,
        borderRadius: 14, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
    },
    badge: {
        position: 'absolute', top: -5, right: -5,
        minWidth: 16, height: 16, borderRadius: 8,
        backgroundColor: '#1a1a1a',
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
    },
    badgeText: { fontSize: 9, fontWeight: '800', color: '#e2a731' },
});

// ─── Status pills ─────────────────────────────────────────────────────────────
const StatusPills = ({ active, onSelect, theme }) => (
    <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
    >
        {STATUS_PILLS.map((p) => {
            const isActive = active === p.key;
            return (
                <TouchableOpacity
                    key={p.key}
                    onPress={() => onSelect(p.key)}
                    activeOpacity={0.75}
                    style={[
                        pillStyles.pill,
                        {
                            backgroundColor: isActive ? theme.colors.primary : theme.colors.surfaceLow,
                            borderColor: isActive ? theme.colors.primary : theme.colors.border,
                        },
                    ]}
                >
                    <Text
                        style={[
                            pillStyles.label,
                            {
                                color: isActive ? '#1a1a1a' : theme.colors.textSecondary,
                                fontWeight: isActive ? '700' : '500',
                            },
                        ]}
                    >
                        {p.label}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </ScrollView>
);
const pillStyles = StyleSheet.create({
    pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    label: { fontSize: 12.5, letterSpacing: 0.2 },
});

// ─── Summary strip ────────────────────────────────────────────────────────────
const SummaryStrip = ({ pagination, statusCounts, theme }) => {
    const items = [
        { label: 'Total', value: pagination.totalItems, color: theme.colors.primary },
        { label: 'Pending', value: statusCounts.pending ?? '–', color: theme.colors.textMuted },
        { label: 'Assigned', value: statusCounts.mechanic_assigned ?? '–', color: '#e2a731' },
        { label: 'Done', value: statusCounts.completed ?? '–', color: '#2ECC9A' },
    ];
    return (
        <View style={[sumStyles.strip, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
            {items.map((item, i) => (
                <React.Fragment key={item.label}>
                    <View style={sumStyles.cell}>
                        <Text style={[sumStyles.val, { color: item.color }]}>{item.value}</Text>
                        <Text style={[sumStyles.lbl, { color: theme.colors.textMuted }]}>{item.label}</Text>
                    </View>
                    {i < items.length - 1 && (
                        <View style={[sumStyles.sep, { backgroundColor: theme.colors.border }]} />
                    )}
                </React.Fragment>
            ))}
        </View>
    );
};
const sumStyles = StyleSheet.create({
    strip: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
    cell: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 },
    val: { fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
    lbl: { fontSize: 10.5, fontWeight: '500', letterSpacing: 0.4 },
    sep: { width: StyleSheet.hairlineWidth, marginVertical: 8 },
});

// ─── Empty / Error ────────────────────────────────────────────────────────────
const EmptyState = ({ theme, error, onRetry }) => (
    <View style={stateStyles.wrap}>
        <Ionicons
            name={error ? 'cloud-offline-outline' : 'file-tray-outline'}
            size={48}
            color={theme.colors.textMuted}
        />
        <Text style={[stateStyles.title, { color: theme.colors.textSecondary }]}>
            {error ? 'Failed to load orders' : 'No orders found'}
        </Text>
        <Text style={[stateStyles.sub, { color: theme.colors.textMuted }]}>
            {error ?? 'Try adjusting your search or filters'}
        </Text>
        {error && (
            <TouchableOpacity
                onPress={onRetry}
                style={[stateStyles.retryBtn, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
            >
                <Text style={stateStyles.retryLabel}>Retry</Text>
            </TouchableOpacity>
        )}
    </View>
);
const stateStyles = StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
    title: { fontSize: 15, fontWeight: '700' },
    sub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
    retryLabel: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
});

// ─── Pagination bar ───────────────────────────────────────────────────────────
const PaginationBar = ({ pagination, onChangePage, theme }) => {
    const { currentPage, totalPages } = pagination;
    if (totalPages <= 1) return null;
    return (
        <View style={[pgStyles.bar, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
                onPress={() => onChangePage(currentPage - 1)}
                disabled={currentPage <= 1}
                style={[pgStyles.btn, { borderColor: theme.colors.border, opacity: currentPage <= 1 ? 0.35 : 1 }]}
                activeOpacity={0.75}
            >
                <Ionicons name="chevron-back" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[pgStyles.label, { color: theme.colors.textSecondary }]}>
                <Text style={{ fontWeight: '800', color: theme.colors.textPrimary }}>{currentPage}</Text>
                {' / '}{totalPages}
            </Text>
            <TouchableOpacity
                onPress={() => onChangePage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                style={[pgStyles.btn, { borderColor: theme.colors.border, opacity: currentPage >= totalPages ? 0.35 : 1 }]}
                activeOpacity={0.75}
            >
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );
};
const pgStyles = StyleSheet.create({
    bar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth,
    },
    btn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 13, letterSpacing: 0.2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AdminOrderScreen = () => {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const navigation = useNavigation();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusPill, setStatusPill] = useState('');
    const [showFilter, setShowFilter] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const {
        data,
        loading,
        error,
        pagination,
        filters,
        setFilters,
        setPage,
        refetch,
    } = useOrder({}, 1, 10);

    // ✅ Sort orders: active statuses first, then by updatedAt desc
    const sortedData = useMemo(() => {
        const activeStatuses = new Set([
            'pending',
            'mechanic assigned',
            'mechanic arrived',
            'in progress',
            'work completed',
            'invoice generated',
        ]);
        return [...data].sort((a, b) => {
            const aStatus = (a.status || '').toLowerCase();
            const bStatus = (b.status || '').toLowerCase();
            const aActive = activeStatuses.has(aStatus);
            const bActive = activeStatuses.has(bStatus);
            if (aActive !== bActive) {
                return aActive ? -1 : 1;
            }
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    }, [data]);

    const filterBadgeCount = activeFilterCount(filters);
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);
    const handleSearchChange = useCallback((text) => {
        setSearchQuery(text);
        setFilters({ ...filters, search: text, status: statusPill });
    }, [filters, statusPill, setFilters]);

    const handleStatusPill = useCallback((key) => {
        setStatusPill(key);
        setFilters(prevFilters => ({
            ...prevFilters,
            search: searchQuery,
            status: key,
        }));
    }, [searchQuery, setFilters]);

    const handleFilterApply = useCallback((newFilters) => {
        setFilters({
            search: searchQuery,
            ...newFilters,
            status: newFilters.status ?? '',
        });
        setStatusPill(newFilters.status ?? '');
        setShowFilter(false);
    }, [searchQuery, setFilters]);

    const renderItem = useCallback(({ item, index }) => (
        <AdminOrderCard
            order={item}
            index={index}
            onPress={() => navigation.navigate('AdminOrderDetail', { order: item })}
        />
    ), []);

    // Status counts (based on original data, unaffected by sorting)
    const statusCounts = {
        pending: data.filter(o => o.status === 'Pending').length,
        in_progress: data.filter(o => o.status === 'In Progress').length,
        mechanic_assigned: data.filter(o => o.status === 'Mechanic Assigned').length,
        completed: data.filter(o => o.status === 'Completed').length,
        invoice_generated: data.filter(o => o.status === 'Invoice Generated').length,
        cancelled: data.filter(o => o.status === 'Cancelled').length,
    };

    const ListHeader = (
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
            <SearchBar
                query={searchQuery}
                onQueryChange={handleSearchChange}
                onFilterPress={() => setShowFilter(true)}
                filterCount={filterBadgeCount}
                theme={theme}
            />
            <StatusPills active={statusPill} onSelect={handleStatusPill} theme={theme} />
            <View style={{ height: 14 }} />
            <SummaryStrip pagination={pagination} statusCounts={statusCounts} theme={theme} />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <TabScreenWrapper greeting="Orders" showMenuIcon>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    {loading && data.length === 0 ? (
                        <View style={{ flex: 1 }}>
                            {ListHeader}
                            <ActivityIndicator
                                size="large"
                                color={theme.colors.primary}
                                style={{ marginTop: 40 }}
                            />
                        </View>
                    ) : (
                        <FlatList
                            data={sortedData}  // ✅ Use sorted orders
                            renderItem={renderItem}
                            keyExtractor={(item) => String(item._id ?? item.id ?? item.orderId)}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={handleRefresh}
                                    tintColor={theme.colors.primary}
                                    colors={[theme.colors.primary]}
                                />
                            }
                            contentContainerStyle={[
                                listStyles.content,
                                sortedData.length === 0 && { flex: 1 },
                            ]}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            ListHeaderComponent={ListHeader}
                            ListEmptyComponent={
                                !loading && <EmptyState theme={theme} error={error} onRetry={refetch} />
                            }
                            ListFooterComponent={
                                <>
                                    {loading && sortedData.length > 0 && (
                                        <ActivityIndicator
                                            size="small"
                                            color={theme.colors.primary}
                                            style={{ paddingVertical: 16 }}
                                        />
                                    )}
                                    <PaginationBar
                                        pagination={pagination}
                                        onChangePage={setPage}
                                        theme={theme}
                                    />
                                    <View style={{ height: 100 }} />
                                </>
                            }
                        />
                    )}
                </KeyboardAvoidingView>

                <AdminOrderFilterSheet
                    visible={showFilter}
                    currentFilters={filters}
                    onApply={handleFilterApply}
                    onClose={() => setShowFilter(false)}
                />
            </TabScreenWrapper>
        </View>
    );
};

export default AdminOrderScreen;

const listStyles = StyleSheet.create({
    content: { paddingBottom: 24, paddingHorizontal: 0 },
});