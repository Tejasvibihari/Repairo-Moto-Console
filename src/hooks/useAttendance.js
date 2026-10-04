// src/hooks/useAttendance.js
//
// Today's attendance state for the signed-in employee.
//   state: 'loading' | 'not_marked' | 'checked_in' | 'on_break' | 'checked_out' | 'error'
// A day can hold several breaks: checked_in → on_break → checked_in → ... → checked_out.
// Re-syncs with the server whenever the screen gains focus or the app returns to the
// foreground (so a new day never shows yesterday's state).
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { attendanceService } from '../services/attendanceService';
import { getAttendanceLocation, holdLocationWarm } from '../utils/attendanceLocation';
import { showAttendanceError } from '../utils/attendanceUtils';

/**
 * Keep the phone's location warm while `wanted` is true AND this screen is in front, so that
 * tapping "Mark Attendance" / "Sign Out" is instant. Stops automatically when the screen is
 * left, the app goes to the background, or `wanted` turns false (e.g. attendance is done).
 */
export function useLocationWarm(wanted) {
    const focused = useIsFocused();
    const active = !!wanted && focused;
    useEffect(() => (active ? holdLocationWarm() : undefined), [active]);
}

/** Current time in ms, re-read every `ms` while `active` (drives the running break timer). */
export function useNow(active, ms = 30000) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!active) return undefined;
        setNow(Date.now());
        const t = setInterval(() => setNow(Date.now()), ms);
        return () => clearInterval(t);
    }, [active, ms]);
    return now;
}

export function useTodayAttendance() {
    const [state, setState] = useState('loading');
    const [attendance, setAttendance] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [busyKind, setBusyKind] = useState(null);    // 'in' | 'out' | 'break' | 'resume' — which button is working
    const busyRef = useRef(false);
    const aliveRef = useRef(true);

    useEffect(() => () => { aliveRef.current = false; }, []);

    const apply = useCallback((data) => {
        if (!aliveRef.current) return;
        setAttendance(data?.attendance || null);
        setState(data?.state || 'not_marked');
        setError(null);
    }, []);

    const refresh = useCallback(async () => {
        try {
            apply(await attendanceService.today());
        } catch (e) {
            if (!aliveRef.current) return;
            setError(e?.response?.data?.message || 'Could not load attendance.');
            // keep showing the last known state if we have one; otherwise show the error card
            setState((prev) => (prev === 'loading' ? 'error' : prev));
        }
    }, [apply]);

    useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

    useEffect(() => {
        const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
        return () => sub.remove();
    }, [refresh]);

    // kind: 'in' | 'out'  →  resolves { ok, attendance? }
    const submit = useCallback(async (kind) => {
        if (busyRef.current) return { ok: false };
        busyRef.current = true;
        setBusy(true);
        setBusyKind(kind);
        try {
            const { payload, pendingAddress } = await getAttendanceLocation();
            const data = kind === 'in' ? await attendanceService.checkIn(payload) : await attendanceService.checkOut(payload);
            apply(data);
            // Street address wasn't ready → it was NOT waited for; add it now in the background
            if (pendingAddress) {
                pendingAddress
                    .then((address) => (address ? attendanceService.setAddress({ kind, address }) : null))
                    .then((res) => { if (res?.updated && aliveRef.current) refresh(); })
                    .catch(() => { });
            }
            return { ok: true, attendance: data.attendance };
        } catch (e) {
            // Server already has a record (double tap / other device) → just sync to it
            if (e?.response?.status === 409 && e.response.data?.state) apply(e.response.data);
            showAttendanceError(e, kind === 'in' ? 'Could not mark attendance' : 'Could not sign out');
            return { ok: false };
        } finally {
            busyRef.current = false;
            if (aliveRef.current) { setBusy(false); setBusyKind(null); }
        }
    }, [apply, refresh]);

    // kind: 'start' | 'end'  →  resolves { ok, attendance? }. No location needed, so it is quick.
    const breakAction = useCallback(async (kind) => {
        if (busyRef.current) return { ok: false };
        busyRef.current = true;
        setBusy(true);
        setBusyKind(kind === 'start' ? 'break' : 'resume');
        try {
            const data = kind === 'start' ? await attendanceService.startBreak() : await attendanceService.endBreak();
            apply(data);
            return { ok: true, attendance: data.attendance };
        } catch (e) {
            // Already in that state (double tap / other device) → just sync to the server
            if (e?.response?.status === 409 && e.response.data?.state) apply(e.response.data);
            showAttendanceError(e, kind === 'start' ? 'Could not start your break' : 'Could not resume work');
            return { ok: false };
        } finally {
            busyRef.current = false;
            if (aliveRef.current) { setBusy(false); setBusyKind(null); }
        }
    }, [apply]);

    const checkIn = useCallback(() => submit('in'), [submit]);
    const checkOut = useCallback(() => submit('out'), [submit]);
    const startBreak = useCallback(() => breakAction('start'), [breakAction]);
    const endBreak = useCallback(() => breakAction('end'), [breakAction]);

    return { state, attendance, error, busy, busyKind, refresh, checkIn, checkOut, startBreak, endBreak };
}
