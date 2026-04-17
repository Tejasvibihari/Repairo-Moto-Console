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

// ── Terms content (Vendor specific) ──────────────────────────────────────────────
const SECTIONS = [
    {
        id: '01',
        title: 'Vendor Onboarding & Agreement',
        icon: 'business-outline',
        content:
            'Your partnership with Repairo Moto as a vendor is governed by the terms agreed during onboarding. You must provide accurate business information, valid licenses, and comply with all local regulations. Repairo Moto reserves the right to verify your credentials at any time.',
    },
    {
        id: '02',
        title: 'Service & Product Quality',
        icon: 'medal-outline',
        content:
            'All services and products listed on the platform must meet the quality standards set by Repairo Moto. You are responsible for accurate descriptions, fair pricing, and timely delivery. Misrepresentation, defective products, or substandard service may result in suspension or removal from the platform.',
    },
    {
        id: '03',
        title: 'Pricing & Payment Terms',
        icon: 'cash-outline',
        content:
            'Vendors set their own pricing within Repairo Moto’s guidelines. Commissions and fee structures are communicated during onboarding. Payments are processed according to the agreed schedule. Repairo Moto may withhold payment for disputed transactions pending investigation.',
    },
    {
        id: '04',
        title: 'Order Fulfillment & Cancellations',
        icon: 'cart-outline',
        content:
            'You must fulfill confirmed orders promptly. Unreasonable cancellations, delays, or stock unavailability without prior notice may result in penalties. Customers are entitled to refunds or replacements as per Repairo Moto’s policies for vendor-caused issues.',
    },
    {
        id: '05',
        title: 'Confidentiality & Data Protection',
        icon: 'lock-closed-outline',
        content:
            'Customer data shared through the platform — including names, contact details, and vehicle/service history — is strictly confidential. You may not use this data for any purpose outside of fulfilling orders. Violations will lead to immediate termination and legal action.',
    },
    {
        id: '06',
        title: 'Platform Usage & Conduct',
        icon: 'phone-portrait-outline',
        content:
            'Your vendor account is for business use only. You must not share credentials, manipulate reviews, or engage in fraudulent activities. Any attempt to bypass Repairo Moto’s commission system or solicit customers for off-platform transactions is prohibited.',
    },
    {
        id: '07',
        title: 'Compliance & Safety',
        icon: 'shield-checkmark-outline',
        content:
            'You must comply with all applicable laws, safety standards, and environmental regulations related to your products or services. Repairo Moto may conduct periodic audits. Non-compliance may result in immediate suspension and reporting to authorities.',
    },
    {
        id: '08',
        title: 'Termination & Exit',
        icon: 'exit-outline',
        content:
            'Either party may terminate this agreement with written notice as per your contract. Upon termination, you must remove all Repairo Moto branding, cease use of the platform, and fulfill any pending orders. Vendors may not poach customers for 12 months after exit.',
    },
    {
        id: '09',
        title: 'Amendments',
        icon: 'document-text-outline',
        content:
            'Repairo Moto may update these terms periodically. You will be notified via the vendor dashboard or email. Continued use of the platform after the effective date constitutes acceptance of the revised terms.',
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

// ── Highlight banner (Vendor focused) ───────────────────────────────────────────
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
                <Ionicons name="business-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={bannerStyles.textBlock}>
                <Text style={[bannerStyles.heading, { color: theme.colors.textPrimary }]}>
                    Build trust with every service
                </Text>
                <Text style={[bannerStyles.sub, { color: theme.colors.textMuted }]}>
                    These terms ensure fair practices, protect customer interests, and help you grow on Repairo Moto. Tap any section for details.
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
                    Last updated: February 2025
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

// ── Main Vendor Terms Screen ────────────────────────────────────────────────────
export default function VendorTerms() {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    return (
        <ScreenWrapper title="Vendor Terms & Conditions" noPadding>
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