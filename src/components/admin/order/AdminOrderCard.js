// src/components/admin/AdminOrderCard.js
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

// ─── Status config ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    pending: {
        label: 'Pending',
        bg: 'rgba(158,142,120,0.18)',
        text: '#9E8E78',
        dot: '#9E8E78'
    },
    in_progress: {
        label: 'In Progress',
        bg: 'rgba(226,167,49,0.18)',
        text: '#E2A731',
        dot: '#E2A731'
    },
    mechanic_assigned: {
        label: 'Mechanic Assigned',
        bg: 'rgba(52,152,219,0.18)',
        text: '#3498DB',
        dot: '#3498DB'
    },
    completed: {
        label: 'Completed',
        bg: 'rgba(46,204,154,0.18)',
        text: '#2ECC9A',
        dot: '#2ECC9A'
    },
    invoice_generated: {
        label: 'Invoice Generated',
        bg: 'rgba(155,89,182,0.18)',
        text: '#9B59B6',
        dot: '#9B59B6'
    },
    cancelled: {
        label: 'Cancelled',
        bg: 'rgba(255,107,107,0.18)',
        text: '#FF6B6B',
        dot: '#FF6B6B'
    },
};

const truncateText = (text = '', maxLength = 12) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
};

const getStatusConfig = (status = '') => {
    const key = status.toLowerCase().trim().replace(/\s+/g, '_');
    const config = STATUS_CONFIG[key] ?? STATUS_CONFIG.pending;
    return {
        ...config,
        shortLabel: truncateText(config.label, 12)
    };
};

// ─── Helper to format date ───────────────────────────────────────────────────
const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Helper for service type chip styling ─────────────────────────────────────
const getServiceChipStyle = (type) => {
    if (type === 'Schedule Repair') {
        return {
            label: 'Scheduled',
            icon: 'calendar-outline',
            bg: 'rgba(46,204,154,0.15)',    // muted green
            text: '#2ECC9A',
            border: 'rgba(46,204,154,0.3)'
        };
    }
    if (type === 'Emergency Repair') {
        return {
            label: 'Emergency',
            icon: 'alert-circle-outline',
            bg: 'rgba(255,107,107,0.15)',   // muted red
            text: '#FF6B6B',
            border: 'rgba(255,107,107,0.3)'
        };
    }
    return {
        label: type || '—',
        icon: 'help-circle-outline',
        bg: 'rgba(128,128,128,0.15)',
        text: '#888',
        border: 'rgba(128,128,128,0.3)'
    };
};

// ─── InfoRow (unchanged) ──────────────────────────────────────────────────────
const InfoRow = ({ icon, value, theme, accent = false }) => (
    <View style={rowStyles.row}>
        <Ionicons
            name={icon}
            size={13}
            color={accent ? theme.colors.primary : theme.colors.textMuted}
            style={{ marginTop: 1 }}
        />
        <Text
            style={[
                rowStyles.value,
                {
                    color: accent ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: accent ? '700' : '400',
                },
            ]}
            numberOfLines={1}
        >
            {value}
        </Text>
    </View>
);

const rowStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
    value: { fontSize: 12.5, flex: 1, letterSpacing: 0.1 },
});

// ─── Services chips (unchanged) ───────────────────────────────────────────────
const ServiceChips = ({ services = [], theme }) => (
    <View style={chipStyles.wrap}>
        {services.map((s, i) => (
            <View
                key={i}
                style={[chipStyles.chip, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.border }]}
            >
                <Text style={[chipStyles.text, { color: theme.colors.textSecondary }]}>{s}</Text>
            </View>
        ))}
    </View>
);

const chipStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    chip: {
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 20,
        borderWidth: 1,
    },
    text: { fontSize: 11, fontWeight: '500', letterSpacing: 0.2 },
});

