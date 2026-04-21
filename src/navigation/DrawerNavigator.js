import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
    Platform,
} from 'react-native';
import {
    createDrawerNavigator,
    DrawerContentScrollView,
} from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../styles/Theme';
import { logout, selectUserRole } from '../store/slices/authSlice';
import { getImageUrl } from '../utils/imageUtils';

// Import our common PopUp (or create a dummy one if it doesn't exist)
import PopUp from '../components/common/PopUp';

// Screen imports (Role-specific Bottom Navigators)
import AdminNavigator from './admin/AdminNavigator';
import EmployeeNavigator from './employee/EmployeeNavigator';
import VendorNavigator from './vendor/VendorNavigator';
import VendorTerms from '../screens/vendor/terms/VendorTerms';

import AdminSupportNavigator from './AdminSupportNavigator';
import AdminSettingsScreen from '../screens/admin/settings/AdminSettingsScreen';
import NotificationsScreen from '../screens/shared/NotificationScreen';
import AdminDashboardScreen from '../screens/admin/dashboard/AdminDashboardScreen';
import EmployeeOrderDetailScreen from '../screens/employee/booking/EmployeeOrderDetailScreen';
import EmployeeOrderDetail from '../screens/employee/booking/EmployeeOrderDetailScreen';
import EmployeeOrdersScreen from '../screens/employee/booking/EmployeeOrdersScreen';
import EmployeeDashboardScreen from '../screens/employee/dashboard/EmployeeDashboard';
import EmployeeTermsScreen from '../screens/employee/terms/EmployeeTermsScreen';

const Drawer = createDrawerNavigator();

// ─── Role conditional data ──────────────────────────────────────────────────────────
const getDrawerConfig = (role, user) => {
    let HomeNav = AdminNavigator;
    let group1 = [];
    let group2 = [];

    const isAuthorizedChatEmployee = role === 'employee' || role === 'Employee' ? 
        ['manager', 'operational manager', 'telecaller'].includes(user?.position?.toLowerCase()) : false;

    if (role === 'admin' || role === 'Admin') {
        HomeNav = AdminNavigator;
        group1 = [
            { name: 'Dashboard', label: 'Dashboard', icon: 'home-outline', iconActive: 'home', lib: 'ion' },
            { name: 'Orders', label: 'Orders', icon: 'receipt-outline', iconActive: 'receipt', lib: 'ion' },
            { name: 'AdminSupport', label: 'Chat Support', icon: 'chatbubbles-outline', iconActive: 'chatbubbles', lib: 'ion' },
        ];
    } else if (role === 'employee' || role === 'Employee') {
        // Employee default
        HomeNav = EmployeeNavigator;
        if (isAuthorizedChatEmployee) {
            group1.push({ name: 'AdminSupport', label: 'Chat Support', icon: 'chatbubbles-outline', iconActive: 'chatbubbles', lib: 'ion' });
        }
        // group1 = [
        //     { name: 'Dashboard', label: 'Dashboard', icon: 'home-outline', iconActive: 'home', lib: 'ion' },
        //     { name: 'Orders', label: 'Orders', icon: 'list-outline', iconActive: 'list', lib: 'ion' },
        // ];
        group2 = [
            { name: 'EmployeeTerms', label: 'Terms & Conditions', icon: 'document-text-outline', iconActive: 'document-text', lib: 'ion' },
        ];
    }
    else {
        HomeNav = VendorNavigator;
        // group1 = [
        //     { name: 'Home', label: 'Vendor Hub', icon: 'briefcase-outline', iconActive: 'briefcase', lib: 'ion' },
        //     { name: 'Orders', label: 'Manage Orders', icon: 'construct-outline', iconActive: 'construct', lib: 'ion' },
        // ];
        group2 = [
            { name: 'VendorTerms', label: 'Terms & Conditions', icon: 'document-text-outline', iconActive: 'document-text', lib: 'ion' },
        ];
    }

    return { HomeNav, GROUP_1: group1, GROUP_2: group2 };
};


// ─── Icon helper ──────────────────────────────────────────────────────────────
function NavIcon({ item, isActive, color, size = 20 }) {
    const name = isActive ? item.iconActive : item.icon;
    if (item.lib === 'mci') return <MaterialCommunityIcons name={name} size={size} color={color} />;
    return <Ionicons name={name} size={size} color={color} />;
}

