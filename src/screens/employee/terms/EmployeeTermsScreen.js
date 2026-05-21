import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';

// ── Terms content ──────────────────────────────────────────────────────────────
const SECTIONS = [
    {
        id: '01',
        title: 'Employment & Engagement',
        icon: 'briefcase-outline',
        content:
            'Your engagement with Repairo Moto is governed by the terms set at the time of onboarding. You are expected to fulfill your assigned role — mechanic, delivery, or operational — with professionalism and diligence. Employment status, whether full-time, part-time, or contractual, does not alter your obligation to comply with these terms.',
    },
    {
        id: '02',
        title: 'Order Handling & Conduct',
        icon: 'construct-outline',
        content:
            'All orders assigned to you must be handled with care, honesty, and in a timely manner. You must not misrepresent service outcomes, inflate parts costs, or engage in any conduct that harms the customer experience. Any deliberate damage, theft, or misuse of customer property will result in immediate termination and potential legal action.',
    },
    {
        id: '03',
        title: 'Confidentiality',
        icon: 'lock-closed-outline',
        content:
            'Customer data — including names, contact numbers, addresses, and vehicle information — is strictly confidential. You must not share, sell, or misuse this data in any form. Violation of customer privacy is a serious breach and will be treated accordingly under applicable data protection laws.',
    },
    {
        id: '04',
        title: 'App & Platform Usage',
        icon: 'phone-portrait-outline',
        content:
            'The Repairo Moto employee app is provided solely for work purposes. You must not attempt to tamper with, reverse-engineer, or circumvent any feature of the platform. Sharing your login credentials with others is prohibited. You are responsible for all actions performed under your account.',
    },
    {
        id: '05',
        title: 'Payments & Earnings',
        icon: 'wallet-outline',
        content:
            'Earnings are calculated based on completed orders and applicable incentive structures communicated to you during onboarding. Repairo Moto reserves the right to withhold payment for orders flagged for misconduct, pending investigation. Disputes must be raised within 7 days of the payment cycle.',
    },
    {
        id: '06',
        title: 'Safety & Compliance',
        icon: 'shield-checkmark-outline',
        content:
            'You are required to follow all safety guidelines while on service. This includes wearing appropriate gear, following traffic rules during delivery, and maintaining a safe work environment at the workshop. Non-compliance with safety protocols may result in suspension of assignments.',
    },
    {
        id: '07',
        title: 'Termination & Exit',
        icon: 'exit-outline',
        content:
            'Either party may terminate the engagement with reasonable notice as defined in your individual agreement. Upon exit, you must return all company-issued equipment, cease use of the app, and refrain from soliciting Repairo Moto customers for competing services for a period of 6 months.',
    },
    {
        id: '08',
        title: 'Amendments',
        icon: 'document-text-outline',
        content:
            'Repairo Moto reserves the right to update these terms at any time. You will be notified via the app when changes are made. Continued use of the platform after notification constitutes acceptance of the revised terms.',
    },
];

