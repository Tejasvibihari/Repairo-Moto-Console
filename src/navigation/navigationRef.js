// src/navigation/navigationRef.js
// One shared ref so code outside React (push-notification taps) can navigate.
// Must be passed to <NavigationContainer ref={navigationRef}> in App.js —
// previously AuthGate made its own useNavigationContainerRef() that was never
// attached to a container, so tapping a push notification did nothing.
import { createNavigationContainerRef } from '@react-navigation/native';
import { ROLE_CATEGORY } from '../constants/roles';
import { isTelecaller } from '../utils/leadUtils';
import axiosClient from '../services/axiosClient';

export const navigationRef = createNavigationContainerRef();

// Notification types that point at an order
export const ORDER_NOTIFICATION_TYPES = [
    'new_order', 'order_update', 'order_cancelled', 'order_rescheduled', 'order_assigned',
    'mechanic_assigned', 'mechanic_arrived', 'delivery_assigned', 'delivery_update',
    'work_started', 'work_start_otp', 'work_complete_otp', 'order_confirmed_complete',
    'invoice_generated', 'payment_received', 'general',
];

/**
 * Open the right order screen for whoever is logged in.
 * Returns true if navigation happened, false if it could not (not ready / no screen for this role).
 */
export async function openOrderFromNotification(user, { orderId, screenOrderId }) {
    if (!orderId || !navigationRef.isReady()) return false;

    const role = String(user?.role || '').toLowerCase();
    const category = ROLE_CATEGORY[role] || role;

    if (category === 'admin') {
        navigationRef.navigate('AdminHome', { screen: 'AdminOrderDetail', params: { orderId, screenOrderId } });
        return true;
    }

    if (category === 'vendor') {
        try {
            // VendorOrderDetail expects the full order object
            const res = await axiosClient.get(`/api/admin/order/getorderbyid/${orderId}`);
            const order = res.data?.data || res.data?.order || res.data;
            navigationRef.navigate('AdminHome', { screen: 'VendorOrderDetail', params: { order } });
            return true;
        } catch (e) {
            console.warn('[openOrderFromNotification] vendor order fetch failed', e?.message);
            return false;
        }
    }

    // Telecallers have no order-detail screen in their navigator
    if (isTelecaller(user)) return false;

    navigationRef.navigate('AdminHome', { screen: 'EmployeeOrderDetail', params: { orderId, screenOrderId } });
    return true;
}
