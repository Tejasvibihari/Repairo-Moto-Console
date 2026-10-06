import axiosClient from './axiosClient';

// Admin: look up a customer's referral wallet and correct it (every change is audited on the server).
export const referralAdminService = {
    search: async (q) => (await axiosClient.get('/api/user/admin/referral-users', { params: { q } })).data.users || [],
    get: async (userId) => (await axiosClient.get(`/api/user/admin/referral/${userId}`)).data,
    update: async (userId, payload) => (await axiosClient.put(`/api/user/admin/referral/${userId}`, payload)).data,
};