// ─── Main Card (service type as chip) ─────────────────────────────────────────
export default function AdminOrderCard({ order = {}, onPress, index = 0 }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const {
        orderId = '#--',
        name = 'Unknown',
        contactNo = '--',
        city = '',
        selectedBrand = '',
        selectedModel = '',
        cc = '',
        bs = '',
        services = [],
        serviceType = '',
        preferredDate = null,
        preferredTime = '',
        assignedMechanic = null,
        status = 'pending',
    } = order;

    const sc = getStatusConfig(status);
    const mechanicDisplay = assignedMechanic || 'Unassigned';
    const formattedDate = formatDate(preferredDate);
    const bikeInfo = [selectedBrand, selectedModel].filter(Boolean).join(' ');
    const bikeSpecs = [cc ? `${cc}cc` : null, bs ? bs.toUpperCase() : null].filter(Boolean).join(' · ');

    const serviceChip = getServiceChipStyle(serviceType);

    // Staggered entrance
    const translateY = useRef(new Animated.Value(18)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 280,
                delay: index * 55,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                speed: 18,
                bounciness: 5,
                delay: index * 55,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.82}
                style={[
                    styles.card,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        shadowColor: theme.colors.primary,
                    },
                ]}
            >
                {/* Header: Order ID & Status */}
                <View style={styles.headerRow}>
                    <Text style={[styles.orderId, { color: theme.colors.primary }]}>{orderId}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
                        <Text style={[styles.statusText, { color: sc.text }]}>{sc.shortLabel}</Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                {/* Customer info */}
                <View style={styles.section}>
                    <InfoRow icon="person-outline" value={name} theme={theme} accent />
                    <InfoRow icon="call-outline" value={contactNo} theme={theme} />
                    {city ? <InfoRow icon="location-outline" value={city} theme={theme} /> : null}
                </View>

                {/* Bike details */}
                {bikeInfo && <InfoRow icon="bicycle-outline" value={bikeInfo} theme={theme} accent />}
                {bikeSpecs && <InfoRow icon="options-outline" value={bikeSpecs} theme={theme} />}

                {/* ✨ Service Type as a highlighted chip ✨ */}
                {serviceType && (
                    <View style={styles.serviceChipRow}>
                        <View style={[styles.serviceChip, { backgroundColor: serviceChip.bg, borderColor: serviceChip.border }]}>
                            <Ionicons name={serviceChip.icon} size={12} color={serviceChip.text} />
                            <Text style={[styles.serviceChipText, { color: serviceChip.text }]}>{serviceChip.label}</Text>
                        </View>
                    </View>
                )}

                {/* Services chips */}
                {services.length > 0 && <ServiceChips services={services} theme={theme} />}

                {/* Meta row: date, time, mechanic */}
                <View style={[styles.divider, { backgroundColor: theme.colors.border, marginTop: 12 }]} />
                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={12} color={theme.colors.textMuted} />
                        <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{formattedDate}</Text>
                    </View>
                    {preferredTime ? (
                        <>
                            <View style={styles.metaSep} />
                            <View style={styles.metaItem}>
                                <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
                                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{preferredTime}</Text>
                            </View>
                        </>
                    ) : null}
                    <View style={styles.metaSep} />
                    <View style={[styles.metaItem, { flex: 1 }]}>
                        <Ionicons name="build-outline" size={12} color={theme.colors.textMuted} />
                        <Text numberOfLines={1} style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                            {mechanicDisplay}
                        </Text>
                    </View>
                    <View style={styles.chevron}>
                        <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
        marginHorizontal: 16,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    orderId: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginBottom: 10,
    },
    section: { gap: 0 },
    serviceChipRow: {
        marginTop: 8,
        flexDirection: 'row',
    },
    serviceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    serviceChipText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        flex: 1,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '500',
        flexShrink: 1
    },
    metaSep: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(128,128,128,0.25)',
        marginHorizontal: 4,
    },
    chevron: {
        marginLeft: 'auto',
    },
});