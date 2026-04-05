import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme } from '../../styles/Theme';

const Tab = createBottomTabNavigator();
const C = LightTheme.colors;

const DummyScreen = ({ route }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
        <Text style={{ color: C.textPrimary, fontSize: 18 }}>{route.name} (Admin Placeholder)</Text>
    </View>
);

export default function AdminNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerStyle: { backgroundColor: C.surface },
                headerTintColor: C.textPrimary,
                tabBarIcon: ({ color, size }) => {
                    let iconName = 'list';
                    if (route.name === 'Dashboard') iconName = 'pulse-outline';
                    else if (route.name === 'Settings') iconName = 'settings-outline';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: C.primary,
                tabBarInactiveTintColor: C.textMuted,
                tabBarStyle: { backgroundColor: C.surface }
            })}
        >
            <Tab.Screen name="Dashboard" component={DummyScreen} />
            <Tab.Screen name="Settings" component={DummyScreen} />
        </Tab.Navigator>
    );
}
