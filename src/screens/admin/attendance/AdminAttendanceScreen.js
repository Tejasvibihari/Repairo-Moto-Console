// src/screens/admin/attendance/AdminAttendanceScreen.js
//
// Admin → everyone's attendance. Pick Day / Week / Month, then filter (status, role, search)
// and sort (name, check-in time, working hours, ...). "Records" shows one card per
// day per employee; "By employee" rolls a week/month up into days present + total hours.
// A single-day view also lists employees who haven't marked attendance as "Absent".
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Image,
    Linking,
    StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import { getImageUrl } from '../../../utils/imageUtils';
import { attendanceReportService } from '../../../services/attendanceService';
import { fmtDuration, fmtTime, openMap, todayKey } from '../../../utils/attendanceUtils';
import {
    EMPLOYEE_SORTS,
    RECORD_SORTS,
    STATUS_FILTERS,
    STATUS_META,
    canGoNext,
    filterRows,
    fmtDateKey,
    groupByEmployee,
    periodLabel,
    periodRange,
    positionsOf,
    rowMinutes,
    shiftAnchor,
    sortEmployees,
    sortRows,
    statusCounts,
} from '../../../utils/adminAttendanceUtils';

const EMPTY = [];
const PERIODS = [
    { key: 'day', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
];
const titleCase = (s) => String(s || '').replace(/\b\w/g, (ch) => ch.toUpperCase());

const statusColor = (status, c) =>
    status === 'working' ? c.success : status === 'completed' ? '#3B82F6' : status === 'missed_signout' ? c.warning : status === 'absent' ? c.error : c.textMuted;

// ─── small pieces (module level so they never remount) ───────────────────────

function Avatar({ person, theme, size = 44 }) {
    const c = theme.colors;
    if (person.profileImage) {
        return <Image source={{ uri: getImageUrl(person.profileImage) }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.surfaceLow }} />;
    }
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${c.primary}33`, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.textPrimary, fontWeight: '800', fontSize: size * 0.4 }}>{(person.name || '?').charAt(0).toUpperCase()}</Text>
        </View>
    );
}

function Pill({ status, theme, label }) {
    const color = statusColor(status, theme.colors);
    const meta = STATUS_META[status];
    return (
        <View style={[s.pill, { backgroundColor: `${color}1F` }]}>
            {!!meta && <Ionicons name={meta.icon} size={12} color={color} />}
            <Text style={[s.pillText, { color }]}>{label || meta?.label}</Text>
        </View>
    );
}

function Chip({ label, count, active, onPress, theme }) {
    const c = theme.colors;
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[s.chip, { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }]}
        >
            <Text style={[s.chipText, { color: active ? '#1a1a1a' : c.textSecondary }]}>
                {label}{count != null ? `  ${count}` : ''}
            </Text>
        </TouchableOpacity>
    );
}

function Tile({ label, value, sub, theme }) {
    const c = theme.colors;
    return (
        <View style={[s.tile, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.tileValue, { color: c.textPrimary }]} numberOfLines={1}>{value}</Text>
            <Text style={[s.tileLabel, { color: c.textMuted }]} numberOfLines={1}>{label}</Text>
            {!!sub && <Text style={[s.tileSub, { color: c.textSecondary }]} numberOfLines={1}>{sub}</Text>}
        </View>
    );
}

function Stamp({ label, stamp, theme }) {
    const c = theme.colors;
    if (!stamp?.at) return null;
    const hasCoords = stamp.lat != null && stamp.lng != null;
    return (
        <View style={s.stampRow}>
            <View style={{ flex: 1 }}>
                <Text style={[s.stampLabel, { color: c.textMuted }]}>{label}</Text>
                <Text style={[s.stampTime, { color: c.textPrimary }]}>{fmtTime(stamp.at)}</Text>
                <Text style={[s.stampAddr, { color: c.textSecondary }]} numberOfLines={3}>
                    {stamp.address || (hasCoords ? `${Number(stamp.lat).toFixed(5)}, ${Number(stamp.lng).toFixed(5)}` : 'Location not available')}
                </Text>
                {stamp.mocked && (
                    <View style={s.mockRow}>
                        <Ionicons name="warning-outline" size={14} color={c.warning} />
                        <Text style={{ color: c.warning, fontSize: 12, fontWeight: '700' }}>Fake GPS detected</Text>
                    </View>
                )}
            </View>
            {hasCoords && (
                <TouchableOpacity onPress={() => openMap(stamp.lat, stamp.lng)} style={[s.mapBtn, { borderColor: c.border }]} activeOpacity={0.75}>
                    <Ionicons name="map-outline" size={18} color={c.primary} />
                </TouchableOpacity>
            )}
        </View>
    );
}

function RecordCard({ row, theme, nowMs, showDate, onPress }) {
    const c = theme.colors;
    const absent = row.status === 'absent';
    const minutes = rowMinutes(row, nowMs);
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.cardTop}>
                <Avatar person={row} theme={theme} />
                <View style={{ flex: 1 }}>
                    <Text style={[s.name, { color: c.textPrimary }]} numberOfLines={1}>{row.name}</Text>
                    <Text style={[s.sub, { color: c.textMuted }]} numberOfLines={1}>
                        {titleCase(row.position)}{showDate ? `  •  ${fmtDateKey(row.date, false)}` : ''}
                    </Text>
                </View>
                <Pill status={row.status} theme={theme} />
            </View>
            {absent ? (
                <Text style={[s.line, { color: c.textMuted }]}>No attendance marked</Text>
            ) : (
                <>
                    <View style={s.timeRow}>
                        <Ionicons name="time-outline" size={15} color={c.textMuted} />
                        <Text style={[s.times, { color: c.textPrimary }]}>
                            {fmtTime(row.checkIn?.at)}  →  {row.checkOut?.at ? fmtTime(row.checkOut.at) : '--'}
                        </Text>
                        <Text style={[s.hours, { color: row.status === 'missed_signout' ? c.warning : c.textPrimary }]}>
                            {row.status === 'missed_signout' ? 'No sign-out' : fmtDuration(minutes)}
                        </Text>
                    </View>
                    {!!row.checkIn?.address && (
                        <View style={s.timeRow}>
                            <Ionicons name="location-outline" size={15} color={c.textMuted} />
                            <Text style={[s.line, { color: c.textSecondary, flex: 1 }]} numberOfLines={1}>{row.checkIn.address}</Text>
                        </View>
                    )}
                </>
            )}
        </TouchableOpacity>
    );
}

function EmployeeCard({ group, theme, onPress, showAbsent }) {
    const c = theme.colors;
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.cardTop}>
                <Avatar person={group} theme={theme} />
                <View style={{ flex: 1 }}>
                    <Text style={[s.name, { color: c.textPrimary }]} numberOfLines={1}>{group.name}</Text>
                    <Text style={[s.sub, { color: c.textMuted }]} numberOfLines={1}>{titleCase(group.position)}</Text>
                </View>
                {group.working ? <Pill status="working" theme={theme} /> : group.days === 0 && showAbsent ? <Pill status="absent" theme={theme} /> : null}
            </View>
            <View style={s.stats}>
                <View style={s.stat}>
                    <Text style={[s.statValue, { color: c.textPrimary }]}>{group.days}</Text>
                    <Text style={[s.statLabel, { color: c.textMuted }]}>Days</Text>
                </View>
                <View style={[s.statDivider, { backgroundColor: c.border }]} />
                <View style={s.stat}>
                    <Text style={[s.statValue, { color: c.textPrimary }]}>{fmtDuration(group.totalMinutes)}</Text>
                    <Text style={[s.statLabel, { color: c.textMuted }]}>Total</Text>
                </View>
                <View style={[s.statDivider, { backgroundColor: c.border }]} />
                <View style={s.stat}>
                    <Text style={[s.statValue, { color: c.textPrimary }]}>{group.avgMinutes ? fmtDuration(group.avgMinutes) : '--'}</Text>
                    <Text style={[s.statLabel, { color: c.textMuted }]}>Avg / day</Text>
                </View>
            </View>
            {group.missedSignOut > 0 && (
                <Text style={[s.line, { color: c.warning }]}>
                    {group.missedSignOut} day{group.missedSignOut > 1 ? 's' : ''} without sign-out
                </Text>
            )}
        </TouchableOpacity>
    );
}

// Bottom sheet for one record, or one employee's days
function DetailSheet({ item, theme, nowMs, onClose }) {
    const c = theme.colors;
    if (!item) return null;
    const isGroup = item.kind === 'group';
    const person = item.data;
    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <View style={s.backdrop}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={[s.sheet, { backgroundColor: c.background, borderColor: c.border }]}>
                    <View style={[s.grab, { backgroundColor: c.border }]} />
                    <View style={s.cardTop}>
                        <Avatar person={person} theme={theme} size={50} />
                        <View style={{ flex: 1 }}>
                            <Text style={[s.sheetName, { color: c.textPrimary }]} numberOfLines={1}>{person.name}</Text>
                            <Text style={[s.sub, { color: c.textMuted }]}>{titleCase(person.position)}</Text>
                        </View>
                        {!!person.phone && (
                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${person.phone}`).catch(() => { })} style={[s.mapBtn, { borderColor: c.border }]} activeOpacity={0.75}>
                                <Ionicons name="call-outline" size={18} color={c.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingTop: 14, paddingBottom: 24 }}>
                        {!isGroup ? (
                            <>
                                <View style={s.timeRow}>
                                    <Text style={[s.sheetDate, { color: c.textPrimary }]}>{fmtDateKey(person.date)}</Text>
                                    <Pill status={person.status} theme={theme} />
                                </View>
                                {person.status === 'absent' ? (
                                    <Text style={[s.line, { color: c.textMuted }]}>No attendance was marked on this day.</Text>
                                ) : (
                                    <>
                                        <Stamp label="Checked in" stamp={person.checkIn} theme={theme} />
                                        <Stamp label="Signed out" stamp={person.checkOut} theme={theme} />
                                        <View style={[s.worked, { backgroundColor: c.surface, borderColor: c.border }]}>
                                            <Text style={[s.sub, { color: c.textMuted }]}>
                                                {person.status === 'working' ? 'Working so far' : 'Working hours'}
                                            </Text>
                                            <Text style={[s.sheetName, { color: person.status === 'missed_signout' ? c.warning : c.textPrimary }]}>
                                                {person.status === 'missed_signout' ? 'No sign-out' : fmtDuration(rowMinutes(person, nowMs))}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <View style={[s.worked, { backgroundColor: c.surface, borderColor: c.border }]}>
                                    <Text style={[s.sub, { color: c.textMuted }]}>{person.days} day{person.days === 1 ? '' : 's'} present</Text>
                                    <Text style={[s.sheetName, { color: c.textPrimary }]}>{fmtDuration(person.totalMinutes)}</Text>
                                </View>
                                {person.rows.filter((r) => r.status !== 'absent').map((r) => (
                                    <View key={r._id} style={[s.dayRow, { borderColor: c.border }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.name, { color: c.textPrimary }]}>{fmtDateKey(r.date, false)}</Text>
                                            <Text style={[s.line, { color: c.textSecondary }]}>
                                                {fmtTime(r.checkIn?.at)}  →  {r.checkOut?.at ? fmtTime(r.checkOut.at) : '--'}
                                            </Text>
                                            {!!r.checkIn?.address && <Text style={[s.line, { color: c.textMuted }]} numberOfLines={1}>{r.checkIn.address}</Text>}
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                            <Text style={[s.hours, { color: r.status === 'missed_signout' ? c.warning : c.textPrimary }]}>
                                                {r.status === 'missed_signout' ? 'No sign-out' : fmtDuration(rowMinutes(r, nowMs))}
                                            </Text>
                                            {r.checkIn?.lat != null && (
                                                <TouchableOpacity onPress={() => openMap(r.checkIn.lat, r.checkIn.lng)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                                    <Ionicons name="map-outline" size={18} color={c.primary} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

function SortSheet({ visible, options, value, theme, onPick, onClose }) {
    const c = theme.colors;
    if (!visible) return null;
    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <View style={s.backdrop}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={[s.sheet, { backgroundColor: c.background, borderColor: c.border }]}>
                    <View style={[s.grab, { backgroundColor: c.border }]} />
                    <Text style={[s.sheetName, { color: c.textPrimary, marginBottom: 6 }]}>Sort by</Text>
                    {options.map((o) => (
                        <TouchableOpacity key={o.key} onPress={() => onPick(o.key)} activeOpacity={0.7} style={[s.sortRow, { borderColor: c.border }]}>
                            <Text style={[s.name, { color: o.key === value ? c.primary : c.textPrimary, flex: 1 }]}>{o.label}</Text>
                            {o.key === value && <Ionicons name="checkmark" size={20} color={c.primary} />}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </Modal>
    );
}

// ─── screen ──────────────────────────────────────────────────────────────────
export default function AdminAttendanceScreen() {
    const themeMode = useSelector((st) => st.theme?.mode || 'light');
    const theme = themeMode === 'dark' ? DarkTheme : LightTheme;
    const c = theme.colors;

    const today = todayKey();
    const [periodMode, setPeriodMode] = useState('day');
    const [anchor, setAnchor] = useState(today);
    const range = useMemo(() => periodRange(periodMode, anchor, today), [periodMode, anchor, today]);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const reqId = useRef(0);
    const lastRangeKey = useRef('');

    const [status, setStatus] = useState('all');
    const [position, setPosition] = useState('all');
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('records');      // records | employees (week/month only)
    const [sortKey, setSortKey] = useState('name_asc');
    const [empSortKey, setEmpSortKey] = useState('name_asc');
    const [sortOpen, setSortOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [nowMs, setNowMs] = useState(Date.now());

    const load = useCallback(async (silent = false) => {
        const id = ++reqId.current;
        if (!silent) { setLoading(true); setError(null); }
        try {
            const res = await attendanceReportService.get(range.from, range.to);
            if (id !== reqId.current) return;           // a newer request superseded this one
            setData({ rows: res.rows, singleDay: res.singleDay, from: res.from, to: res.to });
            setError(null);
            setNowMs(Date.now());
        } catch (e) {
            if (id !== reqId.current) return;
            if (!silent) setError(e?.response?.data?.message || 'Could not load attendance.');
        } finally {
            if (id === reqId.current && !silent) setLoading(false);
        }
    }, [range.from, range.to]);

    // Load on focus / when the period changes (spinner), then quietly refresh every minute
    useFocusEffect(useCallback(() => {
        const key = `${range.from}|${range.to}`;
        const changed = lastRangeKey.current !== key;
        lastRangeKey.current = key;
        load(!changed);
        const t = setInterval(() => load(true), 60000);
        return () => clearInterval(t);
    }, [load, range.from, range.to]));

    const ready = !!data && data.from === range.from && data.to === range.to;
    const rows = ready ? data.rows : EMPTY;
    const singleDay = ready ? data.singleDay : range.from === range.to;
    const hasWorking = useMemo(() => rows.some((r) => r.status === 'working'), [rows]);

    // keep "working so far" hours ticking
    useEffect(() => {
        if (!hasWorking) return undefined;
        const t = setInterval(() => setNowMs(Date.now()), 30000);
        return () => clearInterval(t);
    }, [hasWorking]);

    // an "Absent" filter makes no sense for week/month
    useEffect(() => { if (!singleDay && status === 'absent') setStatus('all'); }, [singleDay, status]);

    const view = singleDay ? 'records' : viewMode;
    const positions = useMemo(() => positionsOf(rows), [rows]);
    useEffect(() => { if (position !== 'all' && ready && !positions.includes(position)) setPosition('all'); }, [positions, position, ready]);

    const counts = useMemo(() => statusCounts(rows, { position, search }), [rows, position, search]);
    const filtered = useMemo(() => filterRows(rows, { status, position, search }), [rows, status, position, search]);

    const sortOptions = view === 'records'
        ? RECORD_SORTS.filter((o) => !singleDay || !o.key.startsWith('date'))
        : EMPLOYEE_SORTS;
    const activeSortKey = view === 'records' ? sortKey : empSortKey;
    const sortKeyEff = sortOptions.some((o) => o.key === activeSortKey) ? activeSortKey : sortOptions[0].key;
    const sortLabel = sortOptions.find((o) => o.key === sortKeyEff)?.label;

    const records = useMemo(() => (view === 'records' ? sortRows(filtered, sortKeyEff, nowMs) : EMPTY), [view, filtered, sortKeyEff, nowMs]);
    const employees = useMemo(
        () => (view === 'employees' ? sortEmployees(groupByEmployee(filtered, nowMs), sortKeyEff) : EMPTY),
        [view, filtered, sortKeyEff, nowMs]
    );
    const listData = view === 'records' ? records : employees;

    // whole-period summary (ignores filters) — hours use the live clock
    const summary = useMemo(() => {
        const present = rows.filter((r) => r.status !== 'absent');
        const completed = rows.filter((r) => r.status === 'completed');
        const total = present.reduce((sum, r) => sum + rowMinutes(r, nowMs), 0);
        return {
            presentEmployees: new Set(present.map((r) => r.employeeId)).size,
            totalEmployees: new Set(rows.map((r) => r.employeeId)).size,
            absent: rows.filter((r) => r.status === 'absent').length,
            working: rows.filter((r) => r.status === 'working').length,
            missed: rows.filter((r) => r.status === 'missed_signout').length,
            totalMinutes: total,
            avgMinutes: completed.length ? Math.round(completed.reduce((sum, r) => sum + r.minutes, 0) / completed.length) : 0,
        };
    }, [rows, nowMs]);

    const pickSort = (key) => { (view === 'records' ? setSortKey : setEmpSortKey)(key); setSortOpen(false); };
    const statusChips = STATUS_FILTERS.filter((f) => singleDay || f.key !== 'absent');

    const changePeriodMode = (m) => { if (m !== periodMode) { setPeriodMode(m); setViewMode(m === 'day' ? 'records' : 'employees'); } };
    const onRefresh = async () => { setRefreshing(true); await load(true); setRefreshing(false); };

    const header = (
        <View style={s.header}>
            {/* period */}
            <View style={[s.segment, { backgroundColor: c.surface, borderColor: c.border }]}>
                {PERIODS.map((p) => (
                    <TouchableOpacity
                        key={p.key}
                        onPress={() => changePeriodMode(p.key)}
                        activeOpacity={0.8}
                        style={[s.segmentBtn, periodMode === p.key && { backgroundColor: c.primary }]}
                    >
                        <Text style={[s.segmentText, { color: periodMode === p.key ? '#1a1a1a' : c.textSecondary }]}>{p.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={s.stepper}>
                <TouchableOpacity onPress={() => setAnchor((a) => shiftAnchor(periodMode, a, -1))} style={[s.stepBtn, { backgroundColor: c.surface, borderColor: c.border }]} activeOpacity={0.75}>
                    <Ionicons name="chevron-back" size={18} color={c.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAnchor(today)} activeOpacity={0.8} style={{ alignItems: 'center' }}>
                    <Text style={[s.periodLabel, { color: c.textPrimary }]}>{periodLabel(periodMode, anchor, today)}</Text>
                    {periodMode === 'day' && anchor !== today && <Text style={{ color: c.primary, fontSize: 11, fontWeight: '700' }}>Back to today</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setAnchor((a) => shiftAnchor(periodMode, a, 1))}
                    disabled={!canGoNext(periodMode, anchor, today)}
                    style={[s.stepBtn, { backgroundColor: c.surface, borderColor: c.border, opacity: canGoNext(periodMode, anchor, today) ? 1 : 0.35 }]}
                    activeOpacity={0.75}
                >
                    <Ionicons name="chevron-forward" size={18} color={c.textPrimary} />
                </TouchableOpacity>
            </View>

            {ready && (
                <>
                    {/* summary */}
                    <View style={s.tiles}>
                        {singleDay ? (
                            <>
                                <Tile theme={theme} label="Present" value={summary.presentEmployees} sub={`of ${summary.totalEmployees}`} />
                                <Tile theme={theme} label="Absent" value={summary.absent} />
                                <Tile theme={theme} label="Working now" value={summary.working} />
                                <Tile theme={theme} label="Total hours" value={fmtDuration(summary.totalMinutes)} />
                            </>
                        ) : (
                            <>
                                <Tile theme={theme} label="Employees present" value={summary.presentEmployees} />
                                <Tile theme={theme} label="Total hours" value={fmtDuration(summary.totalMinutes)} />
                                <Tile theme={theme} label="Avg hours / day" value={summary.avgMinutes ? fmtDuration(summary.avgMinutes) : '--'} />
                                <Tile theme={theme} label="No sign-out" value={summary.missed} />
                            </>
                        )}
                    </View>

                    {/* search */}
                    <View style={[s.search, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Ionicons name="search-outline" size={18} color={c.textMuted} />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search name, role or phone"
                            placeholderTextColor={c.textMuted}
                            style={[s.searchInput, { color: c.textPrimary }]}
                            autoCorrect={false}
                            returnKeyType="search"
                        />
                        {!!search && (
                            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close-circle" size={18} color={c.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* filters */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                        {statusChips.map((f) => (
                            <Chip key={f.key} theme={theme} label={f.label} count={counts[f.key]} active={status === f.key} onPress={() => setStatus(f.key)} />
                        ))}
                    </ScrollView>
                    {positions.length > 1 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                            <Chip theme={theme} label="All roles" active={position === 'all'} onPress={() => setPosition('all')} />
                            {positions.map((p) => (
                                <Chip key={p} theme={theme} label={titleCase(p)} active={position === p} onPress={() => setPosition(p)} />
                            ))}
                        </ScrollView>
                    )}

                    {/* view + sort */}
                    <View style={s.toolbar}>
                        {!singleDay ? (
                            <View style={[s.segment, { backgroundColor: c.surface, borderColor: c.border, flex: 0 }]}>
                                {[{ key: 'employees', label: 'By employee', icon: 'people-outline' }, { key: 'records', label: 'Daily records', icon: 'list-outline' }].map((v) => (
                                    <TouchableOpacity
                                        key={v.key}
                                        onPress={() => setViewMode(v.key)}
                                        activeOpacity={0.8}
                                        style={[s.segmentBtn, { paddingHorizontal: 12, flexDirection: 'row', gap: 5 }, view === v.key && { backgroundColor: c.primary }]}
                                    >
                                        <Ionicons name={v.icon} size={14} color={view === v.key ? '#1a1a1a' : c.textSecondary} />
                                        <Text style={[s.segmentText, { color: view === v.key ? '#1a1a1a' : c.textSecondary }]}>{v.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <Text style={[s.sub, { color: c.textMuted }]}>{listData.length} of {rows.length}</Text>
                        )}
                        <TouchableOpacity onPress={() => setSortOpen(true)} activeOpacity={0.8} style={[s.sortBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
                            <Ionicons name="swap-vertical-outline" size={16} color={c.primary} />
                            <Text style={[s.sortText, { color: c.textPrimary }]} numberOfLines={1}>{sortLabel}</Text>
                        </TouchableOpacity>
                    </View>
                    {!singleDay && <Text style={[s.sub, { color: c.textMuted }]}>Showing {listData.length} of {view === 'records' ? rows.length : new Set(rows.map((r) => r.employeeId)).size}</Text>}
                </>
            )}
        </View>
    );

    const emptyText = rows.length === 0 ? 'No attendance recorded in this period.' : 'No one matches these filters.';

    return (
        <TabScreenWrapper greeting="Employee Attendance" showMenuIcon showBookingIcon={false}>
            <FlatList
                style={{ flex: 1, backgroundColor: c.background }}
                contentContainerStyle={s.listContent}
                data={ready ? listData : EMPTY}
                keyExtractor={(item) => (view === 'records' ? item._id : item.employeeId)}
                ListHeaderComponent={header}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                windowSize={7}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}
                renderItem={({ item }) =>
                    view === 'records' ? (
                        <RecordCard row={item} theme={theme} nowMs={nowMs} showDate={!singleDay} onPress={() => setDetail({ kind: 'row', data: item })} />
                    ) : (
                        <EmployeeCard group={item} theme={theme} showAbsent={singleDay} onPress={() => setDetail({ kind: 'group', data: item })} />
                    )
                }
                ListEmptyComponent={
                    loading || !ready ? (
                        error ? (
                            <View style={s.center}>
                                <Ionicons name="cloud-offline-outline" size={44} color={c.textMuted} />
                                <Text style={[s.emptyText, { color: c.textSecondary }]}>{error}</Text>
                                <TouchableOpacity onPress={() => load(false)} style={[s.retryBtn, { backgroundColor: c.primary }]} activeOpacity={0.85}>
                                    <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Try again</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={s.center}><ActivityIndicator size="large" color={c.primary} /></View>
                        )
                    ) : (
                        <View style={s.center}>
                            <Ionicons name="calendar-outline" size={44} color={c.textMuted} />
                            <Text style={[s.emptyText, { color: c.textMuted }]}>{emptyText}</Text>
                        </View>
                    )
                }
            />

            <SortSheet visible={sortOpen} options={sortOptions} value={sortKeyEff} theme={theme} onPick={pickSort} onClose={() => setSortOpen(false)} />
            <DetailSheet item={detail} theme={theme} nowMs={nowMs} onClose={() => setDetail(null)} />
        </TabScreenWrapper>
    );
}

const s = StyleSheet.create({
    header: { gap: 12, paddingBottom: 6 },
    listContent: { padding: 16, paddingBottom: 120, gap: 12 },
    segment: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 3 },
    segmentBtn: { flex: 1, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    segmentText: { fontSize: 13, fontWeight: '800' },
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    periodLabel: { fontSize: 16, fontWeight: '800' },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: { width: '48%', flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 12, gap: 2 },
    tileValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    tileLabel: { fontSize: 12, fontWeight: '600' },
    tileSub: { fontSize: 11, fontWeight: '600' },
    search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12 },
    searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
    chips: { gap: 8, paddingRight: 8 },
    chip: { height: 34, borderRadius: 17, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
    chipText: { fontSize: 12.5, fontWeight: '700' },
    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, maxWidth: '58%', marginLeft: 'auto' },
    sortText: { fontSize: 12.5, fontWeight: '700', flexShrink: 1 },
    card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    name: { fontSize: 15, fontWeight: '800' },
    sub: { fontSize: 12, fontWeight: '600', marginTop: 1 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
    pillText: { fontSize: 11, fontWeight: '800' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    times: { fontSize: 14, fontWeight: '700', flex: 1 },
    hours: { fontSize: 14, fontWeight: '800' },
    line: { fontSize: 12.5, fontWeight: '500' },
    stats: { flexDirection: 'row', alignItems: 'center' },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    statValue: { fontSize: 15, fontWeight: '800' },
    statLabel: { fontSize: 11, fontWeight: '600' },
    statDivider: { width: StyleSheet.hairlineWidth, height: 28 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
    emptyText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
    retryBtn: { marginTop: 6, paddingHorizontal: 22, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { maxHeight: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, padding: 18, paddingBottom: 12 },
    grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
    sheetName: { fontSize: 17, fontWeight: '800' },
    sheetDate: { fontSize: 15, fontWeight: '800', flex: 1 },
    stampRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    stampLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
    stampTime: { fontSize: 17, fontWeight: '800', marginTop: 1 },
    stampAddr: { fontSize: 12.5, lineHeight: 17, marginTop: 2 },
    mockRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    mapBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    worked: { borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    sortRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
