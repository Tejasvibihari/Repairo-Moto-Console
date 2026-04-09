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
        console.error(`[NotificationService] ${message}`);
        throw { success: false, message, status: error.response?.status };
    }
};

export const notificationService = {
    // Register expo push token with backend
    registerToken: (token) =>
        handleRequest(() =>
            axiosClient.post('/api/notifications/register-token', { expoPushToken: token })
        ),

    // Fetch all notifications for current user
    getAll: () =>
        handleRequest(() => axiosClient.get('/api/notifications')),

    // Mark a single notification read
    markRead: (id) =>
        handleRequest(() => axiosClient.patch(`/api/notifications/${id}/read`)),

    // Mark all notifications read
    markAllRead: () =>
        handleRequest(() => axiosClient.patch('/api/notifications/read-all')),

    // Get unread count
    getUnreadCount: () =>
        handleRequest(() => axiosClient.get('/api/notifications/unread-count')),
};