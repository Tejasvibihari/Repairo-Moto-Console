import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import useCoupon from '../../../hooks/useCoupon';

// ─── Summary stat ───────────────────────────────────────────────────────────────
const StatBlock = ({ label, value, theme }) => (
    <View style={[statStyles.block, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
        <Text style={[statStyles.value, { color: theme.colors.textPrimary }]}>{value}</Text>
        <Text style={[statStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
);

const statStyles = StyleSheet.create({
    block: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    value: { fontSize: 18, fontWeight: '900' },
    label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 },
});

// ─── Redemption row ─────────────────────────────────────────────────────────────
const RedemptionRow = ({ item, theme }) => {
    const customerName = item.user?.name || item.customer?.name || item.userName || 'Customer';
    const orderRef = item.orderId?.toString?.().slice(-6) || item.order?._id?.toString?.().slice(-6) || item.order?.slice?.(-6);
    const date = item.createdAt || item.redeemedAt || item.appliedAt;
    const discountGiven = item.discountAmount ?? item.discountGiven ?? item.amount;

    return (
        <View style={[rowStyles.row, { borderBottomColor: theme.colors.border }]}>
            <View style={[rowStyles.iconWrap, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Ionicons name="pricetag-outline" size={16} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[rowStyles.name, { color: theme.colors.textPrimary }]}>{customerName}</Text>
                <Text style={[rowStyles.sub, { color: theme.colors.textMuted }]}>
                    {orderRef ? `Order #${orderRef}` : 'Order'}
                    {date ? ` · ${new Date(date).toLocaleDateString()}` : ''}
                </Text>
            </View>
            {discountGiven != null && (
                <Text style={[rowStyles.discount, { color: theme.colors.success }]}>-₹{discountGiven}</Text>
            )}
        </View>
    );
};

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 13.5, fontWeight: '700' },
    sub: { fontSize: 11.5, marginTop: 2 },
    discount: { fontSize: 13, fontWeight: '800' },
});

// ─── Empty state ────────────────────────────────────────────────────────────────
const EmptyState = ({ theme }) => (
    <View style={styles.emptyWrap}>
        <MaterialCommunityIcons name="receipt-text-outline" size={48} color={theme.colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No redemptions yet</Text>
        <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
            This coupon hasn't been used by any customer so far.
        </Text>
    </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
// route.params.coupon = the coupon doc to show usage for (required)
export default function AdminCouponUsageScreen({ navigation, route }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const coupon = route?.params?.coupon;
    const { fetchCouponUsage } = useCoupon({}, 1, 1);

    const [redemptions, setRedemptions] = useState([]);
    const [totalDiscountGiven, setTotalDiscountGiven] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const load = useCallback(async (silent = false) => {
        if (!coupon?._id) return;
        if (!silent) setLoading(true);
        setError(null);
        try {
            const result = await fetchCouponUsage(coupon._id);
            const list = result?.redemptions || result?.usage || (Array.isArray(result) ? result : []) || [];
            setRedemptions(list);
            setTotalDiscountGiven(result?.totalDiscountGiven ?? result?.totalDiscount ?? 0);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load usage history.');
        } finally {
            setLoading(false);
        }
    }, [coupon?._id, fetchCouponUsage]);

    useFocusEffect(
        useCallback(() => { load(); }, [load])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await load(true);
        setRefreshing(false);
    };

    const usedCount = coupon?.usageCount ?? coupon?.usedCount ?? redemptions.length;

    return (
        <ScreenWrapper title={coupon ? `${coupon.code} · Usage` : 'Coupon Usage'}>
            <View style={{ flex: 1 }}>
                <View style={styles.statsRow}>
                    <StatBlock label="Redemptions" value={usedCount} theme={theme} />
                    <StatBlock
                        label="Discount Given"
                        value={`₹${totalDiscountGiven ?? 0}`}
                        theme={theme}
                    />
                    <StatBlock
                        label="Limit"
                        value={coupon?.usageLimit ? coupon.usageLimit : '∞'}
                        theme={theme}
                    />
                </View>

                {loading ? (
                    <View style={styles.loaderWrap}>
                        <ActivityIndicator color={theme.colors.primary} size="large" />
                    </View>
                ) : (
                    <FlatList
                        data={redemptions}
                        keyExtractor={(item, idx) => item._id || item.orderId || String(idx)}
                        renderItem={({ item }) => <RedemptionRow item={item} theme={theme} />}
                        contentContainerStyle={[
                            { paddingBottom: insets.bottom + 24 },
                            redemptions.length === 0 && { flex: 1 },
                        ]}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                        }
                        ListEmptyComponent={<EmptyState theme={theme} />}
                    />
                )}

                {!!error && redemptions.length === 0 && !loading && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                )}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
    emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 12 },
    emptySub: { fontSize: 12.5, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
    errorText: { textAlign: 'center', fontSize: 13, marginTop: 10 },
});
