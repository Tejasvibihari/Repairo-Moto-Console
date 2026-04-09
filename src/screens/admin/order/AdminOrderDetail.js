// src/screens/admin/order/AdminOrderDetail.js
// ─── CHANGES: Added Generate Bill FAB, PaymentStatusCard, updated AssignmentSummaryCard
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Animated, Platform, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axiosClient from '../../../services/axiosClient';

import AssignmentPanel from '../../../components/admin/order/AssignmentPanel';
import useEmployee from '../../../hooks/useEmployee';
import useVendor from '../../../hooks/useVendor';
import useOrder from '../../../hooks/useOrder';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    pending: { label: 'Pending', bg: 'rgba(158,142,120,0.18)', text: '#9E8E78', dot: '#9E8E78' },
    in_progress: { label: 'In Progress', bg: 'rgba(226,167,49,0.18)', text: '#E2A731', dot: '#E2A731' },
    mechanic_assigned: { label: 'Mechanic Assigned', bg: 'rgba(52,152,219,0.18)', text: '#3498DB', dot: '#3498DB' },
    completed: { label: 'Completed', bg: 'rgba(46,204,154,0.18)', text: '#2ECC9A', dot: '#2ECC9A' },
    invoice_generated: { label: 'Invoice Generated', bg: 'rgba(155,89,182,0.18)', text: '#9B59B6', dot: '#9B59B6' },
    cancelled: { label: 'Cancelled', bg: 'rgba(255,107,107,0.18)', text: '#FF6B6B', dot: '#FF6B6B' },
};

// ─── Payment Status config ─────────────────────────────────────────────────────
const PAYMENT_STATUS_CONFIG = {
    unpaid: { label: 'Unpaid', bg: 'rgba(255,107,107,0.15)', text: '#FF6B6B', border: 'rgba(255,107,107,0.3)', icon: 'close-circle' },
    partial: { label: 'Partial', bg: 'rgba(226,167,49,0.15)', text: '#E2A731', border: 'rgba(226,167,49,0.3)', icon: 'time' },
    paid: { label: 'Paid', bg: 'rgba(46,204,154,0.15)', text: '#2ECC9A', border: 'rgba(46,204,154,0.3)', icon: 'checkmark-circle' },
};

const PAYMENT_METHOD_ICONS = {
    cash: 'cash-outline',
    upi: 'phone-portrait-outline',
    card: 'card-outline',
    razorpay: 'globe-outline',
    bank_transfer: 'business-outline',
};

const getStatusConfig = (status = '') => {
    const key = status.toLowerCase().trim().replace(/\s+/g, '_');
    return STATUS_CONFIG[key] ?? STATUS_CONFIG.pending;
};

