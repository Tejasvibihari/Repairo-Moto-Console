import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';

export default function ScreenWrapper({
    title = '',
    onBack,
    rightSlot,
    noPadding = false,
    children,
}) {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    // Entrance animation
    const translateY = useRef(new Animated.Value(-8)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 260,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                speed: 22,
                bounciness: 3,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (navigation.canGoBack()) {
            navigation.goBack();
        }
    };

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

            {/* ── Top bar with status bar padding ── */}
            <Animated.View
                style={[
                    styles.wrapper,
                    {
                        paddingTop: insets.top,
                        opacity,
                        transform: [{ translateY }],
                    },
                ]}
            >
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.colors.background,
                            borderBottomColor: theme.colors.border,
                        },
                    ]}
                >
                    {/* Left: back button (fixed width) */}
                    <View style={styles.leftSlot}>
                        <TouchableOpacity
                            onPress={handleBack}
                            style={[
                                styles.backBtn,
                                {
                                    backgroundColor: isDark ? '#2E2618' : '#FFF4E0',
                                    borderColor: theme.colors.border,
                                },
                            ]}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            activeOpacity={0.72}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={20}
                                color={theme.colors.textPrimary}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Center: title (flex:1) */}
                    <View style={styles.centerSlot}>
                        <Text
                            style={[styles.title, { color: theme.colors.textPrimary }]}
                            numberOfLines={1}
                        >
                            {title}
                        </Text>
                    </View>

                    {/* Right: optional action (fixed width) */}
                    <View style={styles.rightSlot}>
                        {rightSlot ?? null}
                    </View>
                </View>
            </Animated.View>

            {/* ── Content ── */}
            <View style={[styles.content, noPadding && styles.noPad]}>
                {children}
            </View>
        </View>
    );
}

const BACK_BTN_SIZE = 38;

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    wrapper: {
        zIndex: 10,
        backgroundColor: 'transparent', 
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingVertical: 12,      
        paddingHorizontal: 16,
    },
    leftSlot: {
        width: BACK_BTN_SIZE,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    centerSlot: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightSlot: {
        width: BACK_BTN_SIZE,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    backBtn: {
        width: BACK_BTN_SIZE,
        height: BACK_BTN_SIZE,
        borderRadius: BACK_BTN_SIZE / 2,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    noPad: {
        paddingHorizontal: 0,
    },
});
