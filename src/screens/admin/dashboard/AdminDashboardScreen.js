import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
import AttendanceCard from '../../../components/employee/AttendanceCard';
import { isManagerStaff } from '../../../utils/attendanceUtils';
import DashboardFilterSheet, {
    PERIOD_OPTIONS,
    DEFAULT_FILTERS,
    countActiveFilters,
} from '../../../components/admin/dashboard/DashboardFilterSheet';

// ── API ───────────────────────────────────────────────────────────────────────
const fetchDashboard = async (filters) => {
    const params = { period: filters.period };
    if (filters.period === 'custom') {
        params.from = filters.from;
        params.to = filters.to;
    }
    if (filters.city) params.city = filters.city;
    if (filters.serviceType) params.serviceType = filters.serviceType;
    if (filters.mechanicId) params.mechanicId = filters.mechanicId;
    const res = await axiosClient.get('/api/admin/dashboard', { params });
    return res.data;
};

const fetchFilterOptions = async () => {
    const res = await axiosClient.get('/api/admin/dashboard/filters');
    return res.data?.data;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (val) => {
    if (val === null || val === undefined) return '—';
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${Math.round(val)}`;
};

const formatNum = (val) => (val === null || val === undefined ? '—' : Number(val).toLocaleString('en-IN'));

const fmtDay = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

const formatRange = (range) => {
    if (!range) return '';
    const from = fmtDay(range.from);
    const to = fmtDay(range.to);
    const year = new Date(range.to).toLocaleDateString('en-IN', { year: 'numeric', timeZone: 'Asia/Kolkata' });
    return from === to ? `${from} ${year}` : `${from} – ${to} ${year}`;
};

const STATUS_META = {
    pending: { label: 'Pending', color: '#F59E0B', icon: 'time-outline' },
    mechanicAssigned: { label: 'Assigned', color: '#8B5CF6', icon: 'person-outline' },
    mechanicArrived: { label: 'Arrived', color: '#06B6D4', icon: 'navigate-outline' },
    inProgress: { label: 'In Progress', color: '#3B82F6', icon: 'construct-outline' },
    completionRequested: { label: 'Completion Req.', color: '#F97316', icon: 'hourglass-outline' },
    workCompleted: { label: 'Work Done', color: '#14B8A6', icon: 'checkmark-done-outline' },
    invoiceGenerated: { label: 'Invoiced', color: '#e2a731', icon: 'document-text-outline' },
    completed: { label: 'Completed', color: '#10B981', icon: 'checkmark-circle-outline' },
    cancelled: { label: 'Cancelled', color: '#EF4444', icon: 'close-circle-outline' },
};

const PAYMENT_META = {
    unpaid: { label: 'Unpaid', color: '#EF4444' },
    partial: { label: 'Partial', color: '#F59E0B' },
    paid: { label: 'Paid', color: '#10B981' },
};

const STATUS_BADGE = {
    'Pending': { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
    'Mechanic Assigned': { bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6' },
    'Mechanic Start': { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
    'Mechanic Arrived': { bg: 'rgba(6,182,212,0.15)', text: '#06B6D4' },
    'In Progress': { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
    'Completion Requested': { bg: 'rgba(249,115,22,0.15)', text: '#F97316' },
    'Work Completed': { bg: 'rgba(20,184,166,0.15)', text: '#14B8A6' },
    'Invoice Generated': { bg: 'rgba(226,167,49,0.15)', text: '#e2a731' },
    'Completed': { bg: 'rgba(16,185,129,0.15)', text: '#10B981' },
    'Cancelled': { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
};

const SERVICE_COLORS = ['#e2a731', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

// ── Delta badge (vs previous period) ─────────────────────────────────────────
// change === null means there was no baseline to compare with ("New").
const Delta = ({ change, theme, invert = false }) => {
    if (change === undefined) return null;
    if (change === null) {
        return <Text style={[kpiStyles.subText, { color: '#3B82F6', fontWeight: '700' }]}>New vs prev.</Text>;
    }
    if (change === 0) {
        return <Text style={[kpiStyles.subText, { color: theme.colors.textMuted }]}>No change vs prev.</Text>;
    }
    const up = change > 0;
    const good = invert ? !up : up;
    const color = good ? '#10B981' : '#EF4444';
    return (
        <View style={kpiStyles.subRow}>
            <Ionicons name={up ? 'trending-up' : 'trending-down'} size={11} color={color} />
            <Text style={kpiStyles.subText}>
                <Text style={{ color, fontWeight: '700' }}>{Math.abs(change)}%</Text>
                <Text style={{ color: theme.colors.textMuted }}> vs prev.</Text>
            </Text>
        </View>
    );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, accent, theme, delay, footer, valueColor }) => (
    <FadeCard delay={delay} style={{ flex: 1 }}>
        <View style={[
            kpiStyles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadow.soft },
        ]}>
            <View style={[kpiStyles.iconBox, { backgroundColor: `${accent}1A` }]}>
                <Ionicons name={icon} size={20} color={accent} />
            </View>
            <Text style={[kpiStyles.value, { color: valueColor || theme.colors.textPrimary }]}>{value}</Text>
            <Text style={[kpiStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
            {footer}
        </View>
    </FadeCard>
);

const kpiStyles = StyleSheet.create({
    card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 6, minWidth: 0 },
    iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    value: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, lineHeight: 26 },
    label: { fontSize: 11.5, fontWeight: '500', letterSpacing: 0.3 },
    subRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    subText: { fontSize: 10.5, marginTop: 2 },
});

// ── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({ title, theme, action, onAction, right }) => (
    <View style={secStyles.row}>
        <Text style={[secStyles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        {right}
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

// ── Revenue chart (View-based, no chart lib needed) ───────────────────────────
const CHART_H = 110;

const bucketLabel = (key, granularity) => {
    if (granularity === 'hour') {
        const h = parseInt(key, 10);
        return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`;
    }
    if (granularity === 'day') {
        const [, m, d] = key.split('-');
        return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]}`;
    }
    const [, m] = key.split('-');
    return MONTHS[parseInt(m, 10) - 1];
};

const RevenueChart = ({ chart, theme }) => {
    const points = chart?.points || [];
    const max = Math.max(...points.map((p) => p.revenue), 0);
    const hasRevenue = max > 0;

    if (!points.length) return null;

    // Show ~4 evenly spaced x labels regardless of bucket count
    const step = Math.max(1, Math.floor((points.length - 1) / 3));
    const labelIdx = new Set();
    for (let i = 0; i < points.length; i += step) labelIdx.add(i);
    labelIdx.add(points.length - 1);
    if (labelIdx.has(points.length - 2) && points.length > 4) labelIdx.delete(points.length - 2);

    return (
        <View>
            <View style={[chartStyles.plot, { height: CHART_H }]}>
                {points.map((p) => {
                    const h = hasRevenue ? Math.max((p.revenue / max) * CHART_H, p.revenue > 0 ? 3 : 0) : 0;
                    return (
                        <View key={p.key} style={chartStyles.barSlot}>
                            <View style={[chartStyles.barTrack, { backgroundColor: theme.colors.surfaceLow }]} />
                            <View
                                style={[
                                    chartStyles.bar,
                                    { height: h, backgroundColor: theme.colors.primary },
                                ]}
                            />
                        </View>
                    );
                })}
            </View>
            <View style={chartStyles.axis}>
                {points.map((p, i) => (
                    <View key={p.key} style={chartStyles.axisSlot}>
                        {labelIdx.has(i) && (
                            <Text
                                numberOfLines={1}
                                style={[chartStyles.axisText, { color: theme.colors.textMuted }]}
                            >
                                {bucketLabel(p.key, chart.granularity)}
                            </Text>
                        )}
                    </View>
                ))}
            </View>
            {!hasRevenue && (
                <Text style={[chartStyles.empty, { color: theme.colors.textMuted }]}>
                    No collected revenue in this range
                </Text>
            )}
        </View>
    );
};

const chartStyles = StyleSheet.create({
    plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
    barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
    barTrack: { ...StyleSheet.absoluteFillObject, borderRadius: 3, opacity: 0.6 },
    bar: { borderRadius: 3, minWidth: 2 },
    axis: { flexDirection: 'row', marginTop: 6 },
    axisSlot: { flex: 1, alignItems: 'center', overflow: 'visible' },
    axisText: { fontSize: 9.5, width: 44, textAlign: 'center' },
    empty: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});

// ── Order Status Grid ─────────────────────────────────────────────────────────
const CELL_W = (SCREEN_W - 32 - 20) / 3; // 16px side padding ×2, 10px gap ×2

const OrderStatusGrid = ({ orderStatus, theme }) => {
    const total = Object.values(orderStatus).reduce((a, b) => a + b, 0) || 1;

    return (
        <View style={osStyles.grid}>
            {Object.keys(STATUS_META).map((key, i) => {
                const meta = STATUS_META[key];
                const count = orderStatus[key] ?? 0;
                const pct = Math.round((count / total) * 100);
                return (
                    <FadeCard key={key} delay={200 + i * 40} style={{ width: CELL_W }}>
                        <View style={[osStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <View style={[osStyles.dot, { backgroundColor: `${meta.color}22` }]}>
                                <Ionicons name={meta.icon} size={16} color={meta.color} />
                            </View>
                            <Text style={[osStyles.count, { color: theme.colors.textPrimary }]}>{count}</Text>
                            <Text style={[osStyles.label, { color: theme.colors.textMuted }]} numberOfLines={1}>{meta.label}</Text>
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
    card: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 4 },
    dot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    count: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    label: { fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
    bar: { height: 3, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
    fill: { height: 3, borderRadius: 2 },
});

// ── Payment Status Pills ──────────────────────────────────────────────────────
const PaymentStatus = ({ payments, outstanding, theme }) => (
    <View>
        <View style={payStyles.row}>
            {Object.entries(PAYMENT_META).map(([key, meta]) => (
                <View key={key} style={[payStyles.pill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={[payStyles.colorDot, { backgroundColor: meta.color }]} />
                    <Text style={[payStyles.count, { color: theme.colors.textPrimary }]}>{payments[key] ?? 0}</Text>
                    <Text style={[payStyles.label, { color: theme.colors.textMuted }]}>{meta.label}</Text>
                </View>
            ))}
        </View>
        <Text style={[payStyles.note, { color: theme.colors.textMuted }]}>
            Billed, non-cancelled orders only
            {outstanding > 0 ? ` · ${formatCurrency(outstanding)} outstanding` : ''}
        </Text>
    </View>
);

const payStyles = StyleSheet.create({
    row: { flexDirection: 'row', gap: 10 },
    pill: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, gap: 4, alignItems: 'center' },
    colorDot: { width: 8, height: 8, borderRadius: 4 },
    count: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    label: { fontSize: 11, fontWeight: '500' },
    note: { fontSize: 11, marginTop: 8, textAlign: 'center' },
});

// ── Manual Invoices card ──────────────────────────────────────────────────────
const INVOICE_META = [
    { key: 'paid', label: 'Paid', color: '#10B981' },
    { key: 'unpaid', label: 'Unpaid', color: '#EF4444' },
    { key: 'draft', label: 'Draft', color: '#F59E0B' },
    { key: 'cancelled', label: 'Cancelled', color: '#9CA3AF' },
];

const ManualInvoicesCard = ({ invoices, theme, onSeeAll }) => {
    const inv = invoices || {};
    return (
        <View>
            <SectionHeader title="Manual Invoices" theme={theme} action="See All" onAction={onSeeAll} />
            <View style={[miStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={miStyles.topRow}>
                    <View style={[miStyles.iconBox, { backgroundColor: `${theme.colors.primary}22` }]}>
                        <Ionicons name="document-text-outline" size={22} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[miStyles.total, { color: theme.colors.textPrimary }]}>{formatNum(inv.total ?? 0)}</Text>
                        <Text style={[miStyles.totalLabel, { color: theme.colors.textMuted }]}>Total manual invoices</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[miStyles.amount, { color: theme.colors.textPrimary }]}>{formatCurrency(inv.billedAmount ?? 0)}</Text>
                        <Text style={[miStyles.totalLabel, { color: theme.colors.textMuted }]}>Billed</Text>
                    </View>
                </View>

                <View style={miStyles.statRow}>
                    {INVOICE_META.map((m) => (
                        <View key={m.key} style={[miStyles.stat, { backgroundColor: theme.colors.surfaceLow }]}>
                            <View style={[miStyles.dot, { backgroundColor: m.color }]} />
                            <Text style={[miStyles.statCount, { color: theme.colors.textPrimary }]}>{inv[m.key] ?? 0}</Text>
                            <Text style={[miStyles.statLabel, { color: theme.colors.textMuted }]}>{m.label}</Text>
                        </View>
                    ))}
                </View>

                {(inv.unpaidAmount > 0 || inv.paidAmount > 0) && (
                    <Text style={[miStyles.note, { color: theme.colors.textMuted }]}>
                        <Text style={{ color: '#10B981', fontWeight: '700' }}>{formatCurrency(inv.paidAmount)}</Text> paid
                        {inv.unpaidAmount > 0 && (
                            <Text> · <Text style={{ color: '#EF4444', fontWeight: '700' }}>{formatCurrency(inv.unpaidAmount)}</Text> unpaid</Text>
                        )}
                    </Text>
                )}
            </View>
        </View>
    );
};

const miStyles = StyleSheet.create({
    card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    total: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 30 },
    totalLabel: { fontSize: 11.5, fontWeight: '500', letterSpacing: 0.2 },
    amount: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    statRow: { flexDirection: 'row', gap: 8 },
    stat: { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', gap: 3 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    statCount: { fontSize: 17, fontWeight: '800' },
    statLabel: { fontSize: 10.5, fontWeight: '500' },
    note: { fontSize: 11.5, textAlign: 'center' },
});

// ── Upcoming Orders ───────────────────────────────────────────────────────────
const istDayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const upcomingDayLabel = (date) => {
    const key = istDayKey(date);
    const now = Date.now();
    if (key === istDayKey(now)) return 'Today';
    if (key === istDayKey(now + 24 * 60 * 60 * 1000)) return 'Tomorrow';
    return new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
};

const UpcomingOrders = ({ upcoming, theme, onSeeAll, onOpen }) => {
    const list = upcoming?.orders || [];
    const pills = [
        { label: 'Today', value: upcoming?.today ?? 0, color: '#F59E0B' },
        { label: 'Next 7 days', value: upcoming?.next7Days ?? 0, color: '#3B82F6' },
        { label: 'All upcoming', value: upcoming?.total ?? 0, color: '#8B5CF6' },
    ];

    return (
        <View>
            <SectionHeader title="Upcoming Orders" theme={theme} action="See All" onAction={onSeeAll} />
            <View style={upStyles.pillRow}>
                {pills.map((p) => (
                    <View key={p.label} style={[upStyles.pill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <Text style={[upStyles.pillValue, { color: p.color }]}>{p.value}</Text>
                        <Text style={[upStyles.pillLabel, { color: theme.colors.textMuted }]} numberOfLines={1}>{p.label}</Text>
                    </View>
                ))}
            </View>

            {list.length === 0 ? (
                <View style={[upStyles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Ionicons name="calendar-outline" size={22} color={theme.colors.textMuted} />
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12.5 }}>No upcoming orders scheduled</Text>
                </View>
            ) : (
                list.map((o) => {
                    const badge = STATUS_BADGE[o.status] || { bg: 'rgba(150,150,150,0.15)', text: '#999' };
                    const isToday = upcomingDayLabel(o.preferredDate) === 'Today';
                    return (
                        <TouchableOpacity
                            key={o._id}
                            activeOpacity={0.8}
                            onPress={() => onOpen(o)}
                            style={[upStyles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                        >
                            <View style={[upStyles.dateBox, { backgroundColor: isToday ? `${theme.colors.primary}22` : theme.colors.surfaceLow }]}>
                                <Text style={[upStyles.dateDay, { color: isToday ? theme.colors.primary : theme.colors.textPrimary }]} numberOfLines={1}>
                                    {upcomingDayLabel(o.preferredDate)}
                                </Text>
                                {!!o.preferredTime && (
                                    <Text style={[upStyles.dateTime, { color: theme.colors.textMuted }]} numberOfLines={1}>{o.preferredTime}</Text>
                                )}
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                                <View style={upStyles.rowTop}>
                                    <Text style={[upStyles.orderId, { color: theme.colors.primary }]} numberOfLines={1}>{o.orderId}</Text>
                                    <View style={[upStyles.badge, { backgroundColor: badge.bg }]}>
                                        <Text style={[upStyles.badgeText, { color: badge.text }]}>{o.status}</Text>
                                    </View>
                                </View>
                                <Text style={[upStyles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>{o.name}</Text>
                                <Text style={[upStyles.meta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                                    {o.serviceType}{o.city ? ` · ${o.city}` : ''}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })
            )}
        </View>
    );
};

const upStyles = StyleSheet.create({
    pillRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    pill: { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 12, alignItems: 'center', gap: 2 },
    pillValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    pillLabel: { fontSize: 10.5, fontWeight: '500' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 8 },
    dateBox: { width: 74, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 2 },
    dateDay: { fontSize: 12, fontWeight: '800' },
    dateTime: { fontSize: 10, fontWeight: '500' },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    orderId: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.2, flexShrink: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 14 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    name: { fontSize: 13.5, fontWeight: '600' },
    meta: { fontSize: 11 },
    empty: { borderRadius: 16, borderWidth: 1, paddingVertical: 22, alignItems: 'center', gap: 6 },
});

// ── Top Services ──────────────────────────────────────────────────────────────
const TopServices = ({ services, theme }) => {
    const maxCount = Math.max(...services.map((s) => s.count), 1);
    return (
        <View style={svcStyles.list}>
            {services.map((s, i) => {
                const pct = (s.count / maxCount) * 100;
                const color = SERVICE_COLORS[i % SERVICE_COLORS.length];
                return (
                    <FadeCard key={s._id} delay={300 + i * 60}>
                        <View style={svcStyles.row}>
                            <Text style={[svcStyles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>{s._id}</Text>
                            <View style={svcStyles.barArea}>
                                <View style={[svcStyles.track, { backgroundColor: theme.colors.surfaceHigh }]}>
                                    <View style={[svcStyles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
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
const OrderRow = ({ order, theme, onPress, delay }) => {
    const badge = STATUS_BADGE[order.status] || { bg: 'rgba(150,150,150,0.15)', text: '#999' };
    const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });
    const mechanics = Array.isArray(order.assignedMechanics) ? order.assignedMechanics.filter(Boolean).join(', ') : '';

    return (
        <FadeCard delay={delay}>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                style={[orStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
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
                        <Text style={[orStyles.metaVal, { color: theme.colors.textPrimary }]} numberOfLines={1}>{order.name}</Text>
                    </View>
                    <View style={orStyles.col}>
                        <Text style={[orStyles.metaLabel, { color: theme.colors.textMuted }]}>Service</Text>
                        <Text style={[orStyles.metaVal, { color: theme.colors.textPrimary }]} numberOfLines={1}>{order.serviceType}</Text>
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
                    {!!mechanics && (
                        <View style={[orStyles.footerItem, { flexShrink: 1 }]}>
                            <Ionicons name="person-outline" size={12} color={theme.colors.textMuted} />
                            <Text style={[orStyles.footerText, { color: theme.colors.textMuted }]} numberOfLines={1}>{mechanics}</Text>
                        </View>
                    )}
                    <Text style={[orStyles.footerText, { color: theme.colors.textMuted, marginLeft: 'auto' }]}>{dateStr}</Text>
                </View>
            </TouchableOpacity>
        </FadeCard>
    );
};

const orStyles = StyleSheet.create({
    card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10, marginBottom: 10 },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    orderId: { fontSize: 13.5, fontWeight: '800', letterSpacing: 0.2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
    mid: { flexDirection: 'row', gap: 0 },
    col: { flex: 1, gap: 2 },
    metaLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.3 },
    metaVal: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerText: { fontSize: 11, fontWeight: '500' },
});

// ── Filter bar: period chips + Filters button + active filter chips ───────────
// The four main filters. Yesterday / 7 / 30 days live in the filter sheet; when one of
// those is active an extra chip is shown so the current selection is always visible.
const QUICK_PERIODS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
];

const FilterBar = ({ filters, options, rangeLabel, onPeriod, onOpenSheet, onClear, onClearAll, theme }) => {
    const extra = countActiveFilters(filters);
    const isCustom = filters.period === 'custom';
    const extraPeriod = !isCustom && !QUICK_PERIODS.some((p) => p.key === filters.period)
        ? PERIOD_OPTIONS.find((p) => p.key === filters.period)
        : null;
    const mechanicName = options?.mechanics?.find((m) => m._id === filters.mechanicId)?.name;

    const active = [
        filters.city && { key: 'city', label: filters.city, icon: 'location-outline' },
        filters.serviceType && { key: 'serviceType', label: filters.serviceType, icon: 'flash-outline' },
        filters.mechanicId && { key: 'mechanicId', label: mechanicName || 'Mechanic', icon: 'build-outline' },
    ].filter(Boolean);

    return (
        <View style={{ gap: 10 }}>
            <View style={fbStyles.row}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={fbStyles.chips}
                    style={{ flex: 1 }}
                >
                    {QUICK_PERIODS.map((p) => {
                        const isActive = filters.period === p.key;
                        return (
                            <TouchableOpacity
                                key={p.key}
                                onPress={() => onPeriod(p.key)}
                                activeOpacity={0.75}
                                style={[
                                    fbStyles.chip,
                                    {
                                        backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                                        borderColor: isActive ? theme.colors.primary : theme.colors.border,
                                    },
                                ]}
                            >
                                <Text style={{ fontSize: 12.5, color: isActive ? '#1a1a1a' : theme.colors.textMuted, fontWeight: isActive ? '700' : '500' }}>
                                    {p.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    {extraPeriod && (
                        <TouchableOpacity
                            onPress={onOpenSheet}
                            activeOpacity={0.75}
                            style={[fbStyles.chip, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                        >
                            <Text style={{ fontSize: 12.5, color: '#1a1a1a', fontWeight: '700' }}>{extraPeriod.label}</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={onOpenSheet}
                        activeOpacity={0.75}
                        style={[
                            fbStyles.chip,
                            {
                                backgroundColor: isCustom ? theme.colors.primary : theme.colors.surface,
                                borderColor: isCustom ? theme.colors.primary : theme.colors.border,
                                flexDirection: 'row',
                                gap: 4,
                            },
                        ]}
                    >
                        <Ionicons name="calendar-outline" size={13} color={isCustom ? '#1a1a1a' : theme.colors.textMuted} />
                        <Text style={{ fontSize: 12.5, color: isCustom ? '#1a1a1a' : theme.colors.textMuted, fontWeight: isCustom ? '700' : '500' }}>
                            Custom
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                <TouchableOpacity
                    onPress={onOpenSheet}
                    activeOpacity={0.8}
                    style={[fbStyles.filterBtn, { backgroundColor: theme.colors.surface, borderColor: extra ? theme.colors.primary : theme.colors.border }]}
                >
                    <Ionicons name="options-outline" size={18} color={extra ? theme.colors.primary : theme.colors.textPrimary} />
                    {extra > 0 && (
                        <View style={[fbStyles.badge, { backgroundColor: theme.colors.primary }]}>
                            <Text style={fbStyles.badgeText}>{extra}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={fbStyles.metaRow}>
                <Ionicons name="calendar-clear-outline" size={12} color={theme.colors.textMuted} />
                <Text style={[fbStyles.rangeText, { color: theme.colors.textMuted }]}>{rangeLabel}</Text>
            </View>

            {active.length > 0 && (
                <View style={fbStyles.activeRow}>
                    {active.map((a) => (
                        <TouchableOpacity
                            key={a.key}
                            onPress={() => onClear(a.key)}
                            activeOpacity={0.75}
                            style={[fbStyles.activeChip, { backgroundColor: `${theme.colors.primary}22`, borderColor: theme.colors.primary }]}
                        >
                            <Ionicons name={a.icon} size={12} color={theme.colors.primary} />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textPrimary }} numberOfLines={1}>{a.label}</Text>
                            <Ionicons name="close" size={13} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    ))}
                    {active.length > 1 && (
                        <TouchableOpacity onPress={onClearAll} activeOpacity={0.7} style={{ justifyContent: 'center', paddingHorizontal: 4 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.primary }}>Clear all</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

const fbStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chips: { gap: 8, paddingRight: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    filterBtn: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    badge: { position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#1a1a1a' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    rangeText: { fontSize: 12, fontWeight: '500' },
    activeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    activeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, borderWidth: 1, maxWidth: '100%' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminDashboardScreen() {
    const navigation = useNavigation();
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const insets = useSafeAreaInsets();
    const user = useSelector((s) => s.auth.user);
    const canMarkAttendance = isManagerStaff(user);

    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [options, setOptions] = useState(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const [data, setData] = useState(null);
    const [meta, setMeta] = useState(null); // { range }
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Ignore responses from superseded requests (fast filter switching)
    const reqId = useRef(0);

    const load = useCallback(async (isRefresh = false) => {
        const id = ++reqId.current;
        try {
            if (!isRefresh) setLoading(true);
            setError(null);
            const res = await fetchDashboard(filters);
            if (id !== reqId.current) return;
            if (!res.success) throw new Error(res.message || 'API returned success: false');
            setData(res.data);
            setMeta({ range: res.range });
        } catch (e) {
            if (id !== reqId.current) return;
            setError(e?.response?.data?.message || e.message || 'Failed to load dashboard');
        } finally {
            if (id === reqId.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [filters]);

    useEffect(() => { load(); }, [load]);

    // Filter options are loaded once; failure just hides those sections in the sheet
    useEffect(() => {
        fetchFilterOptions().then(setOptions).catch(() => { });
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        load(true);
    };

    const setPeriod = (key) => setFilters((f) => ({ ...f, period: key, from: '', to: '' }));
    const clearOne = (key) => setFilters((f) => ({ ...f, [key]: '' }));
    const clearAll = () => setFilters((f) => ({ ...f, city: '', serviceType: '', mechanicId: '' }));

    const rangeLabel = useMemo(() => formatRange(meta?.range), [meta]);

    // ── First-load states ────────────────────────────────────────────────────
    if (loading && !data) {
        return (
            <TabScreenWrapper greeting="Dashboard" showBookingIcon={false} showMenuIcon={true}>
                <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Loading dashboard…</Text>
                </View>
            </TabScreenWrapper>
        );
    }

    if (error && !data) {
        return (
            <TabScreenWrapper greeting="Dashboard" showBookingIcon={false} showMenuIcon={true}>
                <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                    <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>Couldn't load data</Text>
                    <Text style={[styles.errorSub, { color: theme.colors.textMuted }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => { setFilters(DEFAULT_FILTERS); }}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.retryText}>Reset & Retry</Text>
                    </TouchableOpacity>
                </View>
            </TabScreenWrapper>
        );
    }

    const { kpi, orderStatus, payments, manualInvoices, upcoming, topServices, recentOrders, revenueChart } = data || {};
    const totalInRange = kpi?.periodOrders ?? 0;

    return (
        <TabScreenWrapper greeting="Dashboard" showBookingIcon={false} showMenuIcon={true}>
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.colors.background }}
                contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary}
                        colors={[theme.colors.primary]}
                    />
                }
            >
                {/* Managers / operational managers mark their own attendance here */}
                {canMarkAttendance && <AttendanceCard theme={theme} style={{ marginBottom: 0 }} />}

                {/* ── Filters ── */}
                <FilterBar
                    filters={filters}
                    options={options}
                    rangeLabel={rangeLabel}
                    onPeriod={setPeriod}
                    onOpenSheet={() => setSheetOpen(true)}
                    onClear={clearOne}
                    onClearAll={clearAll}
                    theme={theme}
                />

                {/* Inline error when we still have (stale) data on screen */}
                {error && data && (
                    <TouchableOpacity
                        onPress={() => load()}
                        activeOpacity={0.8}
                        style={[styles.banner, { borderColor: '#EF4444' }]}
                    >
                        <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                        <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 12.5 }} numberOfLines={2}>
                            {error} — showing previous results. Tap to retry.
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Content dims while a new filter is loading */}
                <View style={[{ gap: 20 }, loading && { opacity: 0.45 }]} pointerEvents={loading ? 'none' : 'auto'}>
                    {/* ── KPI Cards ── */}
                    <View style={styles.kpiGrid}>
                        <View style={styles.kpiRow}>
                            <KpiCard
                                icon="receipt-outline"
                                label="Total Orders"
                                value={formatNum(kpi?.periodOrders)}
                                accent={theme.colors.primary}
                                theme={theme}
                                delay={60}
                                footer={
                                    <>
                                        <Delta change={kpi?.ordersChange} theme={theme} />
                                        <Text style={[kpiStyles.subText, { color: theme.colors.textMuted }]}>
                                            {formatNum(kpi?.totalOrders)} all time
                                        </Text>
                                    </>
                                }
                            />
                            <KpiCard
                                icon="document-text-outline"
                                label="Total Manual Invoices"
                                value={formatNum(manualInvoices?.total)}
                                accent="#8B5CF6"
                                theme={theme}
                                delay={100}
                                footer={
                                    <>
                                        <Delta change={manualInvoices?.change} theme={theme} />
                                        <Text style={[kpiStyles.subText, { color: theme.colors.textMuted }]}>
                                            {manualInvoices?.paid ?? 0} paid · {manualInvoices?.unpaid ?? 0} unpaid
                                        </Text>
                                    </>
                                }
                            />
                        </View>
                        <View style={styles.kpiRow}>
                            <KpiCard
                                icon="wallet-outline"
                                label="Manual Invoice Amount"
                                value={formatCurrency(manualInvoices?.billedAmount ?? 0)}
                                accent="#10B981"
                                theme={theme}
                                delay={140}
                                footer={
                                    <Text style={[kpiStyles.subText, { color: theme.colors.textMuted }]}>
                                        <Text style={{ color: '#10B981', fontWeight: '700' }}>{formatCurrency(manualInvoices?.paidAmount ?? 0)}</Text> paid
                                    </Text>
                                }
                            />
                            <KpiCard
                                icon="alert-circle-outline"
                                label="Outstanding"
                                value={formatCurrency(kpi?.outstandingAmount)}
                                valueColor={kpi?.outstandingAmount > 0 ? '#EF4444' : undefined}
                                accent="#EF4444"
                                theme={theme}
                                delay={180}
                            />
                        </View>
                        <View style={styles.kpiRow}>
                            <KpiCard
                                icon="calendar-outline"
                                label="Upcoming Orders"
                                value={formatNum(upcoming?.total)}
                                accent="#F59E0B"
                                theme={theme}
                                delay={220}
                                footer={
                                    <Text style={[kpiStyles.subText, { color: theme.colors.textMuted }]}>
                                        <Text style={{ color: '#F59E0B', fontWeight: '700' }}>{formatNum(upcoming?.today ?? 0)}</Text> today
                                    </Text>
                                }
                            />
                            <KpiCard
                                icon="pricetag-outline"
                                label="Avg. Paid Order"
                                value={formatCurrency(kpi?.avgOrderValue)}
                                accent="#06B6D4"
                                theme={theme}
                                delay={260}
                            />
                        </View>
                        <View style={styles.kpiRow}>
                            <KpiCard
                                icon="people-outline"
                                label="Total Users"
                                value={formatNum(kpi?.totalUsers)}
                                accent="#3B82F6"
                                theme={theme}
                                delay={300}
                                footer={
                                    <Text style={[kpiStyles.subText, { color: theme.colors.textMuted }]}>
                                        <Text style={{ color: '#10B981', fontWeight: '700' }}>+{formatNum(kpi?.newUsers)}</Text> new in range
                                    </Text>
                                }
                            />
                            <KpiCard
                                icon="build-outline"
                                label="Mechanics"
                                value={formatNum(kpi?.totalMechanics)}
                                accent="#14B8A6"
                                theme={theme}
                                delay={340}
                            />
                        </View>
                    </View>

                    {/* ── Revenue trend ── */}
                    <FadeCard delay={200} style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <SectionHeader title="Revenue Trend" theme={theme} />
                        <RevenueChart chart={revenueChart} theme={theme} />
                    </FadeCard>

                    {/* ── Upcoming Orders (look-ahead, ignores the period filter) ── */}
                    <FadeCard delay={210}>
                        <UpcomingOrders
                            upcoming={upcoming}
                            theme={theme}
                            onSeeAll={() => navigation.navigate('Orders')}
                            onOpen={(o) => navigation.navigate('Orders', { orderId: o._id })}
                        />
                    </FadeCard>

                    {/* ── Order Status ── */}
                    <FadeCard delay={220}>
                        <SectionHeader
                            title="Order Status"
                            theme={theme}
                            right={<Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{totalInRange} orders</Text>}
                        />
                        <OrderStatusGrid orderStatus={orderStatus || {}} theme={theme} />
                    </FadeCard>

                    {/* ── Payment Status ── */}
                    <FadeCard delay={250}>
                        <SectionHeader
                            title="Payment Status"
                            theme={theme}
                            right={
                                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                                    {(payments?.paid ?? 0) + (payments?.partial ?? 0) + (payments?.unpaid ?? 0)} billed orders
                                </Text>
                            }
                        />
                        <PaymentStatus payments={payments || {}} outstanding={kpi?.outstandingAmount} theme={theme} />
                    </FadeCard>

                    {/* ── Manual Invoices ── */}
                    <FadeCard delay={270}>
                        <ManualInvoicesCard
                            invoices={manualInvoices}
                            theme={theme}
                            onSeeAll={() => navigation.navigate('Invoices')}
                        />
                    </FadeCard>

                    {/* ── Top Services ── */}
                    {topServices?.length > 0 && (
                        <FadeCard delay={300} style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <SectionHeader title="Top Services" theme={theme} />
                            <TopServices services={topServices} theme={theme} />
                        </FadeCard>
                    )}

                    {/* ── Recent Orders ── */}
                    {recentOrders?.length > 0 ? (
                        <View>
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
                                    delay={350 + i * 40}
                                    onPress={() => navigation.navigate('Orders', { orderId: order._id })}
                                />
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyBox}>
                            <Ionicons name="file-tray-outline" size={40} color={theme.colors.textMuted} />
                            <Text style={[styles.errorText, { color: theme.colors.textPrimary, marginTop: 8 }]}>No orders match these filters</Text>
                            <Text style={[styles.errorSub, { color: theme.colors.textMuted }]}>Try a wider date range or clear some filters.</Text>
                            <TouchableOpacity
                                onPress={() => setFilters(DEFAULT_FILTERS)}
                                activeOpacity={0.8}
                                style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
                            >
                                <Text style={styles.retryText}>Reset Filters</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {loading && data && (
                    <View style={styles.loadingOverlay} pointerEvents="none">
                        <ActivityIndicator color={theme.colors.primary} />
                    </View>
                )}
            </ScrollView>

            <DashboardFilterSheet
                visible={sheetOpen}
                filters={filters}
                options={options}
                onApply={(next) => { setFilters(next); setSheetOpen(false); }}
                onClose={() => setSheetOpen(false)}
            />
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
    kpiGrid: { gap: 10 },
    kpiRow: { flexDirection: 'row', gap: 10 },
    sectionCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
    loadingText: { fontSize: 14, fontWeight: '500', marginTop: 8 },
    errorText: { fontSize: 18, fontWeight: '800', marginTop: 12, textAlign: 'center' },
    errorSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
    retryBtn: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
    retryText: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 10, backgroundColor: 'rgba(239,68,68,0.08)' },
    emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 6 },
    loadingOverlay: { position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center' },
});