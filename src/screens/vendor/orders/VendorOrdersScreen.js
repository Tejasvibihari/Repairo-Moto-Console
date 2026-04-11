import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Animated,
    RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import VendorOrderCard from '../../../components/vendor/order/VendorOrderCard';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import axiosClient from '../../../services/axiosClient';

// ─── API ──────────────────────────────────────────────────────────────────────
const fetchVendorOrders = async ({ vendorId, page = 1, limit = 10, status }) => {
    const params = { page, limit, sort: 'createdAt:desc' };
    if (status && status !== 'All') params.status = status;

    const response = await axiosClient.get(`/api/admin/order/getorder/${vendorId}`, { params });
    return response.data;
};

// ─── Filter Tabs (dynamic theme) ─────────────────────────────────────────────
const FILTERS = ['All', 'Pending', 'In Progress', 'Mechanic Assigned', 'Completed', 'Cancelled'];

function FilterTabs({ selected, onSelect, theme }) {
    return (
        <View style={filterStyles.wrapper}>
            <FlatList
                data={FILTERS}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                contentContainerStyle={filterStyles.list}
                renderItem={({ item }) => {
                    const isActive = selected === item;
                    return (
                        <TouchableOpacity
                            onPress={() => onSelect(item)}
                            activeOpacity={0.75}
                            style={[
                                filterStyles.chip,
                                {
                                    backgroundColor: isActive
                                        ? theme.colors.primary
                                        : theme.colors.surfaceLow,
                                    borderColor: isActive
                                        ? theme.colors.primary
                                        : theme.colors.border,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    filterStyles.chipText,
                                    {
                                        color: isActive
                                            ? theme.colors.textPrimary   // was '#1a1a1a'
                                            : theme.colors.textSecondary,
                                        fontWeight: isActive ? '700' : '500',
                                    },
                                ]}
                            >
                                {item}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const filterStyles = StyleSheet.create({
    wrapper: { marginBottom: 12 },
    list: { gap: 8, paddingVertical: 4 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 12,
        letterSpacing: 0.2,
    },
});

// ─── Empty State (already dynamic) ───────────────────────────────────────────
function EmptyState({ theme, filter }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View style={[emptyStyles.container, { opacity: fadeAnim }]}>
            <View style={[emptyStyles.iconWrap, { backgroundColor: theme.colors.surfaceLow }]}>
                <Ionicons name="receipt-outline" size={36} color={theme.colors.primary} />
            </View>
            <Text style={[emptyStyles.title, { color: theme.colors.textPrimary }]}>
                No Orders Found
            </Text>
            <Text style={[emptyStyles.subtitle, { color: theme.colors.textMuted }]}>
                {filter === 'All'
                    ? 'No orders assigned to your account yet.'
                    : `No "${filter}" orders at the moment.`}
            </Text>
        </Animated.View>
    );
}

const emptyStyles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 12,
    },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        letterSpacing: 0.1,
        maxWidth: 240,
    },
});

// ─── VendorOrdersScreen (dynamic theming) ────────────────────────────────────
const VendorOrdersScreen = () => {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const vendor = useSelector((s) => s.auth.user);
    const vendorId = vendor?._id || vendor?.id;

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('All');
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });

    const loadOrders = useCallback(
        async ({ page = 1, isRefresh = false, isLoadMore = false } = {}) => {
            if (!vendorId) return;
            try {
                if (isRefresh) setRefreshing(true);
                else if (isLoadMore) setLoadingMore(true);
                else setLoading(true);
                setError(null);

                const res = await fetchVendorOrders({ vendorId, page, status: filter });

                setOrders((prev) => (page === 1 ? res.data : [...prev, ...res.data]));
                setPagination(res.pagination);
            } catch (err) {
                const errorMsg = err.response?.data?.message || err.message || 'Failed to load orders.';
                setError(errorMsg);
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        [vendorId, filter]
    );

    useEffect(() => {
        setOrders([]);
        setPagination({ currentPage: 1, totalPages: 1 });
        loadOrders({ page: 1 });
    }, [filter]);

    const handleRefresh = () => loadOrders({ page: 1, isRefresh: true });

    const handleLoadMore = () => {
        if (!loadingMore && pagination.currentPage < pagination.totalPages) {
            loadOrders({ page: pagination.currentPage + 1, isLoadMore: true });
        }
    };

    const renderItem = useCallback(
        ({ item, index }) => (
            <VendorOrderCard
                order={item}
                index={index}
                onPress={(order) => {
                    // Navigate to order detail screen
                    console.log('Order pressed:', order.orderId);
                }}
            />
        ),
        []
    );

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.loadMoreWrap}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
        );
    };

    const renderEmpty = () => {
        if (loading) return null;
        return <EmptyState theme={theme} filter={filter} />;
    };

    return (
        <TabScreenWrapper greeting="Orders" showBookingIcon={false} showMenuIcon={true}>
            <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
                <FilterTabs selected={filter} onSelect={setFilter} theme={theme} />

                {!loading && orders.length > 0 && (
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryText, { color: theme.colors.textMuted }]}>
                            {pagination.totalItems} order{pagination.totalItems !== 1 ? 's' : ''}
                            {filter !== 'All' ? ` · ${filter}` : ''}
                        </Text>
                    </View>
                )}

                {/* Error state with dynamic theme colors */}
                {error && (
                    <View
                        style={[
                            styles.errorBox,
                            { backgroundColor: theme.colors.error + '1A' }, // 10% opacity
                        ]}
                    >
                        <Ionicons name="warning-outline" size={16} color={theme.colors.error} />
                        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                        <TouchableOpacity onPress={() => loadOrders({ page: 1 })} style={styles.retryBtn}>
                            <Text style={[styles.retryText, { color: theme.colors.primary }]}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {loading && orders.length === 0 ? (
                    <View style={styles.loaderWrap}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={orders}
                        keyExtractor={(item) => item._id || item.orderId}
                        renderItem={renderItem}
                        ListEmptyComponent={renderEmpty}
                        ListFooterComponent={renderFooter}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.4}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.listContent,
                            orders.length === 0 && styles.listContentEmpty,
                        ]}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor={theme.colors.primary}
                                colors={[theme.colors.primary]}
                            />
                        }
                    />
                )}
            </View>
        </TabScreenWrapper>
    );
};

export default VendorOrdersScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 14,
        paddingHorizontal: 16,
    },
    summaryRow: {
        marginBottom: 8,
    },
    summaryText: {
        fontSize: 12,
        letterSpacing: 0.2,
        fontWeight: '500',
    },
    loaderWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadMoreWrap: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 120,
    },
    listContentEmpty: {
        flex: 1,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
    },
    errorText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
    },
    retryBtn: {
        paddingHorizontal: 8,
    },
    retryText: {
        fontSize: 12,
        fontWeight: '700',
    },
});