// ─── Single nav row ───────────────────────────────────────────────────────────
function NavItem({ item, isActive, theme, isDark, onPress, delay }) {
    const translateX = useRef(new Animated.Value(-20)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateX, { toValue: 0, friction: 8, tension: 65, delay, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 280, delay, useNativeDriver: true }),
        ]).start();
    }, []);

    const iconColor = isActive ? '#1a1a1a' : theme.colors.textSecondary;
    const labelColor = isActive ? '#1a1a1a' : theme.colors.textPrimary;

    return (
        <Animated.View style={{ transform: [{ translateX }], opacity }}>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.75}
                style={[
                    navStyles.row,
                    isActive && { backgroundColor: theme.colors.primary, borderRadius: 14 },
                ]}
            >
                <View style={navStyles.iconSlot}>
                    <NavIcon item={item} isActive={isActive} color={iconColor} size={20} />
                </View>
                <Text style={[navStyles.label, { color: labelColor, fontWeight: isActive ? '700' : '500' }]}>
                    {item.label}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const navStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 14,
        gap: 14,
        marginBottom: 2,
    },
    iconSlot: {
        width: 24,
        alignItems: 'center',
    },
    label: {
        fontSize: 15,
        letterSpacing: 0.1,
    },
});

// ─── Custom Drawer Content ────────────────────────────────────────────────────
function CustomDrawerContent(props) {
    const { state, navigation, roleConfig } = props;
    const { GROUP_1, GROUP_2 } = roleConfig;
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const user = useSelector((s) => s.auth.user);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    const activeRouteName = state.routes[state.index]?.name ?? 'Home';

    const logoOpacity = useRef(new Animated.Value(0)).current;
    const headerTransY = useRef(new Animated.Value(-12)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.spring(headerTransY, { toValue: 0, friction: 8, tension: 55, delay: 60, useNativeDriver: true }),
        ]).start();
    }, []);

    const avatarSource = user?.profileImage ? { uri: getImageUrl(user.profileImage) } : null;
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'User';

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const navigate = (name) => {
        navigation.closeDrawer();
        if (['Dashboard', 'Orders', 'ManualOrder', 'Brands'].includes(name)) {
            navigation.navigate('AdminHome', { screen: name });
        } else {
            navigation.navigate(name);
        }
    };

    const s = drawerStyles(theme, isDark, insets);

    return (
        <View style={s.root}>
            <Animated.View style={[s.brand, { opacity: logoOpacity }]}>
                <Text style={[s.brandText, { color: theme.colors.textPrimary }]}>REPAIRO MOTO</Text>
            </Animated.View>

            <Animated.View
                style={[
                    s.userCard,
                    { borderColor: theme.colors.border, transform: [{ translateY: headerTransY }], opacity: logoOpacity },
                ]}
            >
                <View style={s.avatarWrap}>
                    {avatarSource ? (
                        <Image source={avatarSource} style={s.avatarImg} />
                    ) : (
                        <View style={[s.avatarFallback, { backgroundColor: isDark ? '#2E2618' : '#FDECC8' }]}>
                            <Ionicons name="person" size={22} color={theme.colors.primary} />
                        </View>
                    )}
                    <View style={[s.badgeDot, { backgroundColor: theme.colors.primary }]}>
                        <Ionicons name="checkmark" size={8} color="#1a1a1a" />
                    </View>
                </View>

                <View style={s.userInfo}>
                    <Text style={[s.userName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {fullName}
                    </Text>
                </View>
            </Animated.View>

            <DrawerContentScrollView
                {...props}
                scrollEnabled={false}
                contentContainerStyle={s.navContainer}
            >
                <View style={s.navGroup}>
                    {GROUP_1.map((item, i) => (
                        <NavItem
                            key={item.name}
                            item={item}
                            isActive={activeRouteName === item.name}
                            theme={theme}
                            isDark={isDark}
                            onPress={() => navigate(item.name)}
                            delay={100 + i * 50}
                        />
                    ))}
                </View>

                {GROUP_2.length > 0 && <View style={[s.divider, { backgroundColor: theme.colors.border }]} />}

                <View style={s.navGroup}>
                    {GROUP_2.map((item, i) => (
                        <NavItem
                            key={item.name}
                            item={item}
                            isActive={activeRouteName === item.name}
                            theme={theme}
                            isDark={isDark}
                            onPress={() => navigate(item.name)}
                            delay={320 + i * 50}
                        />
                    ))}
                </View>
            </DrawerContentScrollView>

            <TouchableOpacity
                style={[s.logoutRow, { borderTopColor: theme.colors.border }]}
                onPress={handleLogout}
                activeOpacity={0.75}
            >
                <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
                <Text style={s.logoutLabel}>Logout</Text>
            </TouchableOpacity>

            {/* Note: In your real code PopUp is used correctly here. */}
            <PopUp
                visible={showLogoutConfirm}
                type="confirm"
                title="Log Out"
                message="Are you sure you want to log out of your account?"
                primaryLabel="Log Out"
                secondaryLabel="Cancel"
                primaryVariant="danger"
                onPrimary={async () => {
                    setShowLogoutConfirm(false);
                    try {
                        const { notificationService } = require('../services/notificationService');
                        await notificationService.unregisterToken();
                    } catch (e) {
                        console.error('Failed to unregister push token:', e);
                    }
                    setTimeout(() => dispatch(logout()), 200);
                }}
                onSecondary={() => setShowLogoutConfirm(false)}
                onClose={() => setShowLogoutConfirm(false)}
                customIcon="log-out-outline"
            />
        </View>
    );
}

const AVATAR_SIZE = 46;
function drawerStyles(theme, isDark, insets) {
    return StyleSheet.create({
        root: {
            flex: 1,
            backgroundColor: theme.colors.background,
            paddingTop: insets.top > 0 ? insets.top : Platform.OS === 'ios' ? 50 : 28,
        },
        brand: { paddingHorizontal: 20, paddingBottom: 16 },
        brandText: { fontSize: 13, fontWeight: '900', letterSpacing: 3 },
        userCard: {
            flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 14,
            marginBottom: 22, padding: 14, borderRadius: 18, borderWidth: 1,
        },
        avatarWrap: { position: 'relative', width: AVATAR_SIZE, height: AVATAR_SIZE },
        avatarImg: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
        avatarFallback: {
            width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
            alignItems: 'center', justifyContent: 'center',
        },
        badgeDot: {
            position: 'absolute', bottom: 0, right: 0, width: 16, height: 16,
            borderRadius: 8, alignItems: 'center', justifyContent: 'center',
            borderWidth: 1.5, borderColor: theme.colors.background,
        },
        userInfo: { flex: 1, gap: 2 },
        userName: { fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },
        navContainer: { paddingHorizontal: 10, paddingTop: 0, gap: 0 },
        navGroup: { gap: 0 },
        divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14, marginVertical: 14 },
        logoutRow: {
            flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24,
            paddingVertical: 20, borderTopWidth: StyleSheet.hairlineWidth,
            marginBottom: insets.bottom > 0 ? insets.bottom : 12,
        },
        logoutLabel: { fontSize: 15, fontWeight: '700', color: '#FF6B6B', letterSpacing: 0.1 },
    });
}

