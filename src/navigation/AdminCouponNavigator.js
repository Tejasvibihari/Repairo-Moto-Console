import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminCouponListScreen from '../screens/admin/coupon/AdminCouponListScreen';
import AdminCouponFormScreen from '../screens/admin/coupon/AdminCouponFormScreen';
import AdminCouponUsageScreen from '../screens/admin/coupon/AdminCouponUsageScreen';

const Stack = createNativeStackNavigator();

export default function AdminCouponNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
            }}
        >
            <Stack.Screen name="AdminCouponListScreen" component={AdminCouponListScreen} />
            <Stack.Screen name="AdminCouponForm" component={AdminCouponFormScreen} />
            <Stack.Screen name="AdminCouponUsage" component={AdminCouponUsageScreen} />
        </Stack.Navigator>
    );
}
