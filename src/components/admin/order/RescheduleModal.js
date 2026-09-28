// RescheduleModal.js
// Bottom-sheet that lets the user pick a new date + time slot for a booking.
// Used by the admin Console (AdminOrderDetail) and by the customer app
// (OrderDetailScreen). It only collects the input — the caller performs the API
// call in `onSubmit({ preferredDate: 'YYYY-MM-DD', preferredTime: '10:00 AM', reason })`.

import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback, ScrollView,
    TextInput, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Statuses in which a booking can still be rescheduled (mirrors the backend rule).
export const RESCHEDULABLE_STATUSES = ['Pending', 'Mechanic Assigned'];
export const canRescheduleStatus = (status) => RESCHEDULABLE_STATUSES.includes(status);

const TIME_SLOTS = [
    { label: '8 AM', value: '08:00 AM', h: 8 },
    { label: '9 AM', value: '09:00 AM', h: 9 },
    { label: '10 AM', value: '10:00 AM', h: 10 },
    { label: '11 AM', value: '11:00 AM', h: 11 },
    { label: '12 PM', value: '12:00 PM', h: 12 },
    { label: '1 PM', value: '01:00 PM', h: 13 },
    { label: '2 PM', value: '02:00 PM', h: 14 },
    { label: '3 PM', value: '03:00 PM', h: 15 },
    { label: '4 PM', value: '04:00 PM', h: 16 },
    { label: '5 PM', value: '05:00 PM', h: 17 },
    { label: '6 PM', value: '06:00 PM', h: 18 },
    { label: '7 PM', value: '07:00 PM', h: 19 },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_AHEAD = 30;

// Local calendar date → "YYYY-MM-DD" (avoids the UTC shift toISOString would cause)
const toYmd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Stored preferredDate is an ISO string whose first 10 chars are the booking day.
const isoToYmd = (iso) => (iso ? String(iso).slice(0, 10) : null);

const formatYmd = (ymd) => {
    if (!ymd) return '—';
    const [y, m, d] = ymd.split('-').map(Number);
    return `${String(d).padStart(2, '0')} ${MONTH_LABELS[m - 1]} ${y}`;
};

const normalizeTime = (t) => {
    const m = String(t || '').trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    return m ? `${String(parseInt(m[1], 10)).padStart(2, '0')}:${m[2]} ${m[3]}` : String(t || '');
};

export default function RescheduleModal({
    visible,
    onClose,
    onSubmit,
    loading = false,
    theme,                 // { colors: {...} }
    isDark = false,
    currentDate = null,    // ISO string of the booking's current preferredDate
    currentTime = '',      // e.g. "10:00 AM"
    title = 'Reschedule Booking',
    subtitle = 'Choose a new date and time slot.',
    reasonLabel = 'Reason (optional)',
    reasonPlaceholder = 'Why is the booking being moved?',
}) {
    const C = theme.colors;
    const [selectedYmd, setSelectedYmd] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (visible) {
            setSelectedYmd(null);
            setSelectedTime(null);
            setReason('');
        }
    }, [visible]);

    const days = useMemo(() => {
        const today = new Date();
        return Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
            return { date: d, ymd: toYmd(d), isToday: i === 0 };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const isSlotPassed = (ymd, slot) => {
        if (ymd !== toYmd(new Date())) return false;
        // Require at least the top of the slot hour to still be ahead of "now"
        return slot.h * 60 <= new Date().getHours() * 60 + new Date().getMinutes();
    };

    // If the chosen day changes and the chosen time is no longer valid, clear it
    useEffect(() => {
        if (!selectedYmd || !selectedTime) return;
        const slot = TIME_SLOTS.find((s) => s.value === selectedTime);
        if (slot && isSlotPassed(selectedYmd, slot)) setSelectedTime(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYmd]);

    const currentYmd = isoToYmd(currentDate);
    const currentTimeNorm = normalizeTime(currentTime);
    const isSameAsCurrent = selectedYmd === currentYmd && selectedTime === currentTimeNorm;
    const canSubmit = !!selectedYmd && !!selectedTime && !isSameAsCurrent && !loading;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit({ preferredDate: selectedYmd, preferredTime: selectedTime, reason: reason.trim() });
    };

    return (
        <Modal transparent visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={loading ? undefined : onClose}>
                <View style={[s.backdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.45)' }]} />
            </TouchableWithoutFeedback>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={s.sheetWrap}
                pointerEvents="box-none"
            >
                <View style={[s.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <View style={[s.handle, { backgroundColor: C.border }]} />

                    <View style={s.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.title, { color: C.textPrimary }]}>{title}</Text>
                            <Text style={[s.subtitle, { color: C.textMuted }]}>{subtitle}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} disabled={loading} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={22} color={C.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Current schedule */}
                    <View style={[s.currentBox, { backgroundColor: C.surfaceLow, borderColor: C.border }]}>
                        <Ionicons name="calendar-outline" size={16} color={C.primary} />
                        <Text style={[s.currentLabel, { color: C.textMuted }]}>CURRENT</Text>
                        <Text style={[s.currentValue, { color: C.textPrimary }]}>
                            {formatYmd(currentYmd)}{currentTime ? ` · ${currentTime}` : ''}
                        </Text>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
                        {/* Date strip */}
                        <Text style={[s.sectionLabel, { color: C.textMuted }]}>NEW DATE</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateRow}>
                            {days.map(({ date, ymd, isToday }) => {
                                const selected = selectedYmd === ymd;
                                const weekend = date.getDay() === 0 || date.getDay() === 6;
                                return (
                                    <TouchableOpacity
                                        key={ymd}
                                        activeOpacity={0.8}
                                        onPress={() => setSelectedYmd(ymd)}
                                        style={[
                                            s.dateChip,
                                            {
                                                borderColor: selected ? C.primary : isToday ? C.primary + '88' : weekend ? C.warning + '55' : C.border,
                                                backgroundColor: selected ? C.primary : C.surfaceLow,
                                            },
                                        ]}
                                    >
                                        <Text style={[s.dateDay, { color: selected ? '#1a1a1a' : C.textMuted }]}>
                                            {isToday ? 'Today' : DAY_LABELS[date.getDay()]}
                                        </Text>
                                        <Text style={[s.dateNum, { color: selected ? '#1a1a1a' : C.textPrimary }]}>{date.getDate()}</Text>
                                        <Text style={[s.dateMonth, { color: selected ? '#1a1a1a' : C.textMuted }]}>
                                            {MONTH_LABELS[date.getMonth()]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Time slots */}
                        <Text style={[s.sectionLabel, { color: C.textMuted, marginTop: 16 }]}>NEW TIME SLOT</Text>
                        {!selectedYmd ? (
                            <Text style={[s.hint, { color: C.textMuted }]}>Pick a date first.</Text>
                        ) : (
                            <View style={s.timeWrap}>
                                {TIME_SLOTS.map((slot) => {
                                    const passed = isSlotPassed(selectedYmd, slot);
                                    const selected = selectedTime === slot.value;
                                    const isCurrent = selectedYmd === currentYmd && slot.value === currentTimeNorm;
                                    return (
                                        <TouchableOpacity
                                            key={slot.value}
                                            disabled={passed}
                                            activeOpacity={0.8}
                                            onPress={() => setSelectedTime(slot.value)}
                                            style={[
                                                s.timeChip,
                                                {
                                                    borderColor: selected ? C.primary : C.border,
                                                    backgroundColor: selected ? C.primary : C.surfaceLow,
                                                    opacity: passed ? 0.35 : 1,
                                                },
                                            ]}
                                        >
                                            <Text style={[s.timeText, { color: selected ? '#1a1a1a' : C.textPrimary }]}>{slot.label}</Text>
                                            {isCurrent && !selected && <Text style={[s.currentTag, { color: C.textMuted }]}>current</Text>}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {/* Reason */}
                        <Text style={[s.sectionLabel, { color: C.textMuted, marginTop: 16 }]}>{reasonLabel.toUpperCase()}</Text>
                        <TextInput
                            value={reason}
                            onChangeText={setReason}
                            placeholder={reasonPlaceholder}
                            placeholderTextColor={C.textMuted}
                            multiline
                            maxLength={300}
                            style={[s.reasonInput, { color: C.textPrimary, backgroundColor: C.surfaceLow, borderColor: C.border }]}
                        />
                    </ScrollView>

                    {/* Actions */}
                    <View style={s.actions}>
                        <TouchableOpacity
                            style={[s.cancelBtn, { borderColor: C.border }]}
                            onPress={onClose}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: C.textSecondary, fontWeight: '700' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.confirmBtn, { backgroundColor: C.primary, opacity: canSubmit ? 1 : 0.45 }]}
                            onPress={handleSubmit}
                            disabled={!canSubmit}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#1a1a1a" />
                            ) : (
                                <>
                                    <Ionicons name="calendar" size={16} color="#1a1a1a" />
                                    <Text style={s.confirmLabel}>Confirm Reschedule</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheetWrap: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0,
        paddingHorizontal: 18, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 18,
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    title: { fontSize: 18, fontWeight: '800' },
    subtitle: { fontSize: 12, marginTop: 2 },
    currentBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12,
        borderRadius: 12, borderWidth: 1, marginBottom: 14,
    },
    currentLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    currentValue: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
    sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
    hint: { fontSize: 12, fontStyle: 'italic' },
    dateRow: { gap: 8, paddingRight: 8 },
    dateChip: { width: 56, paddingVertical: 10, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', gap: 2 },
    dateDay: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    dateNum: { fontSize: 18, fontWeight: '900' },
    dateMonth: { fontSize: 10, fontWeight: '700' },
    timeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    timeChip: { minWidth: 72, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
    timeText: { fontSize: 13, fontWeight: '800' },
    currentTag: { fontSize: 8, fontWeight: '700', marginTop: 1, textTransform: 'uppercase' },
    reasonInput: {
        minHeight: 64, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
        fontSize: 13, textAlignVertical: 'top',
    },
    actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
    confirmBtn: { flex: 1.6, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
    confirmLabel: { fontSize: 13, fontWeight: '900', color: '#1a1a1a' },
});
