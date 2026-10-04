// src/screens/employee/attendance/AttendanceScreen.js
//
// Opened from the drawer. Shows today's status with Mark Attendance / Sign Out,
// plus the employee's attendance history month by month.
import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import PopUp from '../../../components/common/PopUp';
import { useTodayAttendance, useLocationWarm, useNow } from '../../../hooks/useAttendance';
import { attendanceService } from '../../../services/attendanceService';
import {
    closedBreakMinutes,
    currentMonthKey,
    dayParts,
    fmtDate,
    fmtDuration,
    fmtTime,
    monthLabel,
    openBreak,
    openMap,
    shiftMonth,
    todayKey,
    totalBreakMinutes,
} from '../../../utils/attendanceUtils';

const STATUS = {
    not_marked: { label: 'Not marked', icon: 'time-outline' },
    checked_in: { label: 'Checked in', icon: 'checkmark-circle-outline' },
    on_break: { label: 'On break', icon: 'cafe-outline' },
    checked_out: { label: 'Day complete', icon: 'checkmark-done-outline' },
};

// One "Checked in 9:32 AM · address" line inside the today card
function StampRow({ icon, label, stamp, theme }) {
    const c = theme.colors;
    if (!stamp?.at) return null;
    const hasCoords = stamp.lat != null && stamp.lng != null;
    return (
        <View style={s.stampRow}>
            <View style={[s.stampIcon, { backgroundColor: `${c.primary}1F` }]}>
                <Ionicons name={icon} size={16} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[s.stampLabel, { color: c.textMuted }]}>{label}</Text>
                <Text style={[s.stampTime, { color: c.textPrimary }]}>{fmtTime(stamp.at)}</Text>
                {!!stamp.address && (
                    <Text style={[s.stampAddr, { color: c.textSecondary }]} numberOfLines={2}>{stamp.address}</Text>
                )}
            </View>
            {hasCoords && (
                <TouchableOpacity
                    onPress={() => openMap(stamp.lat, stamp.lng)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[s.mapBtn, { borderColor: c.border }]}
                    activeOpacity={0.75}
                >
                    <Ionicons name="map-outline" size={16} color={c.primary} />
                </TouchableOpacity>
            )}
        </View>
    );
}

