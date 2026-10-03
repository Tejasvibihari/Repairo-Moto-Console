// src/services/attendanceService.js
import axiosClient from './axiosClient';

// Employee: mark attendance (with location), sign out, see own records
export const attendanceService = {
    today: async () => (await axiosClient.get('/api/employee/attendance/today')).data,
    checkIn: async (payload) => (await axiosClient.post('/api/employee/attendance/check-in', payload)).data,
    checkOut: async (payload) => (await axiosClient.post('/api/employee/attendance/check-out', payload)).data,
    list: async (month) => (await axiosClient.get('/api/employee/attendance', { params: month ? { month } : {} })).data,
};

// Admin: who gets the WhatsApp attendance message
export const attendanceSettingsService = {
    get: async () => (await axiosClient.get('/api/admin/attendance/settings')).data.settings,
    update: async (payload) => (await axiosClient.put('/api/admin/attendance/settings', payload)).data.settings,
};
