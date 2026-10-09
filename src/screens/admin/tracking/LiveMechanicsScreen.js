// src/screens/admin/tracking/LiveMechanicsScreen.js
// Admin "Live Tracking" map — shows every mechanic and delivery partner who is currently Online
// (= checked in; people on a break or signed out are not shown).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Linking, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import useLiveMechanics from '../../../hooks/useLiveMechanics';

const PATNA = { latitude: 25.5941, longitude: 85.1376, latitudeDelta: 0.25, longitudeDelta: 0.25 };

const ROLE = {
    mechanic: { label: 'Mechanic', pin: '#2ECC9A' },
    delivery: { label: 'Delivery', pin: '#3B82F6' },
};

// Distinct colour per employee (assigned once per person, stays the same while the screen is open).
const PALETTE = [
    '#E53935', '#1E88E5', '#43A047', '#8E24AA', '#FB8C00', '#00ACC1', '#D81B60', '#6D4C41',
    '#3949AB', '#7CB342', '#F4511E', '#00897B', '#5E35B1', '#C0CA33', '#039BE5', '#546E7A',
];
const colorForIndex = (i) =>
    i < PALETTE.length ? PALETTE[i] : `hsl(${Math.round((i * 137.508) % 360)}, 70%, 45%)`;

const EmployeeMarker = React.memo(function EmployeeMarker({ m, color, selected, now, onPress }) {
    // Custom marker views are bitmaps; only let them re-render briefly after something changes
    const [track, setTrack] = useState(true);
    const initial = (m.name || '?').trim().charAt(0).toUpperCase();
    useEffect(() => {
        setTrack(true);
        const t = setTimeout(() => setTrack(false), 400);
        return () => clearTimeout(t);
    }, [color, selected, initial]);

    return (
        <Marker
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            title={m.name}
            description={`${ROLE[m.position]?.label || 'Staff'} · Updated ${ago(m.at, now)}`}
            onPress={onPress}
            tracksViewChanges={track}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={selected ? 10 : 1}
        >
            <View style={styles.markerWrap}>
                <View style={[
                    styles.markerBubble,
                    { backgroundColor: color, borderColor: selected ? '#e2a731' : '#fff', borderWidth: selected ? 4 : 3 },
                ]}>
                    <Text style={styles.markerText}>{initial}</Text>
                </View>
                <View style={[styles.markerTip, { borderTopColor: selected ? '#e2a731' : color }]} />
            </View>
        </Marker>
    );
});

const ago = (iso, now) => {
    if (!iso) return '—';
    const sec = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (sec < 10) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    return `${Math.floor(sec / 3600)}h ago`;
};

export default function LiveMechanicsScreen() {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const c = theme.colors;

    const { mechanics, connected, loading } = useLiveMechanics();
    const mapRef = useRef(null);
    const fittedOnce = useRef(false);
    const [selectedId, setSelectedId] = useState(null);
    const [now, setNow] = useState(Date.now());

    // tick every 5s so "Updated 12s ago" stays truthful
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(t);
    }, []);

    // employee id -> colour (first come, first served; never reused while screen is open)
    const colorMap = useRef({});
    const colorOf = (id) => {
        const map = colorMap.current;
        if (!map[id]) map[id] = colorForIndex(Object.keys(map).length);
        return map[id];
    };

    const located = useMemo(() => mechanics.filter((m) => m.lat != null && m.lng != null), [mechanics]);

    // Fit the map to everyone the first time we have data
    useEffect(() => {
        if (fittedOnce.current || !located.length || !mapRef.current) return;
        fittedOnce.current = true;
        mapRef.current.fitToCoordinates(
            located.map((m) => ({ latitude: m.lat, longitude: m.lng })),
            { edgePadding: { top: 120, right: 60, bottom: 220, left: 60 }, animated: true }
        );
    }, [located]);

    const focus = (m) => {
        setSelectedId(m.id);
        if (m.lat == null) return;
        mapRef.current?.animateToRegion(
            { latitude: m.lat, longitude: m.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500
        );
    };

    return (
        <TabScreenWrapper greeting="Live Tracking" showBookingIcon={false} showMenuIcon={true}>
            <View style={styles.root}>
                <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={PATNA} showsCompass>
                    {located.map((m) => (
                        <EmployeeMarker
                            key={m.id}
                            m={m}
                            color={colorOf(m.id)}
                            selected={selectedId === m.id}
                            now={now}
                            onPress={() => setSelectedId(m.id)}
                        />
                    ))}
                </MapView>

                {/* status pill */}
                <View style={[styles.pill, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={[styles.dot, { backgroundColor: connected ? c.success : c.error }]} />
                    <Text style={[styles.pillText, { color: c.textPrimary }]}>
                        {mechanics.length} online · {connected ? 'Live' : 'Reconnecting…'}
                    </Text>
                </View>

                {/* bottom list */}
                <View style={styles.bottom}>
                    {loading ? (
                        <ActivityIndicator color={c.primary} />
                    ) : mechanics.length === 0 ? (
                        <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
                            <Ionicons name="moon-outline" size={20} color={c.textMuted} />
                            <Text style={{ color: c.textSecondary, fontWeight: '600' }}>No mechanics or delivery partners are online right now</Text>
                        </View>
                    ) : (
                        <FlatList
                            horizontal
                            data={mechanics}
                            keyExtractor={(m) => m.id}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                            renderItem={({ item: m }) => (
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => focus(m)}
                                    style={[styles.card, {
                                        backgroundColor: c.surface,
                                        borderColor: selectedId === m.id ? c.primary : c.border,
                                    }]}
                                >
                                    <View style={styles.row}>
                                        <View style={[styles.dot, { backgroundColor: colorOf(m.id) }]} />
                                        <Text style={[styles.name, { color: c.textPrimary }]} numberOfLines={1}>{m.name}</Text>
                                    </View>
                                    {!!ROLE[m.position] && (
                                        <Text style={[styles.meta, { color: ROLE[m.position].pin, fontWeight: '700' }]}>{ROLE[m.position].label}</Text>
                                    )}
                                    <Text style={[styles.meta, { color: c.textMuted }]}>
                                        {m.lat == null ? 'Waiting for GPS…' : `Updated ${ago(m.at, now)}`}
                                    </Text>
                                    {m.speed != null && m.speed > 1 && (
                                        <Text style={[styles.meta, { color: c.textMuted }]}>{Math.round(m.speed * 3.6)} km/h</Text>
                                    )}
                                    {!!m.phone && (
                                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${m.phone}`)} style={styles.call}>
                                            <Ionicons name="call-outline" size={14} color={c.primary} />
                                            <Text style={{ color: c.primary, fontWeight: '700', fontSize: 12 }}>Call</Text>
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </View>
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    markerWrap: { alignItems: 'center' },
    markerBubble: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    markerText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    markerTip: {
        width: 0, height: 0, marginTop: -2, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 10,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
    },
    pill: {
        position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
        gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, elevation: 4,
    },
    pillText: { fontSize: 12, fontWeight: '700' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    bottom: { position: 'absolute', left: 0, right: 0, bottom: 24 },
    empty: {
        marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
        padding: 14, borderRadius: 14, borderWidth: 1, justifyContent: 'center',
    },
    card: { width: 190, padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 4, elevation: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { fontSize: 14, fontWeight: '800', flex: 1 },
    meta: { fontSize: 12, fontWeight: '500' },
    call: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
});