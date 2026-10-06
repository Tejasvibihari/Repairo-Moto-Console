// src/tracking/locationTask.js
//
// Background GPS tracking for MECHANICS and DELIVERY partners (only while they are ONLINE,
// i.e. checked in — see dutyTracking.js).
//
// THREE POWER MODES, chosen by the server (every ping reply carries `mode`):
//   idle → nothing to record: low-power fix about once a minute ("last seen" + heartbeat)
//   trip → the person is driving to a customer / back to the hub: a fix every ~40 m or 20 s.
//          The server adds these to the trip DISTANCE. Distance-driven, so a red light costs nothing
//          and the OS can sleep the GPS chip between fixes (this is the battery-friendly one).
//          Fixes that could not be uploaded (no signal) are kept and sent with the next ping.
//   live → an admin has the live map open, or a customer is following the order: high-accuracy
//          fix every ~5s (smooth marker). Falls back to trip/idle as soon as the watcher leaves.
// So the battery is only spent where it is worth it. At the customer's place the phone is idle.
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
const MODE_KEY = 'tracking:mode';          // 'idle' | 'trip' | 'live' — what the OS is currently asked to do
const BUFFER_KEY = 'tracking:buffer';      // fixes not uploaded yet (offline) — capped, oldest dropped
const BUFFER_MAX = 120;

// Settings per mode. (Android honours timeInterval; iOS only distanceInterval, so iOS idle uses a
// 100 m filter — with 0 it would deliver an update every second while driving.)
const modeOptions = (mode) => (mode === 'live'
    ? {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 15,
    }
    : mode === 'trip'
    ? {
        accuracy: Location.Accuracy.High,
        timeInterval: 20000,
        distanceInterval: 40,
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

// ── offline buffer ───────────────────────────────────────────────────────────
const toPoint = (l) => ({
    lat: l.coords.latitude,
    lng: l.coords.longitude,
    t: l.timestamp || Date.now(),
    acc: l.coords.accuracy ?? undefined,
    mocked: l.mocked === true,
});

async function readBuffer() {
    try { return JSON.parse((await AsyncStorage.getItem(BUFFER_KEY)) || '[]'); } catch { return []; }
}
const writeBuffer = (pts) =>
    (pts.length
        ? AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(pts.slice(-BUFFER_MAX)))
        : AsyncStorage.removeItem(BUFFER_KEY)).catch(() => { });

// ── send positions to the server ─────────────────────────────────────────────
// `coords` = the newest fix (what the admin map shows); `points` = every fix not uploaded yet.
// Returns { status, live, mode } — status: HTTP status (0 = network error). 409 = server says we're
// offline, 401 = bad token. mode: which GPS mode to use next (only on a 200).
async function postLocation(coords, points) {
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
                points: points?.length ? points : undefined,
            }),
            signal: controller.signal,
        });
        let live, mode;
        if (res.ok) {
            try {
                const body = await res.json();
                live = !!body?.live;
                mode = body?.mode || (live ? 'live' : 'idle');     // old server only sends `live`
            } catch { /* keep the current mode */ }
        }
        return { status: res.status, live, mode };
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

        // Everything since the last successful upload (this batch + whatever was buffered offline)
        const pending = [...(await readBuffer()), ...data.locations.map(toPoint)];
        const { status, mode } = await postLocation(latest.coords, pending);

        // Server marked us offline (break / sign-out), or session expired → stop draining battery
        if (status === 409 || status === 401) {
            await writeBuffer([]);
            await stopTracking();
            return;
        }
        // 200 → uploaded. Anything else (network down, 5xx) → keep the fixes for the next ping.
        await writeBuffer(status === 200 ? [] : pending);

        // Server tells us which GPS mode fits the situation now
        if (status === 200 && mode) {
            try { await applyMode(mode); } catch { /* keep the current mode */ }
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
        const { status, mode } = await postLocation(pos.coords, [toPoint(pos)]);
        if (status === 200 && mode && mode !== 'idle') await applyMode(mode);
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
    AsyncStorage.removeItem(BUFFER_KEY).catch(() => { });
}

/**
 * One precise fix, used when a trip button is pressed (Start / Arrived / Arrived to Hub), so the
 * server measures from / to the exact spot. Never throws: returns null when there is no fix, and
 * the server then falls back to the last position it already has.
 */
export async function getTripFix() {
    if (!isTrackingAvailable) return null;
    try {
        const last = await Location.getLastKnownPositionAsync({ maxAge: 20000, requiredAccuracy: 60 });
        if (last) return { lat: last.coords.latitude, lng: last.coords.longitude, accuracy: last.coords.accuracy ?? undefined };
        const pos = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
            new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);
        return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? undefined } : null;
    } catch {
        return null;
    }
}

/** Ask the OS to switch mode right now (instead of waiting for the next ping reply). */
export async function setTrackingMode(mode) {
    if (!isTrackingAvailable || !(await isTrackingActive())) return;
    try { await applyMode(mode); } catch { /* the next ping reply will fix it */ }
}