import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import CustomTabBar from '../../components/common/CustomTabBar';
import EmployeeDashboard from '../../screens/employee/dashboard/EmployeeDashboard';
import EmployeeOrdersScreen from '../../screens/employee/booking/EmployeeOrdersScreen';
import EmployeeOrderDetail from '../../screens/employee/booking/EmployeeOrderDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Tab navigator ──
function EmployeeTabs() {
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
            <Tab.Screen name="Dashboard" component={EmployeeDashboard} />
            <Tab.Screen name="Orders" component={EmployeeOrdersScreen} />
        </Tab.Navigator>
    );
}

// ── Stack wraps tabs + detail screens ──
export default function EmployeeNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="EmployeeTabs"
        >
            <Stack.Screen name="EmployeeTabs" component={EmployeeTabs} />
            <Stack.Screen name="EmployeeOrderDetail" component={EmployeeOrderDetail} />
        </Stack.Navigator>
    );
}