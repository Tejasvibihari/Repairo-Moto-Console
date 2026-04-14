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
import { LightTheme, DarkTheme } from '../../../styles/Theme';

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    'Pending': { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'time-outline' },
    'In Progress': { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: 'construct-outline' },
    'Mechanic Assigned': { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'person-outline' },
    'Completed': { color: '#2ECC9A', bg: 'rgba(46,204,154,0.12)', icon: 'checkmark-circle-outline' },
    'Invoice Generated': { color: '#e2a731', bg: 'rgba(226,167,49,0.12)', icon: 'receipt-outline' },
    'Cancelled': { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', icon: 'close-circle-outline' },
};

// ─── VendorOrderCard ──────────────────────────────────────────────────────────
export default function VendorOrderCard({ order, onPress, index = 0 }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    const translateY = useRef(new Animated.Value(16)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 260,
                delay: index * 60,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                speed: 20,
                bounciness: 4,
                delay: index * 60,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['Pending'];

    const formattedDate = order.preferredDate
        ? new Date(order.preferredDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        : '—';

    const vehicleLabel = [order.selectedBrand, order.selectedModel, order.cc ? `${order.cc}cc` : '']
        .filter(Boolean)
        .join(' · ');

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            <TouchableOpacity
                onPress={() => onPress?.(order)}
                activeOpacity={0.78}
                style={[
                    styles.card,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        shadowColor: theme.colors.primary,
                    },
                ]}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={[styles.orderId, { color: theme.colors.primary }]}>
                            #{order.orderId}
                        </Text>
                        <Text style={[styles.orderDate, { color: theme.colors.textMuted }]}>
                            {formattedDate} · {order.preferredTime}
                        </Text>
                    </View>

                    {/* Status Badge */}
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Ionicons name={statusCfg.icon} size={11} color={statusCfg.color} />
                        <Text style={[styles.statusText, { color: statusCfg.color }]}>
                            {order.status}
                        </Text>
                    </View>
                </View>

                {/* ── Divider ── */}
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                {/* ── Customer Info (only name and city, no phone) ── */}
                <View style={styles.section}>
                    <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={14} color={theme.colors.textMuted} />
                        <Text style={[styles.infoText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                            {order.name}
                        </Text>
                        <Text style={[styles.infoCity, { color: theme.colors.textMuted }]}>
                            · {order.city}
                        </Text>
                    </View>
                </View>

                {/* ── Vehicle ── */}
                <View
                    style={[
                        styles.vehicleChip,
                        { backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow },
                    ]}
                >
                    <Ionicons name="bicycle" size={13} color={theme.colors.primary} />
                    <Text style={[styles.vehicleText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {vehicleLabel}
                    </Text>
                    {order.serviceType === 'Emergency Repair' && (
                        <View style={styles.emergencyBadge}>
                            <Ionicons name="flash" size={10} color="#FF6B6B" />
                            <Text style={styles.emergencyText}>Emergency</Text>
                        </View>
                    )}
                </View>

                {/* ── Service Team (Mechanic + Delivery) ── */}
                <View style={styles.serviceTeamContainer}>
                    {/* Mechanic */}
                    <View style={styles.teamRow}>
                        <Ionicons name="construct-outline" size={14} color={theme.colors.primary} />
                        <View style={styles.teamDetails}>
                            <Text style={[styles.teamLabel, { color: theme.colors.textMuted }]}>Mechanic</Text>
                            <Text style={[styles.teamName, { color: theme.colors.textPrimary }]}>
                                {order.assignedMechanic || 'Not assigned'}
                            </Text>
                            {order.mechanicPhone && (
                                <Text style={[styles.teamPhone, { color: theme.colors.textSecondary }]}>
                                    {order.mechanicPhone}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Delivery Person */}
                    <View style={styles.teamRow}>
                        <Ionicons name="bicycle-outline" size={14} color={theme.colors.primary} />
                        <View style={styles.teamDetails}>
                            <Text style={[styles.teamLabel, { color: theme.colors.textMuted }]}>Delivery</Text>
                            <Text style={[styles.teamName, { color: theme.colors.textPrimary }]}>
                                {order.assignedDelivery || 'Not assigned'}
                            </Text>
                            {order.deliveryPhone && (
                                <Text style={[styles.teamPhone, { color: theme.colors.textSecondary }]}>
                                    {order.deliveryPhone}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* ── Footer (only chevron, no payment) ── */}
                <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                    <View style={styles.footerSpacer} />
                    <Ionicons name="chevron-forward" size={15} color={theme.colors.textMuted} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 10,
    },
    headerLeft: { flex: 1, marginRight: 10 },
    orderId: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    orderDate: {
        fontSize: 11,
        letterSpacing: 0.2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 14,
    },
    section: {
        paddingHorizontal: 14,
        paddingTop: 10,
        gap: 5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        fontSize: 13,
        fontWeight: '600',
    },
    infoCity: {
        fontSize: 12,
    },
    vehicleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 14,
        marginTop: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
    },
    vehicleText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
        letterSpacing: 0.1,
    },
    emergencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(255,107,107,0.12)',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 8,
    },
    emergencyText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FF6B6B',
        letterSpacing: 0.2,
    },
    serviceTeamContainer: {
        marginHorizontal: 14,
        marginTop: 12,
        gap: 12,
    },
    teamRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    teamDetails: {
        flex: 1,
        gap: 2,
    },
    teamLabel: {
        fontSize: 10,
        fontWeight: '500',
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    teamName: {
        fontSize: 13,
        fontWeight: '600',
    },
    teamPhone: {
        fontSize: 12,
        fontWeight: '400',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    footerSpacer: {
        flex: 1,
    },
});