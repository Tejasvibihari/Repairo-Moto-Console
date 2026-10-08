// src/services/employeeDashboardService.js
//   Routes/employeeDashboardRoutes.js → /api/employee/dashboard/overview
import axiosClient from './axiosClient';

export const employeeDashboardService = {
    // Orders, attendance, distance, rating and a 7-day strip for the signed-in employee
    overview: async () => (await axiosClient.get('/api/employee/dashboard/overview')).data,
    // Old endpoint (order counts only) — used as a fallback while the server is not updated yet
    orderCounts: async () => (await axiosClient.get('/api/admin/dashboard/order-counts')).data,
};
