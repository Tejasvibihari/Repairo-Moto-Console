// src/screens/admin/order/AdminGenerateInvoice.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, Animated, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform, Modal, Dimensions,
    Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import axiosClient from '../../../services/axiosClient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────
const DISCOUNT_TYPES = ['None', 'Flat', 'Percentage'];
const PAYMENT_STATUSES = [
    { key: 'unpaid', label: 'Unpaid', color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)', icon: 'close-circle-outline' },
    { key: 'partial', label: 'Partial', color: '#E2A731', bg: 'rgba(226,167,49,0.15)', icon: 'time-outline' },
    { key: 'paid', label: 'Paid', color: '#2ECC9A', bg: 'rgba(46,204,154,0.15)', icon: 'checkmark-circle-outline' },
];
const PAYMENT_METHODS = [
    { key: 'cash', label: 'Cash', icon: 'cash-outline' },
    { key: 'upi', label: 'UPI', icon: 'phone-portrait-outline' },
    { key: 'card', label: 'Card', icon: 'card-outline' },
    { key: 'razorpay', label: 'Razorpay', icon: 'globe-outline' },
    { key: 'bank_transfer', label: 'Bank Transfer', icon: 'business-outline' },
];

const formatCurrency = (val) =>
    `₹${Number(val ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const genId = () => Math.random().toString(36).substr(2, 9);

// ─── Animated Row Entry ───────────────────────────────────────────────────────
const RowEntry = ({ children, index }) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(12)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 240, delay: index * 40, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, speed: 22, bounciness: 4, delay: index * 40, useNativeDriver: true }),
        ]).start();
    }, []);
    return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
};

// ─── Bottom Sheet Drawer ──────────────────────────────────────────────────────
const AddItemDrawer = ({ visible, type, onClose, onSave, theme, editItem }) => {
    const isDark = theme === DarkTheme;
    const insets = useSafeAreaInsets();

    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [price, setPrice] = useState('');
    const [discountType, setDiscountType] = useState('None');
    const [discountValue, setDiscountValue] = useState('');

    // Track live keyboard height so we can lift the sheet exactly the right amount
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        // keyboardWillShow fires before animation on iOS giving a smooth lift.
        // keyboardDidShow is the reliable event on Android.
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            setKeyboardHeight(0);
        });

        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    useEffect(() => {
        if (visible) {
            if (editItem) {
                setName(editItem.name || '');
                setQuantity(editItem.quantity || '1');
                setPrice(editItem.price || '');
                setDiscountType(editItem.discountType || 'None');
                setDiscountValue(editItem.discountValue || '');
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
        onSave({ id: editItem?.id || genId(), type, name: name.trim(), quantity, price, discountType, discountValue });
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

    // How far to push the sheet up on Android:
    // - When keyboard is open: lift by keyboard height (keyboard sits above nav bar already)
    // - When keyboard is closed: 0 (sheet rests at bottom of screen, safe area pads content)
    const androidLift = Platform.OS === 'android' ? keyboardHeight : 0;

    // Bottom padding inside the scroll content:
    // - Keyboard open on Android: small gap (sheet already lifted above keyboard)
    // - Keyboard open on iOS: 0 extra (automaticallyAdjustKeyboardInsets handles it natively)
    // - Keyboard closed: insets.bottom so save button clears the nav bar on all nav modes
    const scrollBottomPad = keyboardHeight > 0
        ? (Platform.OS === 'android' ? 12 : 0)
        : insets.bottom + 12;

    // Cap sheet height so it doesn't overflow the screen when keyboard is open
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
                {/* Dim backdrop — tap to close */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={() => { Keyboard.dismiss(); onClose(); }}
                />

                {/*
                  On Android we translate the sheet up manually by the keyboard height.
                  This is more reliable inside a transparent Modal with statusBarTranslucent
                  than KeyboardAvoidingView, which misbehaves across 3-button / 2-button /
                  gesture navigation modes because each reports a different window inset.

                  On iOS, translateY stays 0 and automaticallyAdjustKeyboardInsets on the
                  ScrollView handles everything natively.
                */}
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
                    {/* Drag handle */}
                    <View style={[drawerStyles.handle, { backgroundColor: theme.colors.border }]} />

                    {/* Header */}
                    <View style={[drawerStyles.sheetHeader, { borderBottomColor: theme.colors.border }]}>
                        <View style={[drawerStyles.typeIcon, { backgroundColor: accentBg }]}>
                            <Ionicons
                                name={isPartType ? 'construct-outline' : 'checkmark-circle-outline'}
                                size={20} color={accentColor}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[drawerStyles.sheetTitle, { color: theme.colors.textPrimary }]}>
                                {editItem ? 'Edit' : 'Add'} {isPartType ? 'Part / Consumable' : 'Service'}
                            </Text>
                            <Text style={[drawerStyles.sheetSubtitle, { color: theme.colors.textMuted }]}>
                                {isPartType ? 'Enter part details and pricing' : 'Enter service details and charges'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => { Keyboard.dismiss(); onClose(); }}
                            style={[drawerStyles.closeBtn, { backgroundColor: theme.colors.surfaceLow }]}
                        >
                            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/*
                      automaticallyAdjustKeyboardInsets (iOS 15+): the OS inserts a
                      bottom content inset equal to the keyboard height automatically,
                      so the Save button scrolls above the keyboard with zero JS.
                      On Android the sheet is already translated up, so we just need
                      the scrollBottomPad for breathing room.
                    */}
                    <ScrollView
                        contentContainerStyle={[drawerStyles.sheetScroll, { paddingBottom: scrollBottomPad }]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                        bounces={false}
                    >
                        {/* Name */}
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

                        {/* Qty + Price */}
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

                        {/* Discount Type */}
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

                        {/* Discount Value */}
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

                        {/* Live Price Preview */}
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

                        {/* Save Button */}
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

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, onAdd, theme, count, type }) => {
    const isPartType = type === 'part';
    const accentColor = isPartType ? '#3498DB' : '#2ECC9A';
    const accentBg = isPartType ? 'rgba(52,152,219,0.12)' : 'rgba(46,204,154,0.12)';
    return (
        <View style={[sh.row, { borderBottomColor: theme.colors.border }]}>
            <View style={sh.left}>
                <View style={[sh.iconWrap, { backgroundColor: accentBg }]}>
                    <Ionicons name={isPartType ? 'construct-outline' : 'checkmark-circle-outline'} size={14} color={accentColor} />
                </View>
                <Text style={[sh.title, { color: theme.colors.textPrimary }]}>{title}</Text>
                {count > 0 && <View style={[sh.badge, { backgroundColor: accentBg }]}><Text style={[sh.badgeText, { color: accentColor }]}>{count}</Text></View>}
            </View>
            {/* <TouchableOpacity onPress={onAdd} style={[sh.addBtn, { backgroundColor: accentColor, shadowColor: accentColor }]} activeOpacity={0.82}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={sh.addText}>Add {isPartType ? 'Part' : 'Service'}</Text>
            </TouchableOpacity> */}
        </View>
    );
};
const sh = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
    left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
    badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '800' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 11, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    addText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});

// ─── Item Card ────────────────────────────────────────────────────────────────
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
        <RowEntry index={index}>
            <View style={[cardStyles.wrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={[cardStyles.accentBar, { backgroundColor: accentColor }]} />
                <View style={cardStyles.body}>
                    <View style={cardStyles.topRow}>
                        <View style={[cardStyles.typeTag, { backgroundColor: accentBg }]}>
                            <Ionicons name={isPartType ? 'construct-outline' : 'checkmark-circle-outline'} size={10} color={accentColor} />
                            <Text style={[cardStyles.typeText, { color: accentColor }]}>{isPartType ? 'PART' : 'SERVICE'}</Text>
                        </View>
                        <Text style={[cardStyles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>{item.name || 'Unnamed'}</Text>
                        <View style={cardStyles.actions}>
                            <TouchableOpacity onPress={() => onEdit(item)} style={[cardStyles.actionBtn, { backgroundColor: 'rgba(52,152,219,0.1)' }]} activeOpacity={0.75}>
                                <Ionicons name="pencil-outline" size={13} color="#3498DB" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onRemove(item.id)} style={[cardStyles.actionBtn, { backgroundColor: 'rgba(255,107,107,0.1)' }]} activeOpacity={0.75}>
                                <Ionicons name="trash-outline" size={13} color="#FF6B6B" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={cardStyles.metaRow}>
                        <View style={[cardStyles.metaChip, { backgroundColor: theme.colors.surfaceLow }]}>
                            <Ionicons name="layers-outline" size={11} color={theme.colors.textMuted} />
                            <Text style={[cardStyles.metaTxt, { color: theme.colors.textSecondary }]}>Qty: {item.quantity}</Text>
                        </View>
                        <View style={[cardStyles.metaChip, { backgroundColor: theme.colors.surfaceLow }]}>
                            <Ionicons name="pricetag-outline" size={11} color={theme.colors.textMuted} />
                            <Text style={[cardStyles.metaTxt, { color: theme.colors.textSecondary }]}>{formatCurrency(unitPrice)} / unit</Text>
                        </View>
                        {hasDiscount && (
                            <View style={[cardStyles.metaChip, { backgroundColor: 'rgba(46,204,154,0.1)' }]}>
                                <Ionicons name="gift-outline" size={11} color="#2ECC9A" />
                                <Text style={[cardStyles.metaTxt, { color: '#2ECC9A' }]}>
                                    {item.discountType === 'Percentage' ? `${item.discountValue}% off` : `-${formatCurrency(discAmt)}`}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={[cardStyles.priceRow, { borderTopColor: theme.colors.border }]}>
                        {hasDiscount && <Text style={[cardStyles.strikePrice, { color: theme.colors.textMuted }]}>{formatCurrency(subtotal)}</Text>}
                        <View style={cardStyles.priceRight}>
                            {hasDiscount && <Text style={[cardStyles.discSaved, { color: '#2ECC9A' }]}>Saved {formatCurrency(discAmt)}</Text>}
                            <Text style={[cardStyles.totalPrice, { color: accentColor }]}>{formatCurrency(total)}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </RowEntry>
    );
};
const cardStyles = StyleSheet.create({
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

// ─── Totals Card ──────────────────────────────────────────────────────────────
const TotalsCard = ({ items, referralDiscount, setReferralDiscount, theme }) => {
    const subtotal = items.reduce((acc, item) => {
        const s = (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0);
        const d = item.discountType === 'Percentage' ? s * (parseFloat(item.discountValue) || 0) / 100 : item.discountType === 'Flat' ? parseFloat(item.discountValue) || 0 : 0;
        return acc + Math.max(0, s - d);
    }, 0);
    const totalDiscount = items.reduce((acc, item) => {
        const s = (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0);
        const d = item.discountType === 'Percentage' ? s * (parseFloat(item.discountValue) || 0) / 100 : item.discountType === 'Flat' ? parseFloat(item.discountValue) || 0 : 0;
        return acc + d;
    }, 0);
    const refDisc = parseFloat(referralDiscount) || 0;
    const grandTotal = Math.max(0, subtotal - refDisc);
    return (
        <View style={[totStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[totStyles.heading, { color: theme.colors.textMuted }]}>INVOICE SUMMARY</Text>
            <View>
                <View style={totStyles.row}><Text style={[totStyles.label, { color: theme.colors.textSecondary }]}>Items Subtotal</Text><Text style={[totStyles.val, { color: theme.colors.textSecondary }]}>{formatCurrency(subtotal + totalDiscount)}</Text></View>
                {totalDiscount > 0 && <View style={totStyles.row}><Text style={[totStyles.label, { color: '#2ECC9A' }]}>Item Discounts</Text><Text style={[totStyles.val, { color: '#2ECC9A' }]}>-{formatCurrency(totalDiscount)}</Text></View>}
                <View style={totStyles.row}><Text style={[totStyles.label, { color: theme.colors.textSecondary }]}>Net Subtotal</Text><Text style={[totStyles.val, { color: theme.colors.textSecondary }]}>{formatCurrency(subtotal)}</Text></View>
                <View style={[totStyles.row, { alignItems: 'center' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Ionicons name="gift-outline" size={13} color="#9B59B6" /><Text style={[totStyles.label, { color: '#9B59B6' }]}>Referral Discount</Text></View>
                    <TextInput value={String(referralDiscount ?? '')} onChangeText={setReferralDiscount} placeholder="0" placeholderTextColor={theme.colors.textMuted + '80'} keyboardType="decimal-pad" style={[totStyles.refInput, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border, color: theme.colors.textPrimary }]} />
                </View>
                <View style={[totStyles.divider, { backgroundColor: theme.colors.border }]} />
                <View style={[totStyles.row, { marginBottom: 5 }]}><Text style={[totStyles.grandLabel, { color: theme.colors.textPrimary }]}>GRAND TOTAL</Text><Text style={[totStyles.grandVal, { color: theme.colors.primary }]}>{formatCurrency(grandTotal)}</Text></View>
                <Text style={[totStyles.taxNote, { color: theme.colors.textMuted }]}>* All prices inclusive of applicable taxes</Text>
            </View>
        </View>
    );
};
const totStyles = StyleSheet.create({
    card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 12, elevation: 3 },
    heading: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
    label: { fontSize: 13, fontWeight: '500' },
    val: { fontSize: 13, fontWeight: '600' },
    refInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, fontWeight: '600', width: 90, textAlign: 'right' },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
    grandLabel: { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
    grandVal: { fontSize: 22, fontWeight: '900' },
    taxNote: { fontSize: 10, textAlign: 'right', marginTop: 2 },
});

// ─── Payment Section ──────────────────────────────────────────────────────────
const PaymentSection = ({ paymentStatus, setPaymentStatus, paymentMethod, setPaymentMethod, amountPaid, setAmountPaid, grandTotal, theme }) => (
    <View style={[payStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[payStyles.heading, { color: theme.colors.textMuted }]}>PAYMENT DETAILS</Text>
        <Text style={[payStyles.subLabel, { color: theme.colors.textSecondary }]}>Payment Status</Text>
        <View style={payStyles.statusRow}>
            {PAYMENT_STATUSES.map((ps) => (
                <TouchableOpacity key={ps.key} onPress={() => setPaymentStatus(ps.key)}
                    style={[payStyles.statusBtn, { borderColor: paymentStatus === ps.key ? ps.color : theme.colors.border }, paymentStatus === ps.key && { backgroundColor: ps.bg }]} activeOpacity={0.8}>
                    <Ionicons name={ps.icon} size={14} color={paymentStatus === ps.key ? ps.color : theme.colors.textMuted} />
                    <Text style={[payStyles.statusTxt, { color: paymentStatus === ps.key ? ps.color : theme.colors.textMuted, fontWeight: paymentStatus === ps.key ? '800' : '500' }]}>{ps.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
        <Text style={[payStyles.subLabel, { color: theme.colors.textSecondary, marginTop: 14 }]}>Payment Method</Text>
        <View style={payStyles.methodRow}>
            {PAYMENT_METHODS.map((pm) => (
                <TouchableOpacity key={pm.key} onPress={() => setPaymentMethod(pm.key)}
                    style={[payStyles.methodBtn, { borderColor: paymentMethod === pm.key ? theme.colors.primary : theme.colors.border, backgroundColor: paymentMethod === pm.key ? theme.colors.primary + '18' : theme.colors.surfaceLow }]} activeOpacity={0.8}>
                    <Ionicons name={pm.icon} size={15} color={paymentMethod === pm.key ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[payStyles.methodTxt, { color: paymentMethod === pm.key ? theme.colors.primary : theme.colors.textSecondary, fontWeight: paymentMethod === pm.key ? '800' : '500' }]}>{pm.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
        {paymentStatus === 'partial' && (
            <View style={{ marginTop: 14 }}>
                <Text style={[payStyles.subLabel, { color: theme.colors.textSecondary }]}>Amount Paid (Partial)</Text>
                <View style={[payStyles.amtRow, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                    <Text style={[payStyles.rupee, { color: theme.colors.primary }]}>₹</Text>
                    <TextInput value={String(amountPaid ?? '')} onChangeText={setAmountPaid} placeholder="0.00" placeholderTextColor={theme.colors.textMuted + '80'} keyboardType="decimal-pad" style={[payStyles.amtInput, { color: theme.colors.textPrimary }]} />
                    {grandTotal > 0 && <Text style={[payStyles.balance, { color: '#FF6B6B' }]}>Balance: {formatCurrency(Math.max(0, grandTotal - (parseFloat(amountPaid) || 0)))}</Text>}
                </View>
            </View>
        )}
        {paymentMethod === 'razorpay' && (
            <View style={[payStyles.razorHint, { backgroundColor: 'rgba(52,152,219,0.1)', borderColor: 'rgba(52,152,219,0.25)' }]}>
                <Ionicons name="information-circle-outline" size={14} color="#3498DB" />
                <Text style={[payStyles.razorText, { color: '#3498DB' }]}>Razorpay payment link will be generated after invoice is saved. Customer will receive a payment link via SMS/Email.</Text>
            </View>
        )}
    </View>
);
const payStyles = StyleSheet.create({
    card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 12, elevation: 3 },
    heading: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 14 },
    subLabel: { fontSize: 12, fontWeight: '700', marginBottom: 10 },
    statusRow: { flexDirection: 'row', gap: 8 },
    statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5 },
    statusTxt: { fontSize: 12 },
    methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    methodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
    methodTxt: { fontSize: 12 },
    amtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    rupee: { fontSize: 18, fontWeight: '900' },
    amtInput: { flex: 1, fontSize: 20, fontWeight: '800' },
    balance: { fontSize: 12, fontWeight: '700' },
    razorHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 12 },
    razorText: { flex: 1, fontSize: 11.5, fontWeight: '500', lineHeight: 16 },
});

// ─── Pre-filled banner ────────────────────────────────────────────────────────
const PrefilledBanner = ({ count, theme }) => {
    if (count === 0) return null;
    return (
        <View style={[bannerStyles.wrap, { backgroundColor: 'rgba(52,152,219,0.12)', borderColor: 'rgba(52,152,219,0.25)' }]}>
            <Ionicons name="information-circle-outline" size={15} color="#3498DB" />
            <Text style={[bannerStyles.txt, { color: '#3498DB' }]}>{count} item{count > 1 ? 's' : ''} pre-filled from existing order data. Tap any card to review and adjust.</Text>
        </View>
    );
};
const bannerStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 11, borderWidth: 1, padding: 12, marginBottom: 14 },
    txt: { flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 17 },
});

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ type, onAdd, theme }) => {
    const isPartType = type === 'part';
    const accentColor = isPartType ? '#3498DB' : '#2ECC9A';
    const accentBg = isPartType ? 'rgba(52,152,219,0.08)' : 'rgba(46,204,154,0.08)';
    return (
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
    );
};
const emptyStyles = StyleSheet.create({
    wrap: { alignItems: 'center', padding: 24, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', gap: 6 },
    iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    title: { fontSize: 14, fontWeight: '800' },
    hint: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
    addChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 6 },
    addChipTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminGenerateInvoice({ route, navigation }) {
    const { order } = route.params ?? {};
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;

    // useSafeAreaInsets gives the exact pixel height of:
    //   - 3-button nav bar  (~48dp)
    //   - 2-button nav bar  (~32dp)
    //   - Gesture nav bar   (~8–16dp, just the pill area)
    //   - No nav bar        (0)
    // This covers every Android navigation mode without any hardcoded values.
    const insets = useSafeAreaInsets();

    const [items, setItems] = useState([]);
    const [prefilledCount, setPrefilledCount] = useState(0);
    const [referralDiscount, setReferralDiscount] = useState('0');
    const [paymentStatus, setPaymentStatus] = useState('unpaid');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amountPaid, setAmountPaid] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [drawerType, setDrawerType] = useState('part');
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        if (!order) return;
        const prefilled = [];
        (order.partsUsed || []).forEach((p) => prefilled.push({ id: genId(), type: 'part', name: p.partName || '', quantity: String(p.quantity || 1), price: String(p.price || 0), discountType: p.discountType || 'None', discountValue: String(p.discountPrice || 0) }));
        (order.serviceProvided || []).forEach((s) => prefilled.push({ id: genId(), type: 'service', name: s.serviceName || '', quantity: String(s.quantity || 1), price: String(s.price || 0), discountType: 'None', discountValue: '0' }));
        if (prefilled.length > 0) { setItems(prefilled); setPrefilledCount(prefilled.length); }
        if (order.total?.referralDiscount) setReferralDiscount(String(order.total.referralDiscount));
        if (order.paymentStatus) setPaymentStatus(order.paymentStatus);
        if (order.paymentMethod) setPaymentMethod(order.paymentMethod);
        if (order.amountPaid) setAmountPaid(String(order.amountPaid));
    }, [order]);

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

    const computedTotals = () => {
        const subtotalBeforeDisc = items.reduce((acc, item) => acc + (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0), 0);
        const totalDiscount = items.reduce((acc, item) => {
            const s = (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0);
            const d = item.discountType === 'Percentage' ? s * (parseFloat(item.discountValue) || 0) / 100 : item.discountType === 'Flat' ? parseFloat(item.discountValue) || 0 : 0;
            return acc + d;
        }, 0);
        const subtotal = subtotalBeforeDisc - totalDiscount;
        const refDisc = parseFloat(referralDiscount) || 0;
        return { subtotal, discount: totalDiscount, referralDiscount: refDisc, total: Math.max(0, subtotal - refDisc) };
    };

    const handleGenerateInvoice = async () => {
        if (items.length === 0) { Alert.alert('No Items', 'Please add at least one part or service before generating the invoice.'); return; }
        setSubmitting(true);
        try {
            const totals = computedTotals();
            const partsAndServices = items.map((item) => {
                const s = (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0);
                const d = item.discountType === 'Percentage' ? s * (parseFloat(item.discountValue) || 0) / 100 : item.discountType === 'Flat' ? parseFloat(item.discountValue) || 0 : 0;
                return { type: item.type, name: item.name.trim(), quantity: parseFloat(item.quantity) || 1, price: parseFloat(item.price) || 0, discountPrice: d, discountType: item.discountType !== 'None' ? item.discountType : undefined };
            });
            await axiosClient.put(`/api/admin/order/${order._id}/update-order/generate-invoice`, {
                partsAndServices,
                invoiceDetails: { invoiceDate: new Date().toISOString() },
                total: { subtotal: totals.subtotal + totals.discount, discount: totals.discount, discountType: 'Mixed', referralDiscount: totals.referralDiscount, total: totals.total },
                payment: { paymentStatus, paymentMethod, amountPaid: paymentStatus === 'partial' ? parseFloat(amountPaid) || 0 : paymentStatus === 'paid' ? totals.total : 0 },
            });
            Alert.alert('✅ Invoice Generated', `Invoice has been successfully generated for Order #${order.orderId}.`, [{ text: 'Done', onPress: () => navigation.goBack() }]);
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to generate invoice. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const grandTotal = computedTotals().total;
    const parts = items.filter((i) => i.type === 'part');
    const services = items.filter((i) => i.type === 'service');

    return (
        <View style={[gs.screen, { backgroundColor: theme.colors.background }]}>
            <ScreenWrapper title="Generate Invoice">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <ScrollView
                        contentContainerStyle={[
                            gs.scroll,
                            // insets.bottom ensures the Generate button is never hidden behind
                            // the system nav bar regardless of navigation mode (3-btn / 2-btn / gesture)
                            { paddingBottom: 20 + insets.bottom },
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Order Header */}
                        <View style={[gs.orderHeader, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <View>
                                <Text style={[gs.orderLabel, { color: theme.colors.textMuted }]}>GENERATING INVOICE FOR</Text>
                                <Text style={[gs.orderId, { color: theme.colors.primary }]}>{order?.orderId ?? '#--'}</Text>
                                <Text style={[gs.orderSub, { color: theme.colors.textSecondary }]}>{[order?.selectedBrand, order?.selectedModel].filter(Boolean).join(' ')} · {order?.name}</Text>
                            </View>
                            <View style={[gs.invoiceDateBadge, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary + '30' }]}>
                                <Ionicons name="calendar-outline" size={13} color={theme.colors.primary} />
                                <Text style={[gs.invoiceDateText, { color: theme.colors.primary }]}>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                            </View>
                        </View>

                        <PrefilledBanner count={prefilledCount} theme={theme} />

                        {/* Parts */}
                        <View style={[gs.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <SectionHeader title="Parts & Consumables" onAdd={() => openAddDrawer('part')} theme={theme} count={parts.length} type="part" />
                            {parts.length === 0 ? (
                                <EmptyState type="part" onAdd={() => openAddDrawer('part')} theme={theme} />
                            ) : (
                                <>
                                    {parts.map((item, idx) => <ItemCard key={item.id} item={item} onEdit={openEditDrawer} onRemove={removeItem} theme={theme} index={idx} />)}
                                    <TouchableOpacity onPress={() => openAddDrawer('part')} style={[gs.addMoreBtn, { borderColor: '#3498DB40', backgroundColor: 'rgba(52,152,219,0.06)' }]} activeOpacity={0.75}>
                                        <Ionicons name="add-circle-outline" size={16} color="#3498DB" />
                                        <Text style={[gs.addMoreTxt, { color: '#3498DB' }]}>Add Another Part</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {/* Services */}
                        <View style={[gs.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <SectionHeader title="Services Provided" onAdd={() => openAddDrawer('service')} theme={theme} count={services.length} type="service" />
                            {services.length === 0 ? (
                                <EmptyState type="service" onAdd={() => openAddDrawer('service')} theme={theme} />
                            ) : (
                                <>
                                    {services.map((item, idx) => <ItemCard key={item.id} item={item} onEdit={openEditDrawer} onRemove={removeItem} theme={theme} index={idx} />)}
                                    <TouchableOpacity onPress={() => openAddDrawer('service')} style={[gs.addMoreBtn, { borderColor: '#2ECC9A40', backgroundColor: 'rgba(46,204,154,0.06)' }]} activeOpacity={0.75}>
                                        <Ionicons name="add-circle-outline" size={16} color="#2ECC9A" />
                                        <Text style={[gs.addMoreTxt, { color: '#2ECC9A' }]}>Add Another Service</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {items.length > 0 && <TotalsCard items={items} referralDiscount={referralDiscount} setReferralDiscount={setReferralDiscount} theme={theme} />}

                        <PaymentSection paymentStatus={paymentStatus} setPaymentStatus={setPaymentStatus} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} amountPaid={amountPaid} setAmountPaid={setAmountPaid} grandTotal={grandTotal} theme={theme} />

                        <TouchableOpacity
                            style={[gs.generateBtn, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary, opacity: submitting ? 0.75 : 1 }]}
                            onPress={handleGenerateInvoice}
                            disabled={submitting}
                            activeOpacity={0.85}
                        >
                            {submitting ? <ActivityIndicator size="small" color="#1a1a1a" /> : (
                                <>
                                    <Ionicons name="receipt-outline" size={18} color="#1a1a1a" />
                                    <Text style={gs.generateText}>Generate Invoice</Text>
                                    {grandTotal > 0 && <View style={gs.amtBadge}><Text style={gs.amtBadgeText}>{formatCurrency(grandTotal)}</Text></View>}
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
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

const gs = StyleSheet.create({
    screen: { flex: 1 },
    scroll: { paddingHorizontal: 2, paddingTop: 16 },
    orderHeader: { flexDirection: 'column', alignItems: 'left', justifyContent: 'left', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
    orderLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, marginBottom: 2 },
    orderId: { fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
    orderSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    invoiceDateBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, marginTop: 10 },
    invoiceDateText: { fontSize: 11, fontWeight: '700' },
    section: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
    addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: 11, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 4 },
    addMoreTxt: { fontSize: 13, fontWeight: '700' },
    generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, marginBottom: 12, marginHorizontal: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
    generateText: { fontSize: 16, fontWeight: '900', color: '#1a1a1a', letterSpacing: 0.3 },
    amtBadge: { backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    amtBadgeText: { fontSize: 13, fontWeight: '800', color: '#1a1a1a' },
});