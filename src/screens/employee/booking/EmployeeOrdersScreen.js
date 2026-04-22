import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
    Animated,
    RefreshControl,
    ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import axiosClient from '../../../services/axiosClient';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import EmployeeOrderCard from '../../../components/employee/booking/EmployeeOrderCard';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';

// ── Filter tabs ────────────────────────────────────────────────────────────────
const FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'Pending', label: 'Pending' },
    { key: 'In Progress', label: 'In Progress' },
    { key: 'Mechanic Assigned', label: 'Assigned' },
    { key: 'Completed', label: 'Completed' },
    { key: 'Cancelled', label: 'Cancelled' },
];

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({ theme, activeFilter }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, []);

    return (
        <Animated.View style={[emptyStyles.wrap, { opacity: fadeAnim }]}>
            <View style={[emptyStyles.iconCircle, { backgroundColor: theme.colors.surfaceHigh }]}>
                <Ionicons name="receipt-outline" size={36} color={theme.colors.primary} />
            </View>
            <Text style={[emptyStyles.title, { color: theme.colors.textPrimary }]}>No Orders Found</Text>
            <Text style={[emptyStyles.sub, { color: theme.colors.textMuted }]}>
                {activeFilter === 'all'
                    ? 'No orders have been assigned yet.'
                    : `No "${activeFilter}" orders at the moment.`}
            </Text>
        </Animated.View>
    );
}

const emptyStyles = StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
    iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 16, fontWeight: '700' },
    sub: { fontSize: 13, textAlign: 'center', maxWidth: 240 },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function EmployeeOrdersScreen() {
    const navigation = useNavigation();
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;

    const employeeId = useSelector((s) => s.auth.user?._id || s.auth.user?.id);

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const hasMore = page < totalPages;

    const LIMIT = 10;

    const fetchOrders = useCallback(async ({ pageNum = 1, replace = true } = {}) => {
        if (!employeeId) return;
        try {
            if (replace) setLoading(true);
            else setLoadingMore(true);
            setError(null);

            const { data } = await axiosClient.get(`/api/admin/order/getorder/${employeeId}`, {
                params: { page: pageNum, limit: LIMIT, sort: 'createdAt:desc' },
            });

            const fetched = data.data || [];
            setOrders((prev) => (replace ? fetched : [...prev, ...fetched]));
            setPage(pageNum);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load orders.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [employeeId]);
    console.log('OrdersScreen rendered with orders:', orders);
    useEffect(() => {
        fetchOrders({ pageNum: 1, replace: true });
    }, [fetchOrders]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchOrders({ pageNum: 1, replace: true });
    }, [fetchOrders]);

    const onLoadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            fetchOrders({ pageNum: page + 1, replace: false });
        }
    }, [loadingMore, hasMore, page, fetchOrders]);

    const filteredOrders = orders.filter((o) => {
        const matchesFilter = activeFilter === 'all' || o.status === activeFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q ||
            o.orderId?.toLowerCase().includes(q) ||
            o.name?.toLowerCase().includes(q) ||
            o.contactNo?.includes(q) ||
            o.selectedBrand?.toLowerCase().includes(q) ||
            o.selectedModel?.toLowerCase().includes(q);
        return matchesFilter && matchesSearch;
    });
    const sortedOrders = useMemo(() => {
        const activeStatuses = new Set([
            'Pending',
            'In Progress',
            'Mechanic Assigned',
            'Mechanic Arrived',
        ]);
        return [...filteredOrders].sort((a, b) => {
            const aActive = activeStatuses.has(a.status);
            const bActive = activeStatuses.has(b.status);
            if (aActive !== bActive) {
                return aActive ? -1 : 1;
            }
            // both active or both inactive → newer updatedAt first
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    }, [filteredOrders]);

    const renderCard = useCallback(({ item, index }) => (
        <EmployeeOrderCard
            order={item}
            index={index}
            onPress={(order) => navigation.navigate('EmployeeOrderDetail', { order })}
        />
    ), [navigation]);

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
        );
    };

    const countForTab = (key) => {
        if (key === 'all') return orders.length;
        return orders.filter((o) => o.status === key).length;
    };

    return (
        <TabScreenWrapper greeting="All Orders" showBookingIcon={false} showMenuIcon={true}>
            <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

                {/* ── Search bar — always visible, outside the list ── */}
                <View style={[
                    styles.searchWrap,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}>
                    <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                        placeholder="Search by name, order ID, bike..."
                        placeholderTextColor={theme.colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Filter tabs — fixed-height ScrollView, never inside FlatList ── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsContainer}
                    style={styles.tabsScrollView}
                >
                    {FILTER_TABS.map((item) => {
                        const isActive = activeFilter === item.key;
                        const count = countForTab(item.key);
                        return (
                            <TouchableOpacity
                                key={item.key}
                                onPress={() => setActiveFilter(item.key)}
                                activeOpacity={0.75}
                                style={[
                                    styles.tab,
                                    {
                                        backgroundColor: isActive ? theme.colors.primary : theme.colors.surfaceLow,
                                        borderColor: isActive ? theme.colors.primary : theme.colors.border,
                                    },
                                ]}
                            >
                                <Text style={[
                                    styles.tabLabel,
                                    { color: isActive ? '#1a1a1a' : theme.colors.textSecondary },
                                ]}>
                                    {item.label}
                                </Text>
                                {count > 0 && (
                                    <View style={[
                                        styles.tabBadge,
                                        { backgroundColor: isActive ? 'rgba(26,26,26,0.18)' : theme.colors.surfaceHigh },
                                    ]}>
                                        <Text style={[
                                            styles.tabBadgeText,
                                            { color: isActive ? '#1a1a1a' : theme.colors.textMuted },
                                        ]}>
                                            {count}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* ── List area ── */}
                {loading ? (
                    <View style={styles.centerFill}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.centerFill}>
                        <Ionicons name="alert-circle-outline" size={36} color={theme.colors.error} />
                        <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>{error}</Text>
                        <TouchableOpacity
                            onPress={() => fetchOrders({ pageNum: 1, replace: true })}
                            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.retryLabel}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={sortedOrders}
                        keyExtractor={(item) => item._id || item.orderId}
                        renderItem={renderCard}
                        contentContainerStyle={[
                            styles.listContent,
                            filteredOrders.length === 0 && styles.listContentEmpty,
                        ]}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={<EmptyState theme={theme} activeFilter={activeFilter} />}
                        ListFooterComponent={renderFooter}
                        onEndReached={onLoadMore}
                        onEndReachedThreshold={0.4}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[theme.colors.primary]}
                                tintColor={theme.colors.primary}
                            />
                        }
                    />
                )}
            </View>
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 14,
        marginBottom: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        padding: 0,
    },
    // Key fix: explicit height + no flex growth prevents vertical explosion
    tabsScrollView: {
        height: 44,
        flexGrow: 0,
        flexShrink: 0,
        marginBottom: 4,
    },
    tabsContainer: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 0,
        borderRadius: 20,
        borderWidth: 1,
        height: 34,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.2,
        lineHeight: 16,
    },
    tabBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    tabBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        lineHeight: 12,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 100,
    },
    listContentEmpty: {
        flexGrow: 1,
    },
    centerFill: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 32,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    retryBtn: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 4,
    },
    retryLabel: {
        color: '#1a1a1a',
        fontWeight: '700',
        fontSize: 14,
    },
});