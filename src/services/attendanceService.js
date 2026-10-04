// src/services/attendanceService.js
import axiosClient from './axiosClient';

// Employee: mark attendance (with location), sign out, see own records
export const attendanceService = {
    today: async () => (await axiosClient.get('/api/employee/attendance/today')).data,
    checkIn: async (payload) => (await axiosClient.post('/api/employee/attendance/check-in', payload)).data,
    checkOut: async (payload) => (await axiosClient.post('/api/employee/attendance/check-out', payload)).data,
    // Breaks need no location — they are instant
    startBreak: async () => (await axiosClient.post('/api/employee/attendance/break-start')).data,
    endBreak: async () => (await axiosClient.post('/api/employee/attendance/break-end')).data,
    list: async (month) => (await axiosClient.get('/api/employee/attendance', { params: month ? { month } : {} })).data,
    // Fill in the street address a moment after marking, when it wasn't ready at tap time
    setAddress: async (payload) => (await axiosClient.patch('/api/employee/attendance/address', payload)).data,
};

// Admin: everyone's attendance for a day or a date range (from/to = "YYYY-MM-DD")
export const attendanceReportService = {
    get: async (from, to) => (await axiosClient.get('/api/admin/attendance/report', { params: { from, to } })).data,
};

// Admin: who gets the WhatsApp attendance message
export const attendanceSettingsService = {
    get: async () => (await axiosClient.get('/api/admin/attendance/settings')).data.settings,
    update: async (payload) => (await axiosClient.put('/api/admin/attendance/settings', payload)).data.settings,
};
