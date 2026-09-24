import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, StyleSheet, ScrollView,
    TouchableOpacity, Switch, Alert, ActivityIndicator,
    Modal, Animated, Dimensions, Platform, PanResponder,
    Keyboard, KeyboardAvoidingView, TouchableWithoutFeedback,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import axiosClient from '../../../services/axiosClient';
import { leadService } from '../../../services/leadService';
import LeadPickerModal from '../../../components/admin/invoice/LeadPickerModal';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

// ─── Shared primitives ────────────────────────────────────────────────────────
const Row = ({ children, style }) => (
    <View style={[{ flexDirection: 'row', gap: 10 }, style]}>{children}</View>
);

const Field = ({ label, value, onChangeText, placeholder, keyboardType = 'default', theme, half = false, inputRef }) => (
    <View style={[fldS.wrap, half && fldS.half]}>
        <Text style={[fldS.label, { color: theme.colors.textMuted }]}>{label}</Text>
        <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder || label}
            placeholderTextColor={theme.colors.textMuted + '80'}
            keyboardType={keyboardType}
            returnKeyType="next"
            style={[fldS.input, {
                backgroundColor: theme.colors.surfaceLow,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
            }]}
        />
    </View>
);
const fldS = StyleSheet.create({
    wrap: { flex: 1, marginBottom: 10 },
    half: { flex: 0.48 },
    label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
    input: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontWeight: '500' },
});

