import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Platform,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../hooks/useAuth';
import { LightTheme, DarkTheme } from '../../../styles/Theme';

export default function AdminLoginScreen({ navigation }) {
    const themeMode = useSelector((state) => state.theme.mode);
    const isDark = themeMode === 'dark';
    const C = (isDark ? DarkTheme : LightTheme).colors;

    const { login, loading, error } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null); // 'email' | 'password' | null

    const passwordRef = useRef(null);
    const scrollRef = useRef(null);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Missing Fields', 'Please enter both email and password.');
            return;
        }
        const result = await login(email.trim(), password, 'admin');
        if (!result.success) {
            Alert.alert('Login Failed', result.error);
        }
        // On success AuthGate handles the switch — no navigation needed here
    };

    // Border color for focused vs unfocused inputs
    const inputBorder = (field) => ({
        borderColor: focusedField === field ? C.primary : C.border,
        borderWidth: focusedField === field ? 1.5 : 1,
    });

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={{
                        flexGrow: 1,
                        paddingHorizontal: 24,
                        paddingBottom: 32,
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* ── Logo ── */}
                    <View style={s.logoBlock}>
                        <View style={[s.logoCircle, {
                            backgroundColor: C.primary,
                            ...Platform.select({
                                ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16 },
                                android: { elevation: 8 },
                            }),
                        }]}>
                            <Text style={[s.logoText, { color: C.secondary }]}>R</Text>
                        </View>
                        <Text style={[s.logoWordmark, { color: C.primary }]}>REPAIRO MOTO</Text>
                        <Text style={[s.logoSub, { color: C.textMuted }]}>ADMIN CONSOLE</Text>
                    </View>

                    {/* ── Title ── */}
                    <View style={s.titleBlock}>
                        <Text style={[s.title, { color: C.textPrimary }]}>AUTHENTICATION</Text>
                        <Text style={[s.subtitle, { color: C.textSecondary }]}>
                            Enter your credentials to access the dashboard.
                        </Text>
                    </View>

                    {/* ── Email Field ── */}
                    <Text style={[s.fieldLabel, { color: C.textMuted }]}>EMAIL ADDRESS</Text>
                    <View style={[s.inputWrap, { backgroundColor: C.surface, borderColor: C.border, ...inputBorder('email') }]}>
                        <Ionicons
                            name="mail-outline"
                            size={16}
                            color={focusedField === 'email' ? C.primary : C.textMuted}
                            style={s.inputIcon}
                        />
                        <TextInput
                            style={[s.input, { color: C.textPrimary }]}
                            placeholder="admin@repairo.moto"
                            placeholderTextColor={C.textMuted}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="next"
                            onFocus={() => setFocusedField('email')}
                            onBlur={() => setFocusedField(null)}
                            onSubmitEditing={() => passwordRef.current?.focus()}
                            blurOnSubmit={false}
                        />
                    </View>

                    {/* ── Password Field ── */}
                    <View style={s.passwordLabelRow}>
                        <Text style={[s.fieldLabel, { color: C.textMuted, marginTop: 0, marginBottom: 0 }]}>
                            PASSWORD
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('ForgotPassword', { userType: 'Admin' })}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={[s.forgotBtn, { color: C.primary }]}>FORGOT?</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[s.inputWrap, { backgroundColor: C.surface, borderColor: C.border, ...inputBorder('password') }]}>
                        <Ionicons
                            name="lock-closed-outline"
                            size={16}
                            color={focusedField === 'password' ? C.primary : C.textMuted}
                            style={s.inputIcon}
                        />
                        <TextInput
                            ref={passwordRef}
                            style={[s.input, { color: C.textPrimary }]}
                            placeholder="••••••••••••"
                            placeholderTextColor={C.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            returnKeyType="done"
                            onFocus={() => {
                                setFocusedField('password');
                                // Scroll down so the button is visible above keyboard
                                setTimeout(() => {
                                    scrollRef.current?.scrollToEnd({ animated: true });
                                }, 150);
                            }}
                            onBlur={() => setFocusedField(null)}
                            onSubmitEditing={handleLogin}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(v => !v)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={s.eyeBtn}
                        >
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={18}
                                color={C.textMuted}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* ── Inline Error ── */}
                    {error && !loading && (
                        <View style={[s.errorBox, { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)' }]}>
                            <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                            <Text style={s.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* ── Login Button ── */}
                    <TouchableOpacity
                        style={[
                            s.loginBtn,
                            { backgroundColor: C.primary },
                            loading && { opacity: 0.7 },
                            Platform.select({
                                ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
                                android: { elevation: 6 },
                            }),
                        ]}
                        activeOpacity={0.85}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={C.secondary} />
                        ) : (
                            <>
                                <Text style={[s.loginBtnText, { color: C.secondary }]}>IGNITE SESSION</Text>
                                <Ionicons name="arrow-forward" size={16} color={C.secondary} />
                            </>
                        )}
                    </TouchableOpacity>

                    {/* ── Footer ── */}
                    <Text style={[s.versionText, { color: C.textMuted }]}>
                        © 2024 REPAIRO MOTO ENGINEERING · ALL SYSTEMS OPERATIONAL
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = {
    logoBlock: {
        alignItems: 'center',
        paddingTop: 36,
        paddingBottom: 28,
    },
    logoCircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    logoText: {
        fontSize: 28,
        fontWeight: '900',
    },
    logoWordmark: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 4,
    },
    logoSub: {
        fontSize: 10,
        letterSpacing: 2,
        marginTop: 2,
    },
    titleBlock: {
        marginBottom: 28,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },
    fieldLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 8,
        marginTop: 20,
    },
    passwordLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 8,
    },
    forgotBtn: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 2,
        gap: 10,
    },
    inputIcon: {
        width: 18,
    },
    input: {
        flex: 1,
        fontSize: 14,
        paddingVertical: Platform.OS === 'android' ? 10 : 0,
    },
    eyeBtn: {
        paddingLeft: 6,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    errorText: {
        flex: 1,
        fontSize: 12,
        color: '#EF4444',
        lineHeight: 16,
    },
    loginBtn: {
        marginTop: 28,
        borderRadius: 12,
        paddingVertical: 17,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    loginBtnText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 2,
    },
    versionText: {
        marginTop: 32,
        fontSize: 8,
        letterSpacing: 1.5,
        textAlign: 'center',
        paddingBottom: 8,
    },
};