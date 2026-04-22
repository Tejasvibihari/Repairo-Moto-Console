import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Animated, Platform, Alert, ActivityIndicator, Linking,
    Image, Modal, Dimensions, Pressable, TextInput, RefreshControl, Switch,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axiosClient from '../../../services/axiosClient';
import InvoiceModal from '../../../components/admin/order/InvoiceModal';
import AssignmentPanel from '../../../components/admin/order/AssignmentPanel';
import useEmployee from '../../../hooks/useEmployee';
import useVendor from '../../../hooks/useVendor';
import useOrder from '../../../hooks/useOrder';
import { getImageUrl } from '../../../utils/imageUtils';
import PopUp from '../../../components/common/PopUp';
import MechanicRatingsCard from '../../../components/common/MechanicRatingCard';
const { width } = Dimensions.get('window');


// ─── Status config (extended) ─────────────────────────────────────────────────
const STATUS_CONFIG = {
    pending: { label: 'Pending', bg: 'rgba(158,142,120,0.18)', text: '#9E8E78', dot: '#9E8E78' },
    mechanic_assigned: { label: 'Mechanic Assigned', bg: 'rgba(52,152,219,0.18)', text: '#3498DB', dot: '#3498DB' },
    mechanic_arrived: { label: 'Mechanic Arrived', bg: 'rgba(155,89,182,0.18)', text: '#9B59B6', dot: '#9B59B6' },
    in_progress: { label: 'In Progress', bg: 'rgba(226,167,49,0.18)', text: '#E2A731', dot: '#E2A731' },
    work_completed: { label: 'Work Completed', bg: 'rgba(46,204,154,0.18)', text: '#2ECC9A', dot: '#2ECC9A' },
    invoice_generated: { label: 'Invoice Generated', bg: 'rgba(155,89,182,0.18)', text: '#9B59B6', dot: '#9B59B6' },
    completed: { label: 'Completed', bg: 'rgba(46,204,154,0.18)', text: '#2ECC9A', dot: '#2ECC9A' },
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

const formatDateTime = (iso) => {
    if (!iso) return '—';
    const date = new Date(iso);
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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

// ─── Star Rating Row ───────────────────────────────────────────────────────────
const StarRow = ({ rating = 0, size = 14, theme }) => {
    const filled = Math.round(rating);
    return (
        <View style={starStyles.row}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                    key={i}
                    name={i <= filled ? 'star' : 'star-outline'}
                    size={size}
                    color={i <= filled ? '#E2A731' : theme.colors.border}
                />
            ))}
        </View>
    );
};
const starStyles = StyleSheet.create({
    row: { flexDirection: 'row', gap: 2, alignItems: 'center' },
});

