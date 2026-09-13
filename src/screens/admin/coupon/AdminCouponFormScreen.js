import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Animated,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Switch,
    Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import PopUp from '../../../components/common/PopUp';
import useCoupon from '../../../hooks/useCoupon';

// ─── Animated Input ───────────────────────────────────────────────────────────
const AnimatedInput = ({ value, onChangeText, placeholder, theme, isDark, keyboardType, autoCapitalize }) => {
    const [focused, setFocused] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(borderAnim, { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
    }, [focused]);

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.border, theme.colors.primary],
    });

    return (
        <Animated.View
            style={[
                inputStyles.wrap,
                { backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow, borderColor },
            ]}
        >
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textMuted}
                style={[inputStyles.input, { color: theme.colors.textPrimary }]}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
            />
        </Animated.View>
    );
};

const inputStyles = StyleSheet.create({
    wrap: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
    input: { fontSize: 14, fontWeight: '500', paddingHorizontal: 14, paddingVertical: 13, letterSpacing: 0.2 },
});

// ─── Keyboard height tracker ────────────────────────────────────────────────────
// Native `KeyboardAvoidingView` shrinks the view, but on Android (especially with
// `edgeToEdgeEnabled: true` in app.json) the OS often doesn't resize the window on
// its own — so we also track the live keyboard height and pad the ScrollView with
// it, guaranteeing every field (and the Save button) can always scroll clear of
// the keyboard instead of being hidden behind it.
const useKeyboardHeight = () => {
    const [height, setHeight] = useState(0);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e) => {
            setHeight(e?.endCoordinates?.height ?? 0);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    return height;
};

const FieldLabel = ({ label, theme, hint }) => (
    <View style={{ marginBottom: 8 }}>
        <Text style={[labelStyles.text, { color: theme.colors.textMuted }]}>{label}</Text>
        {!!hint && <Text style={[labelStyles.hint, { color: theme.colors.textMuted }]}>{hint}</Text>}
    </View>
);

const labelStyles = StyleSheet.create({
    text: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    hint: { fontSize: 11, marginTop: 3, textTransform: 'none', letterSpacing: 0.2 },
});

