// src/utils/attendanceLocation.js
//
// Fast location for attendance — the same idea Uber / Ola / Rapido / Blinkit use:
// get the location BEFORE the user needs it, so tapping "Mark Attendance" never waits on GPS.
//
//  1. App open (employees)   → ask permission once, grab the phone's last known fix instantly
//                              and one fresh low-power read, start looking up the street address.
//  2. Screens that need it   → while the "Mark Attendance" card / Attendance screen is visible
//     (holdLocationWarm)       a low-power watch keeps the cached fix fresh (stops when the
//                              screen is left, the app goes to background, or attendance is done).
//  3. Tap                    → getAttendanceLocation() answers from the cache immediately
//                              (≤ 45 s old). Only if the cache is stale does it do ONE quick
//                              balanced-accuracy read (network/Wi-Fi/GPS, 5 s cap) instead of
//                              the slow high-accuracy GPS cold start.
//  4. Address                → looked up ahead of time too. If it is still missing at tap time we
//                              don't wait for it: attendance is saved with coordinates and the
//                              address is filled in a moment later (see `pendingAddress`).
import { AppState } from 'react-native';
import { showLocationDisclosure } from '../tracking/locationDisclosure';

// Load defensively: a build made before expo-location was added must not crash the app.
let Location = null;
try {
    Location = require('expo-location');
} catch (e) {
    console.warn('[attendance] expo-location missing — rebuild the app:', e?.message);
}

const FRESH_MS = 45 * 1000;               // answer instantly from the cache
const USABLE_MS = 5 * 60 * 1000;          // good enough if a fresh read fails (weak signal indoors)
const LAST_KNOWN_MAX_AGE = 10 * 60 * 1000;
const FRESH_READ_TIMEOUT_MS = 5000;
const ADDRESS_WAIT_MS = 800;              // max time the tap waits for the street address
const GEOCODE_TIMEOUT_MS = 8000;
const GEOCODE_RETRY_MS = 30 * 1000;       // don't hammer an offline geocoder
const GEOCODE_REUSE_M = 150;              // same place → reuse the address

export const codedError = (code, message) => {
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

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function distanceM(a, b) {
    const R = 6371000;
    const rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// ── cache ────────────────────────────────────────────────────────────────────
const cache = {
    fix: null,            // { lat, lng, accuracy, mocked, at }
    geo: null,            // { lat, lng, address }  last successful reverse-geocode
    geoPromise: null,     // in-flight lookup → resolves to an address ('' on failure)
    geoFor: null,         // { lat, lng } the in-flight lookup is for
    geoFailedAt: 0,
};
let enabled = false;      // set by prewarmLocation() — only employees ever turn this on
let prewarmPromise = null;

function formatAddress(a) {
    if (!a) return '';
    const parts = [a.name, a.street, a.district || a.subregion, a.city, a.region, a.postalCode]
        .map((p) => (p ? String(p).trim() : ''))
        .filter(Boolean);
    return [...new Set(parts)].join(', ');
}

function warmAddress(fix) {
    if (!Location) return null;
    if (cache.geo && distanceM(cache.geo, fix) < GEOCODE_REUSE_M) return null;               // already have it
    if (cache.geoPromise && cache.geoFor && distanceM(cache.geoFor, fix) < GEOCODE_REUSE_M) return cache.geoPromise;
    if (Date.now() - cache.geoFailedAt < GEOCODE_RETRY_MS) return null;

    const target = { lat: fix.lat, lng: fix.lng };
    cache.geoFor = target;
    const p = withTimeout(Location.reverseGeocodeAsync({ latitude: fix.lat, longitude: fix.lng }), GEOCODE_TIMEOUT_MS)
        .then((list) => formatAddress(list?.[0]))
        .catch(() => '')
        .then((address) => {
            if (address) cache.geo = { ...target, address };
            else cache.geoFailedAt = Date.now();
            if (cache.geoPromise === p) { cache.geoPromise = null; cache.geoFor = null; }
            return address;
        });
    cache.geoPromise = p;
    return p;
}

const cachedAddressFor = (fix) =>
    cache.geo && distanceM(cache.geo, fix) < GEOCODE_REUSE_M ? cache.geo.address : '';

/** Store a position from expo-location (never replaces a newer fix with an older one). */
function remember(pos) {
    const c = pos?.coords;
    if (!c || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return cache.fix;
    const fix = {
        lat: c.latitude,
        lng: c.longitude,
        accuracy: Number.isFinite(c.accuracy) ? c.accuracy : undefined,
        mocked: pos.mocked === true,
        at: Number.isFinite(pos.timestamp) ? pos.timestamp : Date.now(),
    };
    if (cache.fix && fix.at < cache.fix.at) return cache.fix;
    cache.fix = fix;
    warmAddress(fix);                    // fire and forget — the address is ready by tap time
    return fix;
}

// ── keep-warm watch (reference counted) ──────────────────────────────────────
let sub = null;
let subStarting = false;
let holders = 0;
let appState = AppState.currentState || 'active';
let appListener = null;

async function startWatch() {
    if (!Location || sub || subStarting) return;
    subStarting = true;
    try {
        const s = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 8000, distanceInterval: 10 },
            remember
        );
        if (holders > 0 && appState === 'active') sub = s;
        else s.remove();                 // released while it was starting
    } catch (e) {
        // permission missing / services off — getAttendanceLocation reports that clearly at tap time
    } finally {
        subStarting = false;
    }
}

function stopWatch() {
    try { sub?.remove(); } catch { /* already gone */ }
    sub = null;
}

function ensureAppListener() {
    if (appListener) return;
    appListener = AppState.addEventListener('change', (s) => {
        appState = s;
        if (s === 'active') {
            if (enabled && !cache.fix) prewarmLocation();     // e.g. employee just granted permission in Settings
            if (holders > 0) startWatch();
        } else {
            stopWatch();                 // never burn battery in the background
        }
    });
}

/**
 * Keep the location warm while a screen that needs it is visible. Returns a release function.
 * Safe to call from several places at once — the watch stops when the last holder releases.
 */
export function holdLocationWarm() {
    if (!Location) return () => { };
    holders += 1;
    ensureAppListener();
    if (appState === 'active') startWatch();
    let released = false;
    return () => {
        if (released) return;
        released = true;
        holders = Math.max(0, holders - 1);
        if (holders === 0) stopWatch();
    };
}

/**
 * Call once when an employee opens the app. Asks for permission up front (so no dialog
 * interrupts marking later) and seeds the cache. Resolves true if a location is warm.
 */
export function prewarmLocation() {
    if (!Location) return Promise.resolve(false);
    enabled = true;
    ensureAppListener();
    if (prewarmPromise) return prewarmPromise;

    prewarmPromise = (async () => {
        try {
            let perm = await Location.getForegroundPermissionsAsync();
            if (perm.status !== 'granted' && perm.canAskAgain !== false) {
                if (!(await showLocationDisclosure())) return false;   // "Not now" → don't ask the OS
                perm = await Location.requestForegroundPermissionsAsync();
            }
            if (perm.status !== 'granted') return false;

            // 1) instant: whatever fix the phone already has
            const last = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE, requiredAccuracy: 500 }).catch(() => null);
            if (last) remember(last);

            // 2) one recent low-power read if that wasn't recent enough
            if (!cache.fix || Date.now() - cache.fix.at > FRESH_MS) {
                const p = await withTimeout(
                    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                    FRESH_READ_TIMEOUT_MS * 2
                ).catch(() => null);
                if (p) remember(p);
            }
            return !!cache.fix;
        } catch {
            return false;
        }
    })().then((ok) => {
        if (!ok) prewarmPromise = null;  // allow another try (e.g. after permission is granted)
        return ok;
    });
    return prewarmPromise;
}

