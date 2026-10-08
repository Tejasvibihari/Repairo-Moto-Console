import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import DutyStatusCard from '../../../components/employee/DutyStatusCard';
import AttendanceCard from '../../../components/employee/AttendanceCard';
import { employeeDashboardService } from '../../../services/employeeDashboardService';
import { fmtDuration } from '../../../utils/attendanceUtils';
import {
    ATTENDANCE_STATE,
    AttendanceSummary,
    Chip,
    DistanceSummary,
    EmptyNote,
    OrderRow,
    WeekChart,
    fmtKm,
} from '../../../components/employee/dashboard/DashboardWidgets';

// ── Stat cards (values come from the server: Utils/employeeStats.js) ───────────
const todayCards = (d) => {
    const o = d.orders;
    const att = d.attendance?.today;
    const tracked = !!d.distance;
    return [
        { key: 'jobsToday', label: 'Jobs Today', icon: 'calendar-outline', color: '#e2a731', value: `${o.scheduledTodayDone}/${o.scheduledToday}`, sub: 'finished' },
        { key: 'worked', label: 'Worked Today', icon: 'time-outline', color: '#3B82F6', value: fmtDuration(att?.workedMinutes), sub: (ATTENDANCE_STATE[att?.state] || ATTENDANCE_STATE.not_marked).label },
        tracked
            ? { key: 'kmToday', label: 'Distance Today', icon: 'speedometer-outline', color: '#8B5CF6', value: fmtKm(d.distance.todayKm), sub: `${d.distance.todayTrips} trip${d.distance.todayTrips === 1 ? '' : 's'}` }
            : { key: 'needs', label: 'Needs Mechanic', icon: 'person-add-outline', color: '#8B5CF6', value: d.team?.needsMechanic ?? 0, sub: 'new bookings' },
        { key: 'doneToday', label: 'Done Today', icon: 'checkmark-done-outline', color: '#2ECC9A', value: o.completedToday, sub: `${o.completedMonth} this month` },
    ];
};

const orderCards = (o) => [
    { key: 'total', label: 'Total Orders', icon: 'receipt-outline', color: '#e2a731', value: o.total },
    { key: 'pending', label: 'Pending', icon: 'hourglass-outline', color: '#F59E0B', value: o.pending },
    { key: 'open', label: 'In Progress', icon: 'construct-outline', color: '#3B82F6', value: o.open },
    { key: 'done', label: 'Completed', icon: 'checkmark-circle-outline', color: '#2ECC9A', value: o.completed },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline', color: '#FF6B6B', value: o.cancelled },
    { key: 'overdue', label: 'Overdue', icon: 'alarm-outline', color: '#FF6B6B', value: o.overdue, sub: 'past booking date' },
];

// ── Animated stat card ─────────────────────────────────────────────────────────
function StatCard({ config, value, sub, theme, isDark, index }) {
    const translateY = useRef(new Animated.Value(20)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.85)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 350,
                delay: index * 80,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                speed: 16,
                bounciness: 6,
                delay: index * 80,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                speed: 16,
                bounciness: 6,
                delay: index * 80,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                cardStyles.card,
                {
                    backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity,
                    transform: [{ translateY }, { scale: scaleAnim }],
                    ...theme.shadow.soft,
                },
            ]}
        >
            {/* Icon circle */}
            <View style={[cardStyles.iconCircle, { backgroundColor: `${config.color}18` }]}>
                <Ionicons name={config.icon} size={22} color={config.color} />
            </View>

            {/* Value */}
            <Text style={[cardStyles.value, { color: theme.colors.textPrimary }]}>
                {value ?? '—'}
            </Text>

            {/* Label */}
            <Text style={[cardStyles.label, { color: theme.colors.textMuted }]}>
                {config.label}
            </Text>
            {sub ? (
                <Text style={[cardStyles.sub, { color: theme.colors.textMuted }]} numberOfLines={1}>
                    {sub}
                </Text>
            ) : null}

            {/* Bottom accent bar */}
            <View style={[cardStyles.accentBar, { backgroundColor: config.color }]} />
        </Animated.View>
    );
}

const cardStyles = StyleSheet.create({
    card: {
        width: '47%',
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        alignItems: 'flex-start',
        gap: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    value: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
        lineHeight: 32,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    sub: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: -4,
    },
    accentBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
    },
});

