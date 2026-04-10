import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Animated,
    Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import { useNavigation } from '@react-navigation/native';
import axiosClient from '../../../services/axiosClient';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fetchDashboard = async (period = 'month') => {
    const res = await axiosClient.get('/api/admin/dashboard', { params: { period } });
    return res.data;
};

const formatCurrency = (val) => {
    if (!val && val !== 0) return '—';
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
};

const formatNum = (val) => (val ?? '—').toLocaleString();

const STATUS_META = {
    pending: { label: 'Pending', color: '#F59E0B', icon: 'time-outline' },
    inProgress: { label: 'In Progress', color: '#3B82F6', icon: 'construct-outline' },
    mechanicAssigned: { label: 'Assigned', color: '#8B5CF6', icon: 'person-outline' },
    completed: { label: 'Completed', color: '#10B981', icon: 'checkmark-circle-outline' },
    invoiceGenerated: { label: 'Invoiced', color: '#e2a731', icon: 'document-text-outline' },
    cancelled: { label: 'Cancelled', color: '#EF4444', icon: 'close-circle-outline' },
};

const PAYMENT_META = {
    unpaid: { label: 'Unpaid', color: '#EF4444' },
    partial: { label: 'Partial', color: '#F59E0B' },
    paid: { label: 'Paid', color: '#10B981' },
};

const STATUS_BADGE = {
    'Pending': { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
    'In Progress': { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
    'Mechanic Assigned': { bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6' },
    'Completed': { bg: 'rgba(16,185,129,0.15)', text: '#10B981' },
    'Invoice Generated': { bg: 'rgba(226,167,49,0.15)', text: '#e2a731' },
    'Cancelled': { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
};

const PERIOD_OPTIONS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
];

const SERVICE_COLORS = ['#e2a731', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444'];

const { width: SCREEN_W } = Dimensions.get('window');

// ── Animated Card wrapper ─────────────────────────────────────────────────────
const FadeCard = ({ children, delay = 0, style }) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(18)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, speed: 18, bounciness: 4, delay, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
            {children}
        </Animated.View>
    );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, subLabel, accent, theme, isDark, delay }) => {
    const bg = isDark ? theme.colors.surface : theme.colors.surface;
    return (
        <FadeCard delay={delay} style={{ flex: 1 }}>
            <View style={[
                kpiStyles.card,
                {
                    backgroundColor: bg,
                    borderColor: theme.colors.border,
                    ...theme.shadow.soft,
                },
            ]}>
                <View style={[kpiStyles.iconBox, { backgroundColor: `${accent}1A` }]}>
                    <Ionicons name={icon} size={20} color={accent} />
                </View>
                <Text style={[kpiStyles.value, { color: theme.colors.textPrimary }]}>{value}</Text>
                <Text style={[kpiStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
                {sub !== undefined && (
                    <View style={kpiStyles.subRow}>
                        <Ionicons name="trending-up" size={11} color="#10B981" />
                        <Text style={kpiStyles.subText}>
                            <Text style={{ color: '#10B981', fontWeight: '700' }}>{sub}</Text>
                            {' '}<Text style={{ color: theme.colors.textMuted }}>{subLabel}</Text>
                        </Text>
                    </View>
                )}
            </View>
        </FadeCard>
    );
};

const kpiStyles = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        gap: 6,
        minWidth: 0,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    value: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
        lineHeight: 26,
    },
    label: {
        fontSize: 11.5,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    subRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 2,
    },
    subText: {
        fontSize: 10.5,
    },
});

// ── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({ title, theme, action, onAction }) => (
    <View style={secStyles.row}>
        <Text style={[secStyles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        {action && (
            <TouchableOpacity onPress={onAction} activeOpacity={0.75}>
                <Text style={[secStyles.action, { color: theme.colors.primary }]}>{action}</Text>
            </TouchableOpacity>
        )}
    </View>
);

const secStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    title: { fontSize: 16, fontWeight: '800', letterSpacing: 0.1 },
    action: { fontSize: 13, fontWeight: '600' },
});

