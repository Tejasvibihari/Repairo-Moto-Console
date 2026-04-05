import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { LightTheme, DarkTheme } from "../../styles/Theme";

const TabItem = ({ route, label, options, isActive, onPress, onLongPress, theme }) => {
    const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.9)).current;
    const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0.45)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: isActive ? 1 : 0.9,
                speed: 28,
                bounciness: 6,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: isActive ? 1 : 0.45,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start();
    }, [isActive]);

    const iconColor = isActive ? theme.colors.primary : theme.colors.textMuted;

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={isActive ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.75}
            style={tabStyles.item}
        >
            <Animated.View
                style={[
                    tabStyles.iconWrap,
                    { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
                ]}
            >
                {options.tabBarIcon ? options.tabBarIcon({ focused: isActive, color: iconColor, size: 22 }) : null}
            </Animated.View>

            <Text
                style={[
                    tabStyles.label,
                    {
                        color: isActive ? theme.colors.primary : theme.colors.textMuted,
                        fontWeight: isActive ? "700" : "500",
                    },
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
};

const tabStyles = StyleSheet.create({
    item: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 5,
    },
    iconWrap: {
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        fontSize: 9.5,
        letterSpacing: 0.8,
    },
});

export default function CustomTabBar({ state, descriptors, navigation }) {
    const insets = useSafeAreaInsets();
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === "dark" ? DarkTheme : LightTheme;

    // Use theme colors for bar background, border, and shadow
    const barBackgroundColor = theme.colors.surfaceLow;
    const barBorderColor = theme.colors.border;
    const barShadowColor = theme.colors.primary;

    return (
        <View
            style={[
                barStyles.wrapper,
                { paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 12 },
            ]}
        >
            <View
                style={[
                    barStyles.bar,
                    {
                        backgroundColor: barBackgroundColor,
                        borderColor: barBorderColor,
                        shadowColor: barShadowColor,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: mode === "dark" ? 0.22 : 0.18,
                        shadowRadius: 24,
                        elevation: 18,
                    },
                ]}
            >
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];

                    const label =
                        options.tabBarLabel !== undefined
                            ? options.tabBarLabel
                            : options.title !== undefined
                                ? options.title
                                : route.name;

                    const isActive = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: "tabPress",
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isActive && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: "tabLongPress",
                            target: route.key,
                        });
                    };

                    return (
                        <TabItem
                            key={route.key}
                            route={route}
                            label={label}
                            options={options}
                            isActive={isActive}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            theme={theme}
                        />
                    );
                })}
            </View>
        </View>
    );
}

const barStyles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 0,
        backgroundColor: "transparent",
    },
    bar: {
        flexDirection: "row",
        borderRadius: 24,
        borderWidth: 1,
        overflow: "hidden",
        paddingTop: 4,
    },
});
