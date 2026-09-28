import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setExpoPushToken, addNotification } from '../store/slices/notificationSlice';
import { selectIsAuthenticated, selectUser } from '../store/slices/authSlice';
import { openOrderFromNotification, openChatFromNotification, ORDER_NOTIFICATION_TYPES } from '../navigation/navigationRef';
import { notificationService } from '../services/notificationService';

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export function usePushNotifications() {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const user = useSelector(selectUser);
    const userRef = useRef(user);
    userRef.current = user;
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

        // User taps a notification (app in background, or foreground banner).
        // Retries briefly because on a cold start the navigator may not be ready yet.
        const openFromResponse = async (response) => {
            const data = response?.notification?.request?.content?.data;
            if (!data?.orderId) return;

            // Customer support chat → open that conversation
            if (data.type === 'chat') {
                for (let i = 0; i < 20; i++) {
                    if (openChatFromNotification(data)) return;
                    await new Promise(r => setTimeout(r, 250));
                }
                return;
            }

            if (!ORDER_NOTIFICATION_TYPES.includes(data.type || 'general')) return;
            for (let i = 0; i < 20; i++) {
                if (await openOrderFromNotification(userRef.current, data)) return;
                await new Promise(r => setTimeout(r, 250));
            }
        };

        responseListener.current = Notifications.addNotificationResponseReceivedListener(openFromResponse);

        // App was killed and opened by tapping a notification
        Notifications.getLastNotificationResponseAsync().then(r => { if (r) openFromResponse(r); });

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
                name: 'Order Updates',
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