// ── Quick action button ────────────────────────────────────────────────────────
function QuickAction({ icon, label, onPress, theme, isDark, delay = 0 }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(-16)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
            Animated.spring(translateX, { toValue: 0, speed: 18, bounciness: 4, delay, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity, transform: [{ translateX }] }}>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.78}
                style={[
                    actionStyles.btn,
                    {
                        backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow,
                        borderColor: theme.colors.border,
                    },
                ]}
            >
                <View style={[actionStyles.iconWrap, { backgroundColor: `${theme.colors.primary}18` }]}>
                    <Ionicons name={icon} size={18} color={theme.colors.primary} />
                </View>
                <Text style={[actionStyles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
        </Animated.View>
    );
}

const actionStyles = StyleSheet.create({
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 10,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.1,
    },
});

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, theme }) {
    return (
        <Text style={[sectionStyles.title, { color: theme.colors.textSecondary }]}>
            {title}
        </Text>
    );
}

const sectionStyles = StyleSheet.create({
    title: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 10,
        marginTop: 4,
    },
});

// ── Skeleton loader ────────────────────────────────────────────────────────────
function SkeletonCard({ theme, isDark }) {
    const pulseAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                skeletonStyles.card,
                {
                    backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow,
                    borderColor: theme.colors.border,
                    opacity: pulseAnim,
                },
            ]}
        />
    );
}

