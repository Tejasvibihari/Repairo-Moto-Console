import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    items: [],          // { id, title, body, type, orderId, isRead, createdAt }
    unreadCount: 0,
    expoPushToken: null,
    pendingOrderNavigation: null, // { orderId, screenOrderId } from notification click
};

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        setExpoPushToken: (state, action) => {
            state.expoPushToken = action.payload;
        },
        addNotification: (state, action) => {
            const exists = state.items.find(n => n.id === action.payload.id);
            if (!exists) {
                state.items.unshift(action.payload);
                if (!action.payload.isRead) state.unreadCount += 1;
            }
        },
        setNotifications: (state, action) => {
            state.items = action.payload;
            state.unreadCount = action.payload.filter(n => !n.isRead).length;
        },
        markAsRead: (state, action) => {
            const notif = state.items.find(n => n.id === action.payload);
            if (notif && !notif.isRead) {
                notif.isRead = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        markAllAsRead: (state) => {
            state.items.forEach(n => { n.isRead = true; });
            state.unreadCount = 0;
        },
        clearNotifications: (state) => {
            state.items = [];
            state.unreadCount = 0;
        },
        setPendingOrderNavigation: (state, action) => {
            state.pendingOrderNavigation = action.payload;
        },
        clearPendingOrderNavigation: (state) => {
            state.pendingOrderNavigation = null;
        },
    },
});

export const {
    setExpoPushToken,
    addNotification,
    setNotifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    setPendingOrderNavigation,
    clearPendingOrderNavigation,
} = notificationSlice.actions;

export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectExpoPushToken = (state) => state.notifications.expoPushToken;
export const selectPendingOrderNavigation = (state) => state.notifications.pendingOrderNavigation;

export default notificationSlice.reducer;