import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../../styles/Theme'; // adjust path as needed
import { callNumber, digitsOnly } from '../../../utils/phoneUtils';

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    'Pending': { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'time-outline' },
    'In Progress': { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: 'construct-outline' },
    'Mechanic Assigned': { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'person-outline' },
    'Completed': { color: '#2ECC9A', bg: 'rgba(46,204,154,0.12)', icon: 'checkmark-circle-outline' },
    'Invoice Generated': { color: '#e2a731', bg: 'rgba(226,167,49,0.12)', icon: 'document-text-outline' },
    'Cancelled': { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', icon: 'close-circle-outline' },
};

const SERVICE_TYPE_CONFIG = {
    'Emergency Repair': { color: '#FF6B6B', icon: 'flash-outline' },
    'Schedule Repair': { color: '#2ECC9A', icon: 'calendar-outline' },
};

function StatusBadge({ status, theme }) {
    const cfg = STATUS_CONFIG[status] || { color: theme.colors.textMuted, bg: theme.colors.surfaceLow, icon: 'ellipse-outline' };
    return (
        <View style={[cardStyles.badge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={11} color={cfg.color} />
            <Text style={[cardStyles.badgeText, { color: cfg.color }]}>{status}</Text>
        </View>
    );
}

export default function EmployeeOrderCard({ order, onPress, index = 0 }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    // Staggered entrance animation
    const translateY = useRef(new Animated.Value(24)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 320,
                delay: index * 60,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                speed: 18,
                bounciness: 5,
                delay: index * 60,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const serviceTypeCfg = SERVICE_TYPE_CONFIG[order.serviceType] || SERVICE_TYPE_CONFIG['Schedule Repair'];

    const formattedDate = order.preferredDate
        ? new Date(order.preferredDate).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
        })
        : '—';

    const servicesList = Array.isArray(order.services) && order.services.length > 0
        ? order.services.slice(0, 2).join(', ') + (order.services.length > 2 ? ` +${order.services.length - 2}` : '')
        : 'No services listed';

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => onPress?.(order)}
                style={[
                    cardStyles.card,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        ...theme.shadow.soft,
                    },
                ]}
            >
                {/* ── Header row ── */}
                <View style={cardStyles.headerRow}>
                    <View style={cardStyles.orderIdRow}>
                        <Text style={[cardStyles.orderId, { color: theme.colors.primary }]}>
                            #{order.orderId}
                        </Text>
                        <View style={[cardStyles.serviceTypePill, { backgroundColor: `${serviceTypeCfg.color}18` }]}>
                            <Ionicons name={serviceTypeCfg.icon} size={10} color={serviceTypeCfg.color} />
                            <Text style={[cardStyles.serviceTypeText, { color: serviceTypeCfg.color }]}>
                                {order.serviceType}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Divider ── */}
                <View style={[cardStyles.divider, { backgroundColor: theme.colors.border }]} />

                {/* ── Customer info + call button ── */}
                <View style={cardStyles.customerRow}>
                    <View style={[cardStyles.infoRow, { flex: 1 }]}>
                        <Ionicons name="person-outline" size={14} color={theme.colors.textMuted} />
                        <Text style={[cardStyles.infoText, { color: theme.colors.textPrimary, flexShrink: 1 }]} numberOfLines={1}>
                            {order.name}
                        </Text>
                        <Text style={[cardStyles.dot, { color: theme.colors.textMuted }]}>·</Text>
                        <Text style={[cardStyles.infoText, { color: theme.colors.textSecondary }]}>
                            {order.contactNo}
                        </Text>
                    </View>
                    {digitsOnly(order.contactNo).length >= 10 && (
                        // Its own touchable, so tapping it opens the dialer
                        // and does not open the order.
                        <TouchableOpacity
                            onPress={() => callNumber(order.contactNo)}
                            activeOpacity={0.8}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Call ${order.name || 'customer'}`}
                            style={[cardStyles.callBtn, { backgroundColor: theme.colors.primary }]}
                        >
                            <Ionicons name="call" size={16} color="#1a1a1a" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Bike info ── */}
                <View style={cardStyles.infoRow}>
                    <Ionicons name="bicycle" size={14} color={theme.colors.textMuted} />
                    <Text style={[cardStyles.infoText, { color: theme.colors.textPrimary }]}>
                        {order.selectedBrand} {order.selectedModel}
                    </Text>
                    {order.cc ? (
                        <>
                            <Text style={[cardStyles.dot, { color: theme.colors.textMuted }]}>·</Text>
                            <Text style={[cardStyles.infoText, { color: theme.colors.textSecondary }]}>
                                {order.cc} CC
                            </Text>
                        </>
                    ) : null}
                </View>

                {/* ── Services ── */}
                <View style={[cardStyles.servicesRow, { backgroundColor: isDark ? theme.colors.surfaceLow : theme.colors.surfaceLow }]}>
                    <Ionicons name="construct-outline" size={13} color={theme.colors.primary} />
                    <Text style={[cardStyles.servicesText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {servicesList}
                    </Text>
                </View>
                <View style={{ alignSelf: 'flex-start' }}>
                    <StatusBadge status={order.status} theme={theme} />
                </View>
                {/* ── Footer ── */}
                <View style={cardStyles.footer}>
                    <View style={cardStyles.footerLeft}>
                        <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} />
                        <Text style={[cardStyles.footerText, { color: theme.colors.textMuted }]}>
                            {formattedDate}
                        </Text>
                        <Text style={[cardStyles.dot, { color: theme.colors.textMuted }]}>·</Text>
                        <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
                        <Text style={[cardStyles.footerText, { color: theme.colors.textMuted }]}>
                            {order.preferredTime || '—'}
                        </Text>
                    </View>

                    <View style={cardStyles.chevronWrap}>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
        gap: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    orderIdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    orderId: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    serviceTypePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 20,
    },
    serviceTypeText: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    callBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    infoText: {
        fontSize: 13,
        fontWeight: '500',
    },
    dot: {
        fontSize: 14,
        fontWeight: '700',
    },
    servicesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
    },
    servicesText: {
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 12,
    },
    chevronWrap: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});