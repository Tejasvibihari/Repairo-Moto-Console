// src/screens/admin/staff/StaffOverviewScreen.js
//
// Admin → "Staff Overview": how each employee is doing in a Day / Week / Month.
//   Mechanic   → attendance · km travelled · trips · completed orders · rating
//   Delivery   → attendance · km travelled · trips · completed orders
//   Telecaller → attendance · leads · converted · follow-ups · not reachable
// Tap a person for the day-by-day breakdown (and, for mechanics / delivery, every trip).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
    Modal, StyleSheet, TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import { staffOverviewService } from '../../../services/staffOverviewService';
import { fmtDuration, todayKey } from '../../../utils/attendanceUtils';
import { canGoNext, periodLabel, periodRange, shiftAnchor } from '../../../utils/adminAttendanceUtils';

const ROLES = [
    { key: 'mechanic', label: 'Mechanics', icon: 'build-outline' },
    { key: 'delivery', label: 'Delivery', icon: 'bicycle-outline' },
    { key: 'telecaller', label: 'Telecallers', icon: 'call-outline' },
];
const PERIODS = [
    { key: 'day', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
];
const km = (n) => `${Number(n || 0).toFixed(1)} km`;
const dayShort = (key) => {
    const d = new Date(`${key}T12:00:00Z`);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });
};
const clock = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—');

// ── small pieces ──────────────────────────────────────────────────────────────
const Stat = ({ icon, value, label, color, c }) => (
    <View style={[st.stat, { backgroundColor: c.background, borderColor: c.border }]}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[st.statVal, { color: c.textPrimary }]} numberOfLines={1}>{value}</Text>
        <Text style={[st.statLbl, { color: c.textMuted }]} numberOfLines={1}>{label}</Text>
    </View>
);

const StatsFor = ({ row, c }) => {
    const a = row.attendance || {};
    const att = <Stat key="a" icon="calendar-outline" color="#3B82F6" value={`${a.daysPresent || 0} days`} label={`${fmtDuration(a.totalMinutes || 0)} worked`} c={c} />;
    if (row.position === 'telecaller') {
        const l = row.leads || {};
        return (
            <View style={st.statRow}>
                {att}
                <Stat icon="people-outline" color="#E2A731" value={l.total || 0} label="Leads" c={c} />
                <Stat icon="checkmark-done-outline" color="#2ECC9A" value={`${l.converted || 0} (${l.conversionPct || 0}%)`} label="Converted" c={c} />
                <Stat icon="time-outline" color="#8B5CF6" value={l.followUp || 0} label="Follow-ups" c={c} />
                <Stat icon="call-outline" color="#E67E22" value={l.notReachable || 0} label="Not reachable" c={c} />
            </View>
        );
    }
    const d = row.distance || {};
    const o = row.orders || {};
    return (
        <View style={st.statRow}>
            {att}
            <Stat icon="speedometer-outline" color="#E2A731" value={km(d.km)} label={`${d.trips || 0} trips`} c={c} />
            <Stat icon="checkmark-done-outline" color="#2ECC9A" value={o.completed || 0} label="Orders done" c={c} />
            {o.openNow > 0 && <Stat icon="hourglass-outline" color="#3B82F6" value={o.openNow} label="Open now" c={c} />}
            {row.position === 'mechanic' && row.rating?.count > 0 && (
                <Stat icon="star" color="#F59E0B" value={row.rating.average.toFixed(1)} label={`${row.rating.count} ratings`} c={c} />
            )}
        </View>
    );
};

