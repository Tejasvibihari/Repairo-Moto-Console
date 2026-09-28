// src/tracking/locationTask.js
//
// Background GPS tracking for MECHANICS (only while their duty switch is ON).
//
// IMPORTANT: this file must be imported once at app start (see index.js) so the
// task is registered before the OS wakes the app in the background.
//
// The task runs in a headless JS context where redux-persist may not be rehydrated,
// so it reads the auth token from AsyncStorage (saved by setTrackingToken) instead
// of the redux store.
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

// ── token helpers ────────────────────────────────────────────────────────────
export const setTrackingToken = (token) =>
    token ? AsyncStorage.setItem(TOKEN_KEY, token) : AsyncStorage.removeItem(TOKEN_KEY);

// ── send one position to the server ──────────────────────────────────────────
// Returns HTTP status (0 = network error). 409 = server says we're offline, 401 = bad token.
async function postLocation(coords) {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return 401;

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
        return res.status;
    } catch {
        return 0; // offline — the next ping will go through
    } finally {
        clearTimeout(timer);
    }
}

// ── the background task ──────────────────────────────────────────────────────
if (isTrackingAvailable) {
    TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
        if (error || !data?.locations?.length) return;
        const latest = data.locations[data.locations.length - 1];
        const status = await postLocation(latest.coords);

        // Server marked us offline, or session expired → stop draining battery
        if (status === 409 || status === 401) {
            await stopTracking();
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
        const e = new Error('Location permission is required to go Online.');
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

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,          // Android: at most every 5 s
        distanceInterval: 15,        // metres — saves battery when standing still
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.AutomotiveNavigation,
        showsBackgroundLocationIndicator: true,
        // Android needs a foreground service so the OS doesn't kill tracking
        foregroundService: {
            notificationTitle: 'Repairo Moto — You are Online',
            notificationBody: 'Sharing your live location with dispatch',
            notificationColor: '#e2a731',
        },
    });

    // Don't wait for the first background tick: push one fix right now so the
    // admin sees the marker immediately.
    try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await postLocation(pos.coords);
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
}