// src/hooks/useLiveMechanics.js
// Admin/manager side: snapshot of online mechanics + delivery partners, with live updates over Socket.IO (/tracking).
//
// While this screen is IN FRONT (and the app is in the foreground) it sends a "watch" heartbeat every 30s.
// That is what tells the staff phones to switch from low-power pings to the fast GPS stream — and the
// moment the screen is left / the app is backgrounded the heartbeats stop and the phones drop back to
// low-power on their own. Nobody is streamed at full speed unless somebody is really looking.
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import Constants from 'expo-constants';
import axiosClient from '../services/axiosClient';

const SOCKET_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    'https://api.repairomoto.in';

export default function useLiveMechanics() {
    const token = useSelector((s) => s.auth.token);
    const [mechanics, setMechanics] = useState({});   // { [id]: { id, name, phone, lat, lng, speed, at } }
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null);

    const focused = useIsFocused();
    const [appActive, setAppActive] = useState(AppState.currentState === 'active');
    useEffect(() => {
        const sub = AppState.addEventListener('change', (st) => setAppActive(st === 'active'));
        return () => sub.remove();
    }, []);
    const watching = focused && appActive && connected;

    // "I'm looking at them" heartbeat (see header comment)
    useEffect(() => {
        if (!watching) return undefined;
        const beat = () => socketRef.current?.emit('watch', {});
        beat();
        const t = setInterval(beat, 30000);
        return () => clearInterval(t);
    }, [watching]);

    const loadSnapshot = useCallback(async () => {
        try {
            const { data } = await axiosClient.get('/api/admin/tracking/live');
            const next = {};
            (data.mechanics || []).forEach((m) => { next[m.id] = m; });
            setMechanics(next);
        } catch (e) {
            console.warn('[useLiveMechanics] snapshot failed', e?.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!token) return;
        loadSnapshot();

        const socket = io(`${SOCKET_URL}/tracking`, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
        });
        socketRef.current = socket;

        socket.on('connect', () => { setConnected(true); loadSnapshot(); }); // re-sync after any gap
        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', () => setConnected(false));

        socket.on('mechanic:location', (m) =>
            setMechanics((prev) => ({ ...prev, [m.id]: { ...prev[m.id], ...m } })));

        socket.on('mechanic:status', (m) =>
            setMechanics((prev) => {
                if (!m.isOnline) {
                    const { [m.id]: _gone, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [m.id]: { ...prev[m.id], id: m.id, name: m.name, phone: m.phone, position: m.position,
                    lat: m.location?.lat ?? prev[m.id]?.lat, lng: m.location?.lng ?? prev[m.id]?.lng, at: m.at } };
            }));

        return () => { socket.disconnect(); socketRef.current = null; };
    }, [token, loadSnapshot]);

    return { mechanics: Object.values(mechanics), connected, loading, reload: loadSnapshot };
}
