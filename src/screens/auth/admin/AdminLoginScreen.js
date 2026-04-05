// screens/auth/AdminLoginScreen.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useAuth } from '../../../hooks/useAuth'; // adjust path as needed
import { LightTheme, DarkTheme } from '../../../styles/Theme';

export default function AdminLoginScreen({ navigation }) {
    const themeMode = useSelector((state) => state.theme.mode);
    const isDark = themeMode === 'dark';
    const C = (isDark ? DarkTheme : LightTheme).colors;

    const { login, loading, error } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
        }

        const result = await login(email, password, 'admin');
        if (result.success) {
            // Navigate to admin dashboard or home
            navigation.replace('AdminDashboardScreen');
        } else {
            Alert.alert('Login Failed', result.error);
        }
    };

    // Styles (unchanged from your original, but we'll keep them for completeness)
    const s = {
        safe: {
            flex: 1,
            backgroundColor: C.background,
        },
        scroll: {
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingBottom: 40,
        },
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
        },
        subtitle: {
            fontSize: 13,
            color: C.textSecondary,
            lineHeight: 19,
            textAlign: 'center',
        },
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
        forgotBtn: {
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 1.5,
            color: C.primary,
        },
        loginBtn: {
            marginTop: 28,
            backgroundColor: C.primary,
            borderRadius: 8,
            paddingVertical: 17,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
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
        errorText: {
            marginTop: 12,
            fontSize: 12,
            color: '#E54D4D',
            textAlign: 'center',
        },
        footer: {
            marginTop: 36,
            alignItems: 'center',
            paddingBottom: 8,
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
            <ScrollView
                contentContainerStyle={s.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Logo Section */}
                <View style={s.logoBlock}>
                    <View style={s.logoCircle}>
                        <Text style={s.logoText}>R</Text>
                    </View>
                    <Text style={s.logoWordmark}>REPAIRO MOTO</Text>
                    <Text style={s.logoSub}>ADMIN CONSOLE</Text>
                </View>

                {/* Title */}
                <View style={s.titleBlock}>
                    <Text style={s.title}>AUTHENTICATION</Text>
                    <Text style={s.subtitle}>
                        Enter your credentials to continue to the dashboard.
                    </Text>
                </View>

                {/* Email */}
                <Text style={s.fieldLabel}>EMAIL ADDRESS</Text>
                <TextInput
                    style={s.input}
                    placeholder="mechanic@repairo.moto"
                    placeholderTextColor={C.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                {/* Password */}
                <View style={s.passwordRow}>
                    <Text style={s.fieldLabel}>PASSWORD</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                        <Text style={s.forgotBtn}>FORGOT PASSWORD?</Text>
                    </TouchableOpacity>
                </View>
                <TextInput
                    style={s.input}
                    placeholder="••••••••••••"
                    placeholderTextColor={C.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                />

                {/* Login Button with Loading State */}
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

                {/* Inline Error (optional, you can rely on Alert) */}
                {error && !loading && <Text style={s.errorText}>{error}</Text>}

                {/* Footer */}
                <View style={s.footer}>
                    <Text style={s.versionText}>
                        2024 REPAIRO MOTO ENGINEERING · ALL SYSTEMS OPERATIONAL
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}