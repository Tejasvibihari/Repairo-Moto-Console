// src/components/employee/AttendanceCard.js
//
// Dashboard card with the "Mark Attendance" button.
// Shows ONLY while today's attendance is not marked — once marked it disappears
// (the Attendance screen in the drawer has the status + Sign Out).
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTodayAttendance } from '../../hooks/useAttendance';
import { fmtTime } from '../../utils/attendanceUtils';

export default function AttendanceCard({ theme, style }) {
    const { state, error, busy, refresh, checkIn } = useTodayAttendance();
    const c = theme.colors;

    if (state === 'loading' || state === 'checked_in' || state === 'checked_out') return null;

    if (state === 'error') {
        return (
            <View style={[s.errorBox, { backgroundColor: `${c.error}12`, borderColor: `${c.error}30` }, style]}>
                <Ionicons name="alert-circle-outline" size={20} color={c.error} />
                <Text style={[s.errorText, { color: c.error }]} numberOfLines={2}>{error || 'Could not load attendance.'}</Text>
                <TouchableOpacity onPress={refresh} activeOpacity={0.8}>
                    <Text style={[s.retry, { color: c.primary }]}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const onMark = async () => {
        const res = await checkIn();
        if (res.ok) {
            Alert.alert('Attendance marked', `You checked in at ${fmtTime(res.attendance?.checkIn?.at)}. Have a great day!`);
        }
    };

    return (
        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border, ...theme.shadow.soft }, style]}>
            <View style={s.row}>
                <View style={[s.iconWrap, { backgroundColor: `${c.primary}22` }]}>
                    <Ionicons name="finger-print-outline" size={24} color={c.primary} />
                </View>
                <View style={s.textWrap}>
                    <Text style={[s.title, { color: c.textPrimary }]}>Mark your attendance</Text>
                    <Text style={[s.sub, { color: c.textMuted }]}>
                        You haven&apos;t checked in today. Your location is recorded when you mark.
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                onPress={onMark}
                disabled={busy}
                activeOpacity={0.85}
                style={[s.btn, { backgroundColor: c.primary, opacity: busy ? 0.75 : 1 }]}
            >
                {busy ? (
                    <>
                        <ActivityIndicator size="small" color="#1a1a1a" />
                        <Text style={s.btnText}>Getting your location…</Text>
                    </>
                ) : (
                    <>
                        <Ionicons name="location-outline" size={20} color="#1a1a1a" />
                        <Text style={s.btnText}>Mark Attendance</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

const s = StyleSheet.create({
    card: { padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 24, gap: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    textWrap: { flex: 1 },
    title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    sub: { fontSize: 12, fontWeight: '500', marginTop: 2, lineHeight: 17 },
    btn: { height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    btnText: { color: '#1a1a1a', fontWeight: '800', fontSize: 15 },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
    errorText: { flex: 1, fontSize: 13, fontWeight: '500' },
    retry: { fontSize: 13, fontWeight: '700' },
});
