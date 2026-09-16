import axiosClient from './axiosClient';

// Singleton company/payment settings — company info (used on invoices) plus
// the UPI ID and bank details used to render the "Scan & Pay" QR code and
// bank-transfer fallback on manually generated invoices.
export const adminSettingsService = {
    get: async () => {
        const response = await axiosClient.get('/api/admin-settings');
        return response.data;
    },
    update: async (payload) => {
        const response = await axiosClient.put('/api/admin-settings', payload);
        return response.data;
    },
};