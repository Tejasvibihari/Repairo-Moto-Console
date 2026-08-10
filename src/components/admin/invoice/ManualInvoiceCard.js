// components/admin/invoice/ManualInvoiceCard.js
import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import { useSelector } from 'react-redux';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    paid: { bg: '#2ECC9A22', color: '#2ECC9A', label: 'Paid', icon: 'checkmark-circle' },
    unpaid: { bg: '#FF6B6B22', color: '#FF6B6B', label: 'Unpaid', icon: 'time-outline' },
    draft: { bg: '#e2a73122', color: '#e2a731', label: 'Draft', icon: 'time-outline' },
    cancelled: { bg: '#FF6B6B22', color: '#FF6B6B', label: 'Cancelled', icon: 'close-circle' },
};

const StatusBadge = ({ status, theme }) => {
    const c = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    return (
        <View style={[badgeStyles.wrap, { backgroundColor: c.bg }]}>
            <Ionicons name={c.icon} size={10} color={c.color} />
            <Text style={[badgeStyles.text, { color: c.color }]}>{c.label}</Text>
        </View>
    );
};
const badgeStyles = StyleSheet.create({
    wrap: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    text: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});

// ─── Payment method badge ─────────────────────────────────────────────────────
const PaymentBadge = ({ method, theme }) => {
    const METHOD_ICONS = {
        cash: 'cash-outline',
        upi: 'phone-portrait-outline',
        card: 'card-outline',
        razorpay: 'flash-outline',
        bank_transfer: 'business-outline',
        referral: 'gift-outline',
    };
    const icon = METHOD_ICONS[method] || 'card-outline';
    return (
        <View style={[pmBadge.wrap, { backgroundColor: theme.colors.surfaceHigh }]}>
            <Ionicons name={icon} size={10} color={theme.colors.textSecondary} />
            <Text style={[pmBadge.text, { color: theme.colors.textSecondary }]}>
                {method?.toUpperCase() || 'N/A'}
            </Text>
        </View>
    );
};
const pmBadge = StyleSheet.create({
    wrap: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
    },
    text: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
});

// ─── Main Card ────────────────────────────────────────────────────────────────
export default function ManualInvoiceCard({ invoice, onPress, onEdit, onDelete, index = 0 }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    // Staggered entrance animation
    const translateY = useRef(new Animated.Value(18)).current;
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
                bounciness: 4,
                delay: index * 60,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const fmtDate = (d) =>
        d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const safeNum = (v) => {
        if (v == null) return 0;
        if (typeof v === 'number') return v;
        if (typeof v === 'object') {
            const raw = v.$numberDecimal ?? v.$numberDouble ?? v.$numberInt ?? v.value;
            return raw != null ? parseFloat(raw) : 0;
        }
        return parseFloat(v) || 0;
    };

    const finalPayable = safeNum(invoice?.total?.finalPayable);
    const customer = invoice?.customerDetails;
    const vehicle = invoice?.vehicleDetails;
    const hasGST = !!invoice?.businessDetails?.gstin;

    return (
        <Animated.View style={{ transform: [{ translateY }], opacity }}>
            <TouchableOpacity
                onPress={() => onPress?.(invoice)}
                activeOpacity={0.78}
                style={[
                    styles.card,
                    {
                        backgroundColor: isDark ? C.surface : C.surface,
                        borderColor: C.border,
                        shadowColor: C.primary,
                    },
                ]}
            >
                {/* ── Top Row ───────────────────────────────────────────────── */}
                <View style={styles.topRow}>
                    {/* Invoice number + indicator */}
                    <View style={styles.leftCol}>
                        <View style={styles.invNumRow}>
                            <View style={[styles.dot, { backgroundColor: STATUS_CONFIG[invoice?.status]?.color || C.primary }]} />
                            <Text style={[styles.invNum, { color: C.primary }]}>
                                #{invoice?.invoiceNumber || 'DRAFT'}
                            </Text>
                            {hasGST && (
                                <View style={[styles.gstTag, { backgroundColor: C.surfaceHighest }]}>
                                    <Text style={[styles.gstText, { color: C.primary }]}>GST</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.customerName, { color: C.textPrimary }]} numberOfLines={1}>
                            {customer?.name || 'Unknown Customer'}
                        </Text>
                        {customer?.contactNo ? (
                            <Text style={[styles.customerSub, { color: C.textMuted }]}>
                                {customer.contactNo}
                            </Text>
                        ) : null}
                    </View>

                    {/* Amount + status */}
                    <View style={styles.rightCol}>
                        <Text style={[styles.amount, { color: C.textPrimary }]}>
                            ₹{finalPayable.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </Text>
                        <StatusBadge status={invoice?.status} theme={theme} />
                    </View>
                </View>

                {/* ── Divider ───────────────────────────────────────────────── */}
                <View style={[styles.divider, { backgroundColor: C.border }]} />

                {/* ── Bottom Row ────────────────────────────────────────────── */}
                <View style={styles.bottomRow}>
                    {/* Vehicle */}
                    <View style={styles.metaChip}>
                        <MaterialCommunityIcons name="motorbike" size={12} color={C.textMuted} />
                        <Text style={[styles.metaText, { color: C.textMuted }]} numberOfLines={1}>
                            {[vehicle?.brand, vehicle?.model].filter(Boolean).join(' ') || 'No vehicle'}
                        </Text>
                    </View>

                    {/* Date */}
                    <View style={styles.metaChip}>
                        <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
                        <Text style={[styles.metaText, { color: C.textMuted }]}>
                            {fmtDate(invoice?.invoiceDate)}
                        </Text>
                    </View>

                    {/* Payment method */}
                    <PaymentBadge method={invoice?.paymentDetails?.method} theme={theme} />

                    {/* Edit button */}
                    <Pressable
                        onPress={(event) => {
                            event.stopPropagation?.();
                            onEdit?.(invoice);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={({ pressed }) => [
                            styles.editBtn,
                            { backgroundColor: C.surfaceLow, borderColor: C.border, opacity: pressed ? 0.75 : 1 },
                        ]}
                        android_ripple={{ color: '#00000010', radius: 20 }}
                    >
                        <Ionicons name="create-outline" size={14} color={C.primary} />
                    </Pressable>

                    {/* Delete button */}
                    <Pressable
                        onPress={(event) => {
                            event.stopPropagation?.();
                            onDelete?.(invoice);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={({ pressed }) => [
                            styles.deleteBtn,
                            { backgroundColor: '#FF6B6B18', borderColor: '#FF6B6B44', opacity: pressed ? 0.75 : 1 },
                        ]}
                        android_ripple={{ color: '#FF6B6B22', radius: 20 }}
                    >
                        <Ionicons name="trash-outline" size={14} color="#FF6B6B" />
                    </Pressable>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
        marginBottom: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 3,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    leftCol: { flex: 1, gap: 3 },
    rightCol: { alignItems: 'flex-end', gap: 6 },
    invNumRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    invNum: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
    gstTag: {
        paddingHorizontal: 5, paddingVertical: 2,
        borderRadius: 4,
    },
    gstText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    customerName: { fontSize: 15, fontWeight: '700', marginTop: 1 },
    customerSub: { fontSize: 11 },
    amount: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
    bottomRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11 },
    editBtn: {
        width: 28, height: 28, borderRadius: 8, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center', marginLeft: 'auto',
    },
    deleteBtn: {
        width: 28, height: 28, borderRadius: 8, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
    },
});