import React, { useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Animated,
    Linking,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import { LightTheme, DarkTheme } from '../../../styles/Theme';

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    'Pending': { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'time-outline' },
    'In Progress': { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: 'construct-outline' },
    'Mechanic Assigned': { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'person-outline' },
    'Completed': { color: '#2ECC9A', bg: 'rgba(46,204,154,0.12)', icon: 'checkmark-circle-outline' },
    'Invoice Generated': { color: '#e2a731', bg: 'rgba(226,167,49,0.12)', icon: 'receipt-outline' },
    'Cancelled': { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', icon: 'close-circle-outline' },
};

const PAYMENT_CONFIG = {
    paid: { color: '#2ECC9A', label: 'Paid' },
    partial: { color: '#F59E0B', label: 'Partial' },
    unpaid: { color: '#FF6B6B', label: 'Unpaid' },
};

// ─── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children, theme, isDark, delay = 0 }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(14)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 280, delay, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, speed: 20, bounciness: 4, delay, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            <View
                style={[
                    cardStyles.card,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        shadowColor: theme.colors.primary,
                    },
                ]}
            >
                {/* Card Header */}
                <View style={[cardStyles.header, { borderBottomColor: theme.colors.border }]}>
                    <View style={[cardStyles.iconWrap, { backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow }]}>
                        <Ionicons name={icon} size={15} color={theme.colors.primary} />
                    </View>
                    <Text style={[cardStyles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
                </View>
                <View style={cardStyles.body}>{children}</View>
            </View>
        </Animated.View>
    );
}

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 14,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    body: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 0,
    },
});

// ─── Info Row ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value, theme, isLast = false, valueColor }) {
    return (
        <View style={[rowStyles.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
            <Text style={[rowStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
            <Text style={[rowStyles.value, { color: valueColor || theme.colors.textPrimary }]} numberOfLines={2}>
                {value || '—'}
            </Text>
        </View>
    );
}

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 9,
        gap: 12,
    },
    label: { fontSize: 12, fontWeight: '500', letterSpacing: 0.1, flex: 1 },
    value: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1, flex: 2, textAlign: 'right' },
});

// ─── Person Card (Mechanic / Delivery) ────────────────────────────────────────
function PersonRow({ name, phone, role, theme, isDark }) {
    const handleCall = () => {
        if (phone) Linking.openURL(`tel:${phone}`);
    };

    return (
        <View style={[personStyles.row, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.surfaceLow : theme.colors.surfaceLow }]}>
            {/* Avatar */}
            <View style={[personStyles.avatar, { backgroundColor: isDark ? theme.colors.surfaceHigh : '#FDECC8' }]}>
                <Ionicons name="person" size={18} color={theme.colors.primary} />
            </View>

            {/* Info */}
            <View style={personStyles.info}>
                <Text style={[personStyles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {name || 'Not Assigned'}
                </Text>
                <Text style={[personStyles.role, { color: theme.colors.textMuted }]}>{role}</Text>
            </View>

            {/* Call Button */}
            {phone ? (
                <TouchableOpacity
                    onPress={handleCall}
                    activeOpacity={0.75}
                    style={[personStyles.callBtn, { backgroundColor: 'rgba(46,204,154,0.12)' }]}
                >
                    <Ionicons name="call-outline" size={15} color="#2ECC9A" />
                    <Text style={personStyles.callText}>{phone}</Text>
                </TouchableOpacity>
            ) : (
                <View style={[personStyles.callBtn, { backgroundColor: theme.colors.surfaceHigh }]}>
                    <Text style={[personStyles.unassignedText, { color: theme.colors.textMuted }]}>Unassigned</Text>
                </View>
            )}
        </View>
    );
}

const personStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginBottom: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: { flex: 1, gap: 2 },
    name: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
    role: { fontSize: 11, fontWeight: '500', letterSpacing: 0.2 },
    callBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
    },
    callText: { fontSize: 11, fontWeight: '700', color: '#2ECC9A' },
    unassignedText: { fontSize: 11, fontWeight: '600' },
});

