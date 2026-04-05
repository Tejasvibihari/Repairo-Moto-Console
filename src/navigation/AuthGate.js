// src/navigation/AuthGate.js
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { loginSuccess } from '../store/slices/authSlice';
import { LightTheme, DarkTheme } from '../styles/Theme';

import AuthNavigator from './AuthNavigator';
import DrawerNavigator from './DrawerNavigator';

export default function AuthGate() {
    const { isAuthenticated } = useAuth();
    const dispatch = useDispatch();
    const [isBootstrapping, setIsBootstrapping] = useState(true);

    // ── Read theme from Redux — no hardcoded colors ──
    const themeMode = useSelector((state) => state.theme?.mode || 'light');
    const C = (themeMode === 'dark' ? DarkTheme : LightTheme).colors;

    useEffect(() => {
        const bootstrap = async () => {
            try {
                const { data } = await authService.getMe();
                dispatch(loginSuccess({ token: data.token, user: data.user }));
            } catch (_) {
                // Token expired or no session — stay logged out.
            } finally {
                setIsBootstrapping(false);
            }
        };
        bootstrap();
    }, []);

    if (isBootstrapping) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
                <ActivityIndicator size="large" color={C.primary} />
            </View>
        );
    }

    return isAuthenticated ? <DrawerNavigator /> : <AuthNavigator />;
}