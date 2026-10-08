// src/components/employee/dashboard/DashboardWidgets.js
//
// Building blocks for the employee dashboards: attendance summary, distance summary,
// 7-day chart, order rows. They only draw what the server sends (Utils/employeeStats.js) —
// no numbers are calculated here, so every dashboard shows the same figures.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dayParts, fmtDate, fmtDuration, fmtTime } from '../../../utils/attendanceUtils';

export const fmtKm = (km) => `${(Number(km) || 0).toFixed(1)} km`;

// ── Attendance state → label / colour ────────────────────────────────────────
export const ATTENDANCE_STATE = {
    not_marked: { label: 'Not marked', color: '#FF6B6B', icon: 'alert-circle-outline' },
    checked_in: { label: 'Working', color: '#2ECC9A', icon: 'checkmark-circle-outline' },
    on_break: { label: 'On break', color: '#e2a731', icon: 'cafe-outline' },
    checked_out: { label: 'Signed out', color: '#3B82F6', icon: 'log-out-outline' },
};

const STATUS_COLOR = {
    'Pending': '#F59E0B',
    'Mechanic Assigned': '#8B5CF6',
    'Mechanic Start': '#3B82F6',
    'Mechanic Arrived': '#3B82F6',
    'In Progress': '#3B82F6',
    'Completion Requested': '#e2a731',
    'Work Completed': '#2ECC9A',
    'Invoice Generated': '#e2a731',
    'Completed': '#2ECC9A',
    'Cancelled': '#FF6B6B',
};

const PHASE_LABEL = {
    to_customer: 'On the way to customer',
    at_customer: 'At the customer',
    to_hub: 'Returning to hub',
};

// ── Shell ────────────────────────────────────────────────────────────────────
export function Card({ theme, children, style }) {
    return (
        <View style={[w.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadow.soft }, style]}>
            {children}
        </View>
    );
}

export function Chip({ icon, text, color, theme }) {
    const tint = color || theme.colors.textSecondary;
    return (
        <View style={[w.chip, { backgroundColor: `${tint}18`, borderColor: `${tint}30` }]}>
            {icon ? <Ionicons name={icon} size={13} color={tint} /> : null}
            <Text style={[w.chipText, { color: tint }]}>{text}</Text>
        </View>
    );
}

