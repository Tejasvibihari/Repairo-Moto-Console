// src/tracking/logoutCleanup.js
// Called right before logout. If the user is a mechanic who is Online, tell the server
// (admin gets "logged out and went offline") and stop GPS + forget the tracking token.
import { store } from '../store';
import axiosClient from '../services/axiosClient';
import { stopTracking, setTrackingToken } from './locationTask';

export async function goOfflineForLogout() {
    const user = store.getState().auth?.user;
    if (user?.position !== 'mechanic') return;

    try {
        // Idempotent on the server: if already offline nothing happens and no notification is sent
        await axiosClient.patch('/api/employee/auth/status', { online: false, reason: 'logout' });
    } catch {
        // Server unreachable: the stale-connection cron will mark them offline within minutes.
    } finally {
        await stopTracking();
        await setTrackingToken(null);
    }
}
