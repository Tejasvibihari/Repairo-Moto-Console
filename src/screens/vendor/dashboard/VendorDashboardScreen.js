import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import { LightTheme, DarkTheme } from '../../../styles/Theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Animated counter ─────────────────────────────────────────────────────────
const AnimatedNumber = ({ value, prefix = '', suffix = '', style }) => {
    const anim = useRef(new Animated.Value(0)).current;
    const [display, setDisplay] = useState('0');

    useEffect(() => {
        anim.setValue(0);
        Animated.timing(anim, {
            toValue: value,
            duration: 1200,
            useNativeDriver: false,
        }).start();
        const listener = anim.addListener(({ value: v }) => {
            setDisplay(Math.floor(v).toLocaleString('en-IN'));
        });
        return () => anim.removeListener(listener);
    }, [value]);

    return (
        <Text style={style}>{prefix}{display}{suffix}</Text>
    );
};

// ─── Staggered entrance hook ──────────────────────────────────────────────────
const useStagger = (count, delay = 80, baseDelay = 100) => {
    const anims = useRef(
        Array.from({ length: count }, () => ({
            opacity: new Animated.Value(0),
            translateY: new Animated.Value(20),
        }))
    ).current;

    useEffect(() => {
        const animations = anims.map((a, i) =>
            Animated.parallel([
                Animated.timing(a.opacity, {
                    toValue: 1,
                    duration: 380,
                    delay: baseDelay + i * delay,
                    useNativeDriver: true,
                }),
                Animated.spring(a.translateY, {
                    toValue: 0,
                    speed: 18,
                    bounciness: 4,
                    delay: baseDelay + i * delay,
                    useNativeDriver: true,
                }),
            ])
        );
        Animated.parallel(animations).start();
    }, []);

    return anims;
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, prefix, suffix, accentColor, accentBg, theme, anim }) => (
    <Animated.View style={[
        statStyles.card,
        {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: accentColor,
            opacity: anim.opacity,
            transform: [{ translateY: anim.translateY }],
        },
    ]}>
        <View style={[statStyles.iconWrap, { backgroundColor: accentBg }]}>
            <Ionicons name={icon} size={20} color={accentColor} />
        </View>
        <AnimatedNumber
            value={value}
            prefix={prefix}
            suffix={suffix}
            style={[statStyles.value, { color: accentColor }]}
        />
        <Text style={[statStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
    </Animated.View>
);

const statStyles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        alignItems: 'flex-start',
        gap: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 4,
    },
    iconWrap: {
        width: 38, height: 38, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center',
    },
    value: { fontSize: 22, fontWeight: '900', letterSpacing: 0.2 },
    label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
});

