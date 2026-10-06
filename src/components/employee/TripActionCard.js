// src/components/employee/TripActionCard.js
// The "movement" buttons of the order screen for mechanics + delivery partners:
//
//   Mechanic   Mechanic Assigned → [Start trip] → (driving) → [Mark Arrived: in MechanicActionStrip]
//              … work … → Work Completed → [Arrived to Hub]
//   Delivery   [Start trip] → (driving) → [Arrived at customer] → [Arrived to Hub]
//
// Distance is counted by the server only while driving (to the customer, and back to the hub);
// time spent at the customer's place is NOT counted.
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const fmtKm = (km) => `${Number(km || 0).toFixed(2)} km`;

export default function TripActionCard({ order, trip, position, busy, theme, onStart, onArrive, onHubArrived }) {
    if (!order) return null;
    const status = (order.status || '').toLowerCase().trim().replace(/\s+/g, '_');
    const isDelivery = position?.toLowerCase() === 'delivery';
    const mine = trip && String(trip.orderId) === String(order._id);
    const closedJob = ['work_completed', 'invoice_generated', 'completed', 'cancelled'].includes(status);

    let view = null;

    // ── driving back to the hub → the last button of the flow ──
    if (mine && trip.phase === 'to_hub') {
        view = {
            icon: 'business-outline', color: '#2ECC9A',
            title: 'Heading back to the hub',
            sub: `Travelled so far: ${fmtKm(trip.distanceKm)}`,
            btn: 'Arrived to Hub', btnIcon: 'flag', onPress: () => onHubArrived(trip.id),
        };
    }
    // ── mechanic is at the customer: distance is paused ──
    else if (mine && trip.phase === 'at_customer') {
        view = {
            icon: 'pause-circle-outline', color: '#9B59B6',
            title: 'At the customer',
            sub: `Trip so far ${fmtKm(trip.distanceKm)} · distance is paused while you work`,
        };
    }
    // ── driving to the customer ──
    else if (mine && trip.phase === 'to_customer') {
        view = isDelivery
            ? {
                icon: 'navigate', color: '#3498DB',
                title: 'On the way', sub: `Travelled so far: ${fmtKm(trip.distanceKm)}`,
                btn: 'Arrived at customer', btnIcon: 'pin', onPress: () => onArrive(trip.id),
            }
            : {
                icon: 'navigate', color: '#3498DB',
                title: 'On the way to the customer',
                sub: `Travelled so far: ${fmtKm(trip.distanceKm)} — tap "Mark Arrived" below when you reach`,
            };
    }
    // ── not started yet ──
    else if (!trip || !mine) {
        const canStart = isDelivery ? !closedJob : status === 'mechanic_assigned';
        if (canStart) {
            view = {
                icon: 'play-circle', color: '#E2A731',
                title: 'Leaving for the customer?',
                sub: 'Tap Start when you leave the hub — your distance is recorded from here',
                btn: 'Start', btnIcon: 'play', onPress: () => onStart(order._id),
            };
        }
    }
    if (!view) return null;

    return (
        <View style={[s.strip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={s.left}>
                <View style={[s.icon, { backgroundColor: `${view.color}26` }]}>
                    <Ionicons name={view.icon} size={20} color={view.color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[s.title, { color: theme.colors.textPrimary }]}>{view.title}</Text>
                    <Text style={[s.sub, { color: theme.colors.textMuted }]}>{view.sub}</Text>
                </View>
            </View>
            {!!view.btn && (
                <TouchableOpacity
                    onPress={view.onPress}
                    disabled={busy}
                    activeOpacity={0.85}
                    style={[s.btn, { backgroundColor: view.color, opacity: busy ? 0.7 : 1 }]}
                >
                    {busy
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <>
                            <Ionicons name={view.btnIcon} size={15} color="#fff" />
                            <Text style={s.btnTxt}>{view.btn}</Text>
                        </>}
                </TouchableOpacity>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    strip: {
        padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 13.5, fontWeight: '800', letterSpacing: 0.1 },
    sub: { fontSize: 11, marginTop: 1, fontWeight: '500' },
    btn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, minWidth: 100, alignSelf: 'flex-start',
    },
    btnTxt: { fontSize: 12.5, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },
});
