// src/tracking/dutyTracking.js
//
// Starts / stops background location sharing for mechanics and delivery partners
// purely from their ATTENDANCE state — there is no manual on/off switch any more:
//
//   checked_in                          → ONLINE  → location sharing ON
//   on_break / checked_out / not_marked → OFFLINE → location sharing OFF
//
// The SERVER already flips the person online/offline inside the attendance request
// (check-in, break, resume, sign-out), so the admin map is right even if this phone is
// offline or killed. This file only handles the phone's half: permissions + the GPS task.
//
// syncDutyTracking() is idempotent and cheap, so it is simply called every time the attendance
// state is (re)loaded — after an action, when a screen gains focus, when the app reopens.
import { Alert, Linking } from 'react-native';
import { store } from '../store';
import axiosClient from '../services/axiosClient';
import {
    ensureLocationPermissions,
    isTrackingActive,
    isTrackingAvailable,
    setTrackingToken,
    startTracking,
    stopTracking,
} from './locationTask';

export const TRACKABLE_POSITIONS = ['mechanic', 'delivery'];
export const isTrackablePosition = (p) => TRACKABLE_POSITIONS.includes(p);

const STATUS_URL = '/api/employee/auth/status';

let pending = null;          // { state, promise } — collapses duplicate calls made at the same moment
let chain = Promise.resolve();
let alertedFor = null;       // show each permission problem once per app session, not on every refresh

function explainDenied(e) {
    const bg = e.code === 'BACKGROUND_DENIED';
    if (alertedFor === e.code) return;
    alertedFor = e.code;
    Alert.alert(
        'Location permission needed',
        bg
            ? 'To be online, please set location access to "Allow all the time" so dispatch can find you when the app is in the background.'
            : 'To be online, please allow location access for Repairo Moto.',
        [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
    );
}

async function run(state) {
    // Old build without the native modules: never break attendance because of it
    if (!isTrackingAvailable) return { ok: true, skipped: true };

    await setTrackingToken(store.getState().auth?.token);

    // Not working right now (break, signed out, not marked) → stop sharing
    if (state !== 'checked_in') {
        await stopTracking();
        return { ok: true };
    }

    if (await isTrackingActive()) return { ok: true };

    try {
        await ensureLocationPermissions();                         // 1. permissions
        await axiosClient.patch(STATUS_URL, { online: true });     // 2. make sure the server has us online (no-op if it already does)
        await startTracking();                                     // 3. start the (low-power) GPS task
        return { ok: true };
    } catch (e) {
        if (e?.code === 'LOCATION_DENIED' || e?.code === 'BACKGROUND_DENIED') {
            // Can't share location → be honest: show as offline to dispatch (no-op if already offline)
            axiosClient.patch(STATUS_URL, { online: false, reason: 'no_location' }).catch(() => { });
            explainDenied(e);
            return { ok: false, code: e.code };
        }
        // Network hiccup / server disagrees → the next refresh retries
        return { ok: false, code: e?.response?.data?.code || 'RETRY' };
    }
}

/**
 * @param {'checked_in'|'on_break'|'checked_out'|'not_marked'|string} attendanceState
 */
export function syncDutyTracking(attendanceState) {
    const position = store.getState().auth?.user?.position;
    if (!isTrackablePosition(position)) return Promise.resolve({ ok: true, skipped: true });
    if (!['checked_in', 'on_break', 'checked_out', 'not_marked'].includes(attendanceState)) {
        return Promise.resolve({ ok: true, skipped: true });          // 'loading' / 'error' say nothing about duty
    }
    if (pending?.state === attendanceState) return pending.promise;

    const promise = chain
        .then(() => run(attendanceState))
        .catch(() => ({ ok: false }))
        .finally(() => { if (pending?.promise === promise) pending = null; });
    chain = promise;
    pending = { state: attendanceState, promise };
    return promise;
}