const SectionCard = ({ title, icon, children, theme }) => (
    <View style={[scS.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={scS.hdr}>
            <View style={[scS.iconWrap, { backgroundColor: theme.colors.primary + '18' }]}>
                <Ionicons name={icon} size={15} color={theme.colors.primary} />
            </View>
            <Text style={[scS.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        </View>
        {children}
    </View>
);
const scS = StyleSheet.create({
    card: { borderRadius: 18, borderWidth: 1.5, padding: 16, marginBottom: 14 },
    hdr: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    iconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
});

const AddBtn = ({ label, onPress, theme }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
        style={[abS.btn, { borderColor: theme.colors.primary + '60', backgroundColor: theme.colors.primary + '0C' }]}>
        <View style={[abS.iconCircle, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="add" size={14} color="#1a1a1a" />
        </View>
        <Text style={[abS.label, { color: theme.colors.primary }]}>{label}</Text>
    </TouchableOpacity>
);
const abS = StyleSheet.create({
    btn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 6 },
    iconCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 13, fontWeight: '700' },
});

const ItemRow = ({ item, index, onEdit, onRemove, theme, nameKey }) => {
    const C = theme.colors;
    const qty = parseFloat(item.quantity) || 0;
    const eff = parseFloat(item.effectivePrice ?? item.price) || 0;
    const lineTotal = qty * eff;
    const hasDisc = parseFloat(item.discountPrice) > 0;

    return (
        <View style={[irS.card, { backgroundColor: C.surfaceLow, borderColor: C.border }]}>
            <View style={[irS.indexDot, { backgroundColor: C.primary + '22' }]}>
                <Text style={[irS.indexNum, { color: C.primary }]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[irS.name, { color: C.textPrimary }]} numberOfLines={1}>{item[nameKey] || '—'}</Text>
                <View style={irS.meta}>
                    <Text style={[irS.metaText, { color: C.textMuted }]}>{qty} × ₹{eff.toFixed(0)}</Text>
                    {hasDisc && (
                        <View style={[irS.discPill, { backgroundColor: C.success + '20' }]}>
                            <Text style={[irS.discText, { color: C.success }]}>
                                {item.discountType === 'percent' ? `${item.discountPrice}% off` : `₹${item.discountPrice} off`}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            <Text style={[irS.total, { color: C.textPrimary }]}>₹{lineTotal.toFixed(0)}</Text>
            <TouchableOpacity onPress={() => onEdit(index)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                <Ionicons name="pencil" size={14} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onRemove(index)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                <Ionicons name="trash" size={14} color={C.error} />
            </TouchableOpacity>
        </View>
    );
};
const irS = StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
    indexDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    indexNum: { fontSize: 11, fontWeight: '800' },
    name: { fontSize: 13, fontWeight: '700' },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    metaText: { fontSize: 11 },
    discPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
    discText: { fontSize: 9, fontWeight: '800' },
    total: { fontSize: 13, fontWeight: '800', minWidth: 50, textAlign: 'right' },
});

const SummaryRow = ({ label, value, bold, color, theme, divider }) => (
    <>
        {divider && <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />}
        <View style={srS.row}>
            <Text style={[srS.label, bold && srS.bold, { color: bold ? theme.colors.textPrimary : theme.colors.textSecondary }]}>{label}</Text>
            <Text style={[srS.value, bold && srS.boldVal, { color: color || (bold ? theme.colors.primary : theme.colors.textPrimary) }]}>{value}</Text>
        </View>
    </>
);
const srS = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
    label: { fontSize: 13 },
    value: { fontSize: 13 },
    bold: { fontSize: 14, fontWeight: '800' },
    boldVal: { fontSize: 16, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────────────────────
// ITEM DRAWER
// ─────────────────────────────────────────────────────────────────────────────
const ItemDrawer = ({ visible, onClose, onSave, type, editItem, theme }) => {
    const C = theme.colors;
    const insets = useSafeAreaInsets();
    const nameKey = type === 'part' ? 'partName' : 'serviceName';
    const isEdit = !!editItem;

    const slideY = useRef(new Animated.Value(SCREEN_H)).current;
    const overlayAlpha = useRef(new Animated.Value(0)).current;
    const [mounted, setMounted] = useState(false);

    const [name, setName] = useState('');
    const [qty, setQty] = useState('1');
    const [price, setPrice] = useState('');
    const [discAmt, setDiscAmt] = useState('');
    const [discType, setDiscType] = useState('flat');
    const [kbHeight, setKbHeight] = useState(0);

    const qtyRef = useRef(null);
    const priceRef = useRef(null);
    const discRef = useRef(null);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', e => setKbHeight(e.endCoordinates.height));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
        return () => { show.remove(); hide.remove(); };
    }, []);

    useEffect(() => {
        if (visible) {
            if (editItem) {
                setName(editItem[nameKey] || '');
                setQty(String(editItem.quantity || 1));
                setPrice(String(editItem.price || ''));
                setDiscAmt(String(editItem.discountPrice || ''));
                setDiscType(editItem.discountType || 'flat');
            } else {
                setName(''); setQty('1'); setPrice(''); setDiscAmt(''); setDiscType('flat');
            }
            setMounted(true);
            Animated.parallel([
                Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
                Animated.timing(overlayAlpha, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
        } else {
            Keyboard.dismiss();
            Animated.parallel([
                Animated.timing(slideY, { toValue: SCREEN_H, duration: 280, useNativeDriver: true }),
                Animated.timing(overlayAlpha, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start(() => setMounted(false));
        }
    }, [visible, editItem]);

    const dragY = useRef(new Animated.Value(0)).current;
    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (_, gs) => gs.dy > 2,
            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 4 && Math.abs(gs.dy) > Math.abs(gs.dx),
            onPanResponderGrant: () => { Keyboard.dismiss(); dragY.setValue(0); },
            onPanResponderMove: (_, gs) => { if (gs.dy > 0) dragY.setValue(gs.dy); },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 100 || gs.vy > 0.8) onClose();
                else Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 80 }).start();
            },
        })
    ).current;

    const numQty = parseFloat(qty) || 0;
    const numPrice = parseFloat(price) || 0;
    const numDisc = parseFloat(discAmt) || 0;
    let effectiveUnit = numPrice;
    if (numDisc > 0 && numPrice > 0) {
        effectiveUnit = discType === 'percent'
            ? numPrice * (1 - numDisc / 100)
            : Math.max(numPrice - numDisc, 0);
    }
    const lineTotal = numQty * effectiveUnit;
    const hasPreview = numPrice > 0 && numQty > 0;

    const handleSave = () => {
        if (!name.trim()) { Alert.alert('Required', `Please enter a ${type === 'part' ? 'part' : 'service'} name.`); return; }
        if (!price || numPrice <= 0) { Alert.alert('Required', 'Please enter a valid price.'); return; }
        onSave({
            [nameKey]: name.trim(),
            quantity: numQty || 1,
            price: numPrice,
            discountPrice: numDisc,
            discountType: numDisc > 0 ? discType : undefined,
            effectivePrice: effectiveUnit,
        });
        onClose();
    };

    if (!mounted && !visible) return null;

    const combinedTranslate = Animated.add(slideY, dragY);
    const accent = type === 'part' ? C.primary : '#4ECDC4';
    const accentLight = type === 'part' ? C.primary + '18' : '#4ECDC420';

    return (
        <Modal transparent visible={mounted} onRequestClose={onClose} animationType="none" statusBarTranslucent>
            <View style={{ flex: 1 }}>
                <Animated.View
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: overlayAlpha }]}
                    pointerEvents={visible ? 'auto' : 'none'}
                >
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                </Animated.View>
                <Animated.View
                    style={[
                        dwS.sheet,
                        {
                            backgroundColor: C.surface,
                            paddingBottom: Math.max(insets.bottom, 16),
                            transform: [{ translateY: combinedTranslate }],
                            marginBottom: kbHeight > 0 ? kbHeight : 0,
                        },
                    ]}
                >
                    <View {...pan.panHandlers} style={dwS.handleZone}>
                        <View style={[dwS.handle, { backgroundColor: C.border }]} />
                    </View>
                    <View style={[dwS.headerStrip, { backgroundColor: accentLight, borderBottomColor: accent + '30' }]}>
                        <View style={[dwS.typeIconCircle, { backgroundColor: accent }]}>
                            <Ionicons name={type === 'part' ? 'construct' : 'hammer'} size={20} color="#1a1a1a" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[dwS.typeLabel, { color: C.textMuted }]}>
                                {isEdit ? 'EDITING' : 'NEW'} {type === 'part' ? 'PART' : 'SERVICE'}
                            </Text>
                            <Text style={[dwS.typeTitle, { color: C.textPrimary }]}>
                                {isEdit ? (editItem?.[nameKey] || 'Edit item') : `Add ${type === 'part' ? 'Part' : 'Service'}`}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={[dwS.closeBtn, { backgroundColor: C.surfaceHigh, borderColor: C.border }]}>
                            <Ionicons name="close" size={16} color={C.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={dwS.body}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        <View style={dwS.fieldGroup}>
                            <Text style={[dwS.fieldLabel, { color: C.textMuted }]}>
                                {type === 'part' ? 'PART NAME' : 'SERVICE NAME'} *
                            </Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder={type === 'part' ? 'e.g. Brake Pad, Engine Oil…' : 'e.g. Oil Change, Wheel Alignment…'}
                                placeholderTextColor={C.textMuted + '70'}
                                returnKeyType="next"
                                onSubmitEditing={() => qtyRef.current?.focus()}
                                style={[dwS.bigInput, { backgroundColor: C.surfaceLow, borderColor: C.border, color: C.textPrimary }]}
                            />
                        </View>
                        <View style={dwS.twoCol}>
                            <View style={dwS.col}>
                                <Text style={[dwS.fieldLabel, { color: C.textMuted }]}>QUANTITY</Text>
                                <TextInput
                                    ref={qtyRef}
                                    value={qty}
                                    onChangeText={setQty}
                                    placeholder="1"
                                    placeholderTextColor={C.textMuted + '70'}
                                    keyboardType="numeric"
                                    returnKeyType="next"
                                    onSubmitEditing={() => priceRef.current?.focus()}
                                    style={[dwS.numInput, { backgroundColor: C.surfaceLow, borderColor: C.border, color: C.textPrimary }]}
                                />
                            </View>
                            <View style={[dwS.col, { flex: 1.4 }]}>
                                <Text style={[dwS.fieldLabel, { color: C.textMuted }]}>UNIT PRICE *</Text>
                                <View style={dwS.prefixWrap}>
                                    <Text style={[dwS.prefix, { color: C.textMuted, backgroundColor: C.surfaceHigh, borderColor: C.border }]}>₹</Text>
                                    <TextInput
                                        ref={priceRef}
                                        value={price}
                                        onChangeText={setPrice}
                                        placeholder="0.00"
                                        placeholderTextColor={C.textMuted + '70'}
                                        keyboardType="numeric"
                                        returnKeyType="next"
                                        onSubmitEditing={() => discRef.current?.focus()}
                                        style={[dwS.prefixInput, { backgroundColor: C.surfaceLow, borderColor: C.border, color: C.textPrimary }]}
                                    />
                                </View>
                            </View>
                        </View>
                        <View style={[dwS.discBlock, { backgroundColor: C.surfaceLow, borderColor: C.border }]}>
                            <View style={dwS.discHeader}>
                                <View style={dwS.discTitleRow}>
                                    <Ionicons name="pricetag" size={13} color={C.textMuted} />
                                    <Text style={[dwS.discTitle, { color: C.textMuted }]}>DISCOUNT</Text>
                                </View>
                                <View style={[dwS.typePill, { backgroundColor: C.surface, borderColor: C.border }]}>
                                    {['flat', 'percent'].map(t => (
                                        <TouchableOpacity
                                            key={t}
                                            onPress={() => setDiscType(t)}
                                            style={[dwS.pillOption, discType === t && { backgroundColor: accent }]}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[dwS.pillText, { color: discType === t ? '#1a1a1a' : C.textMuted }]}>
                                                {t === 'flat' ? '₹ Flat' : '% Off'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            <View style={dwS.discInputRow}>
                                <View style={dwS.prefixWrap}>
                                    <Text style={[dwS.prefix, { color: C.textMuted, backgroundColor: C.surface, borderColor: C.border, fontSize: discType === 'percent' ? 14 : 15 }]}>
                                        {discType === 'flat' ? '₹' : '%'}
                                    </Text>
                                    <TextInput
                                        ref={discRef}
                                        value={discAmt}
                                        onChangeText={setDiscAmt}
                                        placeholder={discType === 'percent' ? 'e.g.  10' : 'e.g.  50'}
                                        placeholderTextColor={C.textMuted + '70'}
                                        keyboardType="numeric"
                                        returnKeyType="done"
                                        onSubmitEditing={Keyboard.dismiss}
                                        style={[dwS.prefixInput, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
                                    />
                                </View>
                                {numDisc > 0 && numPrice > 0 && (
                                    <View style={[dwS.savingBadge, { backgroundColor: C.success + '20' }]}>
                                        <Text style={[dwS.savingText, { color: C.success }]}>
                                            saves ₹{(numPrice - effectiveUnit).toFixed(0)}/unit
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        {hasPreview && (
                            <View style={[dwS.preview, { backgroundColor: accentLight, borderColor: accent + '35' }]}>
                                <View style={dwS.previewHeader}>
                                    <View style={[dwS.previewDot, { backgroundColor: accent }]} />
                                    <Text style={[dwS.previewHeading, { color: C.textSecondary }]}>LIVE PREVIEW</Text>
                                </View>
                                <View style={dwS.previewGrid}>
                                    <View style={dwS.previewCell}>
                                        <Text style={[dwS.previewCellLabel, { color: C.textMuted }]}>Unit Price</Text>
                                        <Text style={[dwS.previewCellVal, { color: C.textPrimary }]}>₹{numPrice.toFixed(2)}</Text>
                                    </View>
                                    <View style={[dwS.previewCellDivider, { backgroundColor: accent + '25' }]} />
                                    {numDisc > 0 ? (
                                        <View style={dwS.previewCell}>
                                            <Text style={[dwS.previewCellLabel, { color: C.textMuted }]}>Discount</Text>
                                            <Text style={[dwS.previewCellVal, { color: C.success }]}>
                                                −₹{(numPrice - effectiveUnit).toFixed(2)}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={dwS.previewCell}>
                                            <Text style={[dwS.previewCellLabel, { color: C.textMuted }]}>Discount</Text>
                                            <Text style={[dwS.previewCellVal, { color: C.textMuted }]}>—</Text>
                                        </View>
                                    )}
                                    <View style={[dwS.previewCellDivider, { backgroundColor: accent + '25' }]} />
                                    <View style={dwS.previewCell}>
                                        <Text style={[dwS.previewCellLabel, { color: C.textMuted }]}>Eff. / unit</Text>
                                        <Text style={[dwS.previewCellVal, { color: accent, fontWeight: '800' }]}>
                                            ₹{effectiveUnit.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[dwS.totalStrip, { backgroundColor: accent + '22', borderTopColor: accent + '30' }]}>
                                    <Text style={[dwS.totalLabel, { color: C.textSecondary }]}>
                                        {numQty} × ₹{effectiveUnit.toFixed(2)} =
                                    </Text>
                                    <Text style={[dwS.totalVal, { color: accent }]}>₹{lineTotal.toFixed(2)}</Text>
                                </View>
                            </View>
                        )}
                        <View style={{ height: 8 }} />
                    </ScrollView>
                    <View style={[dwS.saveWrap, { borderTopColor: C.border, backgroundColor: C.surface }]}>
                        <TouchableOpacity onPress={handleSave} style={[dwS.saveBtn, { backgroundColor: accent }]} activeOpacity={0.85}>
                            <Ionicons name={isEdit ? 'checkmark-done' : 'add-circle'} size={20} color="#1a1a1a" />
                            <Text style={dwS.saveBtnText}>
                                {isEdit ? 'Update' : 'Add'} {type === 'part' ? 'Part' : 'Service'}
                                {hasPreview ? `  ·  ₹${lineTotal.toFixed(0)}` : ''}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const dwS = StyleSheet.create({
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        maxHeight: SCREEN_H * 0.88,
        shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.22, shadowRadius: 28, elevation: 24,
        overflow: 'hidden',
    },
    handleZone: { paddingTop: 10, paddingBottom: 4, alignItems: 'center' },
    handle: { width: 36, height: 4, borderRadius: 2 },
    headerStrip: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
    },
    typeIconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    typeLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 2 },
    typeTitle: { fontSize: 17, fontWeight: '800', letterSpacing: 0.1 },
    closeBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 },
    fieldGroup: { marginBottom: 14 },
    fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 7 },
    bigInput: { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, fontWeight: '600' },
    twoCol: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    col: { flex: 1 },
    numInput: { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, fontWeight: '700', textAlign: 'center' },
    prefixWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: 'transparent' },
    prefix: { paddingHorizontal: 12, paddingVertical: 13, fontSize: 15, fontWeight: '700', borderRightWidth: 1.5, borderColor: 'transparent' },
    prefixInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 13, fontSize: 15, fontWeight: '600' },
    discBlock: { borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 14 },
    discHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    discTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    discTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    typePill: { flexDirection: 'row', borderRadius: 10, borderWidth: 1.5, overflow: 'hidden' },
    pillOption: { paddingHorizontal: 12, paddingVertical: 6 },
    pillText: { fontSize: 12, fontWeight: '700' },
    discInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    savingBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    savingText: { fontSize: 11, fontWeight: '700' },
    preview: { borderRadius: 18, borderWidth: 1.5, overflow: 'hidden', marginBottom: 4 },
    previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
    previewDot: { width: 6, height: 6, borderRadius: 3 },
    previewHeading: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
    previewGrid: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, alignItems: 'center' },
    previewCell: { flex: 1, alignItems: 'center', gap: 3 },
    previewCellLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    previewCellVal: { fontSize: 14, fontWeight: '700' },
    previewCellDivider: { width: 1, height: 30, marginHorizontal: 4 },
    totalStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
    totalLabel: { fontSize: 12, flex: 1 },
    totalVal: { fontSize: 20, fontWeight: '900' },
    saveWrap: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16 },
    saveBtnText: { fontSize: 15, fontWeight: '900', color: '#1a1a1a', letterSpacing: 0.2 },
});