const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (val) =>
    `₹${Number(val ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SectionLabel = ({ label, theme }) => (
    <Text style={[sectionStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
);
const sectionStyles = StyleSheet.create({
    label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
});

const Divider = ({ theme, style }) => (
    <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }, style]} />
);

const InfoTile = ({ icon, label, value, theme, accent = false, iconLib = 'ion' }) => {
    const IconComp = iconLib === 'mci' ? MaterialCommunityIcons : Ionicons;
    return (
        <View style={tileStyles.tile}>
            <View style={[tileStyles.iconWrap, { backgroundColor: accent ? `${theme.colors.primary}22` : theme.colors.surfaceHigh }]}>
                <IconComp name={icon} size={15} color={accent ? theme.colors.primary : theme.colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[tileStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
                <Text style={[tileStyles.value, { color: accent ? theme.colors.primary : theme.colors.textPrimary }]} numberOfLines={1}>
                    {value || '—'}
                </Text>
            </View>
        </View>
    );
};
const tileStyles = StyleSheet.create({
    tile: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 1 },
    value: { fontSize: 13.5, fontWeight: '600' },
});

const FinancialRow = ({ icon, name, qty, price, theme }) => (
    <View style={finStyles.row}>
        <View style={[finStyles.iconWrap, { backgroundColor: theme.colors.surfaceHigh }]}>
            <Ionicons name={icon} size={13} color={theme.colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={[finStyles.name, { color: theme.colors.textPrimary }]}>{name}</Text>
            <Text style={[finStyles.qty, { color: theme.colors.textMuted }]}>{qty}</Text>
        </View>
        <Text style={[finStyles.price, { color: theme.colors.textSecondary }]}>{price}</Text>
    </View>
);
const finStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    iconWrap: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 13, fontWeight: '600' },
    qty: { fontSize: 11, marginTop: 1 },
    price: { fontSize: 13, fontWeight: '600', minWidth: 70, textAlign: 'right' },
});

const Card = ({ children, theme, style }) => (
    <View style={[cardStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.primary }, style]}>
        {children}
    </View>
);
const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 3,
    },
});

const getServiceChipStyle = (type) => {
    if (type === 'Schedule Repair') return { label: 'Scheduled', icon: 'calendar-outline', bg: 'rgba(46,204,154,0.15)', text: '#2ECC9A', border: 'rgba(46,204,154,0.3)' };
    if (type === 'Emergency Repair') return { label: 'Emergency', icon: 'alert-circle-outline', bg: 'rgba(255,107,107,0.15)', text: '#FF6B6B', border: 'rgba(255,107,107,0.3)' };
    return { label: type || '—', icon: 'help-circle-outline', bg: 'rgba(128,128,128,0.15)', text: '#888', border: 'rgba(128,128,128,0.3)' };
};

// ─── Payment Status Card (NEW) ────────────────────────────────────────────────
const PaymentStatusCard = ({ order, theme }) => {
    const ps = PAYMENT_STATUS_CONFIG[order.paymentStatus] ?? PAYMENT_STATUS_CONFIG.unpaid;
    const methodIcon = PAYMENT_METHOD_ICONS[order.paymentMethod] ?? 'cash-outline';
    const methodLabel = order.paymentMethod
        ? order.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Not set';

    const amountPaid = order.amountPaid ?? 0;
    const grandTotal = order.total?.total ?? 0;
    const balance = Math.max(0, grandTotal - amountPaid);

    return (
        <Card theme={theme}>
            <SectionLabel label="Payment Status" theme={theme} />
            <View style={psStyles.row}>
                {/* Status pill */}
                <View style={[psStyles.pill, { backgroundColor: ps.bg, borderColor: ps.border }]}>
                    <Ionicons name={ps.icon} size={15} color={ps.text} />
                    <Text style={[psStyles.pillText, { color: ps.text }]}>{ps.label}</Text>
                </View>

                {/* Method */}
                {order.paymentMethod && (
                    <View style={[psStyles.method, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                        <Ionicons name={methodIcon} size={13} color={theme.colors.textSecondary} />
                        <Text style={[psStyles.methodText, { color: theme.colors.textSecondary }]}>{methodLabel}</Text>
                    </View>
                )}
            </View>

            {/* Amount breakdown for partial */}
            {order.paymentStatus === 'partial' && grandTotal > 0 && (
                <View style={[psStyles.breakdown, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                    <View style={psStyles.bRow}>
                        <Text style={[psStyles.bLabel, { color: theme.colors.textMuted }]}>Amount Paid</Text>
                        <Text style={[psStyles.bVal, { color: '#2ECC9A' }]}>{formatCurrency(amountPaid)}</Text>
                    </View>
                    <View style={[psStyles.bDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={psStyles.bRow}>
                        <Text style={[psStyles.bLabel, { color: theme.colors.textMuted }]}>Balance Due</Text>
                        <Text style={[psStyles.bVal, { color: '#FF6B6B' }]}>{formatCurrency(balance)}</Text>
                    </View>
                </View>
            )}
        </Card>
    );
};
const psStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5 },
    pillText: { fontSize: 13, fontWeight: '800' },
    method: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
    methodText: { fontSize: 12, fontWeight: '600' },
    breakdown: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 12, gap: 0 },
    bRow: { flex: 1, alignItems: 'center', gap: 3 },
    bLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    bVal: { fontSize: 14, fontWeight: '800' },
    bDivider: { width: StyleSheet.hairlineWidth, height: 30, marginHorizontal: 8 },
});

// ─── Map Component ────────────────────────────────────────────────────────────
const LocationMap = ({ coordinates, city, theme }) => {
    const [placeName, setPlaceName] = useState('');
    const [mapReady, setMapReady] = useState(false);
    const lat = coordinates[1];
    const lng = coordinates[0];

    useEffect(() => {
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
            .then(r => r.json())
            .then(d => setPlaceName(d.display_name ?? city))
            .catch(() => setPlaceName(city));
    }, [lat, lng]);

    const openExternalMap = () => {
        const url = Platform.select({ ios: `maps:0,0?q=${lat},${lng}`, android: `geo:0,0?q=${lat},${lng}` });
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(url || fallbackUrl).catch(() => Linking.openURL(fallbackUrl));
    };

    return (
        <View style={[mapStyles.wrapper, { borderColor: theme.colors.border, shadowColor: theme.colors.primary }]}>
            <View style={[mapStyles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
                <View style={[mapStyles.iconWrap, { backgroundColor: `${theme.colors.primary}22` }]}>
                    <Ionicons name="location" size={14} color={theme.colors.primary} />
                </View>
                <Text style={[mapStyles.placeName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                    {placeName || city || 'Loading location…'}
                </Text>
            </View>
            <MapView
                provider={PROVIDER_GOOGLE}
                style={mapStyles.map}
                onMapReady={() => setMapReady(true)}
                initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                zoomEnabled scrollEnabled pitchEnabled rotateEnabled
                showsPointsOfInterest showsBuildings showsCompass showsScale zoomControlEnabled
            >
                {mapReady && <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor={theme.colors.primary} />}
            </MapView>
            <View style={[mapStyles.footer, { backgroundColor: theme.colors.surfaceLow, borderTopColor: theme.colors.border }]}>
                <Ionicons name="navigate-outline" size={12} color={theme.colors.textMuted} />
                <Text style={[mapStyles.coordText, { color: theme.colors.textMuted }]}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
                <TouchableOpacity style={[mapStyles.viewMapBtn, { backgroundColor: theme.colors.primary }]} onPress={openExternalMap} activeOpacity={0.8}>
                    <Ionicons name="map-outline" size={12} color="#fff" />
                    <Text style={mapStyles.viewMapText}>View on Map</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
const mapStyles = StyleSheet.create({
    wrapper: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 12, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    placeName: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
    map: { width: '100%', height: 320 },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
    coordText: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3, flex: 1 },
    viewMapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
    viewMapText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

// ─── FAB Row (Manage + Generate Bill) ─────────────────────────────────────────
const ActionButtons = ({ onManage, onGenerateBill, theme, isInvoiced }) => (
    <View style={fabStyles.row}>
        <TouchableOpacity
            style={[fabStyles.secondaryBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.primary }]}
            onPress={onManage}
            activeOpacity={0.85}
        >
            <Ionicons name="settings-outline" size={16} color={theme.colors.textPrimary} />
            <Text style={[fabStyles.secondaryLabel, { color: theme.colors.textPrimary }]}>Manage Order</Text>
        </TouchableOpacity>
        <TouchableOpacity
            style={[fabStyles.primaryBtn, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
            onPress={onGenerateBill}
            activeOpacity={0.85}
        >
            <Ionicons name={isInvoiced ? 'receipt' : 'receipt-outline'} size={16} color="#1a1a1a" />
            <Text style={fabStyles.primaryLabel}>{isInvoiced ? 'View / Edit Bill' : 'Generate Bill'}</Text>
        </TouchableOpacity>
    </View>
);
const fabStyles = StyleSheet.create({
    row: { flexDirection: 'row', gap: 10, marginHorizontal: 1, marginBottom: 12 },
    secondaryBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        paddingVertical: 14, borderRadius: 16, borderWidth: 1,
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
    },
    secondaryLabel: { fontSize: 13, fontWeight: '700' },
    primaryBtn: {
        flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        paddingVertical: 14, borderRadius: 16,
        shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
    },
    primaryLabel: { fontSize: 13, fontWeight: '900', color: '#1a1a1a' },
});

// ─── Assignment Summary Card ──────────────────────────────────────────────────
const AssignmentSummaryCard = ({ order, theme, onManage }) => {
    const sc = getStatusConfig(order.status);
    return (
        <Card theme={theme}>
            <View style={assignStyles.row}>
                <SectionLabel label="Assignment & Status" theme={theme} />
                <TouchableOpacity
                    onPress={onManage}
                    style={[assignStyles.editBtn, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary + '30' }]}
                >
                    <Ionicons name="pencil-outline" size={12} color={theme.colors.primary} />
                    <Text style={[assignStyles.editText, { color: theme.colors.primary }]}>Edit</Text>
                </TouchableOpacity>
            </View>
            <View style={[assignStyles.statusRow, { backgroundColor: sc.bg, borderColor: sc.dot + '55' }]}>
                <View style={[assignStyles.statusDot, { backgroundColor: sc.dot }]} />
                <Text style={[assignStyles.statusText, { color: sc.text }]}>{sc.label}</Text>
            </View>
            <View style={assignStyles.grid}>
                {[
                    { label: 'MECHANIC', value: order.assignedMechanic, icon: 'construct-outline', color: '#3498DB', assignedColor: '#2ECC9A' },
                    { label: 'VENDOR', value: order.assignedVendor, icon: 'business-outline', color: '#9B59B6', assignedColor: '#9B59B6' },
                    { label: 'DELIVERY', value: order.assignedDelivery, icon: 'bicycle-outline', color: '#E2A731', assignedColor: '#E2A731' },
                ].map((cell) => (
                    <View key={cell.label} style={[assignStyles.cell, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                        <View style={[assignStyles.cellIcon, { backgroundColor: cell.value ? cell.color + '22' : theme.colors.surfaceHigh }]}>
                            <Ionicons name={cell.icon} size={14} color={cell.value ? cell.color : theme.colors.textMuted} />
                        </View>
                        <Text style={[assignStyles.cellLabel, { color: theme.colors.textMuted }]}>{cell.label}</Text>
                        <Text style={[assignStyles.cellValue, { color: cell.value ? theme.colors.textPrimary : theme.colors.textMuted }]} numberOfLines={2}>
                            {cell.value || 'Unassigned'}
                        </Text>
                        <View style={[assignStyles.assignedPill, { backgroundColor: cell.value ? cell.assignedColor + '22' : 'rgba(158,142,120,0.15)' }]}>
                            <Text style={[assignStyles.pillText, { color: cell.value ? cell.assignedColor : '#9E8E78' }]}>
                                {cell.value ? 'Assigned' : 'Pending'}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        </Card>
    );
};
const assignStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
    editText: { fontSize: 11, fontWeight: '700' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 13, fontWeight: '800' },
    grid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    cell: { flex: 1, minWidth: 100, borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
    cellIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    cellLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
    cellValue: { fontSize: 12.5, fontWeight: '700', lineHeight: 16 },
    assignedPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4, alignSelf: 'flex-start' },
    pillText: { fontSize: 10, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminOrderDetail({ route, navigation }) {
    const orderIdParam = route?.params?.order?._id || route?.params?.orderId;
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [panelVisible, setPanelVisible] = useState(false);

    const { data: mechanics, loading: mechanicsLoading } = useEmployee({ position: 'mechanic' });
    const { data: deliveryBoys, loading: deliveryBoysLoading } = useEmployee({ position: 'delivery' });
    const { data: vendors, loading: vendorsLoading } = useVendor();

    const { updateMechanic, updateVendor, updateDelivery: updateDeliveryBoy, updateOrderStatus, mutationLoading } = useOrder({}, 1, 10);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    const fetchOrder = useCallback(async () => {
        if (!orderIdParam) { setLoading(false); return; }
        try {
            setLoading(true);
            const response = await axiosClient.get(`/api/admin/order/getorderbyid/${orderIdParam}`);
            setOrder(response.data);
        } catch (err) {
            console.error('Failed to fetch order:', err);
            Alert.alert('Error', 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    }, [orderIdParam]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, speed: 16, bounciness: 4, useNativeDriver: true }),
        ]).start();
    }, []);

    const handlePanelClose = useCallback(() => { setPanelVisible(false); fetchOrder(); }, [fetchOrder]);

    const handleAssignMechanic = useCallback(async (orderId, mechanicId) => {
        const result = await updateMechanic(orderId, mechanicId);
        if (result?.data) setOrder(result.data); else await fetchOrder();
        return result;
    }, [updateMechanic, fetchOrder]);

    const handleAssignVendor = useCallback(async (orderId, vendorId) => {
        const result = await updateVendor(orderId, vendorId);
        if (result?.data) setOrder(result.data); else await fetchOrder();
        return result;
    }, [updateVendor, fetchOrder]);

    const handleAssignDeliveryBoy = useCallback(async (orderId, deliveryBoyId) => {
        const result = await updateDeliveryBoy(orderId, deliveryBoyId);
        if (result?.data) setOrder(result.data); else await fetchOrder();
        return result;
    }, [updateDeliveryBoy, fetchOrder]);

    const handleUpdateStatus = useCallback(async (orderId, newStatus) => {
        const result = await updateOrderStatus(orderId, newStatus);
        if (result?.data) setOrder(result.data); else await fetchOrder();
        return result;
    }, [updateOrderStatus, fetchOrder]);

    const handleGenerateBill = useCallback(() => {
        navigation.navigate('AdminGenerateInvoice', { order });
    }, [navigation, order]);

    if (loading) {
        return (
            <View style={[styles.screen, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!order) {
        return (
            <View style={[styles.screen, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.colors.textMuted }}>Order not found</Text>
            </View>
        );
    }

    const {
        orderId = '#--', name = 'Unknown', email = '', contactNo = '--', city = '',
        selectedBrand = '', selectedModel = '', cc = '', bs = '', services = [],
        serviceType = '', preferredDate = null, preferredTime = '', assignedMechanic = null,
        assignedDelivery = null, status = 'pending', partsUsed = [], serviceProvided = [],
        total = {}, createdAt = null, invoiceDate = null, userLocation = null,
        paymentStatus, paymentMethod, amountPaid,
    } = order;

    const sc = getStatusConfig(status);
    const serviceChip = getServiceChipStyle(serviceType);
    const bikeInfo = [selectedBrand, selectedModel].filter(Boolean).join(' ');
    const bikeSpecs = [cc ? `${cc}cc` : null, bs ? bs.toUpperCase() : null].filter(Boolean).join(' · ');
    const coordStr = userLocation?.coordinates?.length === 2
        ? `${userLocation.coordinates[1].toFixed(4)}, ${userLocation.coordinates[0].toFixed(4)}`
        : null;
    const isInvoiced = status?.toLowerCase().replace(/\s+/g, '_') === 'invoice_generated';

    return (
        <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
            <ScreenWrapper title="Order Details">
                <Animated.ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                >
                    {/* Order Reference */}
                    <View style={styles.orderRefRow}>
                        <View>
                            <Text style={[styles.orderRefLabel, { color: theme.colors.textMuted }]}>ORDER REFERENCE</Text>
                            <Text style={[styles.orderRefId, { color: theme.colors.primary }]}>{orderId}</Text>
                        </View>
                        <View style={styles.badgeGroup}>
                            {invoiceDate && (
                                <View style={[styles.invoiceBadge, { backgroundColor: 'rgba(155,89,182,0.15)', borderColor: 'rgba(155,89,182,0.3)' }]}>
                                    <Text style={[styles.invoiceBadgeText, { color: '#9B59B6' }]}>INVOICED</Text>
                                </View>
                            )}
                            {/* Payment Status mini badge in header */}
                            {paymentStatus && (() => {
                                const ps = PAYMENT_STATUS_CONFIG[paymentStatus] ?? PAYMENT_STATUS_CONFIG.unpaid;
                                return (
                                    <View style={[styles.invoiceBadge, { backgroundColor: ps.bg, borderColor: ps.border }]}>
                                        <Ionicons name={ps.icon} size={11} color={ps.text} />
                                        <Text style={[styles.invoiceBadgeText, { color: ps.text }]}>{ps.label.toUpperCase()}</Text>
                                    </View>
                                );
                            })()}
                        </View>
                    </View>

                    <Divider theme={theme} style={{ marginBottom: 16 }} />

                    <AssignmentSummaryCard order={order} theme={theme} onManage={() => setPanelVisible(true)} />

                    {/* Payment Status Card (shown when payment info exists) */}
                    {(paymentStatus || isInvoiced) && (
                        <PaymentStatusCard order={order} theme={theme} />
                    )}

                    {/* Vehicle Details */}
                    <Card theme={theme}>
                        <SectionLabel label="Vehicle Details" theme={theme} />
                        <View style={styles.bikeHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.bikeName, { color: theme.colors.textPrimary }]}>{bikeInfo || '—'}</Text>
                                {bikeSpecs ? <Text style={[styles.bikeSpecs, { color: theme.colors.textMuted }]}>{bikeSpecs}</Text> : null}
                            </View>
                            <Ionicons name="bicycle" size={28} color={theme.colors.primary} style={{ opacity: 0.7 }} />
                        </View>
                        {services.length > 0 && (
                            <View style={styles.chipRow}>
                                {services.map((s, i) => (
                                    <View key={i} style={[styles.serviceTag, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.border }]}>
                                        <Text style={[styles.serviceTagText, { color: theme.colors.textSecondary }]}>{s}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                            <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
                            <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
                        </View>
                        {serviceType && (
                            <View style={[styles.serviceTypeChip, { backgroundColor: serviceChip.bg, borderColor: serviceChip.border }]}>
                                <Ionicons name={serviceChip.icon} size={12} color={serviceChip.text} />
                                <Text style={[styles.serviceTypeText, { color: serviceChip.text }]}>{serviceChip.label}</Text>
                            </View>
                        )}
                    </Card>

                    {/* Customer Information */}
                    <Card theme={theme}>
                        <SectionLabel label="Customer Information" theme={theme} />
                        <InfoTile icon="person-outline" label="Full Name" value={name} theme={theme} accent />
                        <InfoTile icon="call-outline" label="Contact" value={contactNo} theme={theme} />
                        <InfoTile icon="mail-outline" label="Email" value={email} theme={theme} />
                        <InfoTile icon="location-outline" label="City" value={city} theme={theme} />
                        {coordStr && <InfoTile icon="navigate-outline" label="Coordinates" value={coordStr} theme={theme} />}
                    </Card>

                    {/* Logistics & Appointment */}
                    <Card theme={theme}>
                        <SectionLabel label="Logistics & Appointment" theme={theme} />
                        <View style={styles.logisticsGrid}>
                            {[
                                { icon: 'calendar-outline', label: 'SCHEDULE', value: formatDate(preferredDate), sub: preferredTime, subColor: theme.colors.primary },
                                { icon: 'person-circle-outline', label: 'MECHANIC', value: assignedMechanic || 'Unassigned', assigned: !!assignedMechanic, assignedColor: '#2ECC9A' },
                                { icon: 'bicycle-outline', label: 'DELIVERY BOY', value: assignedDelivery || 'Unassigned', assigned: !!assignedDelivery, assignedColor: '#E2A731' },
                            ].map((cell) => (
                                <View key={cell.label} style={styles.logisticsCell}>
                                    <View style={[styles.logisticsCellInner, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                                        <Ionicons name={cell.icon} size={18} color={theme.colors.primary} />
                                        <Text style={[styles.logisticsLabel, { color: theme.colors.textMuted }]}>{cell.label}</Text>
                                        <Text style={[styles.logisticsValue, { color: theme.colors.textPrimary }]} numberOfLines={2}>{cell.value}</Text>
                                        {cell.sub ? <Text style={[styles.logisticsTime, { color: cell.subColor }]}>{cell.sub}</Text> : null}
                                        {cell.assigned !== undefined && (
                                            <View style={[styles.assignedBadge, { backgroundColor: cell.assigned ? cell.assignedColor + '22' : 'rgba(158,142,120,0.15)' }]}>
                                                <Text style={[styles.assignedText, { color: cell.assigned ? cell.assignedColor : '#9E8E78' }]}>
                                                    {cell.assigned ? 'Assigned' : 'Pending'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </Card>

                    {/* Financial Breakdown */}
                    <Card theme={theme}>
                        <SectionLabel label="Financial Breakdown" theme={theme} />
                        {partsUsed.length > 0 && (
                            <>
                                <Text style={[styles.finSubLabel, { color: theme.colors.textMuted }]}>PARTS &amp; CONSUMABLES</Text>
                                {partsUsed.map((p, i) => (
                                    <FinancialRow key={i} icon="construct-outline" name={p.partName}
                                        qty={`${p.quantity} × ${formatCurrency(p.price)}`}
                                        price={formatCurrency(p.quantity * p.price)} theme={theme} />
                                ))}
                                <Divider theme={theme} style={{ marginBottom: 12 }} />
                            </>
                        )}
                        {serviceProvided.length > 0 && (
                            <>
                                <Text style={[styles.finSubLabel, { color: theme.colors.textMuted }]}>SERVICES PROVIDED</Text>
                                {serviceProvided.map((s, i) => (
                                    <FinancialRow key={i} icon="checkmark-circle-outline" name={s.serviceName}
                                        qty={`${s.quantity} × ${formatCurrency(s.price)}`}
                                        price={formatCurrency(s.quantity * s.price)} theme={theme} />
                                ))}
                                <Divider theme={theme} style={{ marginBottom: 12 }} />
                            </>
                        )}
                        {(partsUsed.length === 0 && serviceProvided.length === 0) && (
                            <View style={[styles.emptyBill, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                                <Ionicons name="receipt-outline" size={22} color={theme.colors.textMuted} />
                                <Text style={[styles.emptyBillText, { color: theme.colors.textMuted }]}>No items billed yet</Text>
                                <Text style={[styles.emptyBillHint, { color: theme.colors.textMuted }]}>Tap "Generate Bill" below to add parts & services</Text>
                            </View>
                        )}
                        {(total?.total > 0) && (
                            <View style={styles.totalsBlock}>
                                <View style={styles.totalRow}>
                                    <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Subtotal</Text>
                                    <Text style={[styles.totalValue, { color: theme.colors.textSecondary }]}>{formatCurrency(total.subTotal)}</Text>
                                </View>
                                {total.discount > 0 && (
                                    <View style={styles.totalRow}>
                                        <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Discount</Text>
                                        <Text style={[styles.totalValue, { color: theme.colors.success }]}>-{formatCurrency(total.discount)}</Text>
                                    </View>
                                )}
                                {total.referralDiscount > 0 && (
                                    <View style={styles.totalRow}>
                                        <View style={styles.referralLabelRow}>
                                            <Ionicons name="gift-outline" size={13} color={theme.colors.success} />
                                            <Text style={[styles.totalLabel, { color: theme.colors.success }]}>Referral Discount</Text>
                                        </View>
                                        <Text style={[styles.totalValue, { color: theme.colors.success }]}>-{formatCurrency(total.referralDiscount)}</Text>
                                    </View>
                                )}
                                <Divider theme={theme} style={{ marginVertical: 10 }} />
                                <View style={styles.totalRow}>
                                    <Text style={[styles.grandTotalLabel, { color: theme.colors.textPrimary }]}>TOTAL AMOUNT</Text>
                                    <Text style={[styles.grandTotalValue, { color: theme.colors.primary }]}>{formatCurrency(total.total)}</Text>
                                </View>
                                <Text style={[styles.taxNote, { color: theme.colors.textMuted }]}>Tax inclusive</Text>
                            </View>
                        )}
                    </Card>

                    {/* Location map */}
                    {userLocation?.coordinates?.length === 2 && (
                        <LocationMap coordinates={userLocation.coordinates} city={city} theme={theme} />
                    )}

                    {/* Action Buttons */}
                    <ActionButtons
                        onManage={() => setPanelVisible(true)}
                        onGenerateBill={handleGenerateBill}
                        theme={theme}
                        isInvoiced={isInvoiced}
                    />

                    <Text style={[styles.metaNote, { color: theme.colors.textMuted }]}>
                        Created {formatDate(createdAt)} · Invoice {invoiceDate ? formatDate(invoiceDate) : '—'}
                    </Text>

                    <View style={{ height: 32 }} />
                </Animated.ScrollView>
            </ScreenWrapper>

            <AssignmentPanel
                visible={panelVisible}
                onClose={handlePanelClose}
                order={order}
                theme={theme}
                mechanics={mechanics}
                mechanicsLoading={mechanicsLoading}
                vendors={vendors}
                vendorsLoading={vendorsLoading}
                deliveryBoys={deliveryBoys}
                deliveryBoysLoading={deliveryBoysLoading}
                onAssignMechanic={handleAssignMechanic}
                onAssignVendor={handleAssignVendor}
                onAssignDeliveryBoy={handleAssignDeliveryBoy}
                onUpdateStatus={handleUpdateStatus}
                mutationLoading={mutationLoading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { paddingHorizontal: 1, paddingTop: 18 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    orderRefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    orderRefLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    orderRefId: { fontSize: 22, fontWeight: '900', letterSpacing: 0.4, marginTop: 2 },
    badgeGroup: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '55%' },
    invoiceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
    invoiceBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
    bikeHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    bikeName: { fontSize: 17, fontWeight: '800' },
    bikeSpecs: { fontSize: 12, marginTop: 3, fontWeight: '500' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
    serviceTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    serviceTagText: { fontSize: 12, fontWeight: '600' },
    serviceTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginTop: 8 },
    serviceTypeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
    logisticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    logisticsCell: { flex: 1, minWidth: 140 },
    logisticsCellInner: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4, alignItems: 'flex-start' },
    logisticsLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
    logisticsValue: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
    logisticsTime: { fontSize: 13, fontWeight: '700' },
    assignedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
    assignedText: { fontSize: 10, fontWeight: '700' },
    finSubLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
    emptyBill: { alignItems: 'center', padding: 24, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', gap: 6, marginBottom: 4 },
    emptyBillText: { fontSize: 13, fontWeight: '700' },
    emptyBillHint: { fontSize: 11, textAlign: 'center' },
    totalsBlock: { marginTop: 4 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    totalLabel: { fontSize: 13, fontWeight: '500' },
    totalValue: { fontSize: 13, fontWeight: '600' },
    referralLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    grandTotalLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
    grandTotalValue: { fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
    taxNote: { fontSize: 10, textAlign: 'right', marginTop: 2 },
    metaNote: { fontSize: 11, textAlign: 'center', marginBottom: 8, letterSpacing: 0.2 },
});