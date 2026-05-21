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
const AnimatedInput = ({ value, onChangeText, placeholder, theme, isDark }) => {
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
            />
        </Animated.View>
    );
};

const inputStyles = StyleSheet.create({
    wrap: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
    input: { fontSize: 14, fontWeight: '500', paddingHorizontal: 14, paddingVertical: 13, letterSpacing: 0.2 },
});

// ─── Field Label ──────────────────────────────────────────────────────────────
const FieldLabel = ({ label, required, theme }) => (
    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <Text style={[labelStyles.text, { color: theme.colors.textMuted }]}>{label}</Text>
        {required && (
            <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: '900' }}> *</Text>
        )}
    </View>
);

const labelStyles = StyleSheet.create({
    text: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
});

// ─── Hero Area ────────────────────────────────────────────────────────────────
const HeroArea = ({ brandName, theme, isDark }) => (
    <View
        style={[
            heroStyles.wrap,
            {
                backgroundColor: isDark ? '#2E2618' : '#FFF4E0',
                borderColor: theme.colors.border,
            },
        ]}
    >
        <MaterialCommunityIcons
            name="motorbike"
            size={64}
            color={theme.colors.primary}
            style={{ opacity: 0.35 }}
        />
        <View style={heroStyles.textWrap}>
            <Text style={[heroStyles.label, { color: theme.colors.primary }]}>
                {brandName ? brandName.toUpperCase() : 'NEW MODEL'}
            </Text>
            <Text style={[heroStyles.sub, { color: theme.colors.textMuted }]}>NEW REGISTRY</Text>
        </View>
    </View>
);

