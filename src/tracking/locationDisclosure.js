// src/tracking/locationDisclosure.js
//
// Prominent in-app disclosure, shown BEFORE the system location permission dialog
// (foreground and background). The person must tap "Continue" for the OS dialog to appear.
import { showPopUp } from '../utils/popupService';

export const LOCATION_DISCLOSURE_TITLE = 'Location Access Required';
export const LOCATION_DISCLOSURE_MESSAGE =
    'Repairo Moto collects your location while you are working, even when the app is in the background. ' +
    'This allows your authorized administrator to monitor your location during your active work session. ' +
    'Location tracking stops when you take a break or sign out.';

let inFlight = null;     // simultaneous callers share ONE dialog
let declined = false;    // tapped "Not now" → automatic flows stay quiet instead of nagging on every refresh

/** Forget a previous "Not now" (called when the person is no longer working, so the next check-in asks again). */
export function resetLocationDisclosureDecline() {
    declined = false;
}

/**
 * @param {{force?: boolean}} opts  force = the person just did something that needs location
 *   (tapped Mark Attendance / the Online switch), so ask even if they declined earlier.
 * @returns {Promise<boolean>} true = tapped Continue, false = tapped Not now
 */
export function showLocationDisclosure({ force = false } = {}) {
    if (inFlight) return inFlight;
    if (declined && !force) return Promise.resolve(false);

    inFlight = new Promise((resolve) => {
        const done = (ok) => {
            declined = !ok;
            inFlight = null;
            resolve(ok);
        };
        showPopUp(
            LOCATION_DISCLOSURE_TITLE,
            LOCATION_DISCLOSURE_MESSAGE,
            [
                { text: 'Not now', style: 'cancel', onPress: () => done(false) },
                { text: 'Continue', onPress: () => done(true) },
            ],
            { cancelable: false }
        );
    });
    return inFlight;
}
