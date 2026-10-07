// src/components/employee/DutyStatusCard.js
//
// Online / Offline status for MECHANICS and DELIVERY partners (dashboard).
// Replaces the old free on/off switch: online-ness now comes from ATTENDANCE.
//
//   checked in            → "You're Online"   (location is shared with dispatch)
//   on a break            → "You're Offline"  (resume work from the card above to go online)
//   signed out / not yet  → "You're Offline"
//
// The only way to go offline is the same as before attendance existed: take a break or sign out.
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { showPopUp } from '../../utils/popupService';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTodayAttendance } from '../../hooks/useAttendance';
import { isTrackablePosition } from '../../tracking/dutyTracking';

const COPY = {
    checked_in: { title: "You're Online", sub: 'Dispatch can see your location while you are on duty.' },
    on_break: { title: "You're Offline", sub: 'You are on a break. Tap "Resume Work" above to go online.' },
    checked_out: { title: "You're Offline", sub: "You've signed out for today." },
    not_marked: { title: "You're Offline", sub: 'Mark your attendance to go online.' },
};

export default function DutyStatusCard({ theme }) {
    const user = useSelector((s) => s.auth.user);
    const navigation = useNavigation();
    const { state, busy, busyKind, startBreak } = useTodayAttendance();
    const c = theme.colors;

    if (!isTrackablePosition(user?.position)) return null;
    if (state === 'loading' || state === 'error') return null;

    const online = state === 'checked_in';
    const copy = COPY[state] || COPY.not_marked;
    const dot = online ? c.success : c.textMuted;

    const goOffline = () =>
        showPopUp(
            'Go offline?',
            'You go offline by taking a break or by signing out. Your location stops being shared.',
            [
                { text: 'Take a Break', onPress: startBreak },
                { text: 'Sign Out', onPress: () => navigation.navigate('Attendance') },   // sign-out needs its confirm + location there
                { text: 'Stay Online', style: 'cancel' },
            ]
        );

    return (
        <View style={[s.card, { backgroundColor: c.surface, borderColor: online ? `${c.success}55` : c.border, ...theme.shadow.soft }]}>
            <View style={[s.iconWrap, { backgroundColor: `${dot}22` }]}>
                <Ionicons name={online ? 'radio-outline' : 'moon-outline'} size={22} color={dot} />
            </View>

            <View style={s.textWrap}>
                <Text style={[s.title, { color: c.textPrimary }]}>{copy.title}</Text>
                <Text style={[s.sub, { color: c.textMuted }]} numberOfLines={2}>{copy.sub}</Text>
            </View>

            {online && (
                <TouchableOpacity
                    onPress={goOffline}
                    disabled={busy}
                    activeOpacity={0.85}
                    style={[s.btn, { borderColor: c.border, opacity: busy ? 0.6 : 1 }]}
                >
                    {busyKind === 'break' ? (
                        <ActivityIndicator size="small" color={c.textPrimary} />
                    ) : (
                        <Text style={[s.btnText, { color: c.textPrimary }]}>Go Offline</Text>
                    )}
                </TouchableOpacity>
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
    btn: { minWidth: 84, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5 },
    btnText: { fontSize: 13, fontWeight: '800' },
});