// ─── Segmented control (2-3 options) ───────────────────────────────────────────
const Segmented = ({ options, value, onChange, theme, isDark }) => (
    <View style={[segStyles.wrap, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow }]}>
        {options.map((opt) => {
            const active = value === opt.value;
            return (
                <TouchableOpacity
                    key={opt.value}
                    onPress={() => onChange(opt.value)}
                    activeOpacity={0.8}
                    style={[
                        segStyles.item,
                        active && { backgroundColor: theme.colors.primary },
                    ]}
                >
                    <Text style={[segStyles.text, { color: active ? '#1a1a1a' : theme.colors.textSecondary, fontWeight: active ? '800' : '600' }]}>
                        {opt.label}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

const segStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
    item: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
    text: { fontSize: 12.5 },
});

// ─── Field wrapper ──────────────────────────────────────────────────────────────
const Field = ({ children }) => <View style={{ marginBottom: 18, zIndex: 1 }}>{children}</View>;

// ─── Main Screen ──────────────────────────────────────────────────────────────
// route.params.coupon = existing coupon doc for edit mode (optional)
export default function AdminCouponFormScreen({ navigation, route }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();
    const scrollRef = useRef(null);

    const { createCoupon, updateCoupon, deleteCoupon } = useCoupon({}, 1, 1);

    const editCoupon = route?.params?.coupon ?? null;
    const isEditing = !!editCoupon;

    // ── Form fields — adjust keys here if the Coupon schema differs ──
    const [code, setCode] = useState(editCoupon?.code ?? '');
    const [description, setDescription] = useState(editCoupon?.description ?? '');
    const [discountType, setDiscountType] = useState(editCoupon?.discountType ?? 'percentage'); // 'percentage' | 'flat'
    const [discountValue, setDiscountValue] = useState(editCoupon?.discountValue?.toString() ?? '');
    const [maxDiscountAmount, setMaxDiscountAmount] = useState(editCoupon?.maxDiscountAmount?.toString() ?? '');
    const [minOrderAmount, setMinOrderAmount] = useState(editCoupon?.minOrderAmount?.toString() ?? '');
    const [serviceType, setServiceType] = useState(editCoupon?.serviceType ?? 'all'); // 'all' | 'scheduled' | 'emergency'
    const [usageLimit, setUsageLimit] = useState(editCoupon?.usageLimit?.toString() ?? '');
    const [perUserLimit, setPerUserLimit] = useState(editCoupon?.perUserLimit?.toString() ?? '');
    const [validFrom, setValidFrom] = useState(
        editCoupon?.validFrom ? new Date(editCoupon.validFrom).toISOString().slice(0, 10) : ''
    );
    const [validUntil, setValidUntil] = useState(
        editCoupon?.validUntil ? new Date(editCoupon.validUntil).toISOString().slice(0, 10) : ''
    );
    const [isActive, setIsActive] = useState(editCoupon?.isActive ?? true);

    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deletePopup, setDeletePopup] = useState(false);
    const [popup, setPopup] = useState({ visible: false, title: '', message: '', type: 'error' });

    const showPopup = (title, message, type = 'error') => setPopup({ visible: true, title, message, type });
    const closePopup = () => setPopup((p) => ({ ...p, visible: false }));

    // Entrance animations
    const slideY = useRef(new Animated.Value(30)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const badgeScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.spring(slideY, { toValue: 0, speed: 16, bounciness: 5, useNativeDriver: true }),
        ]).start();
        Animated.spring(badgeScale, { toValue: 1, speed: 20, bounciness: 10, delay: 200, useNativeDriver: true }).start();
    }, []);

    const parseDate = (str) => {
        if (!str) return undefined;
        const d = new Date(`${str}T00:00:00`);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
    };

    const validate = () => {
        if (!code.trim()) return 'Coupon code is required.';
        if (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0) {
            return 'Enter a valid discount value.';
        }
        if (discountType === 'percentage' && Number(discountValue) > 100) {
            return 'Percentage discount cannot exceed 100.';
        }
        if (validFrom && isNaN(new Date(validFrom).getTime())) return 'Valid from date is invalid. Use YYYY-MM-DD.';
        if (validUntil && isNaN(new Date(validUntil).getTime())) return 'Valid until date is invalid. Use YYYY-MM-DD.';
        return null;
    };

    const handleSave = async () => {
        const validationError = validate();
        if (validationError) {
            showPopup('Check your inputs', validationError, 'warning');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                code: code.trim().toUpperCase(),
                description: description.trim() || undefined,
                discountType,
                discountValue: Number(discountValue),
                maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
                minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
                serviceType: serviceType === 'all' ? undefined : serviceType,
                usageLimit: usageLimit ? Number(usageLimit) : undefined,
                perUserLimit: perUserLimit ? Number(perUserLimit) : undefined,
                validFrom: parseDate(validFrom),
                validUntil: parseDate(validUntil),
                isActive,
            };

            if (isEditing) {
                await updateCoupon(editCoupon._id, payload);
            } else {
                await createCoupon(payload);
            }
            navigation.goBack();
        } catch (err) {
            showPopup('Error', err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        setDeletePopup(false);
        setDeleteLoading(true);
        try {
            await deleteCoupon(editCoupon._id);
            navigation.goBack();
        } catch (err) {
            showPopup('Error', err.message || 'Failed to delete coupon.');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <>
            <ScreenWrapper
                title=""
                rightSlot={
                    isEditing ? (
                        <TouchableOpacity onPress={() => setDeletePopup(true)} activeOpacity={0.75}>
                            {deleteLoading
                                ? <ActivityIndicator size="small" color={theme.colors.error} />
                                : <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                            }
                        </TouchableOpacity>
                    ) : null
                }
            >
                <KeyboardAvoidingView
                    // 'padding' works well on iOS; on Android 'height' actually shrinks
                    // the container so the ScrollView beneath it gets more room to
                    // scroll into — plain `undefined` here was leaving the keyboard to
                    // just sit on top of the form with no avoidance at all.
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={0}
                >
                    <ScrollView
                        ref={scrollRef}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.scroll,
                            { paddingBottom: insets.bottom + 32 + keyboardHeight },
                        ]}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                    >
                        {/* Header */}
                        <Animated.View style={[styles.header, { opacity, transform: [{ translateY: slideY }] }]}>
                            <Animated.View style={[styles.badge, { backgroundColor: theme.colors.primary, transform: [{ scale: badgeScale }] }]}>
                                <Text style={styles.badgeText}>{isEditing ? 'EDIT COUPON' : 'CREATE COUPON'}</Text>
                            </Animated.View>
                            <Text style={[styles.headline, { color: theme.colors.textPrimary }]}>
                                {isEditing ? editCoupon.code : 'New Coupon'}
                            </Text>
                        </Animated.View>

                        {/* Form card */}
                        <Animated.View
                            style={[
                                styles.card,
                                {
                                    backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
                                    borderColor: theme.colors.border,
                                    opacity,
                                    transform: [{ translateY: slideY }],
                                },
                            ]}
                        >
                            <View style={styles.decoWrap} pointerEvents="none">
                                <MaterialCommunityIcons name="ticket-percent-outline" size={130} color={theme.colors.primary} style={{ opacity: 0.06 }} />
                            </View>

                            <Field>
                                <FieldLabel label="Coupon Code" theme={theme} />
                                <AnimatedInput
                                    value={code}
                                    onChangeText={(t) => setCode(t.toUpperCase())}
                                    placeholder="e.g. WELCOME50"
                                    theme={theme}
                                    isDark={isDark}
                                    autoCapitalize="characters"
                                />
                            </Field>

                            <Field>
                                <FieldLabel label="Description" theme={theme} hint="Shown to customers when they apply the coupon (optional)" />
                                <AnimatedInput
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="e.g. Flat 50 off on your first service"
                                    theme={theme}
                                    isDark={isDark}
                                />
                            </Field>

                            <Field>
                                <FieldLabel label="Discount Type" theme={theme} />
                                <Segmented
                                    options={[
                                        { label: 'Percentage', value: 'percentage' },
                                        { label: 'Flat Amount', value: 'flat' },
                                    ]}
                                    value={discountType}
                                    onChange={setDiscountType}
                                    theme={theme}
                                    isDark={isDark}
                                />
                            </Field>

                            <Field>
                                <FieldLabel
                                    label={discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount (₹)'}
                                    theme={theme}
                                />
                                <AnimatedInput
                                    value={discountValue}
                                    onChangeText={setDiscountValue}
                                    placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 100'}
                                    theme={theme}
                                    isDark={isDark}
                                    keyboardType="numeric"
                                />
                            </Field>

                            {discountType === 'percentage' && (
                                <Field>
                                    <FieldLabel label="Max Discount Cap (₹)" theme={theme} hint="Optional — caps the discount amount for percentage coupons" />
                                    <AnimatedInput
                                        value={maxDiscountAmount}
                                        onChangeText={setMaxDiscountAmount}
                                        placeholder="e.g. 200"
                                        theme={theme}
                                        isDark={isDark}
                                        keyboardType="numeric"
                                    />
                                </Field>
                            )}

                            <Field>
                                <FieldLabel label="Minimum Order Amount (₹)" theme={theme} hint="Optional — order must reach this subtotal to qualify" />
                                <AnimatedInput
                                    value={minOrderAmount}
                                    onChangeText={setMinOrderAmount}
                                    placeholder="e.g. 500"
                                    theme={theme}
                                    isDark={isDark}
                                    keyboardType="numeric"
                                />
                            </Field>

                            <Field>
                                <FieldLabel label="Applicable Service" theme={theme} />
                                <Segmented
                                    options={[
                                        { label: 'All', value: 'all' },
                                        { label: 'Scheduled', value: 'scheduled' },
                                        { label: 'Emergency', value: 'emergency' },
                                    ]}
                                    value={serviceType}
                                    onChange={setServiceType}
                                    theme={theme}
                                    isDark={isDark}
                                />
                            </Field>

                            <Field>
                                <FieldLabel label="Total Usage Limit" theme={theme} hint="Optional — max number of times this coupon can be redeemed overall" />
                                <AnimatedInput
                                    value={usageLimit}
                                    onChangeText={setUsageLimit}
                                    placeholder="Leave blank for unlimited"
                                    theme={theme}
                                    isDark={isDark}
                                    keyboardType="numeric"
                                />
                            </Field>

                            <Field>
                                <FieldLabel label="Per-User Limit" theme={theme} hint="Optional — max redemptions per customer" />
                                <AnimatedInput
                                    value={perUserLimit}
                                    onChangeText={setPerUserLimit}
                                    placeholder="Leave blank for unlimited"
                                    theme={theme}
                                    isDark={isDark}
                                    keyboardType="numeric"
                                />
                            </Field>

                            <View style={styles.dateRow}>
                                <View style={{ flex: 1 }}>
                                    <FieldLabel label="Valid From" theme={theme} hint="YYYY-MM-DD" />
                                    <AnimatedInput
                                        value={validFrom}
                                        onChangeText={setValidFrom}
                                        placeholder="2026-01-01"
                                        theme={theme}
                                        isDark={isDark}
                                    />
                                </View>
                                <View style={{ width: 12 }} />
                                <View style={{ flex: 1 }}>
                                    <FieldLabel label="Valid Until" theme={theme} hint="YYYY-MM-DD" />
                                    <AnimatedInput
                                        value={validUntil}
                                        onChangeText={setValidUntil}
                                        placeholder="2026-12-31"
                                        theme={theme}
                                        isDark={isDark}
                                    />
                                </View>
                            </View>

                            <View style={[styles.activeRow, { borderColor: theme.colors.border }]}>
                                <View>
                                    <Text style={[styles.activeLabel, { color: theme.colors.textPrimary }]}>Active</Text>
                                    <Text style={[styles.activeHint, { color: theme.colors.textMuted }]}>
                                        Inactive coupons cannot be applied by customers
                                    </Text>
                                </View>
                                <Switch
                                    value={isActive}
                                    onValueChange={setIsActive}
                                    trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}90` }}
                                    thumbColor={isActive ? theme.colors.primary : '#f4f3f4'}
                                />
                            </View>
                        </Animated.View>

                        {/* Save button */}
                        <Animated.View style={{ opacity, transform: [{ translateY: slideY }] }}>
                            <TouchableOpacity onPress={handleSave} activeOpacity={0.82} disabled={loading} style={styles.saveBtnWrap}>
                                <View style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}>
                                    {loading ? (
                                        <ActivityIndicator color="#1a1a1a" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={18} color="#1a1a1a" style={{ marginRight: 8 }} />
                                            <Text style={styles.saveBtnText}>{isEditing ? 'UPDATE COUPON' : 'SAVE COUPON'}</Text>
                                        </>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ScreenWrapper>

            <PopUp
                visible={popup.visible}
                title={popup.title}
                message={popup.message}
                primaryLabel="Okay"
                onPrimary={closePopup}
                onClose={closePopup}
            />

            {isEditing && (
                <PopUp
                    visible={deletePopup}
                    title="Delete Coupon"
                    message={`Delete "${editCoupon?.code}"? This cannot be undone.`}
                    primaryLabel="Delete"
                    secondaryLabel="Cancel"
                    onPrimary={confirmDelete}
                    onSecondary={() => setDeletePopup(false)}
                    onClose={() => setDeletePopup(false)}
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    scroll: { paddingTop: 8 },
    header: { marginBottom: 20 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 10 },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: '#1a1a1a' },
    headline: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, lineHeight: 30 },
    card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 20, overflow: 'hidden' },
    decoWrap: { position: 'absolute', bottom: 0, right: -20, zIndex: 0 },
    dateRow: { flexDirection: 'row', marginBottom: 18 },
    activeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 16,
        marginTop: 2,
    },
    activeLabel: { fontSize: 14, fontWeight: '700' },
    activeHint: { fontSize: 11, marginTop: 3, maxWidth: 220 },
    saveBtnWrap: { borderRadius: 16, overflow: 'hidden' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, borderRadius: 16 },
    saveBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 2, color: '#1a1a1a' },
});