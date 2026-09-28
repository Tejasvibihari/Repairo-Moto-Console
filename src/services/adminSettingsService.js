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

// Shop status — the customer-app kill switch (closed message) and the daily
// service hours that gate Emergency Repair bookings.
export const shopStatusService = {
    get: async () => {
        const response = await axiosClient.get('/api/admin-settings/shop-status');
        return response.data.status;
    },
    update: async (payload) => {
        const response = await axiosClient.put('/api/admin-settings/shop-status', payload);
        return response.data.status;
    },
};
