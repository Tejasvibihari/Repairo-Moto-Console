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
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';

export default function ForgotPasswordScreen({ navigation, route }) {
    const { userType } = route.params || { userType: 'Admin' };
    
    const themeMode = useSelector((state) => state.theme.mode);
    const isDark = themeMode === 'dark';
    const C = (isDark ? DarkTheme : LightTheme).colors;

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email.trim()) {
            Alert.alert('Missing Field', 'Please enter your email address.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/admin/forgotpassword`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email.trim(), userType }),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert(
                    'Link Sent',
                    `A password reset link has been sent to your email.`,
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert('Error', data.message || 'Something went wrong.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Network Error', 'Failed to connect to the server. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        paddingHorizontal: 24,
                        paddingTop: 20,
                        paddingBottom: 32,
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Back Button ── */}
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: C.surface,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: C.border,
                            marginBottom: 24,
                        }}
                    >
                        <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
                    </TouchableOpacity>

                    {/* ── Title ── */}
                    <View style={{ marginBottom: 32 }}>
                        <Text style={{
                            fontSize: 26,
                            fontWeight: '900',
                            letterSpacing: 1,
                            color: C.textPrimary,
                            marginBottom: 8,
                        }}>
                            RESET PASSWORD
                        </Text>
                        <Text style={{
                            fontSize: 14,
                            lineHeight: 22,
                            color: C.textSecondary,
                        }}>
                            Enter the email address associated with your {userType} account to receive a secure reset link.
                        </Text>
                    </View>

                    {/* ── Email Field ── */}
                    <Text style={{
                        fontSize: 9,
                        fontWeight: '700',
                        letterSpacing: 2,
                        marginBottom: 8,
                        color: C.textMuted,
                    }}>
                        EMAIL ADDRESS
                    </Text>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: C.border,
                        backgroundColor: C.surface,
                        paddingHorizontal: 14,
                        paddingVertical: Platform.OS === 'ios' ? 14 : 2,
                        gap: 10,
                        marginBottom: 32,
                    }}>
                        <Ionicons name="mail-outline" size={18} color={C.textMuted} />
                        <TextInput
                            style={{
                                flex: 1,
                                fontSize: 14,
                                color: C.textPrimary,
                                paddingVertical: Platform.OS === 'android' ? 10 : 0,
                            }}
                            placeholder="your@email.com"
                            placeholderTextColor={C.textMuted}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={handleResetPassword}
                        />
                    </View>

                    {/* ── Submit Button ── */}
                    <TouchableOpacity
                        style={{
                            backgroundColor: C.primary,
                            borderRadius: 12,
                            paddingVertical: 18,
                            alignItems: 'center',
                            justifyContent: 'center',
                            ...Platform.select({
                                ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
                                android: { elevation: 5 },
                            }),
                        }}
                        activeOpacity={0.85}
                        onPress={handleResetPassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={C.secondary} />
                        ) : (
                            <Text style={{
                                fontSize: 13,
                                fontWeight: '800',
                                letterSpacing: 2,
                                color: C.secondary,
                            }}>
                                SEND RESET LINK
                            </Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
