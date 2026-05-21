import axiosClient from "./axiosClient";

const handleRequest = async (request) => {
    try {
        const response = await request();
        return response.data;
    } catch (error) {
        const message =
            error.response?.data?.message ||
            error.message ||
            'Something went wrong';
        const status = error.response?.status;
        console.error(`[NotificationService] Request failed with status code ${status}: ${message}`);
        console.error('[NotificationService] Full error:', error);
        throw { success: false, message, status };
    }
};

export const notificationService = {
    // Register expo push token with backend
    registerToken: (token) =>
        handleRequest(() =>
            axiosClient.post('/api/notifications/register-token', { expoPushToken: token })
        ),

    // Unregister expo push token on logout
    unregisterToken: () =>
        handleRequest(() =>
            axiosClient.post('/api/notifications/unregister-token')
        ),


    // Fetch all notifications for current user
    getAll: () =>
        handleRequest(() => axiosClient.get('/api/notifications')),

    // Mark a single notification read
    markRead: (id) => {
        if (!id) {
            throw { success: false, message: 'Notification ID is required' };
        }
        return handleRequest(() => axiosClient.patch(`/api/notifications/${id}/read`));
    },

    // Mark all notifications read
    markAllRead: () =>
        handleRequest(() => axiosClient.patch('/api/notifications/read-all')),

    // Get unread count
    getUnreadCount: () =>
        handleRequest(() => axiosClient.get('/api/notifications/unread-count')),
};