const heroStyles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 28,
        marginBottom: 20,
    },
    textWrap: { gap: 4 },
    label: { fontSize: 20, fontWeight: '900', letterSpacing: 2 },
    sub: { fontSize: 10, letterSpacing: 3, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
// route.params:
//   brand  — parent brand doc (always required, has _id + brandName)
//   model  — existing embedded model doc for edit mode (optional, has _id + name)
export default function AdminAddModelScreen({ navigation, route }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const brand = route?.params?.brand;           // parent brand — always present
    const editModel = route?.params?.model ?? null;  // sub-doc being edited (optional)
    const isEditing = !!editModel;

    // Embedded model only has `name`
    const [modelName, setModelName] = useState(editModel?.name ?? '');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [popup, setPopup] = useState({ visible: false, title: '', message: '' });
    const [deletePopup, setDeletePopup] = useState(false);

    const showPopup = (title, message) => setPopup({ visible: true, title, message });
    const closePopup = () => setPopup(prev => ({ ...prev, visible: false }));

    // Entrance animations
    const slideY = useRef(new Animated.Value(30)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.spring(slideY, { toValue: 0, speed: 16, bounciness: 5, useNativeDriver: true }),
        ]).start();
    }, []);

    if (!brand) {
        // Safety guard — should never happen if navigation is wired correctly
        return (
            <ScreenWrapper title="Add Model">
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: theme.colors.error }}>No brand selected.</Text>
                </View>
            </ScreenWrapper>
        );
    }

    // ── Save ──
    // Create: POST /brands/:brandId/models  { name }
    // Update: PUT  /brands/:brandId/models/:modelId  { name }
    const handleSave = async () => {
        if (!modelName.trim()) {
            showPopup('Required', 'Model name is required.');
            return;
        }
        setSaving(true);
        try {
            if (isEditing) {
                await axiosClient.put(`/api/admin/brands/updatemodel/${brand._id}/models/${editModel._id}`, { name: modelName.trim() });
            } else {
                // Backend expects: POST /api/admin/brands/addmodel  { brandId, modelName }
                await axiosClient.post('/api/admin/brands/addmodel', {
                    brandId: brand._id,
                    modelName: modelName.trim(),
                });
            }
            navigation.goBack();
        } catch (err) {
            showPopup('Error', err?.response?.data?.message || 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete embedded model ──
    // DELETE /brands/:brandId/models/:modelId
    const handleDelete = () => setDeletePopup(true);

    const confirmDelete = async () => {
        setDeletePopup(false);
        setDeleting(true);
        try {
            await axiosClient.delete(`/api/admin/brands/delete/${brand._id}/models/${editModel._id}`);
            navigation.goBack();
        } catch {
            showPopup('Error', 'Failed to delete model.');
        } finally {
            setDeleting(false);
        }
    };

    return (
    <>
        <ScreenWrapper
            title=""
            rightSlot={
                isEditing ? (
                    <TouchableOpacity onPress={handleDelete} activeOpacity={0.75}>
                        {deleting
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
                    {/* ── Header ── */}
                    <Animated.View style={[styles.header, { opacity, transform: [{ translateY: slideY }] }]}>
                        <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                            <Text style={styles.badgeText}>NEW REGISTRY</Text>
                        </View>
                        <Text style={[styles.headline, { color: theme.colors.textPrimary }]}>
                            {isEditing ? 'Edit Model' : 'Register Model'}
                        </Text>
                        <Text style={[styles.subHeadline, { color: theme.colors.textSecondary }]}>
                            {isEditing
                                ? `Update this model under ${brand.brandName}.`
                                : `Add a new model variant under ${brand.brandName}.`}
                        </Text>
                    </Animated.View>

                    {/* ── Hero ── */}
                    <Animated.View style={{ opacity, transform: [{ translateY: slideY }] }}>
                        <HeroArea brandName={brand.brandName} theme={theme} isDark={isDark} />
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
                        {/* Parent brand (read-only display) */}
                        <View style={styles.field}>
                            <FieldLabel label="Manufacturer" theme={theme} />
                            <View
                                style={[
                                    styles.readonlyWrap,
                                    {
                                        backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow,
                                        borderColor: theme.colors.border,
                                    },
                                ]}
                            >
                                <Text style={[styles.readonlyText, { color: theme.colors.textSecondary }]}>
                                    {brand.brandName}
                                </Text>
                                <Ionicons name="lock-closed" size={13} color={theme.colors.textMuted} />
                            </View>
                        </View>

                        {/* Model Name — maps to embedded schema field `name` */}
                        <View style={styles.field}>
                            <FieldLabel label="Model Name" theme={theme} required />
                            <AnimatedInput
                                value={modelName}
                                onChangeText={setModelName}
                                placeholder="e.g. Panigale V4, R1250 GS"
                                theme={theme}
                                isDark={isDark}
                            />
                        </View>
                    </Animated.View>

                    {/* ── Register button ── */}
                    <Animated.View style={{ opacity, transform: [{ translateY: slideY }] }}>
                        <TouchableOpacity
                            onPress={handleSave}
                            activeOpacity={0.82}
                            disabled={saving}
                            style={styles.saveBtnWrap}
                        >
                            <View style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}>
                                {saving ? (
                                    <ActivityIndicator color="#1a1a1a" />
                                ) : (
                                    <>
                                        <Text style={styles.saveBtnText}>
                                            {isEditing ? 'UPDATE MODEL' : 'REGISTER MODEL'}
                                        </Text>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={16}
                                            color="#1a1a1a"
                                            style={{ marginLeft: 8 }}
                                        />
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>

                        <Text style={[styles.footNote, { color: theme.colors.textMuted }]}>
                            SYSTEM REQ 2.1 | BRAND CATALOG | VEHICLE CLOUD SYNC
                        </Text>
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
                title="Delete Model"
                message={`Delete "${editModel?.name}" from ${brand.brandName}?`}
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
    scroll: { paddingTop: 4 },
    header: { marginBottom: 20 },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 10,
    },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: '#1a1a1a' },
    headline: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, lineHeight: 32, marginBottom: 6 },
    subHeadline: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
    card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 20 },
    field: { marginBottom: 18 },
    readonlyWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
    },
    readonlyText: { fontSize: 14, fontWeight: '600' },
    saveBtnWrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 14 },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 17,
        borderRadius: 16,
    },
    saveBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 2, color: '#1a1a1a' },
    footNote: { textAlign: 'center', fontSize: 9, letterSpacing: 1.5, marginBottom: 4 },
});