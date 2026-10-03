// src/utils/attendanceUtils.js
//
// Attendance helpers: error alerts, map link and IST date/time formatting. Times are
// formatted by hand (like ShopStatusScreen) so nothing depends on Intl/timezone support of
// the JS engine. (Getting the location lives in ./attendanceLocation.)
import { Alert, Linking } from 'react-native';

export function showAttendanceError(e, title = 'Attendance') {
    const denied = e?.code === 'LOCATION_DENIED';
    const message = e?.response?.data?.message || e?.message || 'Something went wrong. Check your internet and try again.';
    Alert.alert(
        denied ? 'Location permission needed' : title,
        message,
        denied
            ? [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
            : [{ text: 'OK' }]
    );
}

export const openMap = (lat, lng) => {
    if (lat == null || lng == null) return;
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`).catch(() => { });
};

// ── IST formatting ───────────────────────────────────────────────────────────
const IST_MS = 5.5 * 60 * 60 * 1000;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ist = (d) => new Date(new Date(d).getTime() + IST_MS); // read with getUTC*()

export const fmtTime = (d) => {
    if (!d) return '--';
    const x = ist(d);
    const h = x.getUTCHours();
    return `${h % 12 === 0 ? 12 : h % 12}:${String(x.getUTCMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const fmtDate = (d) => {
    const x = ist(d);
    return `${DAYS[x.getUTCDay()]}, ${String(x.getUTCDate()).padStart(2, '0')} ${MONTHS[x.getUTCMonth()]}`;
};

// "2026-10-03" → { day: '03', weekday: 'Sat' }
export const dayParts = (dateKey) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    return { day: String(d).padStart(2, '0'), weekday: DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] };
};

export const fmtDuration = (mins) => {
    const m = Math.max(0, Math.round(mins || 0));
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};

export const todayKey = () => ist(new Date()).toISOString().slice(0, 10);
export const currentMonthKey = () => todayKey().slice(0, 7);

export const monthLabel = (key) => {
    const [y, m] = key.split('-').map(Number);
    return `${MONTHS_LONG[m - 1]} ${y}`;
};

export const shiftMonth = (key, delta) => {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
