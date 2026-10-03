// src/hooks/useAttendance.js
//
// Today's attendance state for the signed-in employee.
//   state: 'loading' | 'not_marked' | 'checked_in' | 'checked_out' | 'error'
// Re-syncs with the server whenever the screen gains focus or the app returns to the
// foreground (so a new day never shows yesterday's state).
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { attendanceService } from '../services/attendanceService';
import { captureLocation, showAttendanceError } from '../utils/attendanceUtils';

export function useTodayAttendance() {
    const [state, setState] = useState('loading');
    const [attendance, setAttendance] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
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
        try {
            const loc = await captureLocation();
            const data = kind === 'in' ? await attendanceService.checkIn(loc) : await attendanceService.checkOut(loc);
            apply(data);
            return { ok: true, attendance: data.attendance };
        } catch (e) {
            // Server already has a record (double tap / other device) → just sync to it
            if (e?.response?.status === 409 && e.response.data?.state) apply(e.response.data);
            showAttendanceError(e, kind === 'in' ? 'Could not mark attendance' : 'Could not sign out');
            return { ok: false };
        } finally {
            busyRef.current = false;
            if (aliveRef.current) setBusy(false);
        }
    }, [apply]);

    const checkIn = useCallback(() => submit('in'), [submit]);
    const checkOut = useCallback(() => submit('out'), [submit]);

    return { state, attendance, error, busy, refresh, checkIn, checkOut };
}
