// src/components/employee/DutySwitch.js
//
// Online / Offline switch for mechanics (shown on the employee dashboard).
//   ON  → asks for location permission, tells the server (admin gets a push), starts GPS tracking
//   OFF → tells the server (admin gets a push), stops GPS tracking
// The server is the source of truth: on open/foreground we re-sync the switch with it,
// and resume tracking if the server says we are still online (e.g. after the app was killed).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Switch, Linking, ActivityIndicator, AppState, StyleSheet } from 'react-native';
import { showPopUp } from '../../utils/popupService';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '../../services/axiosClient';
import {
    ensureLocationPermissions,
    startTracking,
    stopTracking,
    isTrackingActive,
    setTrackingToken,
    isTrackingAvailable,
} from '../../tracking/locationTask';

const STATUS_URL = '/api/employee/auth/status';

export default function DutySwitch({ theme }) {
    const token = useSelector((s) => s.auth.token);
    const [online, setOnline] = useState(false);
    const [busy, setBusy] = useState(false);
    const [ready, setReady] = useState(false);
    const busyRef = useRef(false);

    // Re-sync the switch with the server (and resume/stop tracking to match)
    const sync = useCallback(async () => {
        if (busyRef.current) return;
        try {
            await setTrackingToken(token);
            const { data } = await axiosClient.get(STATUS_URL);
            const serverOnline = !!data?.isOnline;
            setOnline(serverOnline);

            // Old build without the native modules: just show the server state,
            // never flip the mechanic offline because of it.
            if (!isTrackingAvailable) return;

            if (serverOnline) {
                if (!(await isTrackingActive())) {
                    try {
                        await startTracking();
                    } catch {
                        // Permission was revoked while we were online → go offline honestly
                        await axiosClient.patch(STATUS_URL, { online: false }).catch(() => { });
                        setOnline(false);
                    }
                }
            } else if (await isTrackingActive()) {
                await stopTracking();
            }
        } catch {
            /* offline / server down — keep whatever is showing */
        } finally {
            setReady(true);
        }
    }, [token]);

    useEffect(() => {
        sync();
        const sub = AppState.addEventListener('change', (s) => { if (s === 'active') sync(); });
        return () => sub.remove();
    }, [sync]);

    const toggle = async (next) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setBusy(true);
        try {
            if (next) {
                await ensureLocationPermissions({ force: true }); // 1. permissions (disclosure first)
                await setTrackingToken(token);
                await axiosClient.patch(STATUS_URL, { online: true }); // 2. server ON (+ admin push)
                try {
                    await startTracking();                       // 3. start GPS
                } catch (e) {
                    await axiosClient.patch(STATUS_URL, { online: false }).catch(() => { });
                    throw e;
                }
            } else {
                await axiosClient.patch(STATUS_URL, { online: false }); // 1. server OFF (+ admin push)
                await stopTracking();                                   // 2. stop GPS
            }
            setOnline(next);
        } catch (e) {
            const denied = e?.code === 'LOCATION_DENIED' || e?.code === 'BACKGROUND_DENIED';
            const msg = e?.response?.data?.message || e?.message || 'Could not change status. Check your internet.';
            showPopUp(
                denied ? 'Location permission needed' : e?.code === 'NATIVE_MISSING' ? 'Update required' : 'Unable to change status',
                msg,
                denied
                    ? [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
                    : [{ text: 'OK' }]
            );
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    };

    const c = theme.colors;
    const dot = online ? c.success : c.textMuted;

    return (
        <View style={[s.card, { backgroundColor: c.surface, borderColor: online ? `${c.success}55` : c.border, ...theme.shadow.soft }]}>
            <View style={[s.iconWrap, { backgroundColor: `${dot}22` }]}>
                <Ionicons name={online ? 'radio-outline' : 'moon-outline'} size={22} color={dot} />
            </View>

            <View style={s.textWrap}>
                <Text style={[s.title, { color: c.textPrimary }]}>{online ? "You're Online" : "You're Offline"}</Text>
                <Text style={[s.sub, { color: c.textMuted }]} numberOfLines={2}>
                    {online
                        ? 'Dispatch can see your live location'
                        : 'Turn on to start your duty and receive jobs'}
                </Text>
            </View>

            {busy || !ready ? (
                <ActivityIndicator color={c.primary} />
            ) : (
                <Switch
                    value={online}
                    onValueChange={toggle}
                    trackColor={{ false: '#d1d5db', true: `${c.success}88` }}
                    thumbColor={online ? c.success : '#f4f4f5'}
                />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 24,
    },
    iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    textWrap: { flex: 1 },
    title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    sub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
});