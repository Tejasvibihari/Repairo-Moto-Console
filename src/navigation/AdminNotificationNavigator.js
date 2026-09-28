// src/navigation/AdminNotificationNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminNotificationsScreen from '../screens/admin/notification/AdminNotificationsScreen';
import ServiceReminderSettingsScreen from '../screens/admin/notification/ServiceReminderSettingsScreen';

const Stack = createNativeStackNavigator();

export default function AdminNotificationNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }}>
            <Stack.Screen name="AdminNotificationsHome" component={AdminNotificationsScreen} />
            <Stack.Screen name="ServiceReminderSettings" component={ServiceReminderSettingsScreen} />
        </Stack.Navigator>
    );
}
