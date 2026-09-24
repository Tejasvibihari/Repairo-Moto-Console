// src/services/leadService.js
// Thin wrapper over the lead + telecaller endpoints in the backend:
//   Routes/leadRoutes.js                 → /api/lead
//   Routes/telecallerDashboardRoutes.js  → /api/employee/dashboard
import axiosClient from './axiosClient';

const clean = (obj = {}) =>
    Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    );

export const leadService = {
    list: async (params) => (await axiosClient.get('/api/lead', { params: clean(params) })).data,
    get: async (id) => (await axiosClient.get(`/api/lead/${id}`)).data,
    create: async (payload) => (await axiosClient.post('/api/lead/new', payload)).data,
    update: async (id, payload) => (await axiosClient.put(`/api/lead/${id}`, payload)).data,
    dashboard: async () => (await axiosClient.get('/api/employee/dashboard')).data,
};

export const getErrorMessage = (err, fallback = 'Something went wrong.') =>
    err?.response?.data?.message || err?.message || fallback;