// ─── Parts Table ───────────────────────────────────────────────────────────────
function PartsTable({ parts, theme, isDark }) {
    if (!parts || parts.length === 0) {
        return (
            <View style={partsStyles.empty}>
                <Ionicons name="cube-outline" size={20} color={theme.colors.textMuted} />
                <Text style={[partsStyles.emptyText, { color: theme.colors.textMuted }]}>No parts used</Text>
            </View>
        );
    }

    return (
        <View style={partsStyles.table}>
            {/* Table Header */}
            <View style={[partsStyles.thead, { backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow }]}>
                <Text style={[partsStyles.th, { color: theme.colors.textMuted, flex: 3 }]}>Part</Text>
                <Text style={[partsStyles.th, { color: theme.colors.textMuted, flex: 1, textAlign: 'center' }]}>Qty</Text>
                {/* <Text style={[partsStyles.th, { color: theme.colors.textMuted, flex: 2, textAlign: 'right' }]}>Price</Text> */}
            </View>

            {/* Table Rows */}
            {parts.map((part, index) => {
                const isLast = index === parts.length - 1;
                const lineTotal = (part.discountPrice > 0 ? part.discountPrice : part.price) * part.quantity;

                return (
                    <View
                        key={index}
                        style={[
                            partsStyles.trow,
                            !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
                        ]}
                    >
                        <View style={{ flex: 3, gap: 2 }}>
                            <Text style={[partsStyles.partName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                                {part.partName}
                            </Text>
                            {/* {part.discountPrice > 0 && (
                                <Text style={[partsStyles.originalPrice, { color: theme.colors.textMuted }]}>
                                    MRP ₹{part.price.toLocaleString('en-IN')}
                                </Text>
                            )} */}
                        </View>
                        <Text style={[partsStyles.qty, { color: theme.colors.textSecondary, flex: 1 }]}>
                            ×{part.quantity}
                        </Text>
                        {/* <View style={{ flex: 2, alignItems: 'flex-end', gap: 2 }}>
                            <Text style={[partsStyles.price, { color: theme.colors.textPrimary }]}>
                                ₹{lineTotal.toLocaleString('en-IN')}
                            </Text>
                            {part.discountPrice > 0 && (
                                <View style={partsStyles.discountTag}>
                                    <Text style={partsStyles.discountText}>
                                        ₹{part.discountPrice}/ea
                                    </Text>
                                </View>
                            )}
                        </View> */}
                    </View>
                );
            })}
        </View>
    );
}

const partsStyles = StyleSheet.create({
    table: { borderRadius: 10, overflow: 'hidden' },
    thead: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 4,
    },
    th: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
    trow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 8,
    },
    partName: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
    originalPrice: { fontSize: 10, textDecorationLine: 'line-through' },
    qty: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
    price: { fontSize: 13, fontWeight: '700' },
    discountTag: {
        backgroundColor: 'rgba(46,204,154,0.12)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    discountText: { fontSize: 9, fontWeight: '700', color: '#2ECC9A' },
    empty: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    emptyText: { fontSize: 13, fontWeight: '500' },
});

// ─── VendorOrderDetails ────────────────────────────────────────────────────────
const VendorOrderDetails = ({ route }) => {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    // Order passed via navigation params — fall back to demo data for preview
    const order = route?.params?.order || DEMO_ORDER;

    const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['Pending'];
    const paymentCfg = PAYMENT_CONFIG[order.paymentStatus] || PAYMENT_CONFIG['unpaid'];

    const formattedDate = order.preferredDate
        ? new Date(order.preferredDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—';

    const vehicleLabel = [order.selectedBrand, order.selectedModel, order.modelName].filter(Boolean).join(' ');

    return (
        <ScreenWrapper title={`Order #${order.orderId}`} noPadding>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.colors.background }]}
            >
                {/* ── Hero Status Banner ── */}
                {/* <View
                    style={[
                        styles.heroBanner,
                        { backgroundColor: statusCfg.bg, borderBottomColor: theme.colors.border },
                    ]}
                >
                    <View style={[styles.statusIconWrap, { backgroundColor: `${statusCfg.color}22` }]}>
                        <Ionicons name={statusCfg.icon} size={22} color={statusCfg.color} />
                    </View>
                    <View style={styles.heroInfo}>
                        <Text style={[styles.heroStatus, { color: statusCfg.color }]}>{order.status}</Text>
                        <Text style={[styles.heroSub, { color: theme.colors.textMuted }]}>
                            {formattedDate} · {order.preferredTime}
                        </Text>
                    </View>
                    {order.serviceType === 'Emergency Repair' && (
                        <View style={styles.emergencyBadge}>
                            <Ionicons name="flash" size={11} color="#FF6B6B" />
                            <Text style={styles.emergencyText}>Emergency</Text>
                        </View>
                    )}
                </View> */}

                <View style={styles.inner}>

                    {/* ── 1. Bike Details ── */}
                    <SectionCard title="Bike Details" icon="bicycle" theme={theme} isDark={isDark} delay={60}>
                        <InfoRow label="Brand & Model" value={vehicleLabel} theme={theme} />
                        <InfoRow label="Engine CC" value={order.cc ? `${order.cc} cc` : null} theme={theme} />
                        <InfoRow label="BS Standard" value={order.bs} theme={theme} />
                        <InfoRow label="Service Type" value={order.serviceType} theme={theme}
                            valueColor={order.serviceType === 'Emergency Repair' ? '#FF6B6B' : undefined}
                        />
                        <InfoRow label="Services" value={Array.isArray(order.services) ? order.services.join(', ') : order.services} theme={theme} isLast />
                    </SectionCard>

                    {/* ── 2. Customer Info ── */}
                    <SectionCard title="Customer Info" icon="person-outline" theme={theme} isDark={isDark} delay={120}>
                        <InfoRow label="Name" value={order.name} theme={theme} />
                        {/* <InfoRow label="Phone" value={order.contactNo} theme={theme} /> */}
                        {/* <InfoRow label="City" value={order.city} theme={theme} />
                        <InfoRow label="Email" value={order.email} theme={theme} isLast /> */}
                    </SectionCard>

                    {/* ── 3. Assigned Team ── */}
                    <SectionCard title="Assigned Team" icon="people-outline" theme={theme} isDark={isDark} delay={180}>
                        <PersonRow
                            name={order.assignedMechanic}
                            phone={order.mechanicPhone}
                            role="Mechanic"
                            theme={theme}
                            isDark={isDark}
                        />
                        <PersonRow
                            name={order.assignedDelivery}
                            phone={order.deliveryPhone}
                            role="Delivery Agent"
                            theme={theme}
                            isDark={isDark}
                        />
                    </SectionCard>

                    {/* ── 4. Parts Used ── */}
                    <SectionCard title="Parts Required" icon="construct-outline" theme={theme} isDark={isDark} delay={240}>
                        <PartsTable parts={order.partsUsed} theme={theme} isDark={isDark} />
                    </SectionCard>
                    {/* ── 5. Payment Summary ── */}

                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

export default VendorOrderDetails;

// ─── Demo Order (for preview/dev) ─────────────────────────────────────────────
const DEMO_ORDER = {
    orderId: 'ORD-20241',
    status: 'Mechanic Assigned',
    paymentStatus: 'partial',
    serviceType: 'Schedule Repair',
    preferredDate: new Date().toISOString(),
    preferredTime: '10:30 AM',
    name: 'Rahul Sharma',
    contactNo: '+91 98765 43210',
    email: 'rahul@example.com',
    city: 'PATNA',
    selectedBrand: 'Royal Enfield',
    selectedModel: 'Classic 350',
    modelName: 'Signals Edition',
    cc: '350',
    bs: 'BS6',
    services: ['Oil Change', 'Chain Lubrication', 'Brake Adjustment'],
    assignedMechanic: 'Amit Kumar',
    mechanicPhone: '+91 91234 56789',
    assignedDelivery: 'Raju Singh',
    deliveryPhone: '+91 88765 43210',
    partsUsed: [
        { partName: 'Engine Oil 15W-50 (1L)', quantity: 2, price: 380, discountPrice: 340 },
        { partName: 'Oil Filter', quantity: 1, price: 120, discountPrice: 0 },
        { partName: 'Chain Lubricant Spray', quantity: 1, price: 220, discountPrice: 0 },
        { partName: 'Brake Pads (Front)', quantity: 1, price: 650, discountPrice: 580 },
    ],
    total: {
        subTotal: 2270,
        total: 2310,
        discount: 130,
        referralDiscount: 0,
        sgst: 104,
        cgst: 104,
        sgstRate: 9,
        cgstRate: 9,
        baseAmount: 2102,
        finalPayable: 2180,
    },
    amountPaid: 1000,
    balanceDue: 1180,
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 40,
    },
    heroBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    statusIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroInfo: { flex: 1 },
    heroStatus: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    heroSub: {
        fontSize: 11,
        marginTop: 2,
        letterSpacing: 0.2,
    },
    emergencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,107,107,0.12)',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 10,
    },
    emergencyText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FF6B6B',
        letterSpacing: 0.2,
    },
    inner: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    finalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    finalLabel: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    finalAmount: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    paymentStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 10,
    },
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    payDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    payBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    paidInfo: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
});