// Today's breaks: one line each + the total. A running break shows "now" and keeps counting.
function BreaksSection({ breaks, nowMs, theme }) {
    const c = theme.colors;
    if (!breaks?.length) return null;
    return (
        <View style={[s.breakBox, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
            <View style={s.breakHead}>
                <Text style={[s.stampLabel, { color: c.textMuted }]}>Breaks today</Text>
                <Text style={[s.breakTotal, { color: c.textPrimary }]}>{fmtDuration(totalBreakMinutes(breaks, nowMs))}</Text>
            </View>
            {breaks.map((b, i) => (
                <View key={`${b.start}-${i}`} style={s.breakLine}>
                    <Ionicons name="cafe-outline" size={14} color={c.textMuted} />
                    <Text style={[s.breakText, { color: c.textSecondary }]}>
                        {fmtTime(b.start)}  →  {b.end ? fmtTime(b.end) : 'now'}
                    </Text>
                    <Text style={[s.breakDur, { color: c.textPrimary }]}>{fmtDuration(totalBreakMinutes([b], nowMs))}</Text>
                </View>
            ))}
        </View>
    );
}

export default function AttendanceScreen() {
    const mode = useSelector((st) => st.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const c = theme.colors;

    const { state, attendance, error, busy, busyKind, refresh, checkIn, checkOut, startBreak, endBreak } = useTodayAttendance();
    useLocationWarm(state === 'not_marked' || state === 'checked_in' || state === 'on_break');     // instant Mark / Sign Out
    const nowMs = useNow(state === 'on_break');                              // running break timer
    const breaks = attendance?.breaks || [];
    const currentBreak = state === 'on_break' ? openBreak(breaks) : null;
    const [confirmOut, setConfirmOut] = useState(false);

    const [month, setMonth] = useState(currentMonthKey());
    const [history, setHistory] = useState(null);       // { summary, records }
    const [histLoading, setHistLoading] = useState(true);
    const [histError, setHistError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadMonth = useCallback(async () => {
        try {
            setHistError(null);
            const data = await attendanceService.list(month);
            setHistory({ summary: data.summary, records: data.records });
        } catch (e) {
            setHistError(e?.response?.data?.message || 'Could not load your attendance history.');
        } finally {
            setHistLoading(false);
        }
    }, [month]);

    // reload when the month changes, and again after marking / signing out
    useEffect(() => {
        setHistLoading(true);
        loadMonth();
    }, [loadMonth, attendance?._id, attendance?.checkOut?.at]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refresh(), loadMonth()]);
        setRefreshing(false);
    };

    const meta = STATUS[state];
    const pillColor = state === 'checked_in' ? c.success : state === 'checked_out' ? '#3B82F6' : c.warning;   // on_break / not_marked → amber
    const isCurrentMonth = month === currentMonthKey();

    return (
        <TabScreenWrapper greeting="Attendance" showMenuIcon showBookingIcon={false}>
            <ScrollView
                style={{ flex: 1, backgroundColor: c.background }}
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />
                }
            >
                {/* ── Today ── */}
                <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border, ...theme.shadow.soft }]}>
                    <View style={s.cardHead}>
                        <View>
                            <Text style={[s.cardTitle, { color: c.textPrimary }]}>Today</Text>
                            <Text style={[s.cardSub, { color: c.textMuted }]}>{fmtDate(new Date())}</Text>
                        </View>
                        {!!meta && (
                            <View style={[s.pill, { backgroundColor: `${pillColor}1F` }]}>
                                <Ionicons name={meta.icon} size={14} color={pillColor} />
                                <Text style={[s.pillText, { color: pillColor }]}>{meta.label}</Text>
                            </View>
                        )}
                    </View>

                    {state === 'loading' && <ActivityIndicator color={c.primary} style={{ marginVertical: 18 }} />}

                    {state === 'error' && (
                        <View style={[s.errorBox, { backgroundColor: `${c.error}12`, borderColor: `${c.error}30` }]}>
                            <Ionicons name="alert-circle-outline" size={20} color={c.error} />
                            <Text style={[s.errorText, { color: c.error }]}>{error || 'Could not load attendance.'}</Text>
                            <TouchableOpacity onPress={refresh} activeOpacity={0.8}>
                                <Text style={[s.retry, { color: c.primary }]}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {state === 'not_marked' && (
                        <>
                            <Text style={[s.hint, { color: c.textSecondary }]}>
                                You haven&apos;t marked attendance today. Your current location is recorded when you mark.
                            </Text>
                            <TouchableOpacity
                                onPress={checkIn}
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
                                        <Ionicons name="finger-print-outline" size={20} color="#1a1a1a" />
                                        <Text style={s.btnText}>Mark Attendance</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </>
                    )}

                    {(state === 'checked_in' || state === 'on_break' || state === 'checked_out') && (
                        <>
                            <StampRow icon="log-in-outline" label="Checked in" stamp={attendance?.checkIn} theme={theme} />
                            <StampRow icon="log-out-outline" label="Signed out" stamp={attendance?.checkOut} theme={theme} />

                            <BreaksSection breaks={breaks} nowMs={nowMs} theme={theme} />

                            {state === 'checked_out' && (
                                <View style={[s.worked, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
                                    <View>
                                        <Text style={[s.workedLabel, { color: c.textMuted }]}>Time worked today</Text>
                                        {breaks.length > 0 && (
                                            <Text style={[s.workedNote, { color: c.textMuted }]}>Breaks not counted</Text>
                                        )}
                                    </View>
                                    <Text style={[s.workedValue, { color: c.textPrimary }]}>{fmtDuration(attendance?.workedMinutes)}</Text>
                                </View>
                            )}

                            {state === 'on_break' && (
                                <View style={[s.onBreak, { backgroundColor: `${c.warning}1A`, borderColor: `${c.warning}40` }]}>
                                    <Ionicons name="cafe-outline" size={20} color={c.warning} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.onBreakTitle, { color: c.textPrimary }]}>
                                            On break · {fmtDuration(totalBreakMinutes(currentBreak ? [currentBreak] : [], nowMs))}
                                        </Text>
                                        <Text style={[s.onBreakSub, { color: c.textSecondary }]}>
                                            Since {fmtTime(currentBreak?.start)}. This time isn&apos;t counted as work.
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {state === 'checked_out' ? (
                                <Text style={[s.hint, { color: c.textSecondary }]}>You&apos;re all done for today. See you tomorrow!</Text>
                            ) : (
                                <>
                                    {state === 'on_break' ? (
                                        <TouchableOpacity
                                            onPress={endBreak}
                                            disabled={busy}
                                            activeOpacity={0.85}
                                            style={[s.btn, { backgroundColor: c.primary, opacity: busy ? 0.75 : 1 }]}
                                        >
                                            {busyKind === 'resume' ? (
                                                <ActivityIndicator size="small" color="#1a1a1a" />
                                            ) : (
                                                <Ionicons name="play-circle-outline" size={20} color="#1a1a1a" />
                                            )}
                                            <Text style={s.btnText}>Resume Work</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={startBreak}
                                            disabled={busy}
                                            activeOpacity={0.85}
                                            style={[s.btn, s.btnOutline, { borderColor: c.primary, opacity: busy ? 0.6 : 1 }]}
                                        >
                                            {busyKind === 'break' ? (
                                                <ActivityIndicator size="small" color={c.primary} />
                                            ) : (
                                                <Ionicons name="cafe-outline" size={20} color={c.primary} />
                                            )}
                                            <Text style={[s.btnText, { color: c.primary }]}>Take a Break</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        onPress={() => setConfirmOut(true)}
                                        disabled={busy}
                                        activeOpacity={0.85}
                                        style={[s.btn, { backgroundColor: c.error, opacity: busy ? 0.75 : 1 }]}
                                    >
                                        {busyKind === 'out' ? (
                                            <>
                                                <ActivityIndicator size="small" color="#1a1a1a" />
                                                <Text style={s.btnText}>Getting your location…</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Ionicons name="log-out-outline" size={20} color="#1a1a1a" />
                                                <Text style={s.btnText}>Sign Out</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </>
                    )}
                </View>

                {/* ── History ── */}
                <View style={s.monthRow}>
                    <TouchableOpacity
                        onPress={() => setMonth((m) => shiftMonth(m, -1))}
                        style={[s.monthBtn, { backgroundColor: c.surface, borderColor: c.border }]}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="chevron-back" size={18} color={c.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[s.monthLabel, { color: c.textPrimary }]}>{monthLabel(month)}</Text>
                    <TouchableOpacity
                        onPress={() => setMonth((m) => shiftMonth(m, 1))}
                        disabled={isCurrentMonth}
                        style={[s.monthBtn, { backgroundColor: c.surface, borderColor: c.border, opacity: isCurrentMonth ? 0.35 : 1 }]}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="chevron-forward" size={18} color={c.textPrimary} />
                    </TouchableOpacity>
                </View>

                {histLoading && !history ? (
                    <ActivityIndicator color={c.primary} style={{ marginTop: 20 }} />
                ) : histError && !history ? (
                    <View style={[s.errorBox, { backgroundColor: `${c.error}12`, borderColor: `${c.error}30` }]}>
                        <Ionicons name="alert-circle-outline" size={20} color={c.error} />
                        <Text style={[s.errorText, { color: c.error }]}>{histError}</Text>
                        <TouchableOpacity onPress={loadMonth} activeOpacity={0.8}>
                            <Text style={[s.retry, { color: c.primary }]}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={s.tiles}>
                            <View style={[s.tile, { backgroundColor: c.surface, borderColor: c.border }]}>
                                <Text style={[s.tileValue, { color: c.textPrimary }]}>{history?.summary?.presentDays ?? 0}</Text>
                                <Text style={[s.tileLabel, { color: c.textMuted }]}>Days present</Text>
                            </View>
                            <View style={[s.tile, { backgroundColor: c.surface, borderColor: c.border }]}>
                                <Text style={[s.tileValue, { color: c.textPrimary }]}>{fmtDuration(history?.summary?.totalMinutes)}</Text>
                                <Text style={[s.tileLabel, { color: c.textMuted }]}>Total time</Text>
                            </View>
                        </View>

                        {(history?.records || []).length === 0 ? (
                            <View style={s.empty}>
                                <Ionicons name="calendar-outline" size={40} color={c.textMuted} />
                                <Text style={[s.emptyText, { color: c.textMuted }]}>No attendance recorded in {monthLabel(month)}.</Text>
                            </View>
                        ) : (
                            history.records.map((r) => {
                                const { day, weekday } = dayParts(r.date);
                                const open = !r.checkOut?.at;
                                const isToday = r.date === todayKey();
                                const right = open
                                    ? (isToday ? (openBreak(r.breaks) ? 'On break' : 'Working') : 'No sign-out')
                                    : fmtDuration(r.workedMinutes);
                                const breakMins = closedBreakMinutes(r.breaks);
                                return (
                                    <View key={r._id} style={[s.item, { backgroundColor: c.surface, borderColor: c.border }]}>
                                        <View style={[s.dateBox, { backgroundColor: `${c.primary}1F` }]}>
                                            <Text style={[s.dateDay, { color: c.textPrimary }]}>{day}</Text>
                                            <Text style={[s.dateWk, { color: c.textSecondary }]}>{weekday}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.itemTime, { color: c.textPrimary }]}>
                                                {fmtTime(r.checkIn?.at)}  →  {open ? '--' : fmtTime(r.checkOut.at)}
                                            </Text>
                                            {breakMins > 0 && (
                                                <Text style={[s.itemAddr, { color: c.textMuted }]} numberOfLines={1}>
                                                    Break {fmtDuration(breakMins)}
                                                </Text>
                                            )}
                                            {!!r.checkIn?.address && (
                                                <Text style={[s.itemAddr, { color: c.textMuted }]} numberOfLines={1}>{r.checkIn.address}</Text>
                                            )}
                                        </View>
                                        <Text style={[s.itemRight, { color: open && r.date !== todayKey() ? c.warning : c.textSecondary }]}>{right}</Text>
                                        {r.checkIn?.lat != null && (
                                            <TouchableOpacity
                                                onPress={() => openMap(r.checkIn.lat, r.checkIn.lng)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                activeOpacity={0.75}
                                            >
                                                <Ionicons name="map-outline" size={18} color={c.primary} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </>
                )}
            </ScrollView>

            <PopUp
                visible={confirmOut}
                title="Sign out for today?"
                message={
                    (state === 'on_break' ? 'Your break will end now. ' : '') +
                    "Your sign-out time and current location will be recorded. You can't mark attendance again today."
                }
                primaryLabel="Sign Out"
                secondaryLabel="Cancel"
                primaryColor={c.error}
                onPrimary={async () => {
                    setConfirmOut(false);
                    await checkOut();
                }}
                onSecondary={() => setConfirmOut(false)}
                onClose={() => setConfirmOut(false)}
            />
        </TabScreenWrapper>
    );
}

const s = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 120, gap: 14 },
    card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 14 },
    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
    cardSub: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    pillText: { fontSize: 12, fontWeight: '800' },
    hint: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
    btn: { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    btnText: { color: '#1a1a1a', fontWeight: '800', fontSize: 15 },
    stampRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    stampIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    stampLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
    stampTime: { fontSize: 17, fontWeight: '800', marginTop: 1 },
    stampAddr: { fontSize: 12.5, lineHeight: 17, marginTop: 2 },
    mapBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    worked: { borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    workedLabel: { fontSize: 12.5, fontWeight: '600' },
    workedValue: { fontSize: 16, fontWeight: '800' },
    workedNote: { fontSize: 11, fontWeight: '600', marginTop: 1 },
    btnOutline: { backgroundColor: 'transparent', borderWidth: 1.5 },
    onBreak: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
    onBreakTitle: { fontSize: 15, fontWeight: '800' },
    onBreakSub: { fontSize: 12.5, fontWeight: '500', marginTop: 2 },
    breakBox: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
    breakHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    breakTotal: { fontSize: 15, fontWeight: '800' },
    breakLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    breakText: { flex: 1, fontSize: 13, fontWeight: '600' },
    breakDur: { fontSize: 13, fontWeight: '700' },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
    monthBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    monthLabel: { fontSize: 16, fontWeight: '800' },
    tiles: { flexDirection: 'row', gap: 12 },
    tile: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
    tileValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    tileLabel: { fontSize: 12, fontWeight: '600' },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 12 },
    dateBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    dateDay: { fontSize: 16, fontWeight: '800', lineHeight: 18 },
    dateWk: { fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase' },
    itemTime: { fontSize: 14, fontWeight: '700' },
    itemAddr: { fontSize: 12, marginTop: 2 },
    itemRight: { fontSize: 12.5, fontWeight: '700' },
    empty: { alignItems: 'center', gap: 8, paddingVertical: 36 },
    emptyText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
    errorText: { flex: 1, fontSize: 13, fontWeight: '500' },
    retry: { fontSize: 13, fontWeight: '700' },
});
