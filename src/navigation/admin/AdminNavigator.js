import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme } from '../../styles/Theme';
import AdminDashboardScreen from '../../screens/admin/dashboard/AdminDashboardScreen';

import CustomTabBar from '../../components/common/CustomTabBar';
import AdminSettingsScreen from '../../screens/admin/settings/AdminSettingsScreen';
import AdminSupportScreen from '../../screens/admin/support/AdminSupportScreen';
import AdminOrderScreen from '../../screens/admin/order/AdminOrderScreen';
import AdminManualOrder from '../../screens/admin/order/AdminManualOrder';
import AdminBikesScreen from '../../screens/admin/bikes/AdminBikesScreen';

const Tab = createBottomTabNavigator();
const C = LightTheme.colors;

export default function AdminNavigator() {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ color, size }) => {
                    let iconName = 'pulse-outline';
                    if (route.name === 'Dashboard') iconName = 'pulse-outline';
                    else if (route.name === 'Orders') iconName = 'settings-outline';
                    else if (route.name === 'ManualOrder') iconName = 'add-circle-outline';
                    else if (route.name === 'Bikes') iconName = 'bicycle';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
            <Tab.Screen name="Orders" component={AdminOrderScreen} />
            <Tab.Screen name="ManualOrder" component={AdminManualOrder} />
            <Tab.Screen name="Bikes" component={AdminBikesScreen} />
            

        </Tab.Navigator>
    );
}