// ─── Quick action button ──────────────────────────────────────────────────────
const QuickAction = ({ icon, label, onPress, accentColor, accentBg, theme, anim }) => (
    <Animated.View style={[{ opacity: anim.opacity, transform: [{ translateY: anim.translateY }] }]}>
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            style={[qaStyles.btn, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: accentColor,
            }]}
        >
            <View style={[qaStyles.iconCircle, { backgroundColor: accentBg }]}>
                <Ionicons name={icon} size={22} color={accentColor} />
            </View>
            <Text style={[qaStyles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
        </TouchableOpacity>
    </Animated.View>
);

const qaStyles = StyleSheet.create({
    btn: {
        alignItems: 'center', gap: 8, padding: 14,
        borderRadius: 18, borderWidth: 1, flex: 1,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
    },
    iconCircle: {
        width: 48, height: 48, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    label: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.2, textAlign: 'center' },
});

// ─── Recent order row ─────────────────────────────────────────────────────────
const OrderRow = ({ order, theme, onPress, anim }) => {
    const statusColors = {
        pending: { text: '#9E8E78', bg: 'rgba(158,142,120,0.12)' },
        in_progress: { text: '#E2A731', bg: 'rgba(226,167,49,0.12)' },
        completed: { text: '#2ECC9A', bg: 'rgba(46,204,154,0.12)' },
        cancelled: { text: '#FF6B6B', bg: 'rgba(255,107,107,0.12)' },
    };
    const s = (order.status || 'pending').toLowerCase().replace(/\s+/g, '_');
    const sc = statusColors[s] || statusColors.pending;

    return (
        <Animated.View style={{ opacity: anim.opacity, transform: [{ translateY: anim.translateY }] }}>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.75}
                style={[orderRowStyles.row, {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                }]}
            >
                <View style={[orderRowStyles.iconWrap, { backgroundColor: `${theme.colors.primary}18` }]}>
                    <Ionicons name="construct-outline" size={16} color={theme.colors.primary} />
                </View>
                <View style={orderRowStyles.info}>
                    <Text style={[orderRowStyles.orderId, { color: theme.colors.textPrimary }]}>
                        {order.orderId || '#—'}
                    </Text>
                    <Text style={[orderRowStyles.bike, { color: theme.colors.textMuted }]} numberOfLines={1}>
                        {[order.selectedBrand, order.selectedModel].filter(Boolean).join(' ') || 'Unknown bike'}
                    </Text>
                </View>
                <View style={[orderRowStyles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[orderRowStyles.badgeTxt, { color: sc.text }]}>
                        {order.status || 'Pending'}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
        </Animated.View>
    );
};

const orderRowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 13, borderRadius: 14, borderWidth: 1, marginBottom: 8,
    },
    iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1, gap: 2 },
    orderId: { fontSize: 13, fontWeight: '800' },
    bike: { fontSize: 11.5, fontWeight: '500' },
    badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
    badgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
});

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, actionLabel, onAction, theme }) => (
    <View style={shStyles.row}>
        <Text style={[shStyles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        {actionLabel && (
            <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
                <Text style={[shStyles.action, { color: theme.colors.primary }]}>{actionLabel}</Text>
            </TouchableOpacity>
        )}
    </View>
);

const shStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    title: { fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
    action: { fontSize: 12.5, fontWeight: '700' },
});

// ─── Welcome banner ───────────────────────────────────────────────────────────
const WelcomeBanner = ({ vendorName, theme, anim }) => (
    <Animated.View style={[{ opacity: anim.opacity, transform: [{ translateY: anim.translateY }], marginBottom: 20 }]}>
        <LinearGradient
            colors={['#e2a731', '#c98a18']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={bannerStyles.gradient}
        >
            {/* Decorative circles */}
            <View style={bannerStyles.circleA} />
            <View style={bannerStyles.circleB} />

            <View style={bannerStyles.content}>
                <View style={bannerStyles.topRow}>
                    <View style={bannerStyles.iconWrap}>
                        <MaterialCommunityIcons name="handshake-outline" size={22} color="#fff" />
                    </View>
                    <View style={[bannerStyles.pill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Text style={bannerStyles.pillTxt}>VENDOR PARTNER</Text>
                    </View>
                </View>

                <Text style={bannerStyles.greeting}>
                    Welcome aboard,{'\n'}
                    <Text style={bannerStyles.name}>{vendorName}! 🎉</Text>
                </Text>

                <Text style={bannerStyles.body}>
                    Thank you for joining the{' '}
                    <Text style={bannerStyles.brand}>REPAIRO MOTO</Text>
                    {' '}family. Your partnership helps thousands of riders get back on the road faster. We're thrilled to have you with us.
                </Text>

                <View style={bannerStyles.divider} />

                <View style={bannerStyles.tagRow}>
                    {['Trusted Partner', '24/7 Support', 'Fast Payments'].map((tag, i) => (
                        <View key={i} style={bannerStyles.tag}>
                            <Ionicons name="checkmark-circle" size={11} color="rgba(255,255,255,0.9)" />
                            <Text style={bannerStyles.tagTxt}>{tag}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </LinearGradient>
    </Animated.View>
);

const bannerStyles = StyleSheet.create({
    gradient: {
        borderRadius: 22, overflow: 'hidden', padding: 22,
        shadowColor: '#e2a731',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 10,
    },
    circleA: {
        position: 'absolute', width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.08)', top: -40, right: -30,
    },
    circleB: {
        position: 'absolute', width: 90, height: 90, borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.06)', bottom: -20, right: 60,
    },
    content: { gap: 12 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconWrap: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    pillTxt: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1.2 },
    greeting: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)', lineHeight: 22 },
    name: { fontSize: 22, fontWeight: '900', color: '#fff' },
    body: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.82)', lineHeight: 20 },
    brand: { fontWeight: '900', color: '#fff' },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.2)' },
    tagRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    tagTxt: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
});

// ─── Tip card ─────────────────────────────────────────────────────────────────
const TipCard = ({ icon, title, body, theme, accentColor, accentBg }) => (
    <View style={[tipStyles.card, {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
    }]}>
        <View style={[tipStyles.iconWrap, { backgroundColor: accentBg }]}>
            <Ionicons name={icon} size={18} color={accentColor} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
            <Text style={[tipStyles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
            <Text style={[tipStyles.body, { color: theme.colors.textMuted }]}>{body}</Text>
        </View>
    </View>
);

const tipStyles = StyleSheet.create({
    card: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8,
    },
    iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    title: { fontSize: 13, fontWeight: '800' },
    body: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const VendorDashboardScreen = () => {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const user = useSelector((s) => s.auth?.user);

    const vendorName = user?.firstName || user?.name || 'Partner';

    // Mock stats — replace with real API data
    const stats = {
        totalOrders: 48,
        pendingOrders: 5,
        revenue: 124500,
        rating: 4,
    };

    // Mock recent orders — replace with real API data
    const recentOrders = [
        { orderId: 'ORD-170425-001', selectedBrand: 'Royal Enfield', selectedModel: 'Classic 350', status: 'In Progress' },
        { orderId: 'ORD-170425-002', selectedBrand: 'Honda', selectedModel: 'CB Shine', status: 'Pending' },
        { orderId: 'ORD-160425-018', selectedBrand: 'Bajaj', selectedModel: 'Pulsar 150', status: 'Completed' },
    ];

    // 9 animated items: banner(0), 4 stats(1-4), 4 quick actions(5-8)
    const anims = useStagger(14, 70, 80);

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <TabScreenWrapper
            showBookingIcon={false}
            showMenuIcon={true}
            greeting={`${getGreeting()}, ${vendorName} 👋`}
        >
            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingBottom: 32 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Welcome Banner ── */}
                <WelcomeBanner vendorName={vendorName} theme={theme} anim={anims[0]} />

                {/* ── Stats Row 1 ── */}
                {/* <Animated.View style={[styles.row, { opacity: anims[1].opacity, transform: [{ translateY: anims[1].translateY }] }]}>
                    <StatCard
                        icon="cube-outline"
                        label="Total Orders"
                        value={stats.totalOrders}
                        accentColor="#3498DB"
                        accentBg="rgba(52,152,219,0.12)"
                        theme={theme}
                        anim={{ opacity: new Animated.Value(1), translateY: new Animated.Value(0) }}
                    />
                    <View style={{ width: 10 }} />
                    <StatCard
                        icon="time-outline"
                        label="Pending"
                        value={stats.pendingOrders}
                        accentColor="#E2A731"
                        accentBg="rgba(226,167,49,0.12)"
                        theme={theme}
                        anim={{ opacity: new Animated.Value(1), translateY: new Animated.Value(0) }}
                    />
                </Animated.View> */}

                {/* ── Stats Row 2 ── */}
                {/* <Animated.View style={[styles.row, { marginTop: 10, opacity: anims[2].opacity, transform: [{ translateY: anims[2].translateY }] }]}>
                    <StatCard
                        icon="cash-outline"
                        label="Revenue"
                        value={stats.revenue}
                        prefix="₹"
                        accentColor="#2ECC9A"
                        accentBg="rgba(46,204,154,0.12)"
                        theme={theme}
                        anim={{ opacity: new Animated.Value(1), translateY: new Animated.Value(0) }}
                    />
                    <View style={{ width: 10 }} />
                    <StatCard
                        icon="star-outline"
                        label="Rating"
                        value={stats.rating}
                        suffix=" / 5"
                        accentColor="#9B59B6"
                        accentBg="rgba(155,89,182,0.12)"
                        theme={theme}
                        anim={{ opacity: new Animated.Value(1), translateY: new Animated.Value(0) }}
                    />
                </Animated.View> */}

                {/* ── Quick Actions ── */}
                {/* <View style={styles.section}>
                    <Animated.View style={{ opacity: anims[3].opacity, transform: [{ translateY: anims[3].translateY }] }}>
                        <SectionHeader title="Quick Actions" theme={theme} />
                    </Animated.View>
                    <View style={styles.row}>
                        <QuickAction
                            icon="receipt-outline"
                            label="My Orders"
                            accentColor="#3498DB"
                            accentBg="rgba(52,152,219,0.12)"
                            theme={theme}
                            anim={anims[4]}
                            onPress={() => { }}
                        />
                        <View style={{ width: 10 }} />
                        <QuickAction
                            icon="construct-outline"
                            label="Parts Catalog"
                            accentColor="#E2A731"
                            accentBg="rgba(226,167,49,0.12)"
                            theme={theme}
                            anim={anims[5]}
                            onPress={() => { }}
                        />
                        <View style={{ width: 10 }} />
                        <QuickAction
                            icon="wallet-outline"
                            label="Payments"
                            accentColor="#2ECC9A"
                            accentBg="rgba(46,204,154,0.12)"
                            theme={theme}
                            anim={anims[6]}
                            onPress={() => { }}
                        />
                        <View style={{ width: 10 }} />
                        <QuickAction
                            icon="headset-outline"
                            label="Support"
                            accentColor="#9B59B6"
                            accentBg="rgba(155,89,182,0.12)"
                            theme={theme}
                            anim={anims[7]}
                            onPress={() => { }}
                        />
                    </View>
                </View> */}

                {/* ── Recent Orders ── */}
                {/* <View style={styles.section}>
                    <Animated.View style={{ opacity: anims[8].opacity, transform: [{ translateY: anims[8].translateY }] }}>
                        <SectionHeader title="Recent Orders" actionLabel="View All" theme={theme} onAction={() => { }} />
                    </Animated.View>
                    {recentOrders.length === 0 ? (
                        <Animated.View style={[
                            styles.emptyBox,
                            {
                                backgroundColor: theme.colors.surfaceLow,
                                borderColor: theme.colors.border,
                                opacity: anims[9].opacity,
                                transform: [{ translateY: anims[9].translateY }],
                            },
                        ]}>
                            <Ionicons name="cube-outline" size={32} color={theme.colors.textMuted} />
                            <Text style={[styles.emptyTxt, { color: theme.colors.textMuted }]}>
                                No orders yet. New orders will appear here.
                            </Text>
                        </Animated.View>
                    ) : (
                        recentOrders.map((order, i) => (
                            <OrderRow
                                key={order.orderId}
                                order={order}
                                theme={theme}
                                onPress={() => { }}
                                anim={anims[9 + i]}
                            />
                        ))
                    )}
                </View> */}

                {/* ── Getting Started Tips ── */}
                {/* <View style={styles.section}>
                    <Animated.View style={{ opacity: anims[12].opacity, transform: [{ translateY: anims[12].translateY }] }}>
                        <SectionHeader title="Getting Started" theme={theme} />
                    </Animated.View>
                    <Animated.View style={{ opacity: anims[13].opacity, transform: [{ translateY: anims[13].translateY }] }}>
                        <TipCard
                            icon="checkmark-circle-outline"
                            title="Complete Your Profile"
                            body="Add your shop details, GST number, and bank account to start receiving payments."
                            theme={theme}
                            accentColor="#2ECC9A"
                            accentBg="rgba(46,204,154,0.12)"
                        />
                        <TipCard
                            icon="cube-outline"
                            title="Add Your Parts Inventory"
                            body="List the parts you carry so mechanics can request them directly from you."
                            theme={theme}
                            accentColor="#3498DB"
                            accentBg="rgba(52,152,219,0.12)"
                        />
                        <TipCard
                            icon="notifications-outline"
                            title="Enable Notifications"
                            body="Stay on top of new order requests and updates in real time."
                            theme={theme}
                            accentColor="#E2A731"
                            accentBg="rgba(226,167,49,0.12)"
                        />
                    </Animated.View>
                </View> */}

                {/* ── Footer note ── */}
                <Animated.View style={[
                    styles.footerCard,
                    {
                        backgroundColor: theme.colors.surfaceLow,
                        borderColor: theme.colors.border,
                        opacity: anims[13].opacity,
                    },
                ]}>
                    <MaterialCommunityIcons name="shield-check-outline" size={18} color={theme.colors.primary} />
                    <Text style={[styles.footerTxt, { color: theme.colors.textMuted }]}>
                        Your partnership is secured and verified by{' '}
                        <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>REPAIRO MOTO</Text>.
                        Reach support anytime from the menu.
                    </Text>
                </Animated.View>
            </ScrollView>
        </TabScreenWrapper>
    );
};

export default VendorDashboardScreen;

const styles = StyleSheet.create({
    scroll: {
        paddingHorizontal: 16,
        paddingTop: 18,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    section: {
        marginTop: 24,
    },
    emptyBox: {
        alignItems: 'center', gap: 10, padding: 28,
        borderRadius: 16, borderWidth: 1, borderStyle: 'dashed',
    },
    emptyTxt: {
        fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 19,
    },
    footerCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        marginTop: 28, padding: 14, borderRadius: 14, borderWidth: 1,
    },
    footerTxt: {
        flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 18,
    },
});