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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import axiosClient from '../../../services/axiosClient';
import PopUp from '../../../components/common/PopUp';

// ─── Animated Input ───────────────────────────────────────────────────────────
const AnimatedInput = ({ value, onChangeText, placeholder, theme, isDark, multiline }) => {
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
                {
                    backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow,
                    borderColor,
                },
            ]}
        >
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textMuted}
                style={[
                    inputStyles.input,
                    { color: theme.colors.textPrimary },
                    multiline && { height: 70, textAlignVertical: 'top' },
                ]}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                multiline={multiline}
            />
        </Animated.View>
    );
};

const inputStyles = StyleSheet.create({
    wrap: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
    input: { fontSize: 14, fontWeight: '500', paddingHorizontal: 14, paddingVertical: 13, letterSpacing: 0.2 },
});

// ─── Field Label ──────────────────────────────────────────────────────────────
const FieldLabel = ({ label, theme }) => (
    <Text style={[labelStyles.text, { color: theme.colors.textMuted }]}>{label}</Text>
);

const labelStyles = StyleSheet.create({
    text: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
// route.params.brand = existing brand doc for edit mode (optional)
export default function AdminBrandsScreen({ navigation, route }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const editBrand = route?.params?.brand ?? null;
    const isEditing = !!editBrand;

    // Schema field is `brandName`
    const [brandName, setBrandName] = useState(editBrand?.brandName ?? '');
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [popup, setPopup] = useState({ visible: false, title: '', message: '', type: 'error' });

    const showPopup = (title, message, type = 'error') => setPopup({ visible: true, title, message, type });
    const closePopup = () => setPopup(prev => ({ ...prev, visible: false }));

    // Entrance animations
    const slideY = useRef(new Animated.Value(30)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const badgeScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.spring(slideY, { toValue: 0, speed: 16, bounciness: 5, useNativeDriver: true }),
        ]).start();
        Animated.spring(badgeScale, {
            toValue: 1, speed: 20, bounciness: 10, delay: 200, useNativeDriver: true,
        }).start();
    }, []);

    // ── Save (create or update) ──
    const handleSave = async () => {
        if (!brandName.trim()) {
            showPopup('Required', 'Brand name is required.', 'warning');
            return;
        }
        setLoading(true);
        try {
            const payload = { brandName: brandName.trim() };
            if (isEditing) {
                await axiosClient.put(`/api/admin/brands/update/${editBrand._id}`, payload);
            } else {
                await axiosClient.post('/api/admin/brands/addbrand', payload);
            }
            navigation.goBack();
        } catch (err) {
            const msg = err?.response?.data?.message || 'Something went wrong.';
            showPopup('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    // ── Delete brand ──
    const [deletePopup, setDeletePopup] = useState(false);

    const handleDelete = () => setDeletePopup(true);

    const confirmDelete = async () => {
        setDeletePopup(false);
        setDeleteLoading(true);
        try {
            await axiosClient.delete(`/api/admin/brands/delete/${editBrand._id}`);
            navigation.goBack();
        } catch {
            showPopup('Error', 'Failed to delete brand.');
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
                    <TouchableOpacity onPress={handleDelete} activeOpacity={0.75}>
                        {deleteLoading
                            ? <ActivityIndicator size="small" color={theme.colors.error} />
                            : <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                        }
                    </TouchableOpacity>
                ) : null
            }
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Page header ── */}
                    <Animated.View style={[styles.header, { opacity, transform: [{ translateY: slideY }] }]}>
                        <Animated.View
                            style={[
                                styles.badge,
                                { backgroundColor: theme.colors.primary, transform: [{ scale: badgeScale }] },
                            ]}
                        >
                            <Text style={styles.badgeText}>
                                {isEditing ? 'EDIT BRAND' : 'INVENTORY MANAGEMENT'}
                            </Text>
                        </Animated.View>
                        <Text style={[styles.headline, { color: theme.colors.textPrimary }]}>
                            {isEditing ? `Edit ${editBrand.brandName}` : 'Add New Brand'}
                        </Text>
                    </Animated.View>

                    {/* ── Form card ── */}
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
                        {/* Decorative bike silhouette */}
                        <View style={styles.decoWrap} pointerEvents="none">
                            <MaterialCommunityIcons
                                name="motorbike"
                                size={130}
                                color={theme.colors.primary}
                                style={{ opacity: 0.05 }}
                            />
                        </View>

                        {/* Brand Name — maps to schema field `brandName` */}
                        <View style={styles.field}>
                            <FieldLabel label="Brand Name" theme={theme} />
                            <AnimatedInput
                                value={brandName}
                                onChangeText={setBrandName}
                                placeholder="e.g. Triumph, Ducati, BMW"
                                theme={theme}
                                isDark={isDark}
                            />
                            <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                                Enter the official manufacturer identity for the catalog
                            </Text>
                        </View>
                    </Animated.View>

                    {/* ── Save button ── */}
                    <Animated.View style={{ opacity, transform: [{ translateY: slideY }] }}>
                        <TouchableOpacity
                            onPress={handleSave}
                            activeOpacity={0.82}
                            disabled={loading}
                            style={styles.saveBtnWrap}
                        >
                            <View style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}>
                                {loading ? (
                                    <ActivityIndicator color="#1a1a1a" />
                                ) : (
                                    <>
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={18}
                                            color="#1a1a1a"
                                            style={{ marginRight: 8 }}
                                        />
                                        <Text style={styles.saveBtnText}>
                                            {isEditing ? 'UPDATE BRAND' : 'SAVE BRAND'}
                                        </Text>
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenWrapper>

        {/* Error / Warning PopUp */}
        <PopUp
            visible={popup.visible}
            title={popup.title}
            message={popup.message}
            primaryLabel="Okay"
            onPrimary={closePopup}
            onClose={closePopup}
        />

        {/* Delete Confirmation PopUp */}
        {isEditing && (
            <PopUp
                visible={deletePopup}
                title="Delete Brand"
                message={`Delete "${editBrand?.brandName}" and all its models? This cannot be undone.`}
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
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 10,
    },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: '#1a1a1a' },
    headline: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, lineHeight: 32 },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        marginBottom: 20,
        overflow: 'hidden',
    },
    decoWrap: { position: 'absolute', bottom: 0, right: -20, zIndex: 0 },
    field: { marginBottom: 6, zIndex: 1 },
    hint: { fontSize: 11, marginTop: 6, marginLeft: 2, letterSpacing: 0.2 },
    saveBtnWrap: { borderRadius: 16, overflow: 'hidden' },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 17,
        borderRadius: 16,
    },
    saveBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 2, color: '#1a1a1a' },
});