// ─── Drawer Navigator ─────────────────────────────────────────────────────────
export default function DrawerNavigator() {
    const role = useSelector(selectUserRole);
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    const user = useSelector((s) => s.auth.user);
    const roleConfig = getDrawerConfig(role, user);
    const HomeNavComponent = roleConfig.HomeNav;

    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} roleConfig={roleConfig} />}
            screenOptions={{
                headerShown: false,
                drawerType: 'slide',
                drawerPosition: 'left',
                drawerStyle: {
                    width: '78%',
                    backgroundColor: theme.colors.background,
                    borderRightWidth: 0,
                    ...Platform.select({
                        ios: {
                            shadowColor: '#000',
                            shadowOffset: { width: 4, height: 0 },
                            shadowOpacity: isDark ? 0.45 : 0.18,
                            shadowRadius: 24,
                        },
                        android: { elevation: 16 },
                    }),
                },
                overlayColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.28)',
                swipeEdgeWidth: 60,
            }}
        >
            <Drawer.Screen name="AdminHome" component={HomeNavComponent} />
            <Drawer.Screen name="AdminSupport" component={AdminSupportNavigator} />
            <Drawer.Screen name="AdminSettings" component={AdminSettingsScreen} />
            <Drawer.Screen name="Notifications" component={NotificationsScreen} />
            <Drawer.Screen name="EmployeeTerms" component={EmployeeTermsScreen} />
            <Drawer.Screen name="VendorTerms" component={VendorTerms} />
        </Drawer.Navigator>
    );
}
