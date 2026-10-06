import axiosClient from './axiosClient';

export const staffOverviewService = {
    list: async (position, from, to) =>
        (await axiosClient.get('/api/admin/staff-overview', { params: { position, from, to } })).data,
    detail: async (employeeId, from, to) =>
        (await axiosClient.get(`/api/admin/staff-overview/${employeeId}`, { params: { from, to } })).data,
};
