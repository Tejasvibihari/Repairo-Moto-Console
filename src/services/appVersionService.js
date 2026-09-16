import axiosClient from './axiosClient';

// Admin/employee-only endpoints for managing the force-update config that
// both the Console app and the customer app check on launch.
export const appVersionService = {
    // Fetch every (app, platform) config currently stored.
    listAll: async () => {
        const response = await axiosClient.get('/api/app-version/all');
        return response.data;
    },

    // Create or update the config for one (app, platform) pair.
    // payload: { app: 'mobile'|'console', platform: 'android'|'ios',
    //            latestVersion, minRequiredVersion, storeUrl, updateMessage, forceUpdate }
    save: async (payload) => {
        const response = await axiosClient.post('/api/app-version', payload);
        return response.data;
    },

    remove: async (id) => {
        const response = await axiosClient.delete(`/api/app-version/${id}`);
        return response.data;
    },
};
