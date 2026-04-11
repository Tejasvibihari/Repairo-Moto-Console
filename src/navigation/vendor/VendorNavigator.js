import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme } from '../../styles/Theme';

import CustomTabBar from '../../components/common/CustomTabBar';
import VendorOrdersScreen from '../../screens/vendor/orders/VendorOrdersScreen';
import VendorDashboardScreen from '../../screens/vendor/dashboard/VendorDashboardScreen';
import VendorTerms from '../../screens/vendor/terms/VendorTerms';
import VendorOrderDetails from '../../screens/vendor/orders/VendorOrderDetails';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const C = LightTheme.colors;


// ── Tab navigator ──
function VendorTabs() {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ color, size }) => {
                    let iconName = 'list-outline';
                    if (route.name === 'Dashboard') iconName = 'home-outline';
                    else if (route.name === 'Orders') iconName = 'list-outline';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={VendorDashboardScreen} />
            <Tab.Screen name="Orders" component={VendorOrdersScreen} />
        </Tab.Navigator>
    );
}


// ── Stack wraps tabs + detail screens ──
export default function VendorNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="VendorTabs"
        >
            <Stack.Screen name="VendorTabs" component={VendorTabs} />
            <Stack.Screen name="VendorTerms" component={VendorTerms} />
            <Stack.Screen name="VendorOrderDetail" component={VendorOrderDetails} />
        </Stack.Navigator>
    );
}