// ── detail modal ──────────────────────────────────────────────────────────────
const DetailModal = ({ id, from, to, onClose, c }) => {
    const [data, setData] = useState(null);
    const [err, setErr] = useState('');
    useEffect(() => {
        let alive = true;
        setData(null); setErr('');
        if (!id) return undefined;
        staffOverviewService.detail(id, from, to)
            .then((d) => alive && setData(d))
            .catch((e) => alive && setErr(e?.response?.data?.message || 'Could not load.'));
        return () => { alive = false; };
    }, [id, from, to]);

    const pos = data?.employee?.position;
    const isTele = pos === 'telecaller';
    const hasTrips = pos === 'mechanic' || pos === 'delivery';

    return (
        <Modal visible={!!id} animationType="slide" onRequestClose={onClose}>
            <View style={[st.modal, { backgroundColor: c.background }]}>
                <View style={[st.mHead, { borderBottomColor: c.border }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={[st.mName, { color: c.textPrimary }]} numberOfLines={1}>{data?.employee?.name || 'Loading…'}</Text>
                        <Text style={[st.mSub, { color: c.textMuted }]}>{pos} · {from === to ? dayShort(from) : `${dayShort(from)} – ${dayShort(to)}`}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={12}><Ionicons name="close" size={24} color={c.textPrimary} /></TouchableOpacity>
                </View>
                {!data && !err && <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />}
                {!!err && <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: 40 }}>{err}</Text>}
                {!!data && (
                    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                        <StatsFor row={{ ...data.employee, ...data.metrics }} c={c} />

                        <Text style={[st.sec, { color: c.textMuted }]}>DAY BY DAY</Text>
                        {data.days.map((d) => {
                            const a = d.attendance;
                            const idle = !a && !d.km && !d.completed && !d.leads;
                            return (
                                <View key={d.date} style={[st.dayRow, { backgroundColor: c.surface, borderColor: c.border, opacity: idle ? 0.55 : 1 }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[st.dayName, { color: c.textPrimary }]}>{dayShort(d.date)}</Text>
                                        <Text style={[st.daySub, { color: c.textMuted }]}>
                                            {a ? `${clock(a.checkIn)} → ${a.checkOut ? clock(a.checkOut) : a.status === 'working' ? 'working' : 'no sign-out'}${a.minutes ? ` · ${fmtDuration(a.minutes)}` : ''}` : 'Absent / not marked'}
                                        </Text>
                                    </View>
                                    {hasTrips && (
                                        <View style={st.dayNums}>
                                            <Text style={[st.dayBig, { color: '#E2A731' }]}>{km(d.km)}</Text>
                                            <Text style={[st.daySub, { color: c.textMuted }]}>{d.completed} done</Text>
                                        </View>
                                    )}
                                    {isTele && (
                                        <View style={st.dayNums}>
                                            <Text style={[st.dayBig, { color: '#E2A731' }]}>{d.leads} leads</Text>
                                            <Text style={[st.daySub, { color: c.textMuted }]}>{d.converted} converted</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        {hasTrips && data.trips.length > 0 && (
                            <>
                                <Text style={[st.sec, { color: c.textMuted, marginTop: 18 }]}>TRIPS</Text>
                                {data.trips.map((t) => (
                                    <View key={t.id} style={[st.dayRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[st.dayName, { color: c.textPrimary }]}>#{t.orderRef || t.orderId.slice(-6)}</Text>
                                            <Text style={[st.daySub, { color: c.textMuted }]}>
                                                {dayShort(t.date)} · {clock(t.startedAt)} → {t.endedAt ? clock(t.endedAt) : 'in progress'}
                                            </Text>
                                            <Text style={[st.daySub, { color: c.textMuted }]}>{km(t.outboundKm)} out · {km(t.returnKm)} back</Text>
                                            {t.flags.length > 0 && <Text style={{ color: '#E67E22', fontSize: 11, fontWeight: '700', marginTop: 2 }}>⚠ {t.flags.join(', ').replace(/_/g, ' ')}</Text>}
                                        </View>
                                        <Text style={[st.dayBig, { color: '#E2A731' }]}>{Number(t.km).toFixed(2)} km</Text>
                                    </View>
                                ))}
                            </>
                        )}
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
};

// ── screen ────────────────────────────────────────────────────────────────────
export default function StaffOverviewScreen() {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const c = (mode === 'dark' ? DarkTheme : LightTheme).colors;

    const today = todayKey();
    const [role, setRole] = useState('mechanic');
    const [period, setPeriod] = useState('month');
    const [anchor, setAnchor] = useState(today);
    const [search, setSearch] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);

    const { from, to } = useMemo(() => periodRange(period, anchor, today), [period, anchor, today]);

    const load = useCallback(async (isRefresh = false) => {
        isRefresh ? setRefreshing(true) : setLoading(true);
        setError('');
        try { setData(await staffOverviewService.list(role, from, to)); }
        catch (e) { setError(e?.response?.data?.message || 'Could not load the overview.'); setData(null); }
        finally { setLoading(false); setRefreshing(false); }
    }, [role, from, to]);

    useEffect(() => { load(); }, [load]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = data?.rows || [];
        const f = q ? list.filter((r) => r.name.toLowerCase().includes(q)) : list;
        // most productive first
        const score = (r) => (r.distance?.km ?? r.leads?.total ?? 0);
        return [...f].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
    }, [data, search]);

    const sum = data?.summary;

    return (
        <TabScreenWrapper showMenuIcon>
            <View style={{ flex: 1 }}>
                {/* role tabs */}
                <View style={st.tabs}>
                    {ROLES.map((r) => {
                        const on = role === r.key;
                        return (
                            <TouchableOpacity key={r.key} onPress={() => setRole(r.key)} activeOpacity={0.8}
                                style={[st.tab, { backgroundColor: on ? c.primary : c.surface, borderColor: on ? c.primary : c.border }]}>
                                <Ionicons name={r.icon} size={14} color={on ? '#1a1a1a' : c.textSecondary} />
                                <Text style={[st.tabTxt, { color: on ? '#1a1a1a' : c.textSecondary }]}>{r.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* period */}
                <View style={st.periodRow}>
                    <View style={[st.seg, { backgroundColor: c.surface, borderColor: c.border }]}>
                        {PERIODS.map((p) => (
                            <TouchableOpacity key={p.key} onPress={() => { setPeriod(p.key); setAnchor(today); }}
                                style={[st.segBtn, period === p.key && { backgroundColor: c.primary }]}>
                                <Text style={[st.segTxt, { color: period === p.key ? '#1a1a1a' : c.textSecondary }]}>{p.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={st.nav}>
                        <TouchableOpacity onPress={() => setAnchor(shiftAnchor(period, anchor, -1))} hitSlop={10}>
                            <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[st.navTxt, { color: c.textPrimary }]} numberOfLines={1}>{periodLabel(period, anchor, today)}</Text>
                        <TouchableOpacity disabled={!canGoNext(period, anchor, today)} onPress={() => setAnchor(shiftAnchor(period, anchor, 1))} hitSlop={10}
                            style={{ opacity: canGoNext(period, anchor, today) ? 1 : 0.3 }}>
                            <Ionicons name="chevron-forward" size={20} color={c.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* summary */}
                {!!sum && (
                    <View style={[st.summary, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <View style={st.sumCell}><Text style={[st.sumVal, { color: c.textPrimary }]}>{sum.present}/{sum.staff}</Text><Text style={[st.sumLbl, { color: c.textMuted }]}>Present</Text></View>
                        {role !== 'telecaller' ? (
                            <>
                                <View style={st.sumCell}><Text style={[st.sumVal, { color: '#E2A731' }]}>{km(sum.totalKm)}</Text><Text style={[st.sumLbl, { color: c.textMuted }]}>Distance</Text></View>
                                <View style={st.sumCell}><Text style={[st.sumVal, { color: c.textPrimary }]}>{sum.completedOrders}</Text><Text style={[st.sumLbl, { color: c.textMuted }]}>Orders done</Text></View>
                            </>
                        ) : (
                            <>
                                <View style={st.sumCell}><Text style={[st.sumVal, { color: '#E2A731' }]}>{sum.leads}</Text><Text style={[st.sumLbl, { color: c.textMuted }]}>Leads</Text></View>
                                <View style={st.sumCell}><Text style={[st.sumVal, { color: c.textPrimary }]}>{sum.converted}</Text><Text style={[st.sumLbl, { color: c.textMuted }]}>Converted</Text></View>
                            </>
                        )}
                    </View>
                )}

                <View style={[st.search, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Ionicons name="search" size={16} color={c.textMuted} />
                    <TextInput value={search} onChangeText={setSearch} placeholder="Search by name" placeholderTextColor={c.textMuted}
                        style={{ flex: 1, color: c.textPrimary, fontSize: 14, paddingVertical: 8 }} />
                </View>

                {loading && !data ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
                ) : (
                    <FlatList
                        data={rows}
                        keyExtractor={(r) => r.id}
                        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 90 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
                        ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: 'center', marginTop: 40 }}>{error || 'No employees found.'}</Text>}
                        renderItem={({ item }) => (
                            <TouchableOpacity activeOpacity={0.85} onPress={() => setOpenId(item.id)}
                                style={[st.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                                <View style={st.cardHead}>
                                    <View style={[st.avatar, { backgroundColor: `${c.primary}33` }]}>
                                        <Text style={{ color: c.primary, fontWeight: '900' }}>{item.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[st.name, { color: c.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                                        <Text style={[st.pos, { color: c.textMuted }]}>{item.position}{item.attendance.missedSignOut ? ` · ${item.attendance.missedSignOut} missed sign-out` : ''}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                                </View>
                                <StatsFor row={item} c={c} />
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
            <DetailModal id={openId} from={from} to={to} onClose={() => setOpenId(null)} c={c} />
        </TabScreenWrapper>
    );
}

const st = StyleSheet.create({
    tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    tabTxt: { fontSize: 12.5, fontWeight: '800' },
    periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
    seg: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
    segBtn: { paddingHorizontal: 12, paddingVertical: 7 },
    segTxt: { fontSize: 12, fontWeight: '800' },
    nav: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    navTxt: { fontSize: 12.5, fontWeight: '800', maxWidth: 140 },
    summary: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 14, borderWidth: 1, paddingVertical: 12 },
    sumCell: { flex: 1, alignItems: 'center' },
    sumVal: { fontSize: 17, fontWeight: '900' },
    sumLbl: { fontSize: 10.5, fontWeight: '700', marginTop: 2 },
    search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
    card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 15, fontWeight: '800' },
    pos: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
    statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    stat: { minWidth: 92, flexGrow: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10, gap: 2 },
    statVal: { fontSize: 14, fontWeight: '900' },
    statLbl: { fontSize: 10, fontWeight: '700' },
    modal: { flex: 1 },
    mHead: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 20, borderBottomWidth: 1, gap: 10 },
    mName: { fontSize: 18, fontWeight: '900' },
    mSub: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize', marginTop: 2 },
    sec: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginTop: 16, marginBottom: 8 },
    dayRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 10 },
    dayName: { fontSize: 13.5, fontWeight: '800' },
    daySub: { fontSize: 11, fontWeight: '600', marginTop: 1 },
    dayNums: { alignItems: 'flex-end' },
    dayBig: { fontSize: 14, fontWeight: '900' },
});
