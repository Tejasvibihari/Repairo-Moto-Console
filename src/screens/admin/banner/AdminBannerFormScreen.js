// src/screens/admin/banner/AdminBannerFormScreen.js
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
    Image,
    ActionSheetIOS,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import PopUp from '../../../components/common/PopUp';
import useBanner from '../../../hooks/useBanner';
import { getImageUrl } from '../../../utils/imageUtils';
import {
    BANNER_ASPECT_RATIO,
    BANNER_TARGET_WIDTH,
    BANNER_TARGET_HEIGHT,
    pickBannerImageFromLibrary,
    pickBannerImageFromCamera,
} from '../../../utils/bannerImage';

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

const Field = ({ children }) => <View style={{ marginBottom: 18, zIndex: 1 }}>{children}</View>;

// ─── Banner image picker/cropper field ─────────────────────────────────────────
// Always crops to a locked 16:9 box via the OS-native crop UI, then normalizes
// to a fixed 1200x675 output so every banner is a uniform size for the carousel.
const BannerImageField = ({ previewUri, onPicked, theme, isDark, picking, setPicking }) => {
    const runPick = async (fromCamera) => {
        setPicking(true);
        try {
            const asset = fromCamera ? await pickBannerImageFromCamera() : await pickBannerImageFromLibrary();
            if (asset) onPicked(asset);
        } catch (err) {
            Alert.alert('Error', 'Could not process that image. Please try another one.');
        } finally {
            setPicking(false);
        }
    };

    const handlePress = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Choose from Gallery', 'Take Photo'],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) runPick(false);
                    if (buttonIndex === 2) runPick(true);
                }
            );
        } else {
            Alert.alert('Banner Image', 'Choose a source', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Gallery', onPress: () => runPick(false) },
                { text: 'Camera', onPress: () => runPick(true) },
            ]);
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePress}
            disabled={picking}
            style={[
                imgFieldStyles.wrap,
                {
                    aspectRatio: BANNER_ASPECT_RATIO,
                    backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow,
                    borderColor: theme.colors.border,
                },
            ]}
        >
            {previewUri ? (
                <>
                    <Image source={{ uri: previewUri }} style={imgFieldStyles.image} resizeMode="cover" />
                    <View style={imgFieldStyles.editBadge}>
                        {picking ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="crop-outline" size={13} color="#FFFFFF" />
                                <Text style={imgFieldStyles.editBadgeText}>Recrop</Text>
                            </>
                        )}
                    </View>
                </>
            ) : (
                <View style={imgFieldStyles.placeholder}>
                    {picking ? (
                        <ActivityIndicator color={theme.colors.primary} />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="image-plus" size={32} color={theme.colors.textMuted} />
                            <Text style={[imgFieldStyles.placeholderText, { color: theme.colors.textMuted }]}>
                                Tap to add a banner image
                            </Text>
                        </>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const imgFieldStyles = StyleSheet.create({
    wrap: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    image: { width: '100%', height: '100%' },
    placeholder: { alignItems: 'center', gap: 8 },
    placeholderText: { fontSize: 12, fontWeight: '600' },
    editBadge: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    editBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
// route.params.banner = existing banner doc for edit mode (optional)
// route.params.meta   = { total, maxTotal, active, maxActive } from the list screen
export default function AdminBannerFormScreen({ navigation, route }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();
    const scrollRef = useRef(null);

    const { createBanner, updateBanner, deleteBanner } = useBanner();

    const editBanner = route?.params?.banner ?? null;
    const isEditing = !!editBanner;
    const meta = route?.params?.meta ?? { total: 0, maxTotal: 10, active: 0, maxActive: 5 };

    const [title, setTitle] = useState(editBanner?.title ?? '');
    const [link, setLink] = useState(editBanner?.link ?? '');
    const [isActive, setIsActive] = useState(editBanner?.isActive ?? true);
    const [imageAsset, setImageAsset] = useState(null); // newly picked local asset { uri }
    const [picking, setPicking] = useState(false);

    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deletePopup, setDeletePopup] = useState(false);
    const [popup, setPopup] = useState({ visible: false, title: '', message: '' });

    const showPopup = (title, message) => setPopup({ visible: true, title, message });
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

    const previewUri = imageAsset?.uri || (editBanner?.image ? getImageUrl(editBanner.image) : null);

    // Would this save turn on visibility while 5 are already active elsewhere?
    const wouldExceedActiveLimit =
        isActive &&
        !editBanner?.isActive &&
        meta.active >= meta.maxActive;

    const handleSave = async () => {
        if (!isEditing && !imageAsset) {
            showPopup('Image required', 'Please add a banner image before saving.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                title: title.trim(),
                link: link.trim(),
                isActive,
                image: imageAsset,
            };

            if (isEditing) {
                await updateBanner(editBanner._id, payload);
            } else {
                await createBanner(payload);
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
            await deleteBanner(editBanner._id);
            navigation.goBack();
        } catch (err) {
            showPopup('Error', err.message || 'Failed to delete banner.');
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
                                <Text style={styles.badgeText}>{isEditing ? 'EDIT BANNER' : 'CREATE BANNER'}</Text>
                            </Animated.View>
                            <Text style={[styles.headline, { color: theme.colors.textPrimary }]}>
                                {isEditing ? (editBanner.title?.trim() || 'Untitled banner') : 'New Banner'}
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
                            <Field>
                                <FieldLabel
                                    label="Banner Image"
                                    theme={theme}
                                    hint={`Cropped to 16:9 and resized to ${BANNER_TARGET_WIDTH}×${BANNER_TARGET_HEIGHT}px so it always fits the app carousel`}
                                />
                                <BannerImageField
                                    previewUri={previewUri}
                                    onPicked={setImageAsset}
                                    theme={theme}
                                    isDark={isDark}
                                    picking={picking}
                                    setPicking={setPicking}
                                />
                            </Field>

                            <Field>
                                <FieldLabel label="Title" theme={theme} hint="Optional — internal label, not shown on the banner image itself" />
                                <AnimatedInput
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="e.g. Diwali Service Offer"
                                    theme={theme}
                                    isDark={isDark}
                                />
                            </Field>

                            <Field>
                                <FieldLabel label="Link" theme={theme} hint="Optional — screen route or URL to open when tapped" />
                                <AnimatedInput
                                    value={link}
                                    onChangeText={setLink}
                                    placeholder="e.g. https://... or a promo code"
                                    theme={theme}
                                    isDark={isDark}
                                    autoCapitalize="none"
                                />
                            </Field>

                            <View style={[styles.activeRow, { borderColor: theme.colors.border }]}>
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={[styles.activeLabel, { color: theme.colors.textPrimary }]}>Visible in app</Text>
                                    <Text style={[styles.activeHint, { color: theme.colors.textMuted }]}>
                                        Up to {meta.maxActive} banners can be visible at a time ({meta.active}/{meta.maxActive} currently visible)
                                    </Text>
                                </View>
                                <Switch
                                    value={isActive}
                                    onValueChange={setIsActive}
                                    trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}90` }}
                                    thumbColor={isActive ? theme.colors.primary : '#f4f3f4'}
                                />
                            </View>

                            {wouldExceedActiveLimit && (
                                <View style={[styles.warnBox, { backgroundColor: `${theme.colors.error}18`, borderColor: theme.colors.error }]}>
                                    <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
                                    <Text style={[styles.warnText, { color: theme.colors.error }]}>
                                        {meta.maxActive} banners are already visible. Deactivate one on the list screen first, or this save may be rejected.
                                    </Text>
                                </View>
                            )}
                        </Animated.View>

                        {/* Save button */}
                        <Animated.View style={{ opacity, transform: [{ translateY: slideY }] }}>
                            <TouchableOpacity onPress={handleSave} activeOpacity={0.82} disabled={loading || picking} style={styles.saveBtnWrap}>
                                <View style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}>
                                    {loading ? (
                                        <ActivityIndicator color="#1a1a1a" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={18} color="#1a1a1a" style={{ marginRight: 8 }} />
                                            <Text style={styles.saveBtnText}>{isEditing ? 'UPDATE BANNER' : 'SAVE BANNER'}</Text>
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
                    title="Delete Banner"
                    message="Delete this banner? This cannot be undone."
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
    activeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 16,
        marginTop: 2,
    },
    activeLabel: { fontSize: 14, fontWeight: '700' },
    activeHint: { fontSize: 11, marginTop: 3 },
    warnBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginTop: 14,
    },
    warnText: { fontSize: 11.5, flex: 1, lineHeight: 16, fontWeight: '600' },
    saveBtnWrap: { borderRadius: 16, overflow: 'hidden' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, borderRadius: 16 },
    saveBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 2, color: '#1a1a1a' },
});