// src/utils/phoneUtils.js
import { Linking, Alert } from 'react-native';

export const digitsOnly = (v = '') => String(v).replace(/\D/g, '');

// True when the value looks like a dialable number (10–13 digits).
export const isValidPhone = (v = '') => {
    const d = digitsOnly(v);
    return d.length >= 10 && d.length <= 13;
};

const dialNumber = (phone) => String(phone || '').replace(/[^\d+]/g, '');

// Opens the phone's dialer with the number filled in. The user still taps
// the green call button there, so nothing is dialled by accident.
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
