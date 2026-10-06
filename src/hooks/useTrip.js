// src/hooks/useTrip.js
// The employee's current trip (mechanic / delivery): start, arrive, "Arrived to Hub".
// The server does the distance maths from the GPS pings — this hook only presses the buttons and
// attaches ONE precise fix to each press so the first / last stretch is measured exactly.
import { useCallback, useEffect, useRef, useState } from 'react';
import axiosClient from '../services/axiosClient';
import { getTripFix, setTrackingMode } from '../tracking/locationTask';

const BASE = '/api/employee/trips';
const REFRESH_MS = 30 * 1000;            // light HTTP poll for the live km counter (no GPS involved)

const messageOf = (e, fallback) => e?.response?.data?.message || fallback;

export default function useTrip({ enabled = true } = {}) {
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const alive = useRef(true);

    const refresh = useCallback(async () => {
        if (!enabled) return null;
        try {
            const { data } = await axiosClient.get(`${BASE}/active`);
            if (alive.current) setTrip(data?.trip || null);
            return data?.trip || null;
        } catch {
            return null;
        }
    }, [enabled]);

    useEffect(() => {
        alive.current = true;
        if (!enabled) return undefined;
        setLoading(true);
        refresh().finally(() => alive.current && setLoading(false));
        return () => { alive.current = false; };
    }, [enabled, refresh]);

    // keep the km counter fresh while he is driving
    useEffect(() => {
        if (!enabled || !trip || !['to_customer', 'to_hub'].includes(trip.phase)) return undefined;
        const id = setInterval(refresh, REFRESH_MS);
        return () => clearInterval(id);
    }, [enabled, trip?.id, trip?.phase, refresh]);

    const call = useCallback(async (path, fallbackMsg, body = {}) => {
        setBusy(true);
        try {
            const fix = await getTripFix();
            const { data } = await axiosClient.post(`${BASE}${path}`, { ...body, ...(fix || {}) });
            return { ok: true, data };
        } catch (e) {
            return { ok: false, message: messageOf(e, fallbackMsg), code: e?.response?.data?.code };
        } finally {
            if (alive.current) setBusy(false);
        }
    }, []);

    const start = useCallback(async (orderId) => {
        const r = await call('/start', 'Could not start the trip.', { orderId });
        if (r.ok) {
            setTrip(r.data.trip);
            setTrackingMode('trip');            // don't wait for the next ping reply
        }
        return r;
    }, [call]);

    const arrive = useCallback(async (tripId) => {
        const r = await call(`/${tripId}/arrive`, 'Could not mark arrival.');
        if (r.ok) { setTrip(r.data.trip); }
        return r;
    }, [call]);

    const hubArrived = useCallback(async (tripId) => {
        const r = await call(`/${tripId}/hub-arrived`, 'Could not mark arrival at the hub.');
        if (r.ok) {
            setTrip(null);
            setTrackingMode('idle');
        }
        return r;
    }, [call]);

    return { trip, loading, busy, refresh, start, arrive, hubArrived };
}
