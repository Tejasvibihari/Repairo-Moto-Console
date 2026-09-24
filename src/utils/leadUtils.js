// src/utils/leadUtils.js
import { Linking, Alert } from 'react-native';

// ── Role / identity ───────────────────────────────────────────────────────────

// The login response stores `role: 'employee'` for every staff member; the
// real job title lives in `position` (see server/Models/employeeModel.js).
export const isTelecaller = (user) =>
    String(user?.position || '').trim().toLowerCase() === 'telecaller';

// Must match how the server builds `leadBy` (Middleware/authAdmin.js).
export const getLeadByName = (user) => {
    const full = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    return full || user?.email || '';
};

// ── Phone helpers ─────────────────────────────────────────────────────────────

export const digitsOnly = (v = '') => String(v).replace(/\D/g, '');

export const isValidPhone = (v = '') => {
    const d = digitsOnly(v);
    return d.length >= 10 && d.length <= 13;
};

const dialNumber = (phone) => String(phone || '').replace(/[^\d+]/g, '');

export const callNumber = async (phone) => {
    const n = dialNumber(phone);
    if (!n) return false;
    try {
        await Linking.openURL(`tel:${n}`);
        return true;
    } catch (_) {
        Alert.alert('Cannot start the call', 'This device could not open the dialer.');
        return false;
    }
};

export const openWhatsApp = async (phone, text) => {
    let d = digitsOnly(phone);
    if (d.length === 10) d = `91${d}`; // India default
    if (!d) return;
    const url = `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    try {
        await Linking.openURL(url);
    } catch (_) {
        Alert.alert('Cannot open WhatsApp', 'WhatsApp does not seem to be installed.');
    }
};

export const openMap = async (location = {}) => {
    let url = location.googleMapLink;
    if (!url && location.latitude != null && location.longitude != null) {
        url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    }
    if (!url) {
        const q = [location.address, location.city].filter(Boolean).join(', ');
        if (!q) return;
        url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    }
    try {
        await Linking.openURL(url);
    } catch (_) {
        Alert.alert('Cannot open maps', 'No app could open this location.');
    }
};

// ── Dates ─────────────────────────────────────────────────────────────────────

const toDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
};

export const formatDateTime = (v) => {
    const d = toDate(v);
    if (!d) return '';
    return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};

export const formatDate = (v) => {
    const d = toDate(v);
    if (!d) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const timeAgo = (v) => {
    const d = toDate(v);
    if (!d) return '';
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} h ago`;
    const days = Math.round(hrs / 24);
    if (days < 30) return `${days} d ago`;
    return formatDate(d);
};

// 'overdue' | 'today' | 'upcoming' | null
export const followUpState = (followUp) => {
    const d = toDate(followUp?.date);
    if (!d) return null;
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (d < now) return 'overdue';
    if (d <= endOfToday) return 'today';
    return 'upcoming';
};

const atHour = (daysAhead, hour) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, 0, 0, 0);
    return d;
};

export const followUpPresets = () => {
    const now = new Date();
    const list = [
        { label: 'In 2 hours', date: new Date(now.getTime() + 2 * 3600000) },
        { label: 'Today, 6 PM', date: atHour(0, 18) },
        { label: 'Tomorrow, 10 AM', date: atHour(1, 10) },
        { label: 'In 3 days', date: atHour(3, 11) },
        { label: 'Next week', date: atHour(7, 11) },
    ];
    return list.filter((p) => p.date.getTime() > now.getTime() + 60000);
};

// Accepts "DD/MM/YYYY HH:mm" (24h) — returns a Date or null.
export const parseCustomDateTime = (text = '') => {
    const m = text.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const [, dd, mm, yyyy, hh, min] = m.map(Number);
    const d = new Date(yyyy, mm - 1, dd, hh, min, 0, 0);
    const valid =
        d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd &&
        hh < 24 && min < 60;
    return valid ? d : null;
};
