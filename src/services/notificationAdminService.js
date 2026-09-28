import axiosClient from './axiosClient';

// Admin-side notification tools: manual campaigns, automatic service-reminder
// settings, and per-order follow-up reminders.
const unwrap = async (request) => {
    try {
        return (await request()).data;
    } catch (error) {
        throw { message: error.response?.data?.message || error.message || 'Something went wrong', status: error.response?.status };
    }
};

const base = '/api/admin/notifications';

export const notificationAdminService = {
    // Manual campaigns (offers / announcements)
    previewAudience: (audience) => unwrap(() => axiosClient.post(`${base}/campaigns/preview`, { audience })),
    createCampaign: (payload) => unwrap(() => axiosClient.post(`${base}/campaigns`, payload)),
    listCampaigns: () => unwrap(() => axiosClient.get(`${base}/campaigns`)),
    cancelCampaign: (id) => unwrap(() => axiosClient.delete(`${base}/campaigns/${id}`)),

    // Automatic service reminders
    getReminderConfig: () => unwrap(() => axiosClient.get(`${base}/reminder-config`)),
    updateReminderConfig: (payload) => unwrap(() => axiosClient.put(`${base}/reminder-config`, payload)),
    listFollowUps: (status = 'pending') => unwrap(() => axiosClient.get(`${base}/follow-ups`, { params: { status } })),

    // Per-order reminder: { days } | { disabled: true } | { title, body }
    setOrderFollowUp: (orderId, payload) => unwrap(() => axiosClient.put(`${base}/follow-up/${orderId}`, payload)),
};
