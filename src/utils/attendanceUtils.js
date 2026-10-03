// src/utils/attendanceUtils.js
//
// Attendance helpers: capture the employee's location (+ readable address) and
// format IST dates/times. Times are formatted by hand (like ShopStatusScreen) so
// nothing depends on Intl/timezone support of the JS engine.
import { Alert, Linking } from 'react-native';

// Load defensively: a build made before expo-location was added must not crash the app.
let Location = null;
try {
    Location = require('expo-location');
} catch (e) {
    console.warn('[attendance] expo-location missing — rebuild the app:', e?.message);
}

const codedError = (code, message) => {
    const e = new Error(message);
    e.code = code;
    return e;
};

const withTimeout = (promise, ms) =>
    new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), ms);
        promise.then(
            (v) => { clearTimeout(t); resolve(v); },
            (e) => { clearTimeout(t); reject(e); }
        );
    });

async function reverseAddress(latitude, longitude) {
    try {
        const [a] = await withTimeout(Location.reverseGeocodeAsync({ latitude, longitude }), 6000);
        if (!a) return '';
        const parts = [a.name, a.street, a.district || a.subregion, a.city, a.region, a.postalCode]
            .map((p) => (p ? String(p).trim() : ''))
            .filter(Boolean);
        return [...new Set(parts)].join(', ');
    } catch {
        return ''; // the address is a nice-to-have; coordinates are what count
    }
}

/**
 * Ask permission, read GPS and (best effort) turn it into an address.
 * Throws an Error with `.code`: NATIVE_MISSING | LOCATION_DENIED | LOCATION_DISABLED | LOCATION_UNAVAILABLE
 * @returns {Promise<{lat:number,lng:number,accuracy?:number,mocked:boolean,address:string}>}
 */
export async function captureLocation() {
    if (!Location) {
        throw codedError('NATIVE_MISSING', 'Please install the latest version of the app to mark attendance.');
    }
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
        throw codedError('LOCATION_DENIED', 'Location permission is needed to record where you are marking attendance.');
    }
    if (!(await Location.hasServicesEnabledAsync())) {
        throw codedError('LOCATION_DISABLED', 'Please turn on Location (GPS) on your phone and try again.');
    }

    let pos = null;
    try {
        pos = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 20000);
    } catch {
        // Weak signal indoors → accept a recent, reasonably accurate fix
        pos = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000, requiredAccuracy: 200 }).catch(() => null);
    }
    if (!pos?.coords) {
        throw codedError('LOCATION_UNAVAILABLE', "Couldn't get your location. Move to an open area and try again.");
    }

    const { latitude, longitude, accuracy } = pos.coords;
    return {
        lat: latitude,
        lng: longitude,
        accuracy: accuracy ?? undefined,
        mocked: pos.mocked === true,
        address: await reverseAddress(latitude, longitude),
    };
}

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