function Metric({ label, value, sub, theme, color }) {
    return (
        <View style={w.metric}>
            <Text style={[w.metricValue, { color: color || theme.colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            <Text style={[w.metricLabel, { color: theme.colors.textMuted }]} numberOfLines={1}>{label}</Text>
            {sub ? <Text style={[w.metricSub, { color: theme.colors.textMuted }]} numberOfLines={1}>{sub}</Text> : null}
        </View>
    );
}

// ── Attendance ───────────────────────────────────────────────────────────────
export function AttendanceSummary({ attendance, theme }) {
    if (!attendance) return null;
    const c = theme.colors;
    const t = attendance.today || {};
    const m = attendance.month || {};
    const meta = ATTENDANCE_STATE[t.state] || ATTENDANCE_STATE.not_marked;

    return (
        <Card theme={theme}>
            <View style={w.headRow}>
                <View style={[w.pill, { backgroundColor: `${meta.color}18` }]}>
                    <Ionicons name={meta.icon} size={14} color={meta.color} />
                    <Text style={[w.pillText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={[w.headNote, { color: c.textMuted }]}>
                    {t.checkInAt
                        ? `In ${fmtTime(t.checkInAt)}${t.checkOutAt ? `  ·  Out ${fmtTime(t.checkOutAt)}` : ''}`
                        : 'Today'}
                </Text>
            </View>

            <View style={w.metricsRow}>
                <Metric label="Worked today" value={fmtDuration(t.workedMinutes)} theme={theme} />
                <Metric label="Break today" value={fmtDuration(t.breakMinutes)} sub={t.breakCount ? `${t.breakCount} break${t.breakCount === 1 ? '' : 's'}` : null} theme={theme} />
            </View>

            <View style={[w.divider, { backgroundColor: c.border }]} />

            <Text style={[w.subTitle, { color: c.textSecondary }]}>This month</Text>
            <View style={w.metricsRow}>
                <Metric label="Days present" value={`${m.presentDays ?? 0}`} sub={`of ${m.daysElapsed ?? 0} days`} theme={theme} />
                <Metric label="Total hours" value={fmtDuration(m.totalMinutes)} theme={theme} />
                <Metric label="Avg / day" value={fmtDuration(m.avgMinutes)} theme={theme} />
            </View>
            {m.missedSignOut > 0 ? (
                <View style={{ marginTop: 10 }}>
                    <Chip icon="warning-outline" color="#FF6B6B" theme={theme}
                        text={`${m.missedSignOut} day${m.missedSignOut === 1 ? '' : 's'} without sign-out`} />
                </View>
            ) : null}
        </Card>
    );
}

// ── Distance (mechanic / delivery) ───────────────────────────────────────────
export function DistanceSummary({ distance, theme }) {
    if (!distance) return null;
    const c = theme.colors;
    const out = distance.outboundKm || 0;
    const back = distance.returnKm || 0;
    const sum = out + back;
    const trip = distance.openTrip;

    return (
        <Card theme={theme}>
            {trip ? (
                <View style={[w.banner, { backgroundColor: '#3B82F618', borderColor: '#3B82F630' }]}>
                    <Ionicons name="navigate" size={16} color="#3B82F6" />
                    <Text style={[w.bannerText, { color: c.textPrimary }]} numberOfLines={2}>
                        {PHASE_LABEL[trip.phase] || 'Trip in progress'}
                        {trip.orderRef ? ` · ${trip.orderRef}` : ''} · {fmtKm(trip.km)}
                    </Text>
                </View>
            ) : null}

            <View style={w.bigRow}>
                <Text style={[w.bigValue, { color: c.textPrimary }]}>{(distance.monthKm || 0).toFixed(1)}</Text>
                <Text style={[w.bigUnit, { color: c.textMuted }]}>km this month</Text>
            </View>

            <View style={w.metricsRow}>
                <Metric label="Today" value={fmtKm(distance.todayKm)} sub={`${distance.todayTrips || 0} trip${distance.todayTrips === 1 ? '' : 's'}`} theme={theme} />
                <Metric label="Trips" value={`${distance.monthTrips || 0}`} sub="this month" theme={theme} />
                <Metric label="Avg / trip" value={fmtKm(distance.avgKmPerTrip)} theme={theme} />
            </View>

            {sum > 0 ? (
                <View style={{ marginTop: 14 }}>
                    <View style={[w.split, { backgroundColor: c.surfaceLow }]}>
                        <View style={{ flex: out, backgroundColor: c.primary }} />
                        <View style={{ flex: back, backgroundColor: '#3B82F6' }} />
                    </View>
                    <View style={w.splitLegend}>
                        <Text style={[w.legendText, { color: c.textMuted }]}>
                            <Text style={{ color: c.primary }}>●</Text> To customer {fmtKm(out)}
                        </Text>
                        <Text style={[w.legendText, { color: c.textMuted }]}>
                            <Text style={{ color: '#3B82F6' }}>●</Text> Back to hub {fmtKm(back)}
                        </Text>
                    </View>
                </View>
            ) : null}

            {distance.flaggedTrips > 0 ? (
                <View style={{ marginTop: 10 }}>
                    <Chip icon="flag-outline" color="#e2a731" theme={theme}
                        text={`${distance.flaggedTrips} trip${distance.flaggedTrips === 1 ? '' : 's'} flagged for review`} />
                </View>
            ) : null}
        </Card>
    );
}

// ── Last 7 days ──────────────────────────────────────────────────────────────
export function WeekChart({ week, tracked, showJobs = true, theme }) {
    if (!week?.length) return null;
    const c = theme.colors;
    const maxMin = Math.max(480, ...week.map((d) => d.minutes || 0));
    const totalMin = week.reduce((s, d) => s + (d.minutes || 0), 0);
    const totalKm = week.reduce((s, d) => s + (d.km || 0), 0);
    const totalDone = week.reduce((s, d) => s + (d.completed || 0), 0);
    const todayKey = week[week.length - 1].date;

    return (
        <Card theme={theme}>
            <View style={w.weekRow}>
                {week.map((d) => {
                    const h = Math.max(4, Math.round(((d.minutes || 0) / maxMin) * 84));
                    const isToday = d.date === todayKey;
                    return (
                        <View key={d.date} style={w.weekCol}>
                            <Text style={[w.weekTop, { color: c.textMuted }]}>{d.completed ? `${d.completed}✓` : ' '}</Text>
                            <View style={w.barTrack}>
                                <View style={{
                                    height: h,
                                    borderRadius: 6,
                                    backgroundColor: d.minutes ? c.primary : d.present ? `${c.primary}55` : c.surfaceHigh,
                                    borderWidth: isToday ? 1.5 : 0,
                                    borderColor: c.textPrimary,
                                }} />
                            </View>
                            <Text style={[w.weekDay, { color: isToday ? c.textPrimary : c.textSecondary, fontWeight: isToday ? '800' : '600' }]}>
                                {dayParts(d.date).weekday}
                            </Text>
                            <Text style={[w.weekSmall, { color: c.textMuted }]}>{d.minutes ? `${(d.minutes / 60).toFixed(1)}h` : '–'}</Text>
                            {tracked ? <Text style={[w.weekSmall, { color: c.textMuted }]}>{d.km ? `${d.km.toFixed(0)}km` : '–'}</Text> : null}
                        </View>
                    );
                })}
            </View>
            <View style={[w.divider, { backgroundColor: c.border }]} />
            <View style={w.metricsRow}>
                <Metric label="Hours worked" value={fmtDuration(totalMin)} theme={theme} />
                {tracked ? <Metric label="Distance" value={fmtKm(totalKm)} theme={theme} /> : null}
                {showJobs ? <Metric label="Jobs done" value={`${totalDone}`} theme={theme} /> : null}
            </View>
        </Card>
    );
}

// ── Order row ────────────────────────────────────────────────────────────────
export function OrderRow({ order, theme, onPress }) {
    const c = theme.colors;
    const color = STATUS_COLOR[order.status] || c.textMuted;
    const vehicle = [order.selectedBrand, order.modelName || order.selectedModel].filter(Boolean).join(' ');
    const services = (order.services || []).slice(0, 2).join(', ');
    const km = order.travel?.distanceMeters ? order.travel.distanceMeters / 1000 : 0;

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPress?.(order)}
            style={[w.orderRow, { backgroundColor: c.surface, borderColor: c.border }]}
        >
            <View style={[w.orderBar, { backgroundColor: color }]} />
            <View style={{ flex: 1 }}>
                <View style={w.orderTop}>
                    <Text style={[w.orderTitle, { color: c.textPrimary }]} numberOfLines={1}>
                        {order.orderId ? `${order.orderId} · ` : ''}{order.name || 'Customer'}
                    </Text>
                    <View style={[w.statusPill, { backgroundColor: `${color}18` }]}>
                        <Text style={[w.statusText, { color }]} numberOfLines={1}>{order.status}</Text>
                    </View>
                </View>
                {vehicle || services ? (
                    <Text style={[w.orderSub, { color: c.textSecondary }]} numberOfLines={1}>
                        {[vehicle, services].filter(Boolean).join(' · ')}
                    </Text>
                ) : null}
                <Text style={[w.orderSub, { color: c.textMuted }]} numberOfLines={1}>
                    {order.preferredDate ? fmtDate(order.preferredDate) : ''}
                    {order.preferredTime ? ` · ${order.preferredTime}` : ''}
                    {km > 0 ? ` · ${km.toFixed(1)} km travelled` : ''}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
        </TouchableOpacity>
    );
}

export function EmptyNote({ text, theme }) {
    return (
        <View style={[w.empty, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
            <Text style={[w.emptyText, { color: theme.colors.textMuted }]}>{text}</Text>
        </View>
    );
}

const w = StyleSheet.create({
    card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
    chipText: { fontSize: 12, fontWeight: '700' },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    pillText: { fontSize: 12, fontWeight: '800' },
    headNote: { fontSize: 12, fontWeight: '600' },
    metricsRow: { flexDirection: 'row', gap: 12 },
    metric: { flex: 1 },
    metricValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    metricLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
    metricSub: { fontSize: 10, fontWeight: '500', marginTop: 1 },
    divider: { height: 1, marginVertical: 14 },
    subTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
    bannerText: { flex: 1, fontSize: 12, fontWeight: '700' },
    bigRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 },
    bigValue: { fontSize: 36, fontWeight: '800', letterSpacing: -1, lineHeight: 40 },
    bigUnit: { fontSize: 13, fontWeight: '600', paddingBottom: 6 },
    split: { height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
    splitLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    legendText: { fontSize: 11, fontWeight: '600' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
    weekCol: { flex: 1, alignItems: 'center' },
    weekTop: { fontSize: 10, fontWeight: '700', height: 14 },
    barTrack: { height: 88, justifyContent: 'flex-end', width: '60%' },
    weekDay: { fontSize: 11, marginTop: 6 },
    weekSmall: { fontSize: 9, fontWeight: '600', marginTop: 1 },
    orderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingRight: 12, paddingLeft: 0, marginBottom: 8, overflow: 'hidden' },
    orderBar: { width: 4, alignSelf: 'stretch', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    orderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    orderTitle: { flex: 1, fontSize: 13, fontWeight: '700' },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, maxWidth: 130 },
    statusText: { fontSize: 10, fontWeight: '800' },
    orderSub: { fontSize: 12, fontWeight: '500', marginTop: 3 },
    empty: { borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 8 },
    emptyText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
});
