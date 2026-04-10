import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Platform,
    ActivityIndicator,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../hooks/useAuth';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import PopUp from '../../../components/common/PopUp';

export default function EmployeeLoginScreen({ navigation }) {
    const themeMode = useSelector((state) => state.theme.mode);
    const isDark = themeMode === 'dark';
    const C = (isDark ? DarkTheme : LightTheme).colors;

    const { login, loading, error } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Popup state
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupTitle, setPopupTitle] = useState('');
    const [popupMessage, setPopupMessage] = useState('');

    const showAlert = (title, message) => {
        setPopupTitle(title);
        setPopupMessage(message);
        setPopupVisible(true);
    };

    const closePopup = () => {
        setPopupVisible(false);
        setPopupTitle('');
        setPopupMessage('');
    };

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            showAlert('Error', 'Please enter both email and password.');
            return;
        }

        const result = await login(email, password, 'employee');
        if (result.success) {
            // Navigation handled by auth state change
        } else {
            showAlert('Login Failed', result.error);
        }
    };

    const s = {
        safe: {
            flex: 1,
            backgroundColor: C.background,
        },
        keyboardView: {
            flex: 1,
        },
        scroll: {
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingBottom: 40,
        },

        // ── Logo block ──
        logoBlock: {
            alignItems: 'center',
            paddingTop: 36,
            paddingBottom: 32,
        },
        logoCircle: {
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: C.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            ...Platform.select({
                ios: {
                    shadowColor: C.primary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.45,
                    shadowRadius: 16,
                },
                android: { elevation: 8 },
            }),
        },
        logoText: {
            fontSize: 28,
            fontWeight: '900',
            color: C.secondary,
        },
        logoWordmark: {
            fontSize: 13,
            fontWeight: '800',
            letterSpacing: 4,
            color: C.primary,
        },
        logoSub: {
            fontSize: 10,
            letterSpacing: 2,
            color: C.textMuted,
            marginTop: 2,
        },

        // ── Title ──
        titleBlock: {
            marginBottom: 32,
            alignItems: 'center',
        },
        title: {
            fontSize: 26,
            fontWeight: '900',
            letterSpacing: 1,
            color: C.textPrimary,
            marginBottom: 6,
            alignItems: 'center',
        },
        subtitle: {
            fontSize: 13,
            color: C.textSecondary,
            lineHeight: 19,
            alignItems: 'center',
            textAlign: 'center',
        },

        // ── Form ──
        fieldLabel: {
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 2,
            color: C.textMuted,
            marginBottom: 8,
            marginTop: 20,
        },
        input: {
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: Platform.OS === 'ios' ? 16 : 13,
            fontSize: 14,
            color: C.textPrimary,
        },
        passwordRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 20,
            marginBottom: 8,
        },
        passwordInputWrapper: {
            position: 'relative',
            justifyContent: 'center',
        },
        passwordIcon: {
            position: 'absolute',
            right: 16,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
        },
        forgotBtn: {
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 1.5,
            color: C.primary,
        },
        inputWrapper: {
            position: 'relative',
        },

        // ── CTA button ──
        loginBtn: {
            marginTop: 28,
            backgroundColor: C.primary,
            borderRadius: 8,
            paddingVertical: 17,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 10,
            ...Platform.select({
                ios: {
                    shadowColor: C.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                },
                android: { elevation: 6 },
            }),
        },
        loginBtnText: {
            fontSize: 13,
            fontWeight: '800',
            letterSpacing: 2,
            color: C.secondary,
        },
        loginBtnArrow: {
            fontSize: 16,
            fontWeight: '800',
            color: C.secondary,
        },

        // ── Divider ──
        dividerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 28,
            gap: 12,
        },
        dividerLine: {
            flex: 1,
            height: 1,
            backgroundColor: C.border,
        },
        dividerText: {
            fontSize: 9,
            fontWeight: '600',
            letterSpacing: 2,
            color: C.textMuted,
        },

        // ── Footer ──
        footer: {
            marginTop: 36,
            alignItems: 'center',
            paddingBottom: 8,
        },
        footerText: {
            fontSize: 12,
            color: C.textSecondary,
        },
        footerLink: {
            color: C.primary,
            fontWeight: '700',
        },
        versionText: {
            marginTop: 24,
            fontSize: 8,
            letterSpacing: 2,
            color: C.textMuted,
            textAlign: 'center',
        },
    };

    return (
        <SafeAreaView style={s.safe}>
            <KeyboardAvoidingView
                style={s.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
            >
                <ScrollView
                    contentContainerStyle={s.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* ── Logo ── */}
                    <View style={s.logoBlock}>
                        <View style={s.logoCircle}>
                            <Text style={s.logoText}>R</Text>
                        </View>
                        <Text style={s.logoWordmark}>REPAIRO MOTO</Text>
                        <Text style={s.logoSub}>EMPLOYEE CONSOLE</Text>
                    </View>

                    {/* ── Title ── */}
                    <View style={s.titleBlock}>
                        <Text style={s.title}>AUTHENTICATION</Text>
                        <Text style={s.subtitle}>
                            Enter your credentials to continue to the dashboard.
                        </Text>
                    </View>

                    {/* ── Email ── */}
                    <Text style={s.fieldLabel}>EMAIL ADDRESS</Text>
                    <TextInput
                        style={s.input}
                        placeholder="mechanic@repairo.moto"
                        placeholderTextColor={C.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="next"
                        autoCorrect={false}
                    />

                    {/* ── Password ── */}
                    <View style={s.passwordRow}>
                        <Text style={s.fieldLabel}>PASSWORD</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                            <Text style={s.forgotBtn}>FORGOT PASSWORD?</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={s.passwordInputWrapper}>
                        <TextInput
                            style={s.input}
                            placeholder="••••••••••••"
                            placeholderTextColor={C.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            returnKeyType="done"
                            onSubmitEditing={handleLogin}
                        />
                        <TouchableOpacity
                            style={s.passwordIcon}
                            onPress={() => setShowPassword(!showPassword)}
                            activeOpacity={0.7}
                        >
                            <Ionicons  // ✅ Changed from Icon to Ionicons
                                name={showPassword ? 'eye-off' : 'eye'}
                                size={22}
                                color={C.textMuted}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* ── Login Button ── */}
                    <TouchableOpacity
                        style={[s.loginBtn, loading && { opacity: 0.7 }]}
                        activeOpacity={0.85}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={C.secondary} />
                        ) : (
                            <>
                                <Text style={s.loginBtnText}>IGNITE SESSION</Text>
                                <Text style={s.loginBtnArrow}>→</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* ── Footer ── */}
                    <View style={s.footer}>
                        <Text style={s.versionText}>
                            2024 REPAIRO MOTO ENGINEERING · ALL SYSTEMS OPERATIONAL
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Custom PopUp component */}
            <PopUp
                visible={popupVisible}
                title={popupTitle}
                message={popupMessage}
                primaryLabel="OK"
                secondaryLabel="Cancel"
                onPrimary={closePopup}
                onSecondary={closePopup}
                onClose={closePopup}
            />
        </SafeAreaView>
    );
}