// ── Collapsible section card ───────────────────────────────────────────────────
function SectionCard({ section, theme, isDark, index }) {
    const [expanded, setExpanded] = useState(false);
    const heightAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    // Entrance animation
    const entranceOpacity = useRef(new Animated.Value(0)).current;
    const entranceY = useRef(new Animated.Value(18)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(entranceOpacity, {
                toValue: 1,
                duration: 340,
                delay: index * 70,
                useNativeDriver: true,
            }),
            Animated.spring(entranceY, {
                toValue: 0,
                speed: 16,
                bounciness: 4,
                delay: index * 70,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const toggle = () => {
        const toValue = expanded ? 0 : 1;
        setExpanded(!expanded);
        Animated.parallel([
            Animated.spring(heightAnim, {
                toValue,
                speed: 20,
                bounciness: 0,
                useNativeDriver: false,
            }),
            Animated.timing(rotateAnim, {
                toValue,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    // Approximate max height for content
    const contentMaxHeight = heightAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 300],
    });

    const contentOpacity = heightAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1],
    });

    return (
        <Animated.View
            style={{
                opacity: entranceOpacity,
                transform: [{ translateY: entranceY }],
                marginBottom: 10,
            }}
        >
            <View
                style={[
                    sectionStyles.card,
                    {
                        backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
                        borderColor: expanded ? theme.colors.primary : theme.colors.border,
                    },
                ]}
            >
                {/* Header row */}
                <TouchableOpacity
                    onPress={toggle}
                    activeOpacity={0.78}
                    style={sectionStyles.header}
                >
                    {/* Left: number + icon + title */}
                    <View style={sectionStyles.headerLeft}>
                        <View style={[
                            sectionStyles.numberBadge,
                            { backgroundColor: expanded ? theme.colors.primary : (isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow) },
                        ]}>
                            <Text style={[
                                sectionStyles.numberText,
                                { color: expanded ? '#1a1a1a' : theme.colors.textMuted },
                            ]}>
                                {section.id}
                            </Text>
                        </View>
                        <View style={[
                            sectionStyles.iconWrap,
                            { backgroundColor: `${theme.colors.primary}14` },
                        ]}>
                            <Ionicons name={section.icon} size={15} color={theme.colors.primary} />
                        </View>
                        <Text
                            style={[sectionStyles.title, { color: theme.colors.textPrimary }]}
                            numberOfLines={2}
                        >
                            {section.title}
                        </Text>
                    </View>

                    {/* Chevron */}
                    <Animated.View style={{ transform: [{ rotate }] }}>
                        <Ionicons
                            name="chevron-down"
                            size={16}
                            color={expanded ? theme.colors.primary : theme.colors.textMuted}
                        />
                    </Animated.View>
                </TouchableOpacity>

                {/* Expandable content */}
                <Animated.View style={{ maxHeight: contentMaxHeight, overflow: 'hidden' }}>
                    <Animated.View style={[sectionStyles.body, { opacity: contentOpacity }]}>
                        <View style={[sectionStyles.divider, { backgroundColor: theme.colors.border }]} />
                        <Text style={[sectionStyles.content, { color: theme.colors.textSecondary }]}>
                            {section.content}
                        </Text>
                    </Animated.View>
                </Animated.View>
            </View>
        </Animated.View>
    );
}

const sectionStyles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        gap: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    numberBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numberText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    iconWrap: {
        width: 30,
        height: 30,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
        letterSpacing: 0.1,
        lineHeight: 18,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 14,
        marginBottom: 12,
    },
    body: {
        paddingBottom: 14,
    },
    content: {
        fontSize: 13,
        lineHeight: 21,
        paddingHorizontal: 14,
        fontWeight: '400',
    },
});

// ── Highlight banner ───────────────────────────────────────────────────────────
function HighlightBanner({ theme, isDark }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.96)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, speed: 16, bounciness: 4, delay: 100, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                bannerStyles.wrap,
                {
                    backgroundColor: `${theme.colors.primary}12`,
                    borderColor: `${theme.colors.primary}30`,
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <View style={[bannerStyles.iconCircle, { backgroundColor: `${theme.colors.primary}22` }]}>
                <Ionicons name="shield-checkmark" size={22} color={theme.colors.primary} />
            </View>
            <View style={bannerStyles.textBlock}>
                <Text style={[bannerStyles.heading, { color: theme.colors.textPrimary }]}>
                    Your responsibilities matter
                </Text>
                <Text style={[bannerStyles.sub, { color: theme.colors.textMuted }]}>
                    These terms protect you, your customers, and the platform. Tap any section to read more.
                </Text>
            </View>
        </Animated.View>
    );
}

const bannerStyles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 2,
    },
    textBlock: {
        flex: 1,
        gap: 4,
    },
    heading: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    sub: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '400',
    },
});

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer({ theme }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: 600, useNativeDriver: true }).start();
    }, []);

    return (
        <Animated.View style={[footerStyles.wrap, { opacity: fadeAnim }]}>
            <View style={[footerStyles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={footerStyles.row}>
                <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
                <Text style={[footerStyles.text, { color: theme.colors.textMuted }]}>
                    Last updated: January 2025
                </Text>
            </View>
            <Text style={[footerStyles.company, { color: theme.colors.textMuted }]}>
                © 2025 Repairo Moto. All rights reserved.
            </Text>
        </Animated.View>
    );
}

const footerStyles = StyleSheet.create({
    wrap: {
        marginTop: 10,
        paddingBottom: 120,
        gap: 6,
        alignItems: 'center',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        alignSelf: 'stretch',
        marginBottom: 14,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    text: {
        fontSize: 11,
        fontWeight: '500',
    },
    company: {
        fontSize: 11,
        fontWeight: '400',
    },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function EmployeeTermsScreen() {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    return (
        <ScreenWrapper title="Terms & Conditions" noPadding>
            <ScrollView
                style={[styles.root, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <HighlightBanner theme={theme} isDark={isDark} />

                {SECTIONS.map((section, index) => (
                    <SectionCard
                        key={section.id}
                        section={section}
                        theme={theme}
                        isDark={isDark}
                        index={index}
                    />
                ))}

                <Footer theme={theme} />
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
});