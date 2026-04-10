import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme } from '../../styles/Theme';

import CustomTabBar from '../../components/common/CustomTabBar';
import EmployeeDashboard from '../../screens/employee/dashboard/EmplaoyeeDashboard';
import EmployeeOrdersScreen from '../../screens/employee/booking/EmployeeOrdersScreen';

const Tab = createBottomTabNavigator();
const C = LightTheme.colors;

const DummyScreen = ({ route }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
        <Text style={{ color: C.textPrimary, fontSize: 18 }}>{route.name} (Employee Placeholder)</Text>
    </View>
);

export default function EmployeeNavigator() {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ color, size }) => {
                    let iconName = 'list-outline';
                    if (route.name === 'Home') iconName = 'home-outline';
                    else if (route.name === 'Orders') iconName = 'list-outline';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={EmployeeDashboard} />
            <Tab.Screen name="Orders" component={EmployeeOrdersScreen} />
        </Tab.Navigator>
    );
}