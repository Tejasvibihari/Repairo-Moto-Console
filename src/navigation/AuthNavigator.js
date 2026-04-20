// src/navigation/AuthNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LightTheme } from '../styles/Theme';

import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import AdminLoginScreen from '../screens/auth/admin/AdminLoginScreen';
import EmployeeLoginScreen from '../screens/auth/employee/EmployeeLoginScreen';
import VendorLoginScreen from '../screens/auth/vendor/VendorLoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

const Stack = createNativeStackNavigator();
const C = LightTheme.colors;

export default function AuthNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: C.background },
            }}
        >
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
            <Stack.Screen name="EmployeeLogin" component={EmployeeLoginScreen} />
            <Stack.Screen name="VendorLogin" component={VendorLoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
    );
}