// ── Order Status Grid ─────────────────────────────────────────────────────────
const OrderStatusGrid = ({ orderStatus, theme }) => {
    const total = Object.values(orderStatus).reduce((a, b) => a + b, 0) || 1;

    return (
        <View style={osStyles.grid}>
            {Object.entries(orderStatus).map(([key, count], i) => {
                const meta = STATUS_META[key];
                if (!meta) return null;
                const pct = Math.round((count / total) * 100);
                return (
                    <FadeCard key={key} delay={200 + i * 50} style={osStyles.cell}>
                        <View style={[osStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <View style={[osStyles.dot, { backgroundColor: `${meta.color}22` }]}>
                                <Ionicons name={meta.icon} size={16} color={meta.color} />
                            </View>
                            <Text style={[osStyles.count, { color: theme.colors.textPrimary }]}>{count}</Text>
                            <Text style={[osStyles.label, { color: theme.colors.textMuted }]}>{meta.label}</Text>
                            <View style={[osStyles.bar, { backgroundColor: theme.colors.surfaceHigh }]}>
                                <View style={[osStyles.fill, { width: `${pct}%`, backgroundColor: meta.color }]} />
                            </View>
                        </View>
                    </FadeCard>
                );
            })}
        </View>
    );
};

const osStyles = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    cell: { width: (SCREEN_W - 40 - 30) / 3 },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        gap: 4,
    },
    dot: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    count: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    label: { fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
    bar: { height: 3, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
    fill: { height: 3, borderRadius: 2 },
});

// ── Payment Status Pills ──────────────────────────────────────────────────────
const PaymentStatus = ({ payments, theme }) => {
    const total = Object.values(payments).reduce((a, b) => a + b, 0) || 1;
    return (
        <View style={payStyles.row}>
            {Object.entries(payments).map(([key, count]) => {
                const meta = PAYMENT_META[key];
                if (!meta) return null;
                const pct = Math.round((count / total) * 100);
                return (
                    <View key={key} style={[payStyles.pill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <View style={[payStyles.colorDot, { backgroundColor: meta.color }]} />
                        <Text style={[payStyles.count, { color: theme.colors.textPrimary }]}>{count}</Text>
                        <Text style={[payStyles.label, { color: theme.colors.textMuted }]}>{meta.label}</Text>
                    </View>
                );
            })}
        </View>
    );
};

const payStyles = StyleSheet.create({
    row: { flexDirection: 'row', gap: 10 },
    pill: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        gap: 4,
        alignItems: 'center',
    },
    colorDot: { width: 8, height: 8, borderRadius: 4 },
    count: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    label: { fontSize: 11, fontWeight: '500' },
});

// ── Top Services Bar Chart ────────────────────────────────────────────────────
const TopServices = ({ services, theme, isDark }) => {
    const maxCount = Math.max(...services.map(s => s.count), 1);
    return (
        <View style={svcStyles.list}>
            {services.map((s, i) => {
                const pct = (s.count / maxCount) * 100;
                const color = SERVICE_COLORS[i % SERVICE_COLORS.length];
                return (
                    <FadeCard key={s._id} delay={300 + i * 60}>
                        <View style={svcStyles.row}>
                            <Text style={[svcStyles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                                {s._id}
                            </Text>
                            <View style={svcStyles.barArea}>
                                <View style={[svcStyles.track, { backgroundColor: theme.colors.surfaceHigh }]}>
                                    <Animated.View style={[svcStyles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                                </View>
                            </View>
                            <Text style={[svcStyles.count, { color }]}>{s.count}</Text>
                        </View>
                    </FadeCard>
                );
            })}
        </View>
    );
};

const svcStyles = StyleSheet.create({
    list: { gap: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    name: { width: 110, fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
    barArea: { flex: 1 },
    track: { height: 8, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 4 },
    count: { width: 36, fontSize: 13, fontWeight: '700', textAlign: 'right' },
});

// ── Recent Order Row ──────────────────────────────────────────────────────────
const OrderRow = ({ order, theme, isDark, onPress, delay }) => {
    const badge = STATUS_BADGE[order.status] || { bg: 'rgba(150,150,150,0.15)', text: '#999' };
    const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

    return (
        <FadeCard delay={delay}>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                style={[
                    orStyles.card,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
            >
                <View style={orStyles.top}>
                    <Text style={[orStyles.orderId, { color: theme.colors.primary }]}>{order.orderId}</Text>
                    <View style={[orStyles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[orStyles.badgeText, { color: badge.text }]}>{order.status}</Text>
                    </View>
                </View>

                <View style={orStyles.mid}>
                    <View style={orStyles.col}>
                        <Text style={[orStyles.metaLabel, { color: theme.colors.textMuted }]}>Customer</Text>
                        <Text style={[orStyles.metaVal, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                            {order.name}
                        </Text>
                    </View>
                    <View style={orStyles.col}>
                        <Text style={[orStyles.metaLabel, { color: theme.colors.textMuted }]}>Service</Text>
                        <Text style={[orStyles.metaVal, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                            {order.serviceType}
                        </Text>
                    </View>
                    <View style={[orStyles.col, { alignItems: 'flex-end' }]}>
                        <Text style={[orStyles.metaLabel, { color: theme.colors.textMuted }]}>Amount</Text>
                        <Text style={[orStyles.metaVal, { color: theme.colors.textPrimary }]}>
                            {order.total?.finalPayable ? formatCurrency(order.total.finalPayable) : '—'}
                        </Text>
                    </View>
                </View>

                <View style={[orStyles.footer, { borderTopColor: theme.colors.border }]}>
                    <View style={orStyles.footerItem}>
                        <Ionicons name="location-outline" size={12} color={theme.colors.textMuted} />
                        <Text style={[orStyles.footerText, { color: theme.colors.textMuted }]}>{order.city}</Text>
                    </View>
                    {order.assignedMechanic && (
                        <View style={orStyles.footerItem}>
                            <Ionicons name="person-outline" size={12} color={theme.colors.textMuted} />
                            <Text style={[orStyles.footerText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                                {order.assignedMechanic}
                            </Text>
                        </View>
                    )}
                    <Text style={[orStyles.footerText, { color: theme.colors.textMuted, marginLeft: 'auto' }]}>
                        {dateStr}
                    </Text>
                </View>
            </TouchableOpacity>
        </FadeCard>
    );
};

const orStyles = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
        gap: 10,
        marginBottom: 10,
    },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    orderId: { fontSize: 13.5, fontWeight: '800', letterSpacing: 0.2 },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
    mid: { flexDirection: 'row', gap: 0 },
    col: { flex: 1, gap: 2 },
    metaLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.3 },
    metaVal: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerText: { fontSize: 11, fontWeight: '500' },
});

// ── Period Selector ───────────────────────────────────────────────────────────
const PeriodSelector = ({ selected, onSelect, theme, isDark }) => (
    <View style={[psStyles.row, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
        {PERIOD_OPTIONS.map((p) => {
            const isActive = selected === p.key;
            return (
                <TouchableOpacity
                    key={p.key}
                    onPress={() => onSelect(p.key)}
                    activeOpacity={0.75}
                    style={[
                        psStyles.btn,
                        isActive && { backgroundColor: theme.colors.primary },
                    ]}
                >
                    <Text style={[
                        psStyles.label,
                        { color: isActive ? '#1a1a1a' : theme.colors.textMuted },
                        isActive && { fontWeight: '700' },
                    ]}>
                        {p.label}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

const psStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        borderRadius: 14,
        borderWidth: 1,
        padding: 4,
        gap: 2,
    },
    btn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
    },
    label: { fontSize: 12.5, fontWeight: '500', letterSpacing: 0.2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EmployeeDashboardScreen() {
    const navigation = useNavigation();
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const [period, setPeriod] = useState('month');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            setError(null);
            const res = await fetchDashboard(period);
            if (res.success) setData(res.data);
            else throw new Error('API returned success: false');
        } catch (e) {
            setError(e.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = () => {
        setRefreshing(true);
        load(true);
    };

    // ── Loading State ────────────────────────────────────────────────────────
    if (loading && !data) {
        return (
            <TabScreenWrapper greeting="Dashboard" showBookingIcon={false} showMenuIcon={true}>
                <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
                        Loading dashboard…
                    </Text>
                </View>
            </TabScreenWrapper>
        );
    }

    // ── Error State ──────────────────────────────────────────────────────────
    if (error && !data) {
        return (
            <TabScreenWrapper greeting="Dashboard" showBookingIcon={false} showMenuIcon={true}>
                <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                    <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>
                        Couldn't load data
                    </Text>
                    <Text style={[styles.errorSub, { color: theme.colors.textMuted }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => load()}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </TabScreenWrapper>
        );
    }

    const { kpi, orderStatus, payments, topServices, recentOrders } = data || {};

    return (
        <TabScreenWrapper greeting="Dashboard" showBookingIcon={false} showMenuIcon={true}>
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.colors.background }}
                contentContainerStyle={[
                    styles.scroll,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary}
                        colors={[theme.colors.primary]}
                    />
                }
            >
                {/* ── Period Selector ── */}
                <FadeCard delay={0}>
                    <PeriodSelector
                        selected={period}
                        onSelect={setPeriod}
                        theme={theme}
                        isDark={isDark}
                    />
                </FadeCard>

                {/* ── KPI Cards ── */}
                <View style={styles.kpiGrid}>
                    <View style={styles.kpiRow}>
                        <KpiCard
                            icon="cash-outline"
                            label="Total Revenue"
                            value={formatCurrency(kpi?.totalRevenue)}
                            sub={formatCurrency(kpi?.periodRevenue)}
                            subLabel="this period"
                            accent="#10B981"
                            theme={theme}
                            isDark={isDark}
                            delay={60}
                        />
                        <KpiCard
                            icon="receipt-outline"
                            label="Total Orders"
                            value={formatNum(kpi?.totalOrders)}
                            sub={kpi?.periodOrders}
                            subLabel="this period"
                            accent={theme.colors.primary}
                            theme={theme}
                            isDark={isDark}
                            delay={100}
                        />
                    </View>
                    <View style={styles.kpiRow}>
                        <KpiCard
                            icon="people-outline"
                            label="Total Users"
                            value={formatNum(kpi?.totalUsers)}
                            sub={kpi?.newUsers}
                            subLabel="new"
                            accent="#3B82F6"
                            theme={theme}
                            isDark={isDark}
                            delay={140}
                        />
                        <KpiCard
                            icon="build-outline"
                            label="Mechanics"
                            value={formatNum(kpi?.totalMechanics)}
                            accent="#8B5CF6"
                            theme={theme}
                            isDark={isDark}
                            delay={180}
                        />
                    </View>
                </View>

                {/* ── Order Status ── */}
                <FadeCard delay={200} style={styles.section}>
                    <SectionHeader title="Order Status" theme={theme} />
                    <OrderStatusGrid orderStatus={orderStatus || {}} theme={theme} />
                </FadeCard>

                {/* ── Payment Status ── */}
                <FadeCard delay={250} style={styles.section}>
                    <SectionHeader title="Payment Status" theme={theme} />
                    <PaymentStatus payments={payments || {}} theme={theme} />
                </FadeCard>

                {/* ── Top Services ── */}
                {topServices?.length > 0 && (
                    <FadeCard delay={300} style={[styles.section, styles.sectionCard, {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                    }]}>
                        <SectionHeader title="Top Services" theme={theme} />
                        <TopServices services={topServices} theme={theme} isDark={isDark} />
                    </FadeCard>
                )}

                {/* ── Recent Orders ── */}
                {recentOrders?.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader
                            title="Recent Orders"
                            theme={theme}
                            action="See All"
                            onAction={() => navigation.navigate('Orders')}
                        />
                        {recentOrders.map((order, i) => (
                            <OrderRow
                                key={order._id}
                                order={order}
                                theme={theme}
                                isDark={isDark}
                                delay={350 + i * 40}
                                onPress={() => navigation.navigate('Orders', { orderId: order._id })}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scroll: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 20,
    },
    kpiGrid: { gap: 10 },
    kpiRow: { flexDirection: 'row', gap: 10 },
    section: { gap: 0 },
    sectionCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 32,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 8,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 12,
        textAlign: 'center',
    },
    errorSub: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    retryBtn: {
        marginTop: 8,
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 14,
    },
    retryText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
    },
});