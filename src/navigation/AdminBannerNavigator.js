// src/navigation/AdminBannerNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminBannerListScreen from '../screens/admin/banner/AdminBannerListScreen';
import AdminBannerFormScreen from '../screens/admin/banner/AdminBannerFormScreen';

const Stack = createNativeStackNavigator();

export default function AdminBannerNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
            }}
        >
            <Stack.Screen name="AdminBannerListScreen" component={AdminBannerListScreen} />
            <Stack.Screen name="AdminBannerForm" component={AdminBannerFormScreen} />
        </Stack.Navigator>
    );
}