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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import axiosClient from '../../../services/axiosClient';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';

// ── Stat card config ───────────────────────────────────────────────────────────
const STAT_CARDS = [
    {
        key: 'totalOrders',
        label: 'Total Orders',
        icon: 'receipt-outline',
        color: '#e2a731',
    },
    {
        key: 'inProgressOrders',
        label: 'In Progress',
        icon: 'construct-outline',
        color: '#3B82F6',
    },
    {
        key: 'completedOrders',
        label: 'Completed',
        icon: 'checkmark-circle-outline',
        color: '#2ECC9A',
    },
    {
        key: 'cancelledOrders',
        label: 'Cancelled',
        icon: 'close-circle-outline',
        color: '#FF6B6B',
    },
];

// ── Animated stat card ─────────────────────────────────────────────────────────
function StatCard({ config, value, theme, isDark, index }) {
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
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
        lineHeight: 32,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
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
    const firstName = user?.firstName || user?.name?.split(' ')[0] || 'there';

    const [counts, setCounts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Header entrance animation
    const headerOpacity = useRef(new Animated.Value(0)).current;
    const headerTranslateY = useRef(new Animated.Value(-10)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(headerTranslateY, { toValue: 0, speed: 18, bounciness: 4, useNativeDriver: true }),
        ]).start();
    }, []);

    const fetchCounts = useCallback(async () => {
        try {
            setError(null);
            const { data } = await axiosClient.get('/api/admin/dashboard/order-counts');
            console.log(data);
            if (data.success) {
                setCounts(data.data);
            } else {
                setError(data.message || 'Failed to load data.');
            }
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || 'Failed to load dashboard.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCounts();
    }, [fetchCounts]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

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


                {/* ── Stats section ── */}
                <SectionHeader title="Overview" theme={theme} />

                {loading && !refreshing ? (
                    <View style={styles.grid}>
                        {[0, 1, 2, 3].map((i) => (
                            <SkeletonCard key={i} theme={theme} isDark={isDark} />
                        ))}
                    </View>
                ) : error ? (
                    <View style={[styles.errorBox, { backgroundColor: `${theme.colors.error}12`, borderColor: `${theme.colors.error}30` }]}>
                        <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error} />
                        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                        <TouchableOpacity onPress={fetchCounts} activeOpacity={0.8}>
                            <Text style={[styles.retryText, { color: theme.colors.primary }]}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {STAT_CARDS.map((cfg, i) => (
                            <StatCard
                                key={cfg.key}
                                config={cfg}
                                value={counts?.[cfg.key]}
                                theme={theme}
                                isDark={isDark}
                                index={i}
                            />
                        ))}
                    </View>
                )}

                {/* ── Quick actions ── */}
                <SectionHeader title="Quick Actions" theme={theme} />

                <QuickAction
                    icon="receipt-outline"
                    label="My Orders"
                    theme={theme}
                    isDark={isDark}
                    delay={200}
                    onPress={() => navigation.navigate('Orders')}
                />
                {/* <QuickAction
                    icon="person-outline"
                    label="My Profile"
                    theme={theme}
                    isDark={isDark}
                    delay={280}
                    onPress={() => navigation.navigate('Profile')}
                /> */}
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