// ─── Discount type chips (bill-level) ────────────────────────────────────────
const DiscChips = ({ value, onChange, theme }) => (
    <View style={{ flexDirection: 'row', gap: 6 }}>
        {['flat', 'percent'].map(t => (
            <TouchableOpacity key={t} onPress={() => onChange(t)} activeOpacity={0.8}
                style={[dcS.chip, {
                    backgroundColor: value === t ? theme.colors.primary : theme.colors.surfaceLow,
                    borderColor: value === t ? theme.colors.primary : theme.colors.border,
                }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: value === t ? '#1a1a1a' : theme.colors.textSecondary }}>
                    {t === 'flat' ? '₹ Flat' : '% Off'}
                </Text>
            </TouchableOpacity>
        ))}
    </View>
);
const dcS = StyleSheet.create({
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, borderWidth: 1.5 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calcSubtotal = (parts, services) => {
    const sum = arr => arr.reduce((a, i) => a + (parseFloat(i.quantity) || 0) * (parseFloat(i.effectivePrice ?? i.price) || 0), 0);
    return sum(parts) + sum(services);
};

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════
// ─── Linked lead card ─────────────────────────────────────────────────────────
const LinkedLeadCard = ({ lead, onPick, onRemove, theme }) => {
    const C = theme.colors;
    const bike = [lead?.vehicle?.brand, lead?.vehicle?.model].filter(Boolean).join(' ');
    return (
        <SectionCard title="Linked Lead" icon="link-outline" theme={theme}>
            {lead ? (
                <View style={[lkS.selected, { backgroundColor: C.primary + '12', borderColor: C.primary + '45' }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={[lkS.name, { color: C.textPrimary }]} numberOfLines={1}>
                            {lead.customer?.name || 'Linked lead'}
                        </Text>
                        {!!(lead.customer?.phone || bike) && (
                            <Text style={[lkS.sub, { color: C.textMuted }]} numberOfLines={1}>
                                {[lead.customer?.phone, bike].filter(Boolean).join('  ·  ')}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity onPress={onPick} style={lkS.action} activeOpacity={0.75}>
                        <Text style={{ color: C.primary, fontWeight: '800', fontSize: 12.5 }}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={22} color={C.textMuted} />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={onPick}
                    activeOpacity={0.8}
                    style={[lkS.empty, { borderColor: C.border, backgroundColor: C.surfaceLow }]}
                >
                    <Ionicons name="add-circle-outline" size={18} color={C.primary} />
                    <Text style={{ color: C.primary, fontWeight: '800', fontSize: 13.5 }}>Link this invoice to a lead</Text>
                </TouchableOpacity>
            )}
            <Text style={[lkS.hint, { color: C.textMuted }]}>
                Optional. Linking marks the lead as Booked and lets staff open this invoice from the lead.
            </Text>
        </SectionCard>
    );
};
const lkS = StyleSheet.create({
    selected: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
    name: { fontSize: 14.5, fontWeight: '800' },
    sub: { fontSize: 12.5, marginTop: 2 },
    action: { paddingHorizontal: 4, paddingVertical: 4 },
    empty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14 },
    hint: { fontSize: 11.5, marginTop: 10 },
});

export default function CreateInvoiceScreen({ navigation, route }) {
    const mode = useSelector(s => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const orderId = route?.params?.orderId || null;

    const invoiceId = route?.params?.invoiceId || null;
    const existingInvoice = route?.params?.invoice || null;
    const isEditing = !!invoiceId && !!existingInvoice;

    const [gstEnabled, setGstEnabled] = useState(false);   // only controls business details visibility
    const [loading, setLoading] = useState(false);

    // Lead this invoice is linked to (optional)
    const [linkedLead, setLinkedLead] = useState(null);
    const [leadTouched, setLeadTouched] = useState(false); // user changed the link on this screen
    const [pickerOpen, setPickerOpen] = useState(false);

    const [customer, setCustomer] = useState({ name: '', email: '', contactNo: '', address: '', city: '' });
    const [business, setBusiness] = useState({ gstin: '', businessName: '', businessAddress: '', businessCity: '', businessState: '', businessPincode: '' });
    const [vehicle, setVehicle] = useState({ brand: '', model: '', modelName: '', cc: '', bs: '' });

    const [parts, setParts] = useState([]);
    const [services, setServices] = useState([]);

    const [drawerType, setDrawerType] = useState('part');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editIdx, setEditIdx] = useState(null);

    const [discount, setDiscount] = useState('');
    const [discountType, setDiscountType] = useState('flat');
    const [sgstRate, setSgstRate] = useState('9');      // always 9% initially
    const [cgstRate, setCgstRate] = useState('9');      // always 9% initially
    const [payMethod, setPayMethod] = useState('cash');
    const [rzpPayId, setRzpPayId] = useState('');
    const [rzpOrdId, setRzpOrdId] = useState('');
    const [amountPaid, setAmountPaid] = useState('');
    // Was hardcoded to always send status: 'paid' regardless of what was
    // actually collected — meaning an invoice with money still owed could
    // never be marked as such, and features that depend on "is anything due"
    // (like the Scan & Pay QR code) never had anything to trigger on.
    const [fullyPaid, setFullyPaid] = useState(true);

    const PAY = ['cash', 'upi', 'card', 'razorpay', 'bank_transfer'];

    const openDrawer = (type, idx = null) => { setDrawerType(type); setEditIdx(idx); setDrawerOpen(true); };

    useEffect(() => {
        if (!existingInvoice) return;

        // Customer
        const cust = existingInvoice.customerDetails || {};
        setCustomer({
            name: cust.name || '',
            email: cust.email || '',
            contactNo: cust.contactNo || '',
            address: cust.address || '',
            city: cust.city || '',
        });

        // Business (show section only if GST data exists)
        const bus = existingInvoice.businessDetails || {};
        const hasBusiness = !!bus.gstin;
        setGstEnabled(hasBusiness);
        setBusiness({
            gstin: bus.gstin || '',
            businessName: bus.businessName || '',
            businessAddress: bus.businessAddress || '',
            businessCity: bus.businessCity || '',
            businessState: bus.businessState || '',
            businessPincode: bus.businessPincode || '',
        });

        // Vehicle
        const veh = existingInvoice.vehicleDetails || {};
        setVehicle({
            brand: veh.brand || '',
            model: veh.model || '',
            modelName: veh.modelName || '',
            cc: veh.cc || '',
            bs: veh.bs || '',
        });

        // Parts & Services
        setParts(existingInvoice.partsUsed || []);
        setServices(existingInvoice.serviceProvided || []);

        // Totals & Discount
        const t = existingInvoice.total || {};
        setDiscount(String(t.discount || ''));
        setDiscountType(t.discountType || 'flat');
        setSgstRate(String(t.sgstRate ?? 9));
        setCgstRate(String(t.cgstRate ?? 9));

        // Payment
        const pd = existingInvoice.paymentDetails || {};
        setPayMethod(pd.method || 'cash');
        setAmountPaid(String(pd.amountPaid ?? t.totalAmountPaid ?? ''));
        setRzpPayId(pd.razorpayPaymentId || '');
        setRzpOrdId(pd.razorpayOrderId || '');
        setFullyPaid(existingInvoice.status === 'paid');

    }, [existingInvoice]);

    // Editing an invoice that is already linked → show which lead it is
    useEffect(() => {
        const raw = existingInvoice?.leadId;
        const lid = raw?._id || raw;
        if (!lid) return;
        if (raw?.customer) { setLinkedLead(raw); return; } // already populated by the API
        let alive = true;
        leadService.get(String(lid))
            .then((r) => { if (alive) setLinkedLead(r.data); })
            .catch(() => { if (alive) setLinkedLead({ _id: String(lid), customer: { name: 'Linked lead' } }); });
        return () => { alive = false; };
    }, [existingInvoice]);

    const handleSelectLead = (lead) => {
        setLinkedLead(lead);
        setLeadTouched(true);
        setPickerOpen(false);
        // Save typing: only fill fields that are still empty
        setCustomer((p) => ({
            ...p,
            name: p.name || lead.customer?.name || '',
            contactNo: p.contactNo || lead.customer?.phone || '',
            address: p.address || lead.location?.address || '',
            city: p.city || lead.location?.city || '',
        }));
        setVehicle((p) => ({
            ...p,
            brand: p.brand || lead.vehicle?.brand || '',
            model: p.model || lead.vehicle?.model || '',
        }));
    };

    const handleRemoveLead = () => {
        setLinkedLead(null);
        setLeadTouched(true);
    };

    const savePart = item => {
        if (editIdx !== null) setParts(p => p.map((x, i) => i === editIdx ? item : x));
        else setParts(p => [...p, item]);
        setEditIdx(null);
    };
    const saveService = item => {
        if (editIdx !== null) setServices(s => s.map((x, i) => i === editIdx ? item : x));
        else setServices(s => [...s, item]);
        setEditIdx(null);
    };

    const subTotal = calcSubtotal(parts, services);
    const discVal = parseFloat(discount) || 0;
    let afterDisc = discountType === 'percent' ? subTotal * (1 - discVal / 100) : subTotal - discVal;
    afterDisc = Math.max(afterDisc, 0);


    // Always calculate GST based on entered rates (ignore gstEnabled for tax)
    const sgstRateNum = parseFloat(sgstRate) || 0;
    const cgstRateNum = parseFloat(cgstRate) || 0;
    const totalTaxRate = sgstRateNum + cgstRateNum;

    let sgst = 0, cgst = 0, baseAmount = afterDisc;

    if (totalTaxRate > 0) {
        // Tax inclusive: afterDisc = base + base * (totalTaxRate/100)
        baseAmount = afterDisc / (1 + totalTaxRate / 100);
        sgst = baseAmount * (sgstRateNum / 100);
        cgst = baseAmount * (cgstRateNum / 100);
    } else {
        baseAmount = afterDisc;
        sgst = 0;
        cgst = 0;
    }
    const total = afterDisc;           // final payable includes tax
    const finalPayable = total;

    const resetForm = () => {
        setGstEnabled(false);
        setCustomer({ name: '', email: '', contactNo: '', address: '', city: '' });
        setBusiness({ gstin: '', businessName: '', businessAddress: '', businessCity: '', businessState: '', businessPincode: '' });
        setVehicle({ brand: '', model: '', modelName: '', cc: '', bs: '' });
        setParts([]);
        setServices([]);
        setDiscount('');
        setDiscountType('flat');
        setSgstRate('9');
        setCgstRate('9');
        setPayMethod('cash');
        setAmountPaid('');
        setRzpPayId('');
        setRzpOrdId('');
        setLinkedLead(null);
        setLeadTouched(false);
    };

    const handleSubmit = async () => {
        if (!customer.name || !customer.contactNo) {
            Alert.alert('Missing Info', 'Customer name and contact are required.');
            return;
        }
        if (parts.length === 0 && services.length === 0) {
            Alert.alert('Missing Items', 'Please add at least one part or service.');
            return;
        }

        setLoading(true);
        try {
            const toNumber = (val) => {
                const num = parseFloat(val);
                return isNaN(num) ? 0 : num;
            };

            const discVal = toNumber(discount);
            const sgstRateNum = toNumber(sgstRate);
            const cgstRateNum = toNumber(cgstRate);
            const amountPaidNum = toNumber(amountPaid);

            const subTotal = calcSubtotal(parts, services);
            let afterDisc = discountType === 'percent'
                ? subTotal * (1 - discVal / 100)
                : subTotal - discVal;
            afterDisc = Math.max(afterDisc, 0);

            // Always apply tax using the rates from state
            // Inclusive tax calculation
            const totalTaxRate = sgstRateNum + cgstRateNum;
            let sgst = 0, cgst = 0, baseAmount = afterDisc;
            if (totalTaxRate > 0) {
                baseAmount = afterDisc / (1 + totalTaxRate / 100);
                sgst = baseAmount * (sgstRateNum / 100);
                cgst = baseAmount * (cgstRateNum / 100);
            } else {
                baseAmount = afterDisc;
                sgst = 0;
                cgst = 0;
            }
            const total = afterDisc;   // inclusive total
            const finalPayable = total;
            // When not fully paid, don't silently default to the full amount —
            // an empty/0 "Amount Paid" genuinely means nothing has been
            // collected yet, which is exactly the case the Scan & Pay QR and
            // bank details exist to help with.
            const totalPaid = fullyPaid ? (amountPaidNum || finalPayable) : amountPaidNum;


            const payload = {
                invoiceNumber: isEditing ? existingInvoice.invoiceNumber : `INV-${Date.now()}`,
                invoiceDate: isEditing ? existingInvoice.invoiceDate : new Date().toISOString(),
                customerDetails: {
                    name: customer.name.trim(),
                    email: customer.email.trim() || undefined,
                    contactNo: customer.contactNo.trim(),
                    address: customer.address.trim() || undefined,
                    city: customer.city.trim() || undefined,
                },
                vehicleDetails: {
                    brand: vehicle.brand.trim() || undefined,
                    model: vehicle.model.trim() || undefined,
                    modelName: vehicle.modelName.trim() || undefined,
                    cc: vehicle.cc.trim() || undefined,
                    bs: vehicle.bs.trim() || undefined,
                },
                partsUsed: parts,
                serviceProvided: services,
                total: {
                    subTotal,
                    discount: discVal,
                    discountType: discVal > 0 ? discountType : undefined,
                    sgst,
                    cgst,
                    sgstRate: sgstRateNum,
                    cgstRate: cgstRateNum,
                    baseAmount,        // <-- exclusive base
                    total,             // <-- inclusive total
                    finalPayable,
                    totalAmountPaid: totalPaid,
                },
                paymentDetails: {
                    method: payMethod,
                    razorpayPaymentId: rzpPayId.trim() || null,
                    razorpayOrderId: rzpOrdId.trim() || null,
                    amountPaid: totalPaid,
                    walletAmountUsed: 0,
                    totalSettled: totalPaid,
                    paymentDate: fullyPaid ? new Date().toISOString() : null,
                },
                status: fullyPaid ? 'paid' : 'unpaid',
            };

            // Remove discountType if discount is zero
            if (!payload.total.discountType) delete payload.total.discountType;

            // Business details sent ONLY if GST toggle is ON
            if (!gstEnabled) {
                delete payload.businessDetails;
            } else {
                payload.businessDetails = {
                    gstin: business.gstin.trim().toUpperCase() || undefined,
                    businessName: business.businessName.trim() || undefined,
                    businessAddress: business.businessAddress.trim() || undefined,
                    businessCity: business.businessCity.trim() || undefined,
                    businessState: business.businessState.trim() || undefined,
                    businessPincode: business.businessPincode.trim() || undefined,
                };
                // remove empty fields
                Object.keys(payload.businessDetails).forEach(key => {
                    if (!payload.businessDetails[key]) delete payload.businessDetails[key];
                });
                if (Object.keys(payload.businessDetails).length === 0) delete payload.businessDetails;
            }

            // Clean up customer/vehicle undefined fields
            Object.keys(payload.customerDetails).forEach(k => {
                if (payload.customerDetails[k] === undefined) delete payload.customerDetails[k];
            });
            Object.keys(payload.vehicleDetails).forEach(k => {
                if (payload.vehicleDetails[k] === undefined) delete payload.vehicleDetails[k];
            });



            // Lead link: on create send it when chosen; on edit only when the user changed it
            // (null removes an existing link).
            if (isEditing) {
                if (leadTouched) payload.leadId = linkedLead?._id || null;
            } else if (linkedLead?._id) {
                payload.leadId = linkedLead._id;
            }

            if (isEditing) {
                await axiosClient.put(`/api/manual-invoices/${invoiceId}`, payload);
            } else {
                await axiosClient.post('/api/manual-invoices', payload);
            }
            if (isEditing) {
                Alert.alert('Updated', 'Invoice has been updated.', [
                    { text: 'OK', onPress: () => navigation.navigate('ManualInvoiceDetail', { invoiceId }) }
                ]);
            } else {
                resetForm();
                Alert.alert('Success', 'Invoice created!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            console.error('Invoice creation error', error);
            const message = error.response?.data?.message || error.message || 'Network error';
            if (error.response?.status === 409) {
                Alert.alert('Conflict', message.includes('already') ? message : 'Invoice number already exists. Please try again.');
            } else if (error.response?.status === 400) {
                Alert.alert('Validation Error', message);
            } else {
                Alert.alert('Error', message);
            }
        } finally {
            setLoading(false);
        }
    };

    const editItem = drawerType === 'part'
        ? (editIdx !== null ? parts[editIdx] : null)
        : (editIdx !== null ? services[editIdx] : null);

    // Helper to decide if we show tax rows
    const showTax = sgstRateNum > 0 || cgstRateNum > 0;

    return (
        <ScreenWrapper title="Create Invoice">
            <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 16, paddingBottom: 110 }}
            >
                {/* GST toggle - now only for business details */}
                <View style={[ms.gstRow, { backgroundColor: gstEnabled ? C.primary + '12' : C.surfaceHigh, borderColor: gstEnabled ? C.primary + '45' : C.border }]}>
                    <View style={[ms.gstIcon, { backgroundColor: gstEnabled ? C.primary : C.surfaceHighest }]}>
                        <Ionicons name="document-text" size={17} color={gstEnabled ? '#1a1a1a' : C.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[ms.gstTitle, { color: C.textPrimary }]}>GST Invoice</Text>
                        <Text style={[ms.gstSub, { color: C.textMuted }]}>
                            {gstEnabled ? 'Business details included' : 'Toggle ON to add your GSTIN & business info'}
                        </Text>
                    </View>
                    <Switch value={gstEnabled} onValueChange={setGstEnabled}
                        thumbColor={gstEnabled ? C.primary : C.textMuted}
                        trackColor={{ false: C.border, true: C.primary + '55' }} />
                </View>

                {/* Linked lead (optional) */}
                <LinkedLeadCard
                    lead={linkedLead}
                    onPick={() => setPickerOpen(true)}
                    onRemove={handleRemoveLead}
                    theme={theme}
                />

                {/* Customer */}
                <SectionCard title="Customer" icon="person-outline" theme={theme}>
                    <Row>
                        <Field label="Name *" value={customer.name} onChangeText={v => setCustomer(p => ({ ...p, name: v }))} theme={theme} half />
                        <Field label="Contact *" value={customer.contactNo} onChangeText={v => setCustomer(p => ({ ...p, contactNo: v }))} keyboardType="phone-pad" theme={theme} half />
                    </Row>
                    <Field label="Email" value={customer.email} onChangeText={v => setCustomer(p => ({ ...p, email: v }))} keyboardType="email-address" theme={theme} />
                    <Field label="Address" value={customer.address} onChangeText={v => setCustomer(p => ({ ...p, address: v }))} theme={theme} />
                    <Field label="City" value={customer.city} onChangeText={v => setCustomer(p => ({ ...p, city: v }))} theme={theme} />
                </SectionCard>

                {/* Business GST - only shown when toggle ON */}
                {gstEnabled && (
                    <SectionCard title="Business / GST" icon="business-outline" theme={theme}>
                        <Row>
                            <Field label="GSTIN" value={business.gstin} onChangeText={v => setBusiness(p => ({ ...p, gstin: v.toUpperCase() }))} theme={theme} half />
                            <Field label="Business Name" value={business.businessName} onChangeText={v => setBusiness(p => ({ ...p, businessName: v }))} theme={theme} half />
                        </Row>
                        <Field label="Business Address" value={business.businessAddress} onChangeText={v => setBusiness(p => ({ ...p, businessAddress: v }))} theme={theme} />
                        <Row>
                            <Field label="City" value={business.businessCity} onChangeText={v => setBusiness(p => ({ ...p, businessCity: v }))} theme={theme} half />
                            <Field label="State" value={business.businessState} onChangeText={v => setBusiness(p => ({ ...p, businessState: v }))} theme={theme} half />
                        </Row>
                        <Field label="Pincode" value={business.businessPincode} onChangeText={v => setBusiness(p => ({ ...p, businessPincode: v }))} keyboardType="numeric" theme={theme} half />
                    </SectionCard>
                )}

                {/* Vehicle */}
                <SectionCard title="Vehicle" icon="bicycle-outline" theme={theme}>
                    <Row>
                        <Field label="Brand" value={vehicle.brand} onChangeText={v => setVehicle(p => ({ ...p, brand: v }))} theme={theme} half />
                        <Field label="Model" value={vehicle.model} onChangeText={v => setVehicle(p => ({ ...p, model: v }))} theme={theme} half />
                    </Row>
                    <Row>
                        <Field label="Model Name" value={vehicle.modelName} onChangeText={v => setVehicle(p => ({ ...p, modelName: v }))} theme={theme} half />
                        <Field label="CC" value={vehicle.cc} onChangeText={v => setVehicle(p => ({ ...p, cc: v }))} keyboardType="numeric" theme={theme} half />
                    </Row>
                    <Field label="BS (e.g. BS6)" value={vehicle.bs} onChangeText={v => setVehicle(p => ({ ...p, bs: v }))} theme={theme} half />
                </SectionCard>

                {/* Parts */}
                <SectionCard title="Parts Used" icon="construct-outline" theme={theme}>
                    {parts.length === 0 && (
                        <Text style={[ms.emptyHint, { color: C.textMuted }]}>No parts added yet</Text>
                    )}
                    {parts.map((p, i) => (
                        <ItemRow key={i} item={p} index={i} nameKey="partName"
                            onEdit={idx => openDrawer('part', idx)}
                            onRemove={idx => setParts(prev => prev.filter((_, ii) => ii !== idx))}
                            theme={theme} />
                    ))}
                    <AddBtn label="Add Part" onPress={() => openDrawer('part')} theme={theme} />
                </SectionCard>

                {/* Services */}
                <SectionCard title="Services Provided" icon="hammer-outline" theme={theme}>
                    {services.length === 0 && (
                        <Text style={[ms.emptyHint, { color: C.textMuted }]}>No services added yet</Text>
                    )}
                    {services.map((s, i) => (
                        <ItemRow key={i} item={s} index={i} nameKey="serviceName"
                            onEdit={idx => openDrawer('service', idx)}
                            onRemove={idx => setServices(prev => prev.filter((_, ii) => ii !== idx))}
                            theme={theme} />
                    ))}
                    <AddBtn label="Add Service" onPress={() => openDrawer('service')} theme={theme} />
                </SectionCard>

                {/* Discounts */}
                <SectionCard title="Discounts" icon="pricetag-outline" theme={theme}>
                    <Row>
                        <Field label="Bill Discount" value={discount} onChangeText={setDiscount} keyboardType="numeric" theme={theme} half />
                        <View style={{ flex: 0.48 }}>
                            <Text style={[fldS.label, { color: C.textMuted }]}>TYPE</Text>
                            <View style={{ marginTop: 6 }}>
                                <DiscChips value={discountType} onChange={setDiscountType} theme={theme} />
                            </View>
                        </View>
                    </Row>
                </SectionCard>

                {/* Tax - always visible, rates always editable */}
                <SectionCard title="Tax (SGST / CGST)" icon="receipt-outline" theme={theme}>
                    <View style={[ms.taxBanner, { backgroundColor: C.surfaceLow, borderColor: C.border }]}>
                        <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
                        <Text style={[ms.taxBannerText, { color: C.textMuted }]}>
                            GST will be applied using the rates below (toggle above only for business details)
                        </Text>
                    </View>
                    <Row style={{ marginTop: 10 }}>
                        <Field label="SGST %" value={sgstRate} onChangeText={setSgstRate} keyboardType="numeric" theme={theme} half />
                        <Field label="CGST %" value={cgstRate} onChangeText={setCgstRate} keyboardType="numeric" theme={theme} half />
                    </Row>
                </SectionCard>

                {/* Payment */}
                <SectionCard title="Payment" icon="card-outline" theme={theme}>
                    <View style={[ms.taxBanner, { backgroundColor: C.surfaceLow, borderColor: C.border, marginBottom: 14 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: C.textPrimary }}>
                                Payment received in full?
                            </Text>
                            <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                                Turn off if the customer still owes some or all of this invoice — a
                                "Scan & Pay" QR code and bank details will then appear when it's shared.
                            </Text>
                        </View>
                        <Switch
                            value={fullyPaid}
                            onValueChange={setFullyPaid}
                            trackColor={{ false: C.border, true: `${C.primary}90` }}
                            thumbColor={fullyPaid ? C.primary : '#f4f3f4'}
                        />
                    </View>
                    <Text style={[fldS.label, { color: C.textMuted, marginBottom: 8 }]}>METHOD</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {PAY.map(m => (
                            <TouchableOpacity key={m} onPress={() => setPayMethod(m)}
                                style={[dcS.chip, {
                                    backgroundColor: payMethod === m ? C.primary : C.surfaceLow,
                                    borderColor: payMethod === m ? C.primary : C.border,
                                }]}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: payMethod === m ? '#1a1a1a' : C.textSecondary, textTransform: 'capitalize' }}>
                                    {m.replace('_', ' ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Field
                        label={fullyPaid ? "Amount Paid ₹" : "Amount Collected So Far ₹ (leave blank if nothing yet)"}
                        value={amountPaid}
                        onChangeText={setAmountPaid}
                        keyboardType="numeric"
                        theme={theme}
                    />
                    {payMethod === 'razorpay' && (
                        <>
                            <Field label="Razorpay Payment ID" value={rzpPayId} onChangeText={setRzpPayId} theme={theme} />
                            <Field label="Razorpay Order ID" value={rzpOrdId} onChangeText={setRzpOrdId} theme={theme} />
                        </>
                    )}
                </SectionCard>

                {/* Summary - shows tax breakdown correctly */}
                <SectionCard title="Summary" icon="calculator-outline" theme={theme}>
                    {/* Taxable value (exclusive) */}
                    <SummaryRow label="Taxable Value" value={`₹${baseAmount.toFixed(2)}`} theme={theme} />

                    {/* Bill discount (if any) */}
                    {discVal > 0 && (
                        <SummaryRow
                            label={`Discount (${discountType === 'percent' ? `${discVal}%` : `₹${discVal}`})`}
                            value={`−₹${(discountType === 'percent' ? subTotal * discVal / 100 : discVal).toFixed(2)}`}
                            color={C.success} theme={theme}
                        />
                    )}

                    {/* GST components */}
                    {sgstRateNum > 0 && (
                        <SummaryRow label={`SGST (${sgstRateNum}%)`} value={`₹${sgst.toFixed(2)}`} theme={theme} />
                    )}
                    {cgstRateNum > 0 && (
                        <SummaryRow label={`CGST (${cgstRateNum}%)`} value={`₹${cgst.toFixed(2)}`} theme={theme} />
                    )}

                    {/* Divider and inclusive totals */}
                    <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />

                    <SummaryRow
                        label="Total (incl. tax)"
                        value={`₹${afterDisc.toFixed(2)}`}
                        bold
                        theme={theme}
                    />
                    <SummaryRow
                        label="Final Payable"
                        value={`₹${finalPayable.toFixed(2)}`}
                        bold
                        theme={theme}
                        divider
                    />
                </SectionCard>
                {/* Submit */}
                <TouchableOpacity onPress={handleSubmit} disabled={loading}
                    style={[ms.submitBtn, { backgroundColor: C.primary, opacity: loading ? 0.7 : 1 }]}
                    activeOpacity={0.85}>
                    {loading
                        ? <ActivityIndicator size="small" color="#1a1a1a" />
                        : (
                            <>
                                <Ionicons name={isEditing ? "checkmark-done" : "checkmark-circle"} size={20} color="#1a1a1a" />
                                <Text style={ms.submitLabel}>{isEditing ? 'Update Invoice' : 'Create Invoice'}</Text>
                            </>
                        )}
                </TouchableOpacity>
            </ScrollView>

            <ItemDrawer
                visible={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onSave={drawerType === 'part' ? savePart : saveService}
                type={drawerType}
                editItem={editItem}
                theme={theme}
            />

            <LeadPickerModal
                visible={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={handleSelectLead}
            />
        </ScreenWrapper>
    );
}

const ms = StyleSheet.create({
    gstRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 14 },
    gstIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    gstTitle: { fontSize: 14, fontWeight: '800' },
    gstSub: { fontSize: 11, marginTop: 2 },
    taxBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1.5 },
    taxBannerText: { flex: 1, fontSize: 12, fontWeight: '600' },
    emptyHint: { fontSize: 12, textAlign: 'center', paddingVertical: 8, fontStyle: 'italic' },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 17, borderRadius: 18 },
    submitLabel: { fontSize: 16, fontWeight: '900', color: '#1a1a1a', letterSpacing: 0.3 },
});