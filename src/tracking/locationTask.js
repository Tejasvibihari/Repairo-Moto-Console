// src/tracking/locationTask.js
//
// Background GPS tracking for MECHANICS and DELIVERY partners (only while they are ONLINE,
// i.e. checked in — see dutyTracking.js).
//
// TWO POWER MODES, chosen by the server (reply to every ping carries `live: true | false`):
//   idle → nobody is watching: low-power fix about once a minute ("last seen" + heartbeat)
//   live → an admin has the live map open, or a customer is following the order, or the person
//          is en route to a customer: high-accuracy fix every ~5s
// So the battery is only spent on GPS while somebody actually looks.
//
// IMPORTANT: this file must be imported once at app start (see index.js) so the
// task is registered before the OS wakes the app in the background.
//
// The task runs in a headless JS context where redux-persist may not be rehydrated,
// so it reads the auth token from AsyncStorage (saved by setTrackingToken) instead
// of the redux store.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Load the native modules defensively. If this build/APK was made BEFORE
// expo-location / expo-task-manager were added, requiring them throws
// "Cannot find native module ...". We must not crash the whole app for that:
// tracking is simply unavailable until a new build is installed.
let TaskManager = null;
let Location = null;
try {
    TaskManager = require('expo-task-manager');
    Location = require('expo-location');
} catch (e) {
    console.warn('[tracking] native modules missing — rebuild the app:', e?.message);
}
export const isTrackingAvailable = !!(TaskManager && Location);

const NATIVE_MISSING_MSG =
    'Live tracking needs the latest version of the app. Please install the newest build (a rebuild is required).';

const API_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    'https://api.repairomoto.in';

export const LOCATION_TASK = 'REPAIRO_MECHANIC_LOCATION_TASK';
const TOKEN_KEY = 'tracking:token';
const MODE_KEY = 'tracking:mode';          // 'idle' | 'live' — what the OS is currently asked to do

// Settings per mode. (Android honours timeInterval; iOS only distanceInterval, so iOS idle uses a
// 100 m filter — with 0 it would deliver an update every second while driving.)
const modeOptions = (mode) => (mode === 'live'
    ? {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 15,
    }
    : {
        accuracy: Location.Accuracy.Balanced,     // cell / Wi-Fi / fused — far cheaper than raw GPS
        timeInterval: 60000,
        distanceInterval: Platform.OS === 'ios' ? 100 : 0,
    });

const baseOptions = () => ({
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    // Android needs a foreground service so the OS doesn't kill tracking
    foregroundService: {
        notificationTitle: 'Repairo Moto — You are Online',
        notificationBody: 'Sharing your location with dispatch while you are on duty',
        notificationColor: '#e2a731',
    },
});

/** (Re)register the background task with the settings of `mode`. Re-calling start with new options updates a running task. */
async function applyMode(mode) {
    if ((await AsyncStorage.getItem(MODE_KEY)) === mode) return;
    await Location.startLocationUpdatesAsync(LOCATION_TASK, { ...baseOptions(), ...modeOptions(mode) });
    await AsyncStorage.setItem(MODE_KEY, mode);
}

// ── token helpers ────────────────────────────────────────────────────────────
export const setTrackingToken = (token) =>
    token ? AsyncStorage.setItem(TOKEN_KEY, token) : AsyncStorage.removeItem(TOKEN_KEY);

// ── send one position to the server ──────────────────────────────────────────
// Returns { status, live } — status: HTTP status (0 = network error). 409 = server says we're
// offline, 401 = bad token. live: should we be in the fast mode (only on a 200).
async function postLocation(coords) {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return { status: 401 };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
        const res = await fetch(`${API_URL}/api/employee/auth/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                lat: coords.latitude,
                lng: coords.longitude,
                speed: coords.speed ?? undefined,
                heading: coords.heading ?? undefined,
                accuracy: coords.accuracy ?? undefined,
            }),
            signal: controller.signal,
        });
        let live;
        if (res.ok) {
            try { live = !!(await res.json())?.live; } catch { /* old server — keep the current mode */ }
        }
        return { status: res.status, live };
    } catch {
        return { status: 0 }; // offline — the next ping will go through
    } finally {
        clearTimeout(timer);
    }
}

// ── the background task ──────────────────────────────────────────────────────
if (isTrackingAvailable) {
    TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
        if (error || !data?.locations?.length) return;
        const latest = data.locations[data.locations.length - 1];
        const { status, live } = await postLocation(latest.coords);

        // Server marked us offline (break / sign-out), or session expired → stop draining battery
        if (status === 409 || status === 401) {
            await stopTracking();
            return;
        }
        // Somebody started / stopped watching → switch between fast and low-power GPS
        if (status === 200 && typeof live === 'boolean') {
            try { await applyMode(live ? 'live' : 'idle'); } catch { /* keep the current mode */ }
        }
    });
}

// ── public API ───────────────────────────────────────────────────────────────
export async function ensureLocationPermissions() {
    if (!isTrackingAvailable) {
        const e = new Error(NATIVE_MISSING_MSG);
        e.code = 'NATIVE_MISSING';
        throw e;
    }
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
        const e = new Error('Location permission is required to be Online.');
        e.code = 'LOCATION_DENIED';
        throw e;
    }
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
        const e = new Error(
            'Please choose "Allow all the time" for location so dispatch can see you when the app is in the background.'
        );
        e.code = 'BACKGROUND_DENIED';
        throw e;
    }
}

export const isTrackingActive = async () => {
    if (!isTrackingAvailable) return false;
    try {
        return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    } catch {
        return false;
    }
};

export async function startTracking() {
    if (!isTrackingAvailable) {
        const e = new Error(NATIVE_MISSING_MSG);
        e.code = 'NATIVE_MISSING';
        throw e;
    }
    if (await isTrackingActive()) return;

    // Always START low-power; the server flips us to live as soon as somebody is watching.
    await Location.startLocationUpdatesAsync(LOCATION_TASK, { ...baseOptions(), ...modeOptions('idle') });
    await AsyncStorage.setItem(MODE_KEY, 'idle');

    // Don't wait for the first background tick: push one fix right now so the
    // admin sees the marker immediately (and learn straight away if we should be live).
    try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { status, live } = await postLocation(pos.coords);
        if (status === 200 && live) await applyMode('live');
    } catch {
        /* the task will deliver the first fix shortly */
    }
}

export async function stopTracking() {
    if (!isTrackingAvailable) return;
    try {
        if (await isTrackingActive()) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    } catch {
        /* already stopped */
    }
    AsyncStorage.removeItem(MODE_KEY).catch(() => { });
}