/** Forget everything (logout) — the next employee must not inherit this location. */
export function resetLocationCache() {
    enabled = false;
    prewarmPromise = null;
    stopWatch();
    cache.fix = null;
    cache.geo = null;
    cache.geoPromise = null;
    cache.geoFor = null;
    cache.geoFailedAt = 0;
}

/**
 * The location to record for an attendance mark / sign-out — normally instant.
 * @returns {Promise<{payload: {lat,lng,accuracy?,mocked,address}, pendingAddress: Promise<string>|null}>}
 *   `pendingAddress` is set only when the street address was not ready: send `payload` right
 *   away, then fill the address in when the promise resolves.
 * Throws an Error with `.code`: NATIVE_MISSING | LOCATION_DENIED | LOCATION_DISABLED | LOCATION_UNAVAILABLE
 */
export async function getAttendanceLocation() {
    if (!Location) {
        throw codedError('NATIVE_MISSING', 'Please install the latest version of the app to mark attendance.');
    }

    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
        if (perm.canAskAgain !== false && !(await showLocationDisclosure({ force: true }))) {
            throw codedError('LOCATION_DENIED', 'Location permission is needed to record where you are marking attendance.');
        }
        perm = await Location.requestForegroundPermissionsAsync();
    }
    if (perm.status !== 'granted') {
        throw codedError('LOCATION_DENIED', 'Location permission is needed to record where you are marking attendance.');
    }

    const age = (f) => Date.now() - f.at;
    let fix = cache.fix;

    // Stale or missing → ONE quick balanced read (not the slow high-accuracy GPS cold start)
    if (!fix || age(fix) > FRESH_MS) {
        if (!(await Location.hasServicesEnabledAsync())) {
            throw codedError('LOCATION_DISABLED', 'Please turn on Location (GPS) on your phone and try again.');
        }
        const p = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            FRESH_READ_TIMEOUT_MS
        ).catch(() => null);
        if (p) fix = remember(p) || fix;
    }
    // Weak signal (e.g. indoors) → accept the phone's recent last known fix
    if (!fix || age(fix) > USABLE_MS) {
        const last = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE, requiredAccuracy: 500 }).catch(() => null);
        if (last) fix = remember(last) || fix;
    }
    if (!fix || age(fix) > LAST_KNOWN_MAX_AGE) {
        throw codedError('LOCATION_UNAVAILABLE', "Couldn't get your location. Move to an open area and try again.");
    }

    // Address: use the one looked up ahead of time; otherwise wait only briefly
    let address = cachedAddressFor(fix);
    let pendingAddress = null;
    if (!address) {
        const lookup = warmAddress(fix);
        if (lookup) {
            address = await Promise.race([lookup, delay(ADDRESS_WAIT_MS).then(() => '')]);
            if (!address) pendingAddress = lookup;
        }
    }

    return {
        payload: { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, mocked: fix.mocked, address },
        pendingAddress,
    };
}
