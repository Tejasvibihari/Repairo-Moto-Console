import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setExpoPushToken, addNotification } from '../store/slices/notificationSlice';
import { selectIsAuthenticated } from '../store/slices/authSlice';
import { notificationService } from '../services/notificationService';

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export function usePushNotifications(navigation) {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        if (!isAuthenticated) return;
        registerForPushNotifications();

        // Foreground: notification received while app is open
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            const { title, body, data } = notification.request.content;
            dispatch(addNotification({
                id: data?.notificationId || notification.request.identifier,  // Use MongoDB ID if available
                title,
                body,
                type: data?.type || 'general',
                orderId: data?.orderId || null,
                data: data,
                isRead: false,
                createdAt: new Date().toISOString(),
            }));
        });

        // Background/killed: user taps notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data?.type === 'new_order' && data?.orderId && navigation) {
                // Navigate to the order detail screen
                navigation.navigate('Orders', { orderId: data.orderId });
            }
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [isAuthenticated]);

    async function registerForPushNotifications() {
        if (!Device.isDevice) {
            console.warn('Push notifications require a physical device');
            return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('Push notification permission denied');
            return;
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('orders', {
                name: 'New Orders',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#e2a731',
                sound: 'default',
            });
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId
            ?? Constants.easConfig?.projectId
            ?? 'cf007c76-9360-4e3c-b663-403dc0f884c7';

        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

        dispatch(setExpoPushToken(token));

        // Send token to your backend so it can push to this device
        try {
            await notificationService.registerToken(token);
        } catch (e) {
            console.error('Failed to register push token:', e);
        }
    }
}