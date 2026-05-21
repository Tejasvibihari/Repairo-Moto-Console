import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminSupportScreen from '../screens/admin/support/AdminSupportScreen';
import AdminChatDetail from '../screens/admin/support/AdminChatDetail';

const Stack = createNativeStackNavigator();

export default function AdminSupportNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
            }}
        >
            <Stack.Screen name="AdminSupportList" component={AdminSupportScreen} />
            <Stack.Screen name="AdminChatDetail" component={AdminChatDetail} />

        </Stack.Navigator>
    );
}
