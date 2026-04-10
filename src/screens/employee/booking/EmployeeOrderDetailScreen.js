// src/screens/employee/booking/EmployeeOrderDetailScreen.js
// ─── Employee view: edit parts/services, view financial breakdown ───
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Animated, Platform, Alert, ActivityIndicator, Linking,
    TextInput, Modal, Dimensions, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axiosClient from '../../../services/axiosClient';

// ─── Status config (display only) ─────────────────────────────────────────────
const STATUS_CONFIG = {
    pending: { label: 'Pending', bg: 'rgba(158,142,120,0.18)', text: '#9E8E78', dot: '#9E8E78' },
    in_progress: { label: 'In Progress', bg: 'rgba(226,167,49,0.18)', text: '#E2A731', dot: '#E2A731' },
    mechanic_assigned: { label: 'Mechanic Assigned', bg: 'rgba(52,152,219,0.18)', text: '#3498DB', dot: '#3498DB' },
    completed: { label: 'Completed', bg: 'rgba(46,204,154,0.18)', text: '#2ECC9A', dot: '#2ECC9A' },
    invoice_generated: { label: 'Invoice Generated', bg: 'rgba(155,89,182,0.18)', text: '#9B59B6', dot: '#9B59B6' },
    cancelled: { label: 'Cancelled', bg: 'rgba(255,107,107,0.18)', text: '#FF6B6B', dot: '#FF6B6B' },
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

// ─── Map Component (unchanged) ────────────────────────────────────────────────
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

// ─── Add/Edit Item Drawer (extracted from AdminGenerateInvoice) ───────────────
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISCOUNT_TYPES = ['None', 'Flat', 'Percentage'];
const genId = () => Math.random().toString(36).substr(2, 9);

const AddItemDrawer = ({ visible, type, onClose, onSave, theme, editItem }) => {
    const isDark = theme === DarkTheme;
    const insets = useSafeAreaInsets();

    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [price, setPrice] = useState('');
    const [discountType, setDiscountType] = useState('None');
    const [discountValue, setDiscountValue] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
        const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    useEffect(() => {
        if (visible) {
            if (editItem) {
                setName(editItem.name || '');
                setQuantity(String(editItem.quantity || 1));
                setPrice(String(editItem.price || 0));
                setDiscountType(editItem.discountType || 'None');
                setDiscountValue(String(editItem.discountValue || 0));
            } else {
                setName(''); setQuantity('1'); setPrice('');
                setDiscountType('None'); setDiscountValue('');
            }
        } else {
            Keyboard.dismiss();
            setKeyboardHeight(0);
        }
    }, [visible, editItem]);

    const handleDiscountTypeChange = (dt) => {
        Keyboard.dismiss();
        setDiscountType(dt);
    };

    const unitPrice = parseFloat(price) || 0;
    const qty = parseFloat(quantity) || 0;
    const subtotal = unitPrice * qty;
    const discAmt = discountType === 'Percentage'
        ? subtotal * (parseFloat(discountValue) || 0) / 100
        : discountType === 'Flat' ? parseFloat(discountValue) || 0 : 0;
    const total = Math.max(0, subtotal - discAmt);

    const handleSave = () => {
        Keyboard.dismiss();
        if (!name.trim()) { Alert.alert('Missing Name', `Please enter a ${type} name.`); return; }
        if (!price || parseFloat(price) <= 0) { Alert.alert('Invalid Price', 'Please enter a valid price greater than 0.'); return; }
        onSave({
            id: editItem?.id || genId(),
            type,
            name: name.trim(),
            quantity: parseFloat(quantity) || 1,
            price: parseFloat(price) || 0,
            discountType,
            discountValue: parseFloat(discountValue) || 0,
        });
        onClose();
    };

    const inputStyle = {
        backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
    };

    const isPartType = type === 'part';
    const accentColor = isPartType ? '#3498DB' : '#2ECC9A';
    const accentBg = isPartType ? 'rgba(52,152,219,0.12)' : 'rgba(46,204,154,0.12)';

    const androidLift = Platform.OS === 'android' ? keyboardHeight : 0;
    const scrollBottomPad = keyboardHeight > 0
        ? (Platform.OS === 'android' ? 12 : 0)
        : insets.bottom + 12;
    const maxSheetHeight = keyboardHeight > 0
        ? SCREEN_HEIGHT - keyboardHeight - (insets.top || 44) - 16
        : SCREEN_HEIGHT * 0.88;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={() => { Keyboard.dismiss(); onClose(); }}
            statusBarTranslucent
        >
            <View style={drawerStyles.modalRoot}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
                <Animated.View
                    style={[
                        drawerStyles.sheet,
                        {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            maxHeight: maxSheetHeight,
                            transform: [{ translateY: -androidLift }],
                        },
                    ]}
                >
                    <View style={[drawerStyles.handle, { backgroundColor: theme.colors.border }]} />
                    <View style={[drawerStyles.sheetHeader, { borderBottomColor: theme.colors.border }]}>
                        <View style={[drawerStyles.typeIcon, { backgroundColor: accentBg }]}>
                            <Ionicons name={isPartType ? 'construct-outline' : 'checkmark-circle-outline'} size={20} color={accentColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[drawerStyles.sheetTitle, { color: theme.colors.textPrimary }]}>
                                {editItem ? 'Edit' : 'Add'} {isPartType ? 'Part / Consumable' : 'Service'}
                            </Text>
                            <Text style={[drawerStyles.sheetSubtitle, { color: theme.colors.textMuted }]}>
                                {isPartType ? 'Enter part details and pricing' : 'Enter service details and charges'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }} style={[drawerStyles.closeBtn, { backgroundColor: theme.colors.surfaceLow }]}>
                            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        contentContainerStyle={[drawerStyles.sheetScroll, { paddingBottom: scrollBottomPad }]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                        bounces={false}
                    >
                        <View style={drawerStyles.fieldGroup}>
                            <Text style={[drawerStyles.fieldLabel, { color: theme.colors.textMuted }]}>
                                {isPartType ? 'PART NAME *' : 'SERVICE NAME *'}
                            </Text>
                            <TextInput
                                value={name} onChangeText={setName}
                                placeholder={isPartType ? 'e.g. Brake Pad, Engine Oil...' : 'e.g. Oil Change, Wheel Alignment...'}
                                placeholderTextColor={theme.colors.textMuted + '60'}
                                style={[drawerStyles.input, inputStyle]}
                                returnKeyType="next"
                            />
                        </View>
                        <View style={drawerStyles.twoCol}>
                            <View style={[drawerStyles.fieldGroup, { flex: 1 }]}>
                                <Text style={[drawerStyles.fieldLabel, { color: theme.colors.textMuted }]}>QUANTITY *</Text>
                                <TextInput
                                    value={quantity} onChangeText={setQuantity}
                                    placeholder="1" placeholderTextColor={theme.colors.textMuted + '60'}
                                    keyboardType="decimal-pad"
                                    style={[drawerStyles.input, inputStyle]}
                                    returnKeyType="next"
                                />
                            </View>
                            <View style={[drawerStyles.fieldGroup, { flex: 1.6 }]}>
                                <Text style={[drawerStyles.fieldLabel, { color: theme.colors.textMuted }]}>UNIT PRICE (₹) *</Text>
                                <TextInput
                                    value={price} onChangeText={setPrice}
                                    placeholder="0.00" placeholderTextColor={theme.colors.textMuted + '60'}
                                    keyboardType="decimal-pad"
                                    style={[drawerStyles.input, inputStyle]}
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                />
                            </View>
                        </View>
                        <View style={drawerStyles.fieldGroup}>
                            <Text style={[drawerStyles.fieldLabel, { color: theme.colors.textMuted }]}>DISCOUNT TYPE</Text>
                            <View style={drawerStyles.discRow}>
                                {DISCOUNT_TYPES.map((dt) => (
                                    <TouchableOpacity
                                        key={dt}
                                        onPress={() => handleDiscountTypeChange(dt)}
                                        style={[drawerStyles.discBtn, {
                                            borderColor: discountType === dt ? accentColor : theme.colors.border,
                                            backgroundColor: discountType === dt ? accentBg : theme.colors.surfaceLow,
                                        }]}
                                    >
                                        <Text style={[drawerStyles.discBtnTxt, {
                                            color: discountType === dt ? accentColor : theme.colors.textMuted,
                                            fontWeight: discountType === dt ? '800' : '500',
                                        }]}>
                                            {dt === 'None' ? 'No Discount' : dt === 'Flat' ? '₹ Flat' : '% Off'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        {discountType !== 'None' && (
                            <View style={drawerStyles.fieldGroup}>
                                <Text style={[drawerStyles.fieldLabel, { color: theme.colors.textMuted }]}>
                                    {discountType === 'Flat' ? 'DISCOUNT AMOUNT (₹)' : 'DISCOUNT PERCENTAGE (%)'}
                                </Text>
                                <TextInput
                                    value={discountValue} onChangeText={setDiscountValue}
                                    placeholder="0" placeholderTextColor={theme.colors.textMuted + '60'}
                                    keyboardType="decimal-pad"
                                    style={[drawerStyles.input, inputStyle]}
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                />
                            </View>
                        )}
                        {price && parseFloat(price) > 0 && (
                            <View style={[drawerStyles.previewCard, { backgroundColor: accentBg, borderColor: accentColor + '30' }]}>
                                <Text style={[drawerStyles.previewTitle, { color: accentColor }]}>PRICE PREVIEW</Text>
                                <View style={drawerStyles.previewRow}>
                                    <Text style={[drawerStyles.previewLabel, { color: theme.colors.textSecondary }]}>Subtotal</Text>
                                    <Text style={[drawerStyles.previewVal, { color: theme.colors.textSecondary }]}>{formatCurrency(subtotal)}</Text>
                                </View>
                                {discAmt > 0 && (
                                    <View style={drawerStyles.previewRow}>
                                        <Text style={[drawerStyles.previewLabel, { color: '#2ECC9A' }]}>Discount</Text>
                                        <Text style={[drawerStyles.previewVal, { color: '#2ECC9A' }]}>-{formatCurrency(discAmt)}</Text>
                                    </View>
                                )}
                                <View style={[drawerStyles.previewRow, drawerStyles.previewTotalRow, { borderTopColor: accentColor + '25' }]}>
                                    <Text style={[drawerStyles.previewTotalLabel, { color: theme.colors.textPrimary }]}>Total</Text>
                                    <Text style={[drawerStyles.previewTotalVal, { color: accentColor }]}>{formatCurrency(total)}</Text>
                                </View>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={handleSave}
                            style={[drawerStyles.saveBtn, { backgroundColor: accentColor, shadowColor: accentColor }]}
                            activeOpacity={0.85}
                        >
                            <Ionicons name={editItem ? 'checkmark-circle' : 'add-circle'} size={20} color="#fff" />
                            <Text style={drawerStyles.saveBtnTxt}>
                                {editItem ? 'Update' : 'Add'} {isPartType ? 'Part' : 'Service'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const drawerStyles = StyleSheet.create({
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.18, shadowRadius: 24, elevation: 20,
    },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    sheetTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
    sheetSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 1 },
    closeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    sheetScroll: { paddingHorizontal: 20, paddingTop: 18 },
    fieldGroup: { marginBottom: 16 },
    fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 7 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '600' },
    twoCol: { flexDirection: 'row', gap: 12, marginBottom: 0 },
    discRow: { flexDirection: 'row', gap: 8 },
    discBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5, alignItems: 'center' },
    discBtnTxt: { fontSize: 12 },
    previewCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 18 },
    previewTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
    previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    previewLabel: { fontSize: 13, fontWeight: '500' },
    previewVal: { fontSize: 13, fontWeight: '600' },
    previewTotalRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 4, marginBottom: 0 },
    previewTotalLabel: { fontSize: 15, fontWeight: '900' },
    previewTotalVal: { fontSize: 18, fontWeight: '900' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginBottom: 8, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    saveBtnTxt: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
});

// ─── Editable Item Card for Parts/Services ────────────────────────────────────
const ItemCard = ({ item, onEdit, onRemove, theme, index }) => {
    const isPartType = item.type === 'part';
    const accentColor = isPartType ? '#3498DB' : '#2ECC9A';
    const accentBg = isPartType ? 'rgba(52,152,219,0.08)' : 'rgba(46,204,154,0.08)';
    const unitPrice = parseFloat(item.price) || 0;
    const qty = parseFloat(item.quantity) || 0;
    const subtotal = unitPrice * qty;
    const discAmt = item.discountType === 'Percentage'
        ? subtotal * (parseFloat(item.discountValue) || 0) / 100
        : item.discountType === 'Flat' ? parseFloat(item.discountValue) || 0 : 0;
    const total = Math.max(0, subtotal - discAmt);
    const hasDiscount = discAmt > 0;

    return (
        <Animated.View style={{ opacity: 1, transform: [{ translateY: 0 }] }}>
            <View style={[cardItemStyles.wrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={[cardItemStyles.accentBar, { backgroundColor: accentColor }]} />
                <View style={cardItemStyles.body}>
                    <View style={cardItemStyles.topRow}>
                        <View style={[cardItemStyles.typeTag, { backgroundColor: accentBg }]}>
                            <Ionicons name={isPartType ? 'construct-outline' : 'checkmark-circle-outline'} size={10} color={accentColor} />
                            <Text style={[cardItemStyles.typeText, { color: accentColor }]}>{isPartType ? 'PART' : 'SERVICE'}</Text>
                        </View>
                        <Text style={[cardItemStyles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>{item.name || 'Unnamed'}</Text>
                        <View style={cardItemStyles.actions}>
                            <TouchableOpacity onPress={() => onEdit(item)} style={[cardItemStyles.actionBtn, { backgroundColor: 'rgba(52,152,219,0.1)' }]} activeOpacity={0.75}>
                                <Ionicons name="pencil-outline" size={13} color="#3498DB" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onRemove(item.id)} style={[cardItemStyles.actionBtn, { backgroundColor: 'rgba(255,107,107,0.1)' }]} activeOpacity={0.75}>
                                <Ionicons name="trash-outline" size={13} color="#FF6B6B" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={cardItemStyles.metaRow}>
                        <View style={[cardItemStyles.metaChip, { backgroundColor: theme.colors.surfaceLow }]}>
                            <Ionicons name="layers-outline" size={11} color={theme.colors.textMuted} />
                            <Text style={[cardItemStyles.metaTxt, { color: theme.colors.textSecondary }]}>Qty: {item.quantity}</Text>
                        </View>
                        <View style={[cardItemStyles.metaChip, { backgroundColor: theme.colors.surfaceLow }]}>
                            <Ionicons name="pricetag-outline" size={11} color={theme.colors.textMuted} />
                            <Text style={[cardItemStyles.metaTxt, { color: theme.colors.textSecondary }]}>{formatCurrency(unitPrice)} / unit</Text>
                        </View>
                        {hasDiscount && (
                            <View style={[cardItemStyles.metaChip, { backgroundColor: 'rgba(46,204,154,0.1)' }]}>
                                <Ionicons name="gift-outline" size={11} color="#2ECC9A" />
                                <Text style={[cardItemStyles.metaTxt, { color: '#2ECC9A' }]}>
                                    {item.discountType === 'Percentage' ? `${item.discountValue}% off` : `-${formatCurrency(discAmt)}`}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={[cardItemStyles.priceRow, { borderTopColor: theme.colors.border }]}>
                        {hasDiscount && <Text style={[cardItemStyles.strikePrice, { color: theme.colors.textMuted }]}>{formatCurrency(subtotal)}</Text>}
                        <View style={cardItemStyles.priceRight}>
                            {hasDiscount && <Text style={[cardItemStyles.discSaved, { color: '#2ECC9A' }]}>Saved {formatCurrency(discAmt)}</Text>}
                            <Text style={[cardItemStyles.totalPrice, { color: accentColor }]}>{formatCurrency(total)}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

const cardItemStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    accentBar: { width: 4 },
    body: { flex: 1, padding: 13 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
    typeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    typeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
    name: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },
    actions: { flexDirection: 'row', gap: 6 },
    actionBtn: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    metaTxt: { fontSize: 11, fontWeight: '600' },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9 },
    strikePrice: { fontSize: 12, fontWeight: '500', textDecorationLine: 'line-through' },
    priceRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
    discSaved: { fontSize: 11, fontWeight: '700' },
    totalPrice: { fontSize: 16, fontWeight: '900' },
});

// ─── Editable Section for Parts or Services ───────────────────────────────────
const EditableItemsSection = ({ title, type, items, onAdd, onEdit, onRemove, theme }) => {
    const isPartType = type === 'part';
    const accentColor = isPartType ? '#3498DB' : '#2ECC9A';
    const accentBg = isPartType ? 'rgba(52,152,219,0.12)' : 'rgba(46,204,154,0.12)';

    return (
        <Card theme={theme}>
            <View style={sectionHeaderStyles.row}>
                <View style={sectionHeaderStyles.left}>
                    <View style={[sectionHeaderStyles.iconWrap, { backgroundColor: accentBg }]}>
                        <Ionicons name={isPartType ? 'construct-outline' : 'checkmark-circle-outline'} size={14} color={accentColor} />
                    </View>
                    <Text style={[sectionHeaderStyles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
                    {items.length > 0 && <View style={[sectionHeaderStyles.badge, { backgroundColor: accentBg }]}><Text style={[sectionHeaderStyles.badgeText, { color: accentColor }]}>{items.length}</Text></View>}
                </View>
                {/* <TouchableOpacity onPress={onAdd} style={[sectionHeaderStyles.addBtn, { backgroundColor: accentColor, shadowColor: accentColor }]} activeOpacity={0.82}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={sectionHeaderStyles.addText}>Add {isPartType ? 'Part' : 'Service'}</Text>
                </TouchableOpacity> */}
            </View>
            {items.length === 0 ? (
                <TouchableOpacity onPress={onAdd} style={[emptyStyles.wrap, { backgroundColor: accentBg, borderColor: accentColor + '30' }]} activeOpacity={0.75}>
                    <View style={[emptyStyles.iconWrap, { backgroundColor: accentColor + '18' }]}>
                        <Ionicons name={isPartType ? 'construct-outline' : 'checkmark-circle-outline'} size={26} color={accentColor} />
                    </View>
                    <Text style={[emptyStyles.title, { color: theme.colors.textPrimary }]}>No {isPartType ? 'parts' : 'services'} added yet</Text>
                    <Text style={[emptyStyles.hint, { color: theme.colors.textMuted }]}>Tap to add {isPartType ? 'a part or consumable' : 'a service performed'}</Text>
                    <View style={[emptyStyles.addChip, { backgroundColor: accentColor }]}>
                        <Ionicons name="add" size={14} color="#fff" />
                        <Text style={emptyStyles.addChipTxt}>Add {isPartType ? 'Part' : 'Service'}</Text>
                    </View>
                </TouchableOpacity>
            ) : (
                <>
                    {items.map((item, idx) => (
                        <ItemCard key={item.id} item={item} onEdit={onEdit} onRemove={onRemove} theme={theme} index={idx} />
                    ))}
                    <TouchableOpacity onPress={onAdd} style={[addMoreStyles.btn, { borderColor: accentColor + '40', backgroundColor: accentColor + '10' }]} activeOpacity={0.75}>
                        <Ionicons name="add-circle-outline" size={16} color={accentColor} />
                        <Text style={[addMoreStyles.txt, { color: accentColor }]}>Add Another {isPartType ? 'Part' : 'Service'}</Text>
                    </TouchableOpacity>
                </>
            )}
        </Card>
    );
};

const sectionHeaderStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
    badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '800' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 11, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    addText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});

const emptyStyles = StyleSheet.create({
    wrap: { alignItems: 'center', padding: 24, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', gap: 6 },
    iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    title: { fontSize: 14, fontWeight: '800' },
    hint: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
    addChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 6 },
    addChipTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

const addMoreStyles = StyleSheet.create({
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: 11, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 4 },
    txt: { fontSize: 13, fontWeight: '700' },
});

// ─── Financial Breakdown (Read‑only from order.total) ─────────────────────────
const FinancialBreakdownCard = ({ order, theme }) => {
    const { total = {} } = order;
    const {
        subTotal = 0,
        discount = 0,
        referralDiscount = 0,
        cgst = 0,
        sgst = 0,
        cgstRate,
        sgstRate,
        total: grandTotal = 0,
        finalPayable = grandTotal,
    } = total;

    const showTaxes = (cgst > 0 || sgst > 0) && (cgstRate || sgstRate);

    return (
        <Card theme={theme}>
            <SectionLabel label="Financial Breakdown" theme={theme} />
            <View style={finBreakStyles.totalsBlock}>
                <View style={finBreakStyles.totalRow}>
                    <Text style={[finBreakStyles.totalLabel, { color: theme.colors.textSecondary }]}>Subtotal</Text>
                    <Text style={[finBreakStyles.totalValue, { color: theme.colors.textSecondary }]}>{formatCurrency(subTotal)}</Text>
                </View>

                {discount > 0 && (
                    <View style={finBreakStyles.totalRow}>
                        <Text style={[finBreakStyles.totalLabel, { color: theme.colors.textSecondary }]}>Discount</Text>
                        <Text style={[finBreakStyles.totalValue, { color: theme.colors.success }]}>-{formatCurrency(discount)}</Text>
                    </View>
                )}

                {referralDiscount > 0 && (
                    <View style={finBreakStyles.totalRow}>
                        <View style={finBreakStyles.referralLabelRow}>
                            <Ionicons name="gift-outline" size={13} color={theme.colors.success} />
                            <Text style={[finBreakStyles.totalLabel, { color: theme.colors.success }]}>Referral Discount</Text>
                        </View>
                        <Text style={[finBreakStyles.totalValue, { color: theme.colors.success }]}>-{formatCurrency(referralDiscount)}</Text>
                    </View>
                )}

                {showTaxes && (
                    <>
                        <View style={finBreakStyles.totalRow}>
                            <Text style={[finBreakStyles.totalLabel, { color: theme.colors.textSecondary }]}>CGST ({cgstRate}%)</Text>
                            <Text style={[finBreakStyles.totalValue, { color: theme.colors.textSecondary }]}>{formatCurrency(cgst)}</Text>
                        </View>
                        <View style={finBreakStyles.totalRow}>
                            <Text style={[finBreakStyles.totalLabel, { color: theme.colors.textSecondary }]}>SGST ({sgstRate}%)</Text>
                            <Text style={[finBreakStyles.totalValue, { color: theme.colors.textSecondary }]}>{formatCurrency(sgst)}</Text>
                        </View>
                    </>
                )}

                <Divider theme={theme} style={{ marginVertical: 10 }} />
                <View style={finBreakStyles.totalRow}>
                    <Text style={[finBreakStyles.grandTotalLabel, { color: theme.colors.textPrimary }]}>TOTAL AMOUNT</Text>
                    <Text style={[finBreakStyles.grandTotalValue, { color: theme.colors.primary }]}>{formatCurrency(finalPayable)}</Text>
                </View>
                <Text style={[finBreakStyles.taxNote, { color: theme.colors.textMuted }]}>Tax inclusive</Text>
            </View>
        </Card>
    );
};

const finBreakStyles = StyleSheet.create({
    totalsBlock: { marginTop: 4 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    totalLabel: { fontSize: 13, fontWeight: '500' },
    totalValue: { fontSize: 13, fontWeight: '600' },
    referralLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    grandTotalLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
    grandTotalValue: { fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
    taxNote: { fontSize: 10, textAlign: 'right', marginTop: 2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EmployeeOrderDetail({ route, navigation }) {
    const orderIdParam = route?.params?.order?._id || route?.params?.orderId;
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const insets = useSafeAreaInsets();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable items state
    const [items, setItems] = useState([]);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [drawerType, setDrawerType] = useState('part');
    const [editingItem, setEditingItem] = useState(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    const fetchOrder = useCallback(async () => {
        if (!orderIdParam) { setLoading(false); return; }
        try {
            setLoading(true);
            const response = await axiosClient.get(`/api/admin/order/getorderbyid/${orderIdParam}`);
            const fetchedOrder = response.data;
            setOrder(fetchedOrder);

            // Build items array from partsUsed and serviceProvided
            const builtItems = [];
            (fetchedOrder.partsUsed || []).forEach(p => {
                builtItems.push({
                    id: genId(),
                    type: 'part',
                    name: p.partName || '',
                    quantity: p.quantity || 1,
                    price: p.price || 0,
                    discountType: p.discountType || 'None',
                    discountValue: p.discountPrice || 0,
                });
            });
            (fetchedOrder.serviceProvided || []).forEach(s => {
                builtItems.push({
                    id: genId(),
                    type: 'service',
                    name: s.serviceName || '',
                    quantity: s.quantity || 1,
                    price: s.price || 0,
                    discountType: s.discountType || 'None',
                    discountValue: s.discountPrice || 0,
                });
            });
            setItems(builtItems);
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

    const handleSaveItems = async () => {
        if (!order) return;
        setSaving(true);
        try {
            const parts = items.filter(i => i.type === 'part').map(i => ({
                partName: i.name,
                quantity: i.quantity,
                price: i.price,
                discountType: i.discountType !== 'None' ? i.discountType : undefined,
                discountPrice: i.discountValue || 0,
            }));
            const services = items.filter(i => i.type === 'service').map(i => ({
                serviceName: i.name,
                quantity: i.quantity,
                price: i.price,
                discountType: i.discountType !== 'None' ? i.discountType : undefined,
                discountPrice: i.discountValue || 0,
            }));

            const payload = { partsUsed: parts, serviceProvided: services };
            await axiosClient.put(`/api/admin/order/${order._id}/update-items`, payload);
            Alert.alert('Success', 'Parts and services updated successfully.');
            fetchOrder(); // Refresh to get updated totals
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to update items.');
        } finally {
            setSaving(false);
        }
    };

    const openAddDrawer = useCallback((type) => { setEditingItem(null); setDrawerType(type); setDrawerVisible(true); }, []);
    const openEditDrawer = useCallback((item) => { setEditingItem(item); setDrawerType(item.type); setDrawerVisible(true); }, []);
    const handleSaveItem = useCallback((savedItem) => {
        setItems((prev) => {
            const exists = prev.find((i) => i.id === savedItem.id);
            return exists ? prev.map((i) => i.id === savedItem.id ? savedItem : i) : [...prev, savedItem];
        });
    }, []);
    const removeItem = useCallback((id) => {
        Alert.alert('Remove Item', 'Are you sure you want to remove this item?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => setItems((prev) => prev.filter((i) => i.id !== id)) },
        ]);
    }, []);

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
        serviceType = '', preferredDate = null, preferredTime = '', status = 'pending',
        createdAt = null, userLocation = null,
    } = order;

    const sc = getStatusConfig(status);
    const serviceChip = getServiceChipStyle(serviceType);
    const bikeInfo = [selectedBrand, selectedModel].filter(Boolean).join(' ');
    const bikeSpecs = [cc ? `${cc}cc` : null, bs ? bs.toUpperCase() : null].filter(Boolean).join(' · ');
    const coordStr = userLocation?.coordinates?.length === 2
        ? `${userLocation.coordinates[1].toFixed(4)}, ${userLocation.coordinates[0].toFixed(4)}`
        : null;

    const partsItems = items.filter(i => i.type === 'part');
    const servicesItems = items.filter(i => i.type === 'service');

    return (
        <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
            <ScreenWrapper title="Order Details">
                <Animated.ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + insets.bottom }]}
                    showsVerticalScrollIndicator={false}
                    style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                >
                    {/* Order Reference */}
                    <View style={styles.orderRefRow}>
                        <View>
                            <Text style={[styles.orderRefLabel, { color: theme.colors.textMuted }]}>ORDER REFERENCE</Text>
                            <Text style={[styles.orderRefId, { color: theme.colors.primary }]}>{orderId}</Text>
                        </View>
                    </View>

                    <Divider theme={theme} style={{ marginBottom: 16 }} />

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

                    {/* Appointment Info */}
                    <Card theme={theme}>
                        <SectionLabel label="Appointment" theme={theme} />
                        <InfoTile icon="calendar-outline" label="Preferred Date" value={formatDate(preferredDate)} theme={theme} />
                        <InfoTile icon="time-outline" label="Preferred Time" value={preferredTime || '—'} theme={theme} />
                    </Card>

                    {/* Editable Parts Section */}
                    <EditableItemsSection
                        title="Parts Used"
                        type="part"
                        items={partsItems}
                        onAdd={() => openAddDrawer('part')}
                        onEdit={openEditDrawer}
                        onRemove={removeItem}
                        theme={theme}
                    />

                    {/* Editable Services Section */}
                    <EditableItemsSection
                        title="Services Provided"
                        type="service"
                        items={servicesItems}
                        onAdd={() => openAddDrawer('service')}
                        onEdit={openEditDrawer}
                        onRemove={removeItem}
                        theme={theme}
                    />

                    {/* Financial Breakdown (Read‑only) */}
                    <FinancialBreakdownCard order={order} theme={theme} />

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary, opacity: saving ? 0.7 : 1 }]}
                        onPress={handleSaveItems}
                        disabled={saving}
                        activeOpacity={0.85}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#1a1a1a" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={18} color="#1a1a1a" />
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Location map */}
                    {userLocation?.coordinates?.length === 2 && (
                        <LocationMap coordinates={userLocation.coordinates} city={city} theme={theme} />
                    )}

                    <Text style={[styles.metaNote, { color: theme.colors.textMuted }]}>
                        Created {formatDate(createdAt)}
                    </Text>

                    <View style={{ height: 16 }} />
                </Animated.ScrollView>
            </ScreenWrapper>

            <AddItemDrawer
                visible={drawerVisible}
                type={drawerType}
                onClose={() => { setDrawerVisible(false); setEditingItem(null); }}
                onSave={handleSaveItem}
                theme={theme}
                editItem={editingItem}
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
    bikeHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    bikeName: { fontSize: 17, fontWeight: '800' },
    bikeSpecs: { fontSize: 12, marginTop: 3, fontWeight: '500' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
    serviceTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    serviceTagText: { fontSize: 12, fontWeight: '600' },
    serviceTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginTop: 8 },
    serviceTypeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, marginBottom: 12, marginHorizontal: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
    saveBtnText: { fontSize: 16, fontWeight: '900', color: '#1a1a1a', letterSpacing: 0.3 },
    metaNote: { fontSize: 11, textAlign: 'center', marginTop: 8, letterSpacing: 0.2 },
});