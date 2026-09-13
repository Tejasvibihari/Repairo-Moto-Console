import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Animated,
    ActivityIndicator,
    RefreshControl,
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import PopUp from '../../../components/common/PopUp';
import useCoupon from '../../../hooks/useCoupon';

// ─── Search Bar ───────────────────────────────────────────────────────────────
const SearchBar = ({ value, onChange, theme, isDark }) => {
    const [focused, setFocused] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(borderAnim, { toValue: focused ? 1 : 0, duration: 180, useNativeDriver: false }).start();
    }, [focused]);

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.border, theme.colors.primary],
    });

    return (
        <Animated.View
            style={[
                styles.searchWrap,
                { backgroundColor: isDark ? theme.colors.surfaceHigh : '#FFFFFF', borderColor },
            ]}
        >
            <Ionicons
                name="search"
                size={18}
                color={value ? theme.colors.primary : theme.colors.textMuted}
                style={{ marginRight: 10 }}
            />
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Search by code..."
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoCapitalize="characters"
                returnKeyType="search"
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

// ─── Status filter pills ───────────────────────────────────────────────────────
const STATUS_PILLS = [
    { key: 'all', label: 'All' },
    { key: 'true', label: 'Active' },
    { key: 'false', label: 'Inactive' },
];

const StatusPills = ({ active, onChange, theme }) => (
    <View style={styles.pillRow}>
        {STATUS_PILLS.map((p) => {
            const isActive = active === p.key;
            return (
                <TouchableOpacity
                    key={p.key}
                    onPress={() => onChange(p.key)}
                    activeOpacity={0.8}
                    style={[
                        styles.pill,
                        {
                            backgroundColor: isActive ? theme.colors.primary : theme.colors.surfaceLow,
                            borderColor: isActive ? theme.colors.primary : theme.colors.border,
                        },
                    ]}
                >
                    <Text
                        style={{
                            fontSize: 12,
                            color: isActive ? '#1a1a1a' : theme.colors.textSecondary,
                            fontWeight: isActive ? '700' : '500',
                        }}
                    >
                        {p.label}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

// ─── Discount summary helper ───────────────────────────────────────────────────
const formatDiscount = (coupon) => {
    if (coupon.discountType === 'percentage') {
        const cap = coupon.maxDiscountAmount ? ` (up to ₹${coupon.maxDiscountAmount})` : '';
        return `${coupon.discountValue}% off${cap}`;
    }
    return `₹${coupon.discountValue} off`;
};

const isExpired = (coupon) => {
    if (!coupon.validUntil) return false;
    return new Date(coupon.validUntil).getTime() < Date.now();
};

// ─── Coupon Card ────────────────────────────────────────────────────────────────
const CouponCard = ({ coupon, theme, isDark, onEdit, onDelete, onUsage, onToggle, togglingId }) => {
    const expired = isExpired(coupon);
    const usedCount = coupon.usageCount ?? coupon.usedCount ?? 0;
    const usageLimit = coupon.usageLimit;

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onEdit(coupon)}
            style={[
                cardStyles.card,
                { backgroundColor: isDark ? theme.colors.surface : '#FFFFFF', borderColor: theme.colors.border },
            ]}
        >
            <View style={cardStyles.topRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[cardStyles.code, { color: theme.colors.textPrimary }]}>{coupon.code}</Text>
                    <Text style={[cardStyles.discount, { color: theme.colors.primary }]}>
                        {formatDiscount(coupon)}
                    </Text>
                </View>
                <Switch
                    value={!!coupon.isActive}
                    onValueChange={() => onToggle(coupon)}
                    disabled={togglingId === coupon._id}
                    trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}90` }}
                    thumbColor={coupon.isActive ? theme.colors.primary : '#f4f3f4'}
                />
            </View>

            {!!coupon.description && (
                <Text
                    numberOfLines={2}
                    style={[cardStyles.description, { color: theme.colors.textSecondary }]}
                >
                    {coupon.description}
                </Text>
            )}

            <View style={cardStyles.metaRow}>
                {coupon.minOrderAmount ? (
                    <View style={[cardStyles.metaChip, { backgroundColor: theme.colors.surfaceLow }]}>
                        <Text style={[cardStyles.metaText, { color: theme.colors.textMuted }]}>
                            Min ₹{coupon.minOrderAmount}
                        </Text>
                    </View>
                ) : null}
                {coupon.validUntil ? (
                    <View style={[cardStyles.metaChip, { backgroundColor: theme.colors.surfaceLow }]}>
                        <Text style={[cardStyles.metaText, { color: expired ? theme.colors.error : theme.colors.textMuted }]}>
                            {expired ? 'Expired' : `Till ${new Date(coupon.validUntil).toLocaleDateString()}`}
                        </Text>
                    </View>
                ) : null}
                <View style={[cardStyles.metaChip, { backgroundColor: theme.colors.surfaceLow }]}>
                    <Text style={[cardStyles.metaText, { color: theme.colors.textMuted }]}>
                        Used {usedCount}{usageLimit ? ` / ${usageLimit}` : ''}
                    </Text>
                </View>
            </View>

            <View style={[cardStyles.actionsRow, { borderTopColor: theme.colors.border }]}>
                <TouchableOpacity
                    onPress={() => onUsage(coupon)}
                    style={cardStyles.actionBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="bar-chart-outline" size={15} color={theme.colors.textSecondary} />
                    <Text style={[cardStyles.actionText, { color: theme.colors.textSecondary }]}>Usage</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => onEdit(coupon)}
                    style={cardStyles.actionBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="pencil-outline" size={15} color={theme.colors.primary} />
                    <Text style={[cardStyles.actionText, { color: theme.colors.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => onDelete(coupon)}
                    style={cardStyles.actionBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="trash-outline" size={15} color={theme.colors.error} />
                    <Text style={[cardStyles.actionText, { color: theme.colors.error }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

// ─── Empty state ────────────────────────────────────────────────────────────────
const EmptyState = ({ theme }) => (
    <View style={styles.emptyWrap}>
        <MaterialCommunityIcons name="ticket-percent-outline" size={54} color={theme.colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No coupons yet</Text>
        <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
            Tap the + button to create your first coupon.
        </Text>
    </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminCouponListScreen({ navigation }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const {
        data: coupons,
        loading,
        error,
        filters,
        setFilters,
        refetch,
        deleteCoupon,
        toggleCoupon,
        mutationLoading,
    } = useCoupon({ sort: 'createdAt:desc' });

    const [searchQuery, setSearchQuery] = useState('');
    const [statusPill, setStatusPill] = useState('all');
    const [refreshing, setRefreshing] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [popup, setPopup] = useState({ visible: false, title: '', message: '' });

    const showPopup = (title, message) => setPopup({ visible: true, title, message });
    const closePopup = () => setPopup((p) => ({ ...p, visible: false }));

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    // Debounce search → filters
    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((prev) => ({ ...prev, search: searchQuery }));
        }, 350);
        return () => clearTimeout(t);
    }, [searchQuery, setFilters]);

    const handleStatusChange = (key) => {
        setStatusPill(key);
        setFilters((prev) => ({ ...prev, isActive: key === 'all' ? undefined : key }));
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleToggle = async (coupon) => {
        setTogglingId(coupon._id);
        try {
            await toggleCoupon(coupon._id);
        } catch (err) {
            showPopup('Error', err.message || 'Failed to update coupon status.');
        } finally {
            setTogglingId(null);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const target = deleteTarget;
        setDeleteTarget(null);
        try {
            await deleteCoupon(target._id);
        } catch (err) {
            showPopup('Error', err.message || 'Failed to delete coupon.');
        }
    };

    return (
        <TabScreenWrapper greeting="Coupons" showMenuIcon>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Text style={[styles.headline, { color: theme.colors.textPrimary }]}>Coupons</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('AdminCouponForm')}
                        activeOpacity={0.85}
                        style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
                    >
                        <Ionicons name="add" size={18} color="#1a1a1a" />
                        <Text style={styles.addBtnText}>New Coupon</Text>
                    </TouchableOpacity>
                </View>

                <SearchBar value={searchQuery} onChange={setSearchQuery} theme={theme} isDark={isDark} />
                <StatusPills active={statusPill} onChange={handleStatusChange} theme={theme} />

                {loading && coupons.length === 0 ? (
                    <View style={styles.loaderWrap}>
                        <ActivityIndicator color={theme.colors.primary} size="large" />
                    </View>
                ) : (
                    <FlatList
                        data={coupons}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <CouponCard
                                coupon={item}
                                theme={theme}
                                isDark={isDark}
                                togglingId={togglingId}
                                onToggle={handleToggle}
                                onEdit={(c) => navigation.navigate('AdminCouponForm', { coupon: c })}
                                onUsage={(c) => navigation.navigate('AdminCouponUsage', { coupon: c })}
                                onDelete={(c) => setDeleteTarget(c)}
                            />
                        )}
                        contentContainerStyle={[
                            { paddingBottom: insets.bottom + 32, paddingTop: 4 },
                            coupons.length === 0 && { flex: 1 },
                        ]}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                        }
                        ListEmptyComponent={<EmptyState theme={theme} />}
                    />
                )}

                {!!error && coupons.length === 0 && !loading && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                )}
            </View>

            <PopUp
                visible={popup.visible}
                title={popup.title}
                message={popup.message}
                primaryLabel="Okay"
                onPrimary={closePopup}
                onClose={closePopup}
            />

            <PopUp
                visible={!!deleteTarget}
                title="Delete Coupon"
                message={`Delete "${deleteTarget?.code}"? This cannot be undone.`}
                primaryLabel={mutationLoading ? 'Deleting...' : 'Delete'}
                secondaryLabel="Cancel"
                onPrimary={confirmDelete}
                onSecondary={() => setDeleteTarget(null)}
                onClose={() => setDeleteTarget(null)}
            />
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headline: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12,
    },
    addBtnText: { fontSize: 12, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.3 },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 14 },
    emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
    errorText: { textAlign: 'center', fontSize: 13, marginTop: 10 },
});

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    code: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    discount: { fontSize: 13, fontWeight: '700', marginTop: 3 },
    description: { fontSize: 12, marginTop: 8, lineHeight: 17 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    metaChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
    metaText: { fontSize: 10.5, fontWeight: '600' },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionText: { fontSize: 11.5, fontWeight: '700' },
});
