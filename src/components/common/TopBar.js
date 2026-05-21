import React, { useRef, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { LightTheme, DarkTheme } from "../../styles/Theme";
import { getImageUrl } from "../../utils/imageUtils";
import { selectUnreadCount } from '../../store/slices/notificationSlice';

// ─── Notification Badge ───────────────────────────────────────────────────────
const Badge = ({ count, theme }) => {
    const scale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scale, {
            toValue: count > 0 ? 1 : 0,
            speed: 28,
            bounciness: 10,
            useNativeDriver: true,
        }).start();
    }, [count]);

    if (count <= 0) return null;

    return (
        <Animated.View
            style={[
                badgeStyles.badge,
                { backgroundColor: theme.colors.error, transform: [{ scale }] },
            ]}
        >
            <Text style={badgeStyles.text}>
                {count > 99 ? "99+" : String(count)}
            </Text>
        </Animated.View>
    );
};

const badgeStyles = StyleSheet.create({
    badge: {
        position: "absolute",
        top: -4, right: -4,
        minWidth: 17, height: 17,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 3,
        zIndex: 10,
    },
    text: { fontSize: 9, fontWeight: "800", color: "#fff", lineHeight: 11 },
});

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ avatarSource, theme }) => {
    if (avatarSource) {
        const imageSource =
            typeof avatarSource === "object" && avatarSource.uri
                ? { uri: getImageUrl(avatarSource.uri) }
                : avatarSource;
        return <Image source={imageSource} style={styles.avatarImg} />;
    }
    return (
        <View style={[styles.avatarFallback, { backgroundColor: theme.colors.surfaceLow }]}>
            <Ionicons name="person" size={18} color={theme.colors.primary} />
        </View>
    );
};

// ─── TopBar ───────────────────────────────────────────────────────────────────
const TopBar = ({
    userName = "User",
    greeting,
    avatarSource,
    onMenuPress,
    onNotificationPress,
    onAvatarPress,
    onBookingPress,
    showMenuIcon = true,
    showBookingIcon = true,
    style,
}) => {
    const insets = useSafeAreaInsets();
    const mode = useSelector((state) => state.theme?.mode || 'light');
    const theme = mode === "dark" ? DarkTheme : LightTheme;
    const notificationCount = useSelector(selectUnreadCount);

    const resolvedName = typeof userName === "string" ? userName : "User";
    const greetingText =
        typeof greeting === "string" && greeting.length > 0
            ? greeting
            : `Hi, ${resolvedName} 👋`;

    const slideY = useRef(new Animated.Value(-10)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(slideY, { toValue: 0, speed: 20, bounciness: 4, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.wrapper,
                {
                    backgroundColor: theme.colors.background,
                    paddingTop: insets.top,
                    opacity,
                    transform: [{ translateY: slideY }],
                },
                style,
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
                {/* Left: Menu + Greeting */}
                <View style={styles.left}>
                    {showMenuIcon && typeof onMenuPress === 'function' && (
                        <TouchableOpacity
                            onPress={onMenuPress}
                            style={styles.menuBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="menu" size={22} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                    <View style={styles.greetBlock}>
                        <Text
                            style={[styles.greetText, { color: theme.colors.textPrimary }]}
                            numberOfLines={1}
                        >
                            {greetingText}
                        </Text>
                    </View>
                </View>

                {/* Right: Bell + Avatar */}
                <View style={styles.right}>
                    {/* {showBookingIcon && (
                        <TouchableOpacity
                            onPress={onBookingPress}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={22}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                    )} */}

                    <TouchableOpacity
                        onPress={onNotificationPress}
                        style={styles.bellWrap}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={notificationCount > 0 ? "notifications" : "notifications-outline"}
                            size={22}
                            color={notificationCount > 0 ? theme.colors.primary : theme.colors.textSecondary}
                        />
                        <Badge count={notificationCount} theme={theme} />
                    </TouchableOpacity>
                    {/* 
                    <TouchableOpacity
                        onPress={onAvatarPress}
                        style={[styles.avatarRing, { borderColor: theme.colors.primary }]}
                        activeOpacity={0.8}
                    >
                        <Avatar avatarSource={avatarSource} theme={theme} />
                    </TouchableOpacity> */}
                </View>
            </View>
        </Animated.View>
    );
};

const AVATAR_SIZE = 42;

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 0,
        paddingBottom: 0,
        zIndex: 100,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 0,
        borderBottomWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    left: { flexDirection: "row", alignItems: "center", flex: 1 },
    menuBtn: { marginRight: 12 },
    greetBlock: { flexShrink: 1 },
    greetText: { fontSize: 18, fontWeight: "700", letterSpacing: 0.1 },
    right: { flexDirection: "row", alignItems: "center", gap: 14, marginLeft: 12 },
    bellWrap: { position: "relative" },
    avatarRing: {
        width: AVATAR_SIZE + 4,
        height: AVATAR_SIZE + 4,
        borderRadius: (AVATAR_SIZE + 4) / 2,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    avatarImg: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
    avatarFallback: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default TopBar;