const skeletonStyles = StyleSheet.create({
    card: {
        width: '47%',
        height: 130,
        borderRadius: 18,
        borderWidth: 1,
    },
});

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function EmployeeDashboardScreen() {
    const navigation = useNavigation();
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    const user = useSelector((s) => s.auth.user);

    const [dash, setDash] = useState(null);       // full dashboard from /overview
    const [legacy, setLegacy] = useState(null);   // order counts only (server not updated yet)
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const hasData = useRef(false);

    const fetchDashboard = useCallback(async () => {
        try {
            setError(null);
            const res = await employeeDashboardService.overview();
            if (res.success) {
                hasData.current = true;
                setDash(res.data);
                setLegacy(null);
            } else if (!hasData.current) {
                setError(res.message || 'Failed to load data.');
            }
        } catch (err) {
            if (err.response?.status === 404) {
                // Older server without /overview → still show the (now correct) order counts.
                try {
                    const res = await employeeDashboardService.orderCounts();
                    if (res.success) {
                        hasData.current = true;
                        setDash(null);
                        setLegacy(res.data);
                        return;
                    }
                } catch (_) { /* fall through to the error below */ }
            }
            // A failed background refresh keeps the numbers already on screen.
            if (!hasData.current) setError(err.response?.data?.message || 'Failed to load dashboard.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Refresh whenever the tab comes back into view, so numbers never go stale after
    // finishing an order or marking attendance.
    useFocusEffect(
        useCallback(() => {
            fetchDashboard();
        }, [fetchDashboard])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboard();
    }, [fetchDashboard]);

    const openOrder = useCallback(
        (order) => navigation.navigate('EmployeeOrderDetail', { orderId: order._id }),
        [navigation]
    );

    const tracked = !!dash?.distance;
    const o = dash?.orders;

    const grid = (cards, startIndex = 0) => (
        <View style={styles.grid}>
            {cards.map((cfg, i) => (
                <StatCard
                    key={cfg.key}
                    config={cfg}
                    value={cfg.value}
                    sub={cfg.sub}
                    theme={theme}
                    isDark={isDark}
                    index={startIndex + i}
                />
            ))}
        </View>
    );

    const skeleton = (
        <View style={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} theme={theme} isDark={isDark} />
            ))}
        </View>
    );

    return (
        <TabScreenWrapper greeting="Dashboard" showBookingIcon={false} showMenuIcon={true}>
            <ScrollView
                style={[styles.root, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.colors.primary]}
                        tintColor={theme.colors.primary}
                    />
                }
            >
                {/* ── Mark attendance (only until today's attendance is marked) ── */}
                <AttendanceCard theme={theme} onStateChange={fetchDashboard} />

                {/* ── Online / Offline status — mechanics + delivery partners; follows attendance ── */}
                {['mechanic', 'delivery'].includes(user?.position) && <DutyStatusCard theme={theme} />}

                {loading && !refreshing ? (
                    <>
                        <SectionHeader title="Today" theme={theme} />
                        {skeleton}
                    </>
                ) : error ? (
                    <>
                        <SectionHeader title="Overview" theme={theme} />
                        <View style={[styles.errorBox, { backgroundColor: `${theme.colors.error}12`, borderColor: `${theme.colors.error}30` }]}>
                            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error} />
                            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                            <TouchableOpacity onPress={fetchDashboard} activeOpacity={0.8}>
                                <Text style={[styles.retryText, { color: theme.colors.primary }]}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : legacy ? (
                    <>
                        <SectionHeader title="Orders" theme={theme} />
                        {grid([
                            { key: 'total', label: 'Total Orders', icon: 'receipt-outline', color: '#e2a731', value: legacy.totalOrders },
                            { key: 'open', label: 'In Progress', icon: 'construct-outline', color: '#3B82F6', value: legacy.inProgressOrders },
                            { key: 'done', label: 'Completed', icon: 'checkmark-circle-outline', color: '#2ECC9A', value: legacy.completedOrders },
                            { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline', color: '#FF6B6B', value: legacy.cancelledOrders },
                        ])}
                    </>
                ) : dash ? (
                    <>
                        {/* ── Today ── */}
                        <SectionHeader title="Today" theme={theme} />
                        {grid(todayCards(dash))}

                        {/* ── Orders ── */}
                        <SectionHeader title="Orders" theme={theme} />
                        {grid(orderCards(o), 4)}
                        <View style={styles.chipRow}>
                            {dash.rating ? (
                                <Chip icon="star" color="#e2a731" theme={theme}
                                    text={dash.rating.count ? `${dash.rating.average.toFixed(1)} rating · ${dash.rating.count} review${dash.rating.count === 1 ? '' : 's'}` : 'No reviews yet'} />
                            ) : null}
                            <Chip icon="trending-up-outline" color="#2ECC9A" theme={theme} text={`${o.completionPct}% completion`} />
                            {o.cancelledMonth > 0 ? (
                                <Chip icon="close-circle-outline" color="#FF6B6B" theme={theme} text={`${o.cancelledMonth} cancelled this month`} />
                            ) : null}
                        </View>

                        {/* ── Attendance ── */}
                        <SectionHeader title="Attendance" theme={theme} />
                        <AttendanceSummary attendance={dash.attendance} theme={theme} />

                        {/* ── Distance (mechanic / delivery) ── */}
                        {tracked ? (
                            <>
                                <SectionHeader title="Distance Travelled" theme={theme} />
                                <DistanceSummary distance={dash.distance} theme={theme} />
                            </>
                        ) : null}

                        {/* ── Last 7 days ── */}
                        <SectionHeader title="Last 7 Days" theme={theme} />
                        <WeekChart week={dash.week} tracked={tracked} theme={theme} />

                        {/* ── Upcoming jobs ── */}
                        <SectionHeader title="Upcoming · Next 7 Days" theme={theme} />
                        {dash.upcoming?.length ? (
                            dash.upcoming.map((ord) => <OrderRow key={ord._id} order={ord} theme={theme} onPress={openOrder} />)
                        ) : (
                            <EmptyNote text="Nothing scheduled in the next 7 days." theme={theme} />
                        )}

                        {/* ── Recent activity ── */}
                        <SectionHeader title="Recent Activity" theme={theme} />
                        {dash.recent?.length ? (
                            dash.recent.map((ord) => <OrderRow key={ord._id} order={ord} theme={theme} onPress={openOrder} />)
                        ) : (
                            <EmptyNote text="No orders yet." theme={theme} />
                        )}
                    </>
                ) : null}

                {/* ── Quick actions ── */}
                <View style={{ height: 8 }} />
                <SectionHeader title="Quick Actions" theme={theme} />

                <QuickAction
                    icon="receipt-outline"
                    label="My Orders"
                    theme={theme}
                    isDark={isDark}
                    delay={200}
                    onPress={() => navigation.navigate('Orders')}
                />
            </ScrollView>
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 120,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
    },
    greeting: {
        fontSize: 13,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginTop: 2,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 28,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: -12,
        marginBottom: 24,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 28,
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
    },
    retryText: {
        fontSize: 13,
        fontWeight: '700',
    },
});