// ─── Force Status Update Modal ────────────────────────────────────────────────
const ForceStatusModal = ({ visible, onClose, onConfirm, theme, currentStatus }) => {
    const statusOptions = [
        'Pending', 'Mechanic Assigned', 'Mechanic Arrived', 'In Progress',
        'Work Completed', 'Invoice Generated', 'Completed', 'Cancelled',
    ];
    const [selected, setSelected] = useState(currentStatus);

    useEffect(() => { if (visible) setSelected(currentStatus); }, [visible, currentStatus]);

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={modalStyles.overlay}>
                <View style={[modalStyles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[modalStyles.title, { color: theme.colors.textPrimary }]}>⚠️ Force Update Status</Text>
                    <Text style={[modalStyles.warning, { color: theme.colors.textMuted }]}>
                        You are bypassing the normal workflow. This may disrupt the order process. Only proceed if you are certain.
                    </Text>

                    <Text style={[modalStyles.label, { color: theme.colors.textSecondary }]}>Select New Status</Text>
                    <ScrollView style={modalStyles.pickerContainer} nestedScrollEnabled>
                        {statusOptions.map((s) => (
                            <TouchableOpacity
                                key={s}
                                style={[
                                    modalStyles.option,
                                    { borderBottomColor: theme.colors.border },
                                    selected === s && { backgroundColor: theme.colors.primary + '22' },
                                ]}
                                onPress={() => setSelected(s)}
                            >
                                <Text style={[modalStyles.optionText, { color: theme.colors.textPrimary }]}>{s}</Text>
                                {selected === s && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={modalStyles.buttonRow}>
                        <TouchableOpacity style={[modalStyles.cancelBtn, { borderColor: theme.colors.border }]} onPress={onClose}>
                            <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[modalStyles.confirmBtn, { backgroundColor: theme.colors.error }]}
                            onPress={() => onConfirm(selected)}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700' }}>Force Update</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const CodPaymentModal = ({
    visible,
    onClose,
    onConfirm,
    theme,
    defaultAmount,
    isBusinessAccount,          // new prop
    useGstInvoice,              // new state passed from parent
    setUseGstInvoice            // state setter from parent
}) => {
    const [amount, setAmount] = useState(String(defaultAmount || ''));

    useEffect(() => {
        if (visible) setAmount(String(defaultAmount || ''));
    }, [visible, defaultAmount]);

    const handleConfirm = () => {
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed < 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }
        // Pass both amount and GST flag to parent
        onConfirm(parsed, useGstInvoice);
    };

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={modalStyles.overlay}>
                <View style={[modalStyles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[modalStyles.title, { color: theme.colors.textPrimary }]}>💵 Mark Paid (COD)</Text>
                    <Text style={[modalStyles.warning, { color: theme.colors.textMuted }]}>
                        Enter the amount collected from the customer.
                    </Text>
                    <TextInput
                        style={[modalStyles.input, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="Amount"
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    {/* GST Invoice Toggle - only for business accounts */}
                    {isBusinessAccount && (
                        <View style={modalStyles.gstRow}>
                            <Text style={{ color: theme.colors.textPrimary, flex: 1 }}>
                                Generate GST Invoice
                            </Text>
                            <Switch
                                value={useGstInvoice}
                                onValueChange={setUseGstInvoice}
                                trackColor={{ false: '#767577', true: theme.colors.primary }}
                                thumbColor={useGstInvoice ? '#f4f3f4' : '#f4f3f4'}
                            />
                        </View>
                    )}

                    <View style={modalStyles.buttonRow}>
                        <TouchableOpacity style={[modalStyles.cancelBtn, { borderColor: theme.colors.border }]} onPress={onClose}>
                            <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[modalStyles.confirmBtn, { backgroundColor: theme.colors.primary }]} onPress={handleConfirm}>
                            <Text style={{ color: '#1a1a1a', fontWeight: '700' }}>Confirm Payment</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

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

// ─── FinancialRow with discount support ───────────────────────────────────────
const FinancialRow = ({ icon, name, qty, effectivePrice, originalPrice, discount, theme }) => (
    <View style={finStyles.row}>
        <View style={[finStyles.iconWrap, { backgroundColor: theme.colors.surfaceHigh }]}>
            <Ionicons name={icon} size={13} color={theme.colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={[finStyles.name, { color: theme.colors.textPrimary }]}>{name}</Text>
            <Text style={[finStyles.qty, { color: theme.colors.textMuted }]}>{qty}</Text>
            {discount > 0 && (
                <View style={finStyles.discountBadge}>
                    <Text style={finStyles.discountText}>−{formatCurrency(discount)}</Text>
                </View>
            )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
            {originalPrice && discount > 0 && (
                <Text style={[finStyles.originalPrice, { color: theme.colors.textMuted }]}>{formatCurrency(originalPrice)}</Text>
            )}
            <Text style={[finStyles.price, { color: theme.colors.textSecondary }]}>{formatCurrency(effectivePrice)}</Text>
        </View>
    </View>
);
const finStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    iconWrap: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 13, fontWeight: '600' },
    qty: { fontSize: 11, marginTop: 1 },
    price: { fontSize: 13, fontWeight: '600', minWidth: 70, textAlign: 'right' },
    originalPrice: { fontSize: 10, textDecorationLine: 'line-through', marginBottom: 2 },
    discountBadge: { backgroundColor: '#FF6B6B22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start', marginTop: 2 },
    discountText: { fontSize: 9, fontWeight: '700', color: '#FF6B6B' },
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

// ─── Payment Status Card (unchanged) ──────────────────────────────────────────
const PaymentStatusCard = ({ order, theme }) => {
    const ps = PAYMENT_STATUS_CONFIG[order.paymentStatus] ?? PAYMENT_STATUS_CONFIG.unpaid;
    const methodIcon = PAYMENT_METHOD_ICONS[order.paymentMethod] ?? 'cash-outline';
    const methodLabel = order.paymentMethod
        ? order.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Not set';

    const amountPaid = order.amountPaid ?? 0;
    const grandTotal = order.total?.finalPayable ?? order.total?.total ?? 0;
    const balance = Math.max(0, grandTotal - amountPaid);
    const paymentDate = order.paymentDate ? formatDate(order.paymentDate) : null;
    const razorpayLink = order.razorpay?.paymentLinkUrl;

    const handlePayNow = () => {
        if (razorpayLink) {
            Linking.openURL(razorpayLink).catch(() => Alert.alert('Error', 'Could not open payment link'));
        } else {
            Alert.alert('Not Available', 'No payment link found for this order.');
        }
    };

    return (
        <Card theme={theme}>
            <SectionLabel label="Payment Status" theme={theme} />
            <View style={psStyles.row}>
                <View style={[psStyles.pill, { backgroundColor: ps.bg, borderColor: ps.border }]}>
                    <Ionicons name={ps.icon} size={15} color={ps.text} />
                    <Text style={[psStyles.pillText, { color: ps.text }]}>{ps.label}</Text>
                </View>

                {order.paymentMethod && (
                    <View style={[psStyles.method, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                        <Ionicons name={methodIcon} size={13} color={theme.colors.textSecondary} />
                        <Text style={[psStyles.methodText, { color: theme.colors.textSecondary }]}>{methodLabel}</Text>
                    </View>
                )}
            </View>

            {paymentDate && (
                <View style={[psStyles.paymentDate, { backgroundColor: theme.colors.surfaceLow }]}>
                    <Ionicons name="calendar-outline" size={12} color={theme.colors.textMuted} />
                    <Text style={[psStyles.dateText, { color: theme.colors.textMuted }]}>Paid on {paymentDate}</Text>
                </View>
            )}

            {(order.paymentStatus === 'partial' || order.paymentStatus === 'unpaid') && grandTotal > 0 && (
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

            {order.paymentStatus === 'unpaid' && razorpayLink && (
                <TouchableOpacity style={[psStyles.payNowBtn, { backgroundColor: theme.colors.primary }]} onPress={handlePayNow}>
                    <Ionicons name="card-outline" size={14} color="#1a1a1a" />
                    <Text style={psStyles.payNowText}>Pay Now</Text>
                </TouchableOpacity>
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
    paymentDate: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start' },
    dateText: { fontSize: 11, fontWeight: '500' },
    breakdown: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 12, gap: 0 },
    bRow: { flex: 1, alignItems: 'center', gap: 3 },
    bLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    bVal: { fontSize: 14, fontWeight: '800' },
    bDivider: { width: StyleSheet.hairlineWidth, height: 30, marginHorizontal: 8 },
    payNowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 12, borderRadius: 12 },
    payNowText: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
});

// ─── Timeline Component (unchanged) ───────────────────────────────────────────
const OrderTimeline = ({ order, theme }) => {
    const steps = [
        { key: 'pending', label: 'Pending', icon: 'time-outline', timestamp: order.createdAt },
        { key: 'mechanic_assigned', label: 'Mechanic Assigned', icon: 'person-add-outline', timestamp: order.assignedAt },
        { key: 'mechanic_arrived', label: 'Mechanic Arrived', icon: 'location-outline', timestamp: order.arrivedAt },
        { key: 'in_progress', label: 'Work Started', icon: 'construct-outline', timestamp: order.workStartedAt },
        { key: 'work_completed', label: 'Work Done', icon: 'checkmark-done-outline', timestamp: order.workCompletedAt },
        { key: 'invoice_generated', label: 'Invoice Generated', icon: 'receipt-outline', timestamp: order.invoiceDate },
        { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline', timestamp: order.completedAt },
    ];

    const currentStatusKey = order.status?.toLowerCase().trim().replace(/\s+/g, '_');
    let currentIndex = steps.findIndex(s => s.key === currentStatusKey);
    if (currentIndex === -1) currentIndex = 0;

    if (currentStatusKey === 'cancelled') {
        return (
            <Card theme={theme}>
                <SectionLabel label="Order Cancelled" theme={theme} />
                <View style={timelineStyles.cancelledContainer}>
                    <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                    <Text style={[timelineStyles.cancelledText, { color: theme.colors.textSecondary }]}>
                        This order was cancelled on {formatDateTime(order.cancelledAt)}
                    </Text>
                </View>
            </Card>
        );
    }

    return (
        <Card theme={theme}>
            <SectionLabel label="Order Progress" theme={theme} />
            <View style={timelineStyles.container}>
                {steps.map((step, idx) => {
                    const isCompleted = idx <= currentIndex;
                    const isActive = idx === currentIndex;
                    const config = STATUS_CONFIG[step.key] ?? STATUS_CONFIG.pending;
                    const timestamp = step.timestamp;
                    return (
                        <View key={step.key} style={timelineStyles.stepRow}>
                            <View style={timelineStyles.leftCol}>
                                <View style={[
                                    timelineStyles.dot,
                                    {
                                        backgroundColor: isCompleted ? config.dot : theme.colors.surfaceHigh,
                                        borderColor: isCompleted ? config.dot : theme.colors.border,
                                    }
                                ]}>
                                    {isCompleted && <Ionicons name="checkmark" size={10} color="#fff" />}
                                </View>
                                {idx < steps.length - 1 && (
                                    <View style={[
                                        timelineStyles.line,
                                        { backgroundColor: idx < currentIndex ? config.dot : theme.colors.border }
                                    ]} />
                                )}
                            </View>
                            <View style={timelineStyles.content}>
                                <Text style={[
                                    timelineStyles.stepLabel,
                                    { color: isActive ? config.text : theme.colors.textSecondary }
                                ]}>
                                    {step.label}
                                </Text>
                                {timestamp && (
                                    <Text style={[timelineStyles.timestamp, { color: theme.colors.textMuted }]}>
                                        {formatDateTime(timestamp)}
                                    </Text>
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        </Card>
    );
};

const timelineStyles = StyleSheet.create({
    container: { paddingVertical: 4 },
    stepRow: { flexDirection: 'row', marginBottom: 12 },
    leftCol: { width: 24, alignItems: 'center', marginRight: 14 },
    dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    line: { width: 2, flex: 1, marginTop: 2 },
    content: { flex: 1, paddingBottom: 8 },
    stepLabel: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
    timestamp: { fontSize: 11, fontWeight: '500' },
    cancelledContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    cancelledText: { fontSize: 13, fontWeight: '500' },
});

// ─── Photo Gallery Components ──────────────────────────────────────────────────
const PhotoGrid = ({ photos, theme, onPhotoPress }) => {
    if (!photos || photos.length === 0) return null;
    const imageSize = (width - 80) / 3;
    return (
        <View style={photoStyles.grid}>
            {photos.slice(0, 6).map((uri, index) => (
                <TouchableOpacity
                    key={index}
                    onPress={() => onPhotoPress(index)}
                    activeOpacity={0.8}
                    style={[photoStyles.thumbnail, { width: imageSize, height: imageSize, borderColor: theme.colors.border }]}
                >
                    <Image source={{ uri }} style={photoStyles.image} resizeMode="cover" />
                    {photos.length > 6 && index === 5 && (
                        <View style={[photoStyles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                            <Text style={photoStyles.overlayText}>+{photos.length - 6}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );
};

const FullScreenImage = ({ visible, images, initialIndex, onClose, theme }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
    useEffect(() => {
        if (visible) setCurrentIndex(initialIndex || 0);
    }, [visible, initialIndex]);

    if (!visible) return null;
    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={[fullStyles.container, { backgroundColor: theme.colors.background }]}>
                <TouchableOpacity style={fullStyles.closeBtn} onPress={onClose}>
                    <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                        setCurrentIndex(idx);
                    }}
                >
                    {images.map((uri, idx) => (
                        <View key={idx} style={{ width }}>
                            <Image source={{ uri }} style={fullStyles.image} resizeMode="contain" />
                        </View>
                    ))}
                </ScrollView>
                <Text style={[fullStyles.counter, { color: theme.colors.textMuted }]}>
                    {currentIndex + 1} / {images.length}
                </Text>
            </View>
        </Modal>
    );
};

const photoStyles = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    thumbnail: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
    image: { width: '100%', height: '100%' },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
    overlayText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

const fullStyles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    closeBtn: { position: 'absolute', top: 48, right: 20, zIndex: 10, padding: 8 },
    image: { width, height: '100%' },
    counter: { position: 'absolute', bottom: 32, alignSelf: 'center', fontSize: 14, fontWeight: '600' },
});

// ─── Map Component (unchanged) ─────────────────────────────────────────────────
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

// ─── Action Buttons (updated to include COD and Force Status) ─────────────────
const ActionButtons = ({
    onManage, onGenerateBill, onViewInvoice, onMarkCod, onForceStatus,
    theme, isCompletedAndPaid, isInvoiceGenerated, paymentStatus,
}) => (
    <View style={fabStyles.container}>
        <View style={fabStyles.row}>
            <TouchableOpacity
                style={[fabStyles.secondaryBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={onManage}
            >
                <Ionicons name="settings-outline" size={16} color={theme.colors.textPrimary} />
                <Text style={[fabStyles.secondaryLabel, { color: theme.colors.textPrimary }]}>Manage</Text>
            </TouchableOpacity>

            {isCompletedAndPaid ? (
                <TouchableOpacity
                    style={[fabStyles.primaryBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={onViewInvoice}
                >
                    <Ionicons name="eye-outline" size={16} color="#1a1a1a" />
                    <Text style={fabStyles.primaryLabel}>View Invoice</Text>
                </TouchableOpacity>
            ) : isInvoiceGenerated && paymentStatus !== 'paid' ? (
                <TouchableOpacity
                    style={[fabStyles.codBtn, { backgroundColor: theme.colors.success }]}
                    onPress={onMarkCod}
                >
                    <Ionicons name="cash-outline" size={16} color="#fff" />
                    <Text style={fabStyles.codLabel}>Mark Paid (COD)</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={[fabStyles.primaryBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={onGenerateBill}
                >
                    <Ionicons name="receipt-outline" size={16} color="#1a1a1a" />
                    <Text style={fabStyles.primaryLabel}>Generate Bill</Text>
                </TouchableOpacity>
            )}
        </View>
    </View>
);
const fabStyles = StyleSheet.create({
    container: { marginBottom: 12 },
    row: { flexDirection: 'row', gap: 10, marginHorizontal: 1 },
    warningBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, marginBottom: 10, borderRadius: 12, borderWidth: 1,
    },
    warningLabel: { fontSize: 13, fontWeight: '700' },
    secondaryBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        paddingVertical: 14, borderRadius: 16, borderWidth: 1,
    },
    secondaryLabel: { fontSize: 13, fontWeight: '700' },
    primaryBtn: {
        flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        paddingVertical: 14, borderRadius: 16,
    },
    primaryLabel: { fontSize: 13, fontWeight: '900', color: '#1a1a1a' },
    codBtn: {
        flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        paddingVertical: 14, borderRadius: 16,
    },
    codLabel: { fontSize: 13, fontWeight: '900', color: '#fff' },
});

// ─── Updated AssignmentSummaryCard (shows all mechanics) ──────────────────────
const AssignmentSummaryCard = ({ order, theme, onManage }) => {
    const sc = getStatusConfig(order.status);
    const mechanicNames = order.assignedMechanics?.length ? order.assignedMechanics.join(', ') : 'Unassigned';
    const vendorName = order.assignedVendor || 'Unassigned';
    const deliveryName = order.assignedDelivery || 'Unassigned';

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
                    { label: 'MECHANIC(S)', value: mechanicNames, icon: 'construct-outline', color: '#3498DB', assignedColor: '#2ECC9A' },
                    { label: 'VENDOR', value: vendorName, icon: 'business-outline', color: '#9B59B6', assignedColor: '#9B59B6' },
                    { label: 'DELIVERY', value: deliveryName, icon: 'bicycle-outline', color: '#E2A731', assignedColor: '#E2A731' },
                ].map((cell) => (
                    <View key={cell.label} style={[assignStyles.cell, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                        <View style={[assignStyles.cellIcon, { backgroundColor: cell.value !== 'Unassigned' ? cell.color + '22' : theme.colors.surfaceHigh }]}>
                            <Ionicons name={cell.icon} size={14} color={cell.value !== 'Unassigned' ? cell.color : theme.colors.textMuted} />
                        </View>
                        <Text style={[assignStyles.cellLabel, { color: theme.colors.textMuted }]}>{cell.label}</Text>
                        <Text style={[assignStyles.cellValue, { color: cell.value !== 'Unassigned' ? theme.colors.textPrimary : theme.colors.textMuted }]} numberOfLines={2}>
                            {cell.value}
                        </Text>
                        <View style={[assignStyles.assignedPill, { backgroundColor: cell.value !== 'Unassigned' ? cell.assignedColor + '22' : 'rgba(158,142,120,0.15)' }]}>
                            <Text style={[assignStyles.pillText, { color: cell.value !== 'Unassigned' ? cell.assignedColor : '#9E8E78' }]}>
                                {cell.value !== 'Unassigned' ? 'Assigned' : 'Pending'}
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

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function AdminOrderDetail({ route, navigation }) {
    const orderIdParam = route?.params?.order?._id || route?.params?.orderId;
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const isBusinessAccount = order?.userId?.accountType || false;

    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const [popup, setPopup] = useState({
        visible: false,
        title: '',
        message: '',
        primaryLabel: 'OK',
        secondaryLabel: 'Cancel',
        onPrimary: () => { },
        onSecondary: () => { },
    });
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [panelVisible, setPanelVisible] = useState(false);
    const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
    const [invoiceData, setInvoiceData] = useState(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState({ visible: false, images: [], index: 0 });

    const [forceModalVisible, setForceModalVisible] = useState(false);
    const [codModalVisible, setCodModalVisible] = useState(false);
    const [useGstInvoice, setUseGstInvoice] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const { data: mechanics, loading: mechanicsLoading } = useEmployee({ position: 'mechanic' });
    const { data: deliveryBoys, loading: deliveryBoysLoading } = useEmployee({ position: 'delivery' });
    const { data: vendors, loading: vendorsLoading } = useVendor();
    const { updateMechanic, updateVendor, updateDelivery: updateDeliveryBoy, updateOrderStatus, mutationLoading } = useOrder({}, 1, 10);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    const showAlert = (title, message, onOk) => {
        setPopup({
            visible: true,
            title,
            message,
            primaryLabel: 'OK',
            secondaryLabel: null,
            onPrimary: () => {
                setPopup(prev => ({ ...prev, visible: false }));
                if (onOk) onOk();
            },
            onSecondary: () => setPopup(prev => ({ ...prev, visible: false })),
        });
    };

    const showConfirm = (title, message, onConfirm, onCancel) => {
        setPopup({
            visible: true,
            title,
            message,
            primaryLabel: 'Yes',
            secondaryLabel: 'No',
            onPrimary: () => {
                setPopup(prev => ({ ...prev, visible: false }));
                if (onConfirm) onConfirm();
            },
            onSecondary: () => {
                setPopup(prev => ({ ...prev, visible: false }));
                if (onCancel) onCancel();
            },
        });
    };

    const fetchOrder = useCallback(async () => {
        if (!orderIdParam) { setLoading(false); return; }
        try {
            setLoading(true);
            const response = await axiosClient.get(`/api/admin/order/getorderbyid/${orderIdParam}`);
            setOrder(response.data);
        } catch (err) {
            console.error('Failed to fetch order:', err);
            showAlert('Error', 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    }, [orderIdParam]);
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchOrder();
        setRefreshing(false);
    }, [fetchOrder]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, speed: 16, bounciness: 4, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleForceStatus = useCallback(async (newStatus) => {
        try {
            const res = await axiosClient.put(`/api/admin/order/force-update-status/${order._id}`, { status: newStatus });
            setOrder(res.data.data);
            showAlert('Success', `Status forcefully updated to ${newStatus}`);
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to update status');
        } finally {
            setForceModalVisible(false);
        }
    }, [order]);

    const handleMarkCod = useCallback(async (amount) => {
        try {
            const res = await axiosClient.post(`/api/admin/order/${order._id}/mark-paid-cod`, {
                amountCollected: amount,
                useGstInvoice,
            });
            setOrder(res.data.order);
            showAlert('Success', 'Payment recorded and invoice generated.');
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to record payment');
        } finally {
            setCodModalVisible(false);
        }
    }, [order]);

    const handlePanelClose = useCallback(() => { setPanelVisible(false); fetchOrder(); }, [fetchOrder]);

    const handleAssignMechanic = useCallback(async (orderId, mechanicIds) => {
        if (!Array.isArray(mechanicIds) || mechanicIds.length === 0) {
            showAlert('Error', 'Please select at least one mechanic.');
            return;
        }
        try {
            const result = await updateMechanic(orderId, mechanicIds);
            if (result?.data) {
                setOrder(result.data);
            } else {
                await fetchOrder();
            }
            setPanelVisible(false);
        } catch (err) {
            showAlert('Error', err.message || 'Failed to assign mechanics');
        }
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

    const handleViewInvoice = useCallback(async () => {
        console.log(order._id);
        try {
            setInvoiceLoading(true);
            setInvoiceModalVisible(true);
            const res = await axiosClient.get(`/api/admin/order/${order._id}/invoice`);
            console.log(res.data);
            setInvoiceData(res.data?.invoice || null);
        } catch (err) {
            setInvoiceModalVisible(false);
            console.log(err);
            const msg = err.response?.data?.message || 'Failed to fetch invoice';
            showAlert('Error', msg);
        } finally {
            setInvoiceLoading(false);
        }
    }, [order]);

    const openFullScreenImage = (images, index) => {
        setFullScreenImage({ visible: true, images, index });
    };

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
        serviceType = '', preferredDate = null, preferredTime = '', assignedMechanics = [],
        assignedDelivery = null, status = 'pending', partsUsed = [], serviceProvided = [],
        total = {}, createdAt = null, invoiceDate = null, userLocation = null,
        paymentStatus, paymentMethod, amountPaid, beforePhotos = [], afterPhotos = [],
    } = order;

    const sc = getStatusConfig(status);
    const serviceChip = getServiceChipStyle(serviceType);
    const bikeInfo = [selectedBrand, selectedModel].filter(Boolean).join(' ');
    const bikeSpecs = [cc ? `${cc}cc` : null, bs ? bs.toUpperCase() : null].filter(Boolean).join(' · ');
    const coordStr = userLocation?.coordinates?.length === 2
        ? `${userLocation.coordinates[1].toFixed(4)}, ${userLocation.coordinates[0].toFixed(4)}`
        : null;
    const isInvoiced = status?.toLowerCase().replace(/\s+/g, '_') === 'invoice_generated';
    const isCompleted = status?.toLowerCase() === 'completed';
    const isInvoiceGenerated = order?.status === 'Invoice Generated';
    const isPaid = order?.paymentStatus === 'paid';
    const isCompletedAndPaid = order?.status === 'Completed' && isPaid;
    const grandTotal = total?.finalPayable ?? total?.total ?? 0;
    const mechanicNames = assignedMechanics?.length ? assignedMechanics.join(', ') : 'Unassigned';

    const getEffectiveItem = (item, isPart = true) => {
        const price = item.price || 0;
        const discount = item.discountPrice || 0;
        const effective = price - discount;
        const quantity = item.quantity || 1;
        return {
            name: isPart ? item.partName : item.serviceName,
            quantity,
            originalTotal: price * quantity,
            effectiveTotal: effective * quantity,
            discountTotal: discount * quantity,
            discountApplied: discount > 0,
            unitPrice: price,
            unitEffective: effective,
        };
    };

    const partsWithDiscount = partsUsed.map(p => getEffectiveItem(p, true));
    const servicesWithDiscount = serviceProvided.map(s => getEffectiveItem(s, false));
    const showTaxes = (total.cgst > 0 || total.sgst > 0) && (total.cgstRate || total.sgstRate);

    const baseUrl = axiosClient.defaults.baseURL?.replace('/api', '') || '';
    const beforePhotoUrls = order?.beforePhoto ? [getImageUrl(order.beforePhoto)] : [];
    const afterPhotoUrls = order?.afterPhoto ? [getImageUrl(order.afterPhoto)] : [];

    return (
        <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
            <ScreenWrapper title="Order Details">
                <Animated.ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.colors.primary]}
                            tintColor={theme.colors.primary}
                            progressBackgroundColor={theme.colors.surface}
                        />
                    }
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
                        </View>
                    </View>

                    <Divider theme={theme} style={{ marginBottom: 16 }} />

                    <OrderTimeline order={order} theme={theme} />
                    <AssignmentSummaryCard order={order} theme={theme} onManage={() => setPanelVisible(true)} />

                    {(paymentStatus || isInvoiceGenerated) && <PaymentStatusCard order={order} theme={theme} />}

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

                    {/* Before & After Photos */}
                    {(beforePhotoUrls.length > 0 || afterPhotoUrls.length > 0) && (
                        <Card theme={theme}>
                            {beforePhotoUrls.length > 0 && (
                                <>
                                    <SectionLabel label="Before Repair" theme={theme} />
                                    <PhotoGrid photos={beforePhotoUrls} theme={theme} onPhotoPress={(index) => openFullScreenImage(beforePhotoUrls, index)} />
                                </>
                            )}
                            {afterPhotoUrls.length > 0 && (
                                <>
                                    <SectionLabel label="After Repair" theme={theme} style={{ marginTop: beforePhotoUrls.length ? 16 : 0 }} />
                                    <PhotoGrid photos={afterPhotoUrls} theme={theme} onPhotoPress={(index) => openFullScreenImage(afterPhotoUrls, index)} />
                                </>
                            )}
                        </Card>
                    )}

                    {/* Logistics & Appointment */}
                    <Card theme={theme}>
                        <SectionLabel label="Logistics & Appointment" theme={theme} />
                        <View style={styles.logisticsGrid}>
                            {[
                                { icon: 'calendar-outline', label: 'SCHEDULE', value: formatDate(preferredDate), sub: preferredTime, subColor: theme.colors.primary },
                                { icon: 'person-circle-outline', label: 'MECHANIC(S)', value: mechanicNames, assigned: assignedMechanics?.length > 0, assignedColor: '#2ECC9A' },
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

                        {partsWithDiscount.length > 0 && (
                            <>
                                <Text style={[styles.finSubLabel, { color: theme.colors.textMuted }]}>PARTS & CONSUMABLES</Text>
                                {partsWithDiscount.map((item, idx) => (
                                    <FinancialRow
                                        key={idx}
                                        icon="construct-outline"
                                        name={item.name}
                                        qty={`${item.quantity} × ${formatCurrency(item.unitPrice)}`}
                                        effectivePrice={item.effectiveTotal}
                                        originalPrice={item.discountApplied ? item.originalTotal : null}
                                        discount={item.discountTotal}
                                        theme={theme}
                                    />
                                ))}
                                <Divider theme={theme} style={{ marginBottom: 12 }} />
                            </>
                        )}

                        {servicesWithDiscount.length > 0 && (
                            <>
                                <Text style={[styles.finSubLabel, { color: theme.colors.textMuted }]}>SERVICES PROVIDED</Text>
                                {servicesWithDiscount.map((item, idx) => (
                                    <FinancialRow
                                        key={idx}
                                        icon="checkmark-circle-outline"
                                        name={item.name}
                                        qty={`${item.quantity} × ${formatCurrency(item.unitPrice)}`}
                                        effectivePrice={item.effectiveTotal}
                                        originalPrice={item.discountApplied ? item.originalTotal : null}
                                        discount={item.discountTotal}
                                        theme={theme}
                                    />
                                ))}
                                <Divider theme={theme} style={{ marginBottom: 12 }} />
                            </>
                        )}

                        {(partsWithDiscount.length === 0 && servicesWithDiscount.length === 0) && (
                            <View style={[styles.emptyBill, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                                <Ionicons name="receipt-outline" size={22} color={theme.colors.textMuted} />
                                <Text style={[styles.emptyBillText, { color: theme.colors.textMuted }]}>No items billed yet</Text>
                                <Text style={[styles.emptyBillHint, { color: theme.colors.textMuted }]}>Tap "Generate Bill" below to add parts & services</Text>
                            </View>
                        )}

                        {(grandTotal > 0) && (
                            <View style={styles.totalsBlock}>
                                <View style={styles.totalRow}>
                                    <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Subtotal</Text>
                                    <Text style={[styles.totalValue, { color: theme.colors.textSecondary }]}>{formatCurrency(total.subTotal ?? 0)}</Text>
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

                                {showTaxes && (
                                    <>
                                        <View style={styles.totalRow}>
                                            <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>CGST ({total.cgstRate}%)</Text>
                                            <Text style={[styles.totalValue, { color: theme.colors.textSecondary }]}>{formatCurrency(total.cgst)}</Text>
                                        </View>
                                        <View style={styles.totalRow}>
                                            <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>SGST ({total.sgstRate}%)</Text>
                                            <Text style={[styles.totalValue, { color: theme.colors.textSecondary }]}>{formatCurrency(total.sgst)}</Text>
                                        </View>
                                    </>
                                )}

                                <Divider theme={theme} style={{ marginVertical: 10 }} />
                                <View style={styles.totalRow}>
                                    <Text style={[styles.grandTotalLabel, { color: theme.colors.textPrimary }]}>TOTAL AMOUNT</Text>
                                    <Text style={[styles.grandTotalValue, { color: theme.colors.primary }]}>{formatCurrency(grandTotal)}</Text>
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
                        onViewInvoice={handleViewInvoice}
                        onMarkCod={() => setCodModalVisible(true)}
                        onForceStatus={() => setForceModalVisible(true)}
                        theme={theme}
                        isCompletedAndPaid={isCompletedAndPaid}
                        isInvoiceGenerated={isInvoiceGenerated}
                        paymentStatus={paymentStatus}
                    />

                    {/* ── Mechanic Ratings Card ─────────────────────────────────────
                        Fetches every assigned mechanic's ratings via
                        GET /api/admin/employee/:id. Tap a mechanic row to expand
                        their full review list. Hidden when no mechanicIds exist. ── */}
                    <MechanicRatingsCard order={order} theme={theme} />

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

            <InvoiceModal
                visible={invoiceModalVisible}
                invoice={invoiceData}
                onClose={() => setInvoiceModalVisible(false)}
                theme={theme}
                loading={invoiceLoading}
            />

            <FullScreenImage
                visible={fullScreenImage.visible}
                images={fullScreenImage.images}
                initialIndex={fullScreenImage.index}
                onClose={() => setFullScreenImage({ visible: false, images: [], index: 0 })}
                theme={theme}
            />
            <ForceStatusModal
                visible={forceModalVisible}
                onClose={() => setForceModalVisible(false)}
                onConfirm={handleForceStatus}
                theme={theme}
                currentStatus={order?.status}
            />
            <CodPaymentModal
                visible={codModalVisible}
                onClose={() => setCodModalVisible(false)}
                onConfirm={handleMarkCod}
                theme={theme}
                defaultAmount={order?.total?.total || 0}
                isBusinessAccount={isBusinessAccount}
                useGstInvoice={useGstInvoice}
                setUseGstInvoice={setUseGstInvoice}
            />
            <PopUp
                visible={popup.visible}
                title={popup.title}
                message={popup.message}
                primaryLabel={popup.primaryLabel}
                secondaryLabel={popup.secondaryLabel}
                onPrimary={popup.onPrimary}
                onSecondary={popup.onSecondary}
                onClose={() => setPopup(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const modalStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    container: { width: '100%', maxWidth: 400, borderRadius: 20, borderWidth: 1, padding: 20 },
    title: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    warning: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    pickerContainer: { maxHeight: 250, marginBottom: 20 },
    option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
    optionText: { fontSize: 15 },
    buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1 },
    confirmBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
    input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, marginBottom: 20 },
    gstRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        marginBottom: 4,
    },
});

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