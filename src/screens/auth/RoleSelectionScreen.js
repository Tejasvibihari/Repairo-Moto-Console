import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Animated,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../styles/Theme';

// ─── Role card data ────────────────────────────────────────────────────────────
const ROLES = [
    {
        key: 'admin',
        label: 'ADMIN',
        description: 'Full workspace orchestration, financial analytics, and strategic oversight.',
        cta: 'ACCESS DASHBOARD →',
        target: 'AdminLogin',
        icon: '⚙️',
    },
    {
        key: 'employee',
        label: 'EMPLOYEE',
        description: 'Technical ops, parts management, and real-time repair diagnostics.',
        cta: 'OPEN WORKSTATION →',
        target: 'EmployeeLogin',
        icon: '🔧',
    },
    {
        key: 'vendor',
        label: 'VENDOR',
        description: 'Supply chain integration, inventory fulfilment, and catalog sync.',
        cta: 'MANAGE INVENTORY →',
        target: 'VendorLogin',
        icon: '🏪',
    },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function RoleSelectionScreen({ navigation }) {
    const themeMode = useSelector((state) => state.theme.mode);
    const isDark = themeMode === 'dark';
    const C = (isDark ? DarkTheme : LightTheme).colors;

    const fadeHeader = useRef(new Animated.Value(0)).current;
    const cardAnims = useRef(ROLES.map(() => new Animated.Value(40))).current;
    const cardOpacity = useRef(ROLES.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.timing(fadeHeader, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        ROLES.forEach((_, i) => {
            Animated.parallel([
                Animated.timing(cardAnims[i], {
                    toValue: 0,
                    duration: 420,
                    delay: 200 + i * 130,
                    useNativeDriver: true,
                }),
                Animated.timing(cardOpacity[i], {
                    toValue: 1,
                    duration: 420,
                    delay: 200 + i * 130,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    }, []);

    const handleSelectRole = (target) => navigation.navigate(target);

    const s = {
        safe: {
            flex: 1,
            backgroundColor: C.background,
        },
        glowBlob: {
            position: 'absolute',
            top: -60,
            left: -60,
            width: 240,
            height: 240,
            borderRadius: 120,
            backgroundColor: C.primary,
            opacity: isDark ? 0.07 : 0.09,
        },
        scroll: {
            paddingHorizontal: 20,
            paddingBottom: 40,
        },

        // ── Header — all centered ──
        header: {
            marginTop: 12,
            marginBottom: 28,
            alignItems: 'center',        // centers all children horizontally
        },
        brandRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',   // centers brand name + dot
            gap: 8,
            marginBottom: 10,
        },
        brandName: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 3,
            color: C.primary,
            textAlign: 'center',
        },
        badgeDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: C.success,
        },
        tagRow: {
            marginBottom: 16,
            alignItems: 'center',        // centers the pill
        },
        tagPill: {
            alignSelf: 'center',         // overrides any inherited flex-start
            backgroundColor: isDark ? 'rgba(226,167,49,0.12)' : 'rgba(226,167,49,0.14)',
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 4,
            paddingHorizontal: 10,
            paddingVertical: 4,
        },
        tagText: {
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 2,
            color: C.primary,
            textAlign: 'center',
        },
        heroHeading: {
            fontSize: 32,
            fontWeight: '800',
            color: C.textPrimary,
            lineHeight: 38,
            marginBottom: 14,
            textAlign: 'center',
        },
        heroAccent: {
            color: C.primary,
            fontStyle: 'italic',
        },
        heroSub: {
            fontSize: 13,
            color: C.textSecondary,
            lineHeight: 20,
            textAlign: 'center',
            maxWidth: 300,
        },

        // ── Cards ──
        cardsContainer: {
            gap: 14,
        },
        card: {
            backgroundColor: C.surface,
            borderRadius: 14,
            padding: 20,
            borderWidth: 1,
            borderColor: C.border,
            overflow: 'hidden',
            ...Platform.select({
                ios: {
                    shadowColor: C.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isDark ? 0.18 : 0.1,
                    shadowRadius: 16,
                },
                android: { elevation: 4 },
            }),
        },
        cardPattern: {
            position: 'absolute',
            right: 16,
            top: 14,
            flexDirection: 'row',
            flexWrap: 'wrap',
            width: 48,
            gap: 5,
            opacity: 0.3,
        },
        dot: {
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: C.primary,
        },
        iconBadge: {
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: isDark ? 'rgba(226,167,49,0.12)' : 'rgba(226,167,49,0.1)',
            borderWidth: 1,
            borderColor: C.border,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
        },
        iconEmoji: {
            fontSize: 22,
        },
        cardBody: {
            gap: 6,
        },
        cardLabel: {
            fontSize: 16,
            fontWeight: '800',
            letterSpacing: 1.5,
            color: C.textPrimary,
        },
        cardDesc: {
            fontSize: 12,
            color: C.textSecondary,
            lineHeight: 18,
            marginTop: 2,
        },
        cardCta: {
            marginTop: 14,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1.8,
            color: C.primary,
        },
        cardAccentLine: {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: C.primary,
            borderTopLeftRadius: 14,
            borderBottomLeftRadius: 14,
            opacity: 0.6,
        },

        // ── Footer ──
        footer: {
            marginTop: 36,
            alignItems: 'center',
            gap: 10,
        },
        statusRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        statusDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: C.success,
        },
        statusText: {
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 2,
            color: C.textMuted,
        },
        footerLinks: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        footerLink: {
            fontSize: 9,
            fontWeight: '600',
            letterSpacing: 1.5,
            color: C.textMuted,
        },
        footerDivider: {
            color: C.textMuted,
            fontSize: 11,
        },
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.glowBlob} pointerEvents="none" />

            <ScrollView
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ── */}
                <Animated.View style={[s.header, { opacity: fadeHeader }]}>
                    <View style={s.brandRow}>
                        <Text style={s.brandName}>REPAIRO MOTO</Text>
                        <View style={s.badgeDot} />
                    </View>

                    <Text style={s.heroHeading}>
                        Select your{'\n'}
                        <Text style={s.heroAccent}>workspace entry.</Text>
                    </Text>

                    <Text style={s.heroSub}>
                        Choose your role to continue to the Repairo Moto technical management ecosystem.
                    </Text>
                </Animated.View>

                {/* ── Role Cards ── */}
                <View style={s.cardsContainer}>
                    {ROLES.map((role, i) => (
                        <Animated.View
                            key={role.key}
                            style={{
                                transform: [{ translateY: cardAnims[i] }],
                                opacity: cardOpacity[i],
                            }}
                        >
                            <TouchableOpacity
                                style={s.card}
                                activeOpacity={0.82}
                                onPress={() => handleSelectRole(role.target)}
                            >
                                <View style={s.cardPattern} pointerEvents="none">
                                    {[...Array(6)].map((_, di) => (
                                        <View key={di} style={s.dot} />
                                    ))}
                                </View>

                                <View style={s.iconBadge}>
                                    <Text style={s.iconEmoji}>{role.icon}</Text>
                                </View>

                                <View style={s.cardBody}>
                                    <Text style={s.cardLabel}>{role.label}</Text>
                                    <Text style={s.cardDesc}>{role.description}</Text>
                                    <Text style={s.cardCta}>{role.cta}</Text>
                                </View>

                                <View style={s.cardAccentLine} />
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>

                {/* ── Footer ── */}
                <View style={s.footer}>
                    <View style={s.statusRow}>
                        <View style={s.statusDot} />
                        <Text style={s.statusText}>SYSTEM STATUS: OPTIMAL</Text>
                    </View>
                    <View style={s.footerLinks}>
                        <Text style={s.footerLink}>PRIVACY PROTOCOL</Text>
                        <Text style={s.footerDivider}>·</Text>
                        <Text style={s.footerLink}>TECHNICAL HELP</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}