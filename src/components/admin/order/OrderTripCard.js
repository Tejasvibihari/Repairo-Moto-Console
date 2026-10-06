// src/components/admin/order/OrderTripCard.js
// Admin order detail → "Travel & Distance": how far the mechanic / delivery partner travelled for
// this order (outbound to the customer + return to the hub), when each step happened, and the
// route on a map. The kilometres are computed by the server from the phone's GPS pings.
//
// Cheap by design: one small request on open; the route polyline is only downloaded with it and the
// MapView is only mounted when the admin taps "View route"; auto-refresh runs only while a trip is live.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import axiosClient from '../../../services/axiosClient';

const PHASE = {
    to_customer: { label: 'On the way to customer', color: '#3498DB' },
    at_customer: { label: 'At the customer', color: '#9B59B6' },
    to_hub: { label: 'Heading to hub', color: '#E2A731' },
    closed: { label: 'Arrived to Hub', color: '#2ECC9A' },
};
const END_NOTE = {
    checkout: 'closed automatically when he signed out',
    timeout: 'closed automatically (left open too long)',
    next_trip: 'went straight to the next customer',
    reassigned: 'mechanic was changed on the order',
};
const FLAG = {
    arrived_far: 'Arrival was marked far from the customer pin',
    hub_far: 'Hub arrival was marked far from the start point',
    mock_gps: 'Fake-GPS fixes were ignored',
    auto_closed: 'Closed automatically',
};

const km = (n) => `${Number(n || 0).toFixed(2)} km`;
const time = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null);

const Step = ({ done, label, at, theme, last }) => (
    <View style={s.stepRow}>
        <View style={s.rail}>
            <View style={[s.dot, { backgroundColor: done ? '#2ECC9A' : 'transparent', borderColor: done ? '#2ECC9A' : theme.colors.border }]} />
            {!last && <View style={[s.line, { backgroundColor: done ? '#2ECC9A' : theme.colors.border }]} />}
        </View>
        <Text style={[s.stepLabel, { color: done ? theme.colors.textPrimary : theme.colors.textMuted }]}>{label}</Text>
        <Text style={[s.stepTime, { color: theme.colors.textMuted }]}>{time(at) || '—'}</Text>
    </View>
);

const RouteMap = ({ trip }) => {
    const ref = useRef(null);
    const coords = (trip.path || []).map(([latitude, longitude]) => ({ latitude, longitude }));
    useEffect(() => {
        if (coords.length > 1) {
            const t = setTimeout(() => ref.current?.fitToCoordinates(coords, {
                edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false,
            }), 300);
            return () => clearTimeout(t);
        }
        return undefined;
    }, [coords.length]);
    const first = coords[0] || (trip.hub && { latitude: trip.hub.lat, longitude: trip.hub.lng });
    if (!first) return null;
    return (
        <MapView
            ref={ref}
            style={s.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{ ...first, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
            pitchEnabled={false}
        >
            {coords.length > 1 && <Polyline coordinates={coords} strokeWidth={4} strokeColor="#3498DB" />}
            {trip.hub && <Marker coordinate={{ latitude: trip.hub.lat, longitude: trip.hub.lng }} title="Start (hub)" pinColor="green" />}
            {trip.destination && <Marker coordinate={{ latitude: trip.destination.lat, longitude: trip.destination.lng }} title="Customer" pinColor="red" />}
            {trip.live && trip.phase !== 'closed' && (
                <Marker coordinate={{ latitude: trip.live.lat, longitude: trip.live.lng }} title={trip.employeeName || 'Now'} pinColor="blue" />
            )}
        </MapView>
    );
};

export default function OrderTripCard({ orderId, theme }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showMap, setShowMap] = useState(null);       // trip id whose route is open

    const load = useCallback(async () => {
        try {
            const { data: d } = await axiosClient.get(`/api/admin/tracking/trips/order/${orderId}`);
            setData(d);
        } catch { /* keep what we have */ }
        finally { setLoading(false); }
    }, [orderId]);

    useEffect(() => { load(); }, [load]);

    const live = (data?.trips || []).some((t) => t.phase !== 'closed');
    useEffect(() => {
        if (!live) return undefined;
        const id = setInterval(load, 30000);
        return () => clearInterval(id);
    }, [live, load]);

    if (loading) return null;
    if (!data?.trips?.length) return null;

    return (
        <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={s.head}>
                <Text style={[s.label, { color: theme.colors.textMuted }]}>TRAVEL & DISTANCE</Text>
                <View style={s.total}>
                    <Ionicons name="speedometer-outline" size={14} color="#E2A731" />
                    <Text style={s.totalTxt}>{km(data.totalKm)}</Text>
                </View>
            </View>

            {data.trips.map((t, i) => {
                const ph = PHASE[t.phase] || PHASE.closed;
                const closedByHub = t.phase === 'closed' && t.endReason === 'hub_arrived';
                const phLabel = t.phase === 'closed' && !closedByHub ? 'Trip closed' : ph.label;
                return (
                    <View key={t.id} style={[s.trip, i > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 14, marginTop: 14 }]}>
                        <View style={s.rowBetween}>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.name, { color: theme.colors.textPrimary }]}>
                                    {t.employeeName || 'Staff'} <Text style={{ color: theme.colors.textMuted, fontWeight: '600' }}>· {t.role}</Text>
                                </Text>
                                <View style={[s.chip, { backgroundColor: `${ph.color}22` }]}>
                                    <View style={[s.chipDot, { backgroundColor: ph.color }]} />
                                    <Text style={[s.chipTxt, { color: ph.color }]}>{phLabel}</Text>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[s.big, { color: theme.colors.textPrimary }]}>{km(t.distanceKm)}</Text>
                                <Text style={[s.bigSub, { color: theme.colors.textMuted }]}>
                                    {km(t.outboundKm)} out · {km(t.returnKm)} back
                                </Text>
                            </View>
                        </View>

                        {t.eta && t.phase === 'to_customer' && (
                            <Text style={[s.eta, { color: theme.colors.textSecondary }]}>
                                ETA to customer ≈ {t.eta.minutes} min ({km(t.eta.distanceKm)} left)
                            </Text>
                        )}

                        <View style={{ marginTop: 10 }}>
                            <Step done label={t.startedFromHub ? 'Started from hub' : 'Started (from previous customer)'} at={t.startedAt} theme={theme} />
                            <Step done={!!t.arrivedAt} label="Arrived at customer" at={t.arrivedAt} theme={theme} />
                            <Step done={!!t.returnStartedAt} label="Left for hub" at={t.returnStartedAt} theme={theme} />
                            <Step done={closedByHub} label="Arrived to Hub" at={closedByHub ? t.endedAt : null} theme={theme} last />
                        </View>

                        {t.phase === 'closed' && !closedByHub && !!END_NOTE[t.endReason] && (
                            <Text style={[s.note, { color: theme.colors.textMuted }]}>Trip {END_NOTE[t.endReason]}.</Text>
                        )}
                        {(t.flags || []).map((f) => (
                            <View key={f} style={s.flag}>
                                <Ionicons name="warning-outline" size={13} color="#E67E22" />
                                <Text style={s.flagTxt}>
                                    {FLAG[f] || f}
                                    {f === 'arrived_far' && t.arrivalOffsetM != null ? ` (${t.arrivalOffsetM} m)` : ''}
                                    {f === 'hub_far' && t.hubOffsetM != null ? ` (${t.hubOffsetM} m)` : ''}
                                </Text>
                            </View>
                        ))}

                        <TouchableOpacity
                            onPress={() => setShowMap(showMap === t.id ? null : t.id)}
                            style={[s.mapBtn, { borderColor: theme.colors.border }]}
                            activeOpacity={0.8}
                        >
                            <Ionicons name={showMap === t.id ? 'chevron-up' : 'map-outline'} size={15} color={theme.colors.primary} />
                            <Text style={[s.mapBtnTxt, { color: theme.colors.primary }]}>{showMap === t.id ? 'Hide route' : 'View route'}</Text>
                        </TouchableOpacity>
                        {showMap === t.id && <RouteMap trip={t} />}
                    </View>
                );
            })}
        </View>
    );
}

const s = StyleSheet.create({
    card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
    total: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(226,167,49,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    totalTxt: { color: '#E2A731', fontSize: 13, fontWeight: '900' },
    trip: {},
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    name: { fontSize: 14, fontWeight: '800', textTransform: 'capitalize' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 5 },
    chipDot: { width: 6, height: 6, borderRadius: 3 },
    chipTxt: { fontSize: 11, fontWeight: '800' },
    big: { fontSize: 20, fontWeight: '900' },
    bigSub: { fontSize: 10.5, fontWeight: '600', marginTop: 1 },
    eta: { fontSize: 12, fontWeight: '600', marginTop: 8 },
    stepRow: { flexDirection: 'row', alignItems: 'center', minHeight: 26 },
    rail: { width: 18, alignItems: 'center', alignSelf: 'stretch' },
    dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, marginTop: 4 },
    line: { width: 2, flex: 1, marginTop: 1 },
    stepLabel: { flex: 1, fontSize: 12.5, fontWeight: '600', marginLeft: 6 },
    stepTime: { fontSize: 11.5, fontWeight: '600' },
    note: { fontSize: 11, fontWeight: '500', marginTop: 6 },
    flag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: 'rgba(230,126,34,0.12)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
    flagTxt: { color: '#E67E22', fontSize: 11, fontWeight: '700', flex: 1 },
    mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, marginTop: 12 },
    mapBtnTxt: { fontSize: 12, fontWeight: '800' },
    map: { height: 220, borderRadius: 12, marginTop: 10, overflow: 'hidden' },
});
