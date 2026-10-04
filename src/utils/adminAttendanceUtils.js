// src/utils/adminAttendanceUtils.js
//
// Pure helpers behind the admin "Employee Attendance" screen: choosing the period,
// filtering, sorting and the per-employee roll-up. No React, no network — unit-testable.
import { shiftMonth } from './attendanceUtils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ── period (Day / Week / Month) ──────────────────────────────────────────────
const toUtc = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const toKey = (dt) => dt.toISOString().slice(0, 10);

export const addDays = (key, n) => { const dt = toUtc(key); dt.setUTCDate(dt.getUTCDate() + n); return toKey(dt); };
export const weekStart = (key) => addDays(key, -((toUtc(key).getUTCDay() + 6) % 7));    // Monday
const monthFirst = (key) => `${key.slice(0, 7)}-01`;
const monthLast = (key) => { const dt = toUtc(monthFirst(key)); dt.setUTCMonth(dt.getUTCMonth() + 1, 0); return toKey(dt); };

export const periodStart = (mode, anchor) => (mode === 'week' ? weekStart(anchor) : mode === 'month' ? monthFirst(anchor) : anchor);

/** The {from, to} to ask the server for. A running week/month ends today. */
export function periodRange(mode, anchor, today) {
    const from = periodStart(mode, anchor);
    const end = mode === 'week' ? addDays(from, 6) : mode === 'month' ? monthLast(anchor) : anchor;
    return { from, to: end > today ? today : end };
}

export function shiftAnchor(mode, anchor, dir) {
    if (mode === 'week') return addDays(anchor, 7 * dir);
    if (mode === 'month') return `${shiftMonth(anchor.slice(0, 7), dir)}-01`;
    return addDays(anchor, dir);
}

export const canGoNext = (mode, anchor, today) => periodStart(mode, shiftAnchor(mode, anchor, 1)) <= today;

export const fmtDateKey = (key, withYear = true) => {
    const dt = toUtc(key);
    return `${DAYS[dt.getUTCDay()]}, ${String(dt.getUTCDate()).padStart(2, '0')} ${MONTHS[dt.getUTCMonth()]}${withYear ? ` ${dt.getUTCFullYear()}` : ''}`;
};

export function periodLabel(mode, anchor, today) {
    if (mode === 'month') { const dt = toUtc(anchor); return `${MONTHS_LONG[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`; }
    if (mode === 'week') {
        const s = toUtc(weekStart(anchor));
        const e = toUtc(addDays(weekStart(anchor), 6));
        const part = (d) => `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]}`;
        return `${part(s)} – ${part(e)}, ${e.getUTCFullYear()}`;
    }
    if (anchor === today) return 'Today';
    if (anchor === addDays(today, -1)) return 'Yesterday';
    return fmtDateKey(anchor);
}

// ── rows ─────────────────────────────────────────────────────────────────────
export const STATUS_META = {
    working: { label: 'Working', icon: 'time-outline' },
    on_break: { label: 'On break', icon: 'cafe-outline' },
    completed: { label: 'Completed', icon: 'checkmark-done-outline' },
    missed_signout: { label: 'No sign-out', icon: 'alert-circle-outline' },
    absent: { label: 'Absent', icon: 'close-circle-outline' },
};

export const STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'present', label: 'Present' },
    { key: 'working', label: 'Working' },
    { key: 'on_break', label: 'On break' },
    { key: 'completed', label: 'Completed' },
    { key: 'missed_signout', label: 'No sign-out' },
    { key: 'absent', label: 'Absent' },
];

export const RECORD_SORTS = [
    { key: 'name_asc', label: 'Name (A → Z)' },
    { key: 'name_desc', label: 'Name (Z → A)' },
    { key: 'in_early', label: 'Check-in: earliest first' },
    { key: 'in_late', label: 'Check-in: latest first' },
    { key: 'hours_desc', label: 'Working hours: most first' },
    { key: 'hours_asc', label: 'Working hours: least first' },
    { key: 'date_desc', label: 'Date: newest first' },
    { key: 'date_asc', label: 'Date: oldest first' },
];

export const EMPLOYEE_SORTS = [
    { key: 'name_asc', label: 'Name (A → Z)' },
    { key: 'name_desc', label: 'Name (Z → A)' },
    { key: 'hours_desc', label: 'Total hours: most first' },
    { key: 'hours_asc', label: 'Total hours: least first' },
    { key: 'days_desc', label: 'Days present: most first' },
    { key: 'days_asc', label: 'Days present: least first' },
    { key: 'avg_desc', label: 'Avg hours/day: most first' },
    { key: 'avg_asc', label: 'Avg hours/day: least first' },
];

/**
 * Working hours for a row (breaks are NOT counted).
 *  - "working"  keeps growing until they sign out: time since check-in minus finished breaks
 *  - "on_break" is paused — the server already froze it at the moment the break began
 */
export const rowMinutes = (row, nowMs = Date.now()) =>
    row.status === 'working' && row.checkIn?.at
        ? Math.max(0, Math.floor((nowMs - new Date(row.checkIn.at).getTime()) / 60000) - (row.breakMinutes || 0))
        : row.minutes || 0;

/** Total break time for a row; a running break keeps counting. */
export const rowBreakMinutes = (row, nowMs = Date.now()) =>
    (row.breakMinutes || 0) +
    (row.status === 'on_break' && row.onBreakSince
        ? Math.max(0, Math.floor((nowMs - new Date(row.onBreakSince).getTime()) / 60000))
        : 0);

export const positionsOf = (rows) =>
    [...new Set(rows.map((r) => r.position).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const matchesStatus = (row, status) =>
    status === 'all' ? true : status === 'present' ? row.status !== 'absent' : row.status === status;

const matchesSearch = (row, q) => {
    const text = q.trim().toLowerCase();
    if (!text) return true;
    const digits = text.replace(/\D/g, '');
    return (
        row.name.toLowerCase().includes(text) ||
        String(row.position || '').toLowerCase().includes(text) ||
        (digits.length >= 3 && String(row.phone || '').replace(/\D/g, '').includes(digits))
    );
};

/** Position + search first (these also drive the status counts), then status. */
export function filterRows(rows, { status = 'all', position = 'all', search = '' } = {}) {
    return rows.filter(
        (r) => (position === 'all' || r.position === position) && matchesSearch(r, search) && matchesStatus(r, status)
    );
}

export function statusCounts(rows, { position = 'all', search = '' } = {}) {
    const base = filterRows(rows, { position, search });
    const counts = {};
    for (const f of STATUS_FILTERS) counts[f.key] = base.filter((r) => matchesStatus(r, f.key)).length;
    return counts;
}

const byName = (a, b) => a.name.localeCompare(b.name);
const inAt = (r) => (r.checkIn?.at ? new Date(r.checkIn.at).getTime() : null);

// Rows with no value for the chosen sort (e.g. absent when sorting by check-in) always go last.
function withEmptyLast(getValue, dir) {
    return (a, b) => {
        const x = getValue(a), y = getValue(b);
        if (x == null && y == null) return byName(a, b);
        if (x == null) return 1;
        if (y == null) return -1;
        return x === y ? byName(a, b) : dir * (x - y);
    };
}

export function sortRows(rows, key, nowMs = Date.now()) {
    const list = [...rows];
    const minutes = (r) => (r.status === 'absent' ? null : rowMinutes(r, nowMs));
    switch (key) {
        case 'name_desc': return list.sort((a, b) => byName(b, a) || b.date.localeCompare(a.date));
        case 'in_early': return list.sort(withEmptyLast(inAt, 1));
        case 'in_late': return list.sort(withEmptyLast(inAt, -1));
        case 'hours_desc': return list.sort(withEmptyLast(minutes, -1));
        case 'hours_asc': return list.sort(withEmptyLast(minutes, 1));
        case 'date_desc': return list.sort((a, b) => b.date.localeCompare(a.date) || byName(a, b));
        case 'date_asc': return list.sort((a, b) => a.date.localeCompare(b.date) || byName(a, b));
        case 'name_asc':
        default: return list.sort((a, b) => byName(a, b) || b.date.localeCompare(a.date));
    }
}

// ── per-employee roll-up ─────────────────────────────────────────────────────
export function groupByEmployee(rows, nowMs = Date.now()) {
    const map = new Map();
    for (const r of rows) {
        let g = map.get(r.employeeId);
        if (!g) {
            g = {
                employeeId: r.employeeId, name: r.name, position: r.position, phone: r.phone, profileImage: r.profileImage,
                days: 0, totalMinutes: 0, completedDays: 0, completedMinutes: 0, missedSignOut: 0, working: false, onBreak: false, lastDate: null, rows: [],
            };
            map.set(r.employeeId, g);
        }
        g.rows.push(r);
        if (r.status === 'absent') continue;
        const m = rowMinutes(r, nowMs);
        g.days += 1;
        g.totalMinutes += m;
        if (r.status === 'completed') { g.completedDays += 1; g.completedMinutes += m; }
        if (r.status === 'missed_signout') g.missedSignOut += 1;
        if (r.status === 'working') g.working = true;
        if (r.status === 'on_break') g.onBreak = true;
        if (!g.lastDate || r.date > g.lastDate) g.lastDate = r.date;
    }
    return [...map.values()].map((g) => ({
        ...g,
        avgMinutes: g.completedDays ? Math.round(g.completedMinutes / g.completedDays) : 0,
        status: g.days === 0 ? 'absent' : g.working ? 'working' : g.onBreak ? 'on_break' : 'present',
        rows: sortRows(g.rows, 'date_desc', nowMs),
    }));
}

export function sortEmployees(list, key) {
    const out = [...list];
    const num = (getter, dir) => (a, b) => (getter(a) === getter(b) ? byName(a, b) : dir * (getter(a) - getter(b)));
    switch (key) {
        case 'name_desc': return out.sort((a, b) => byName(b, a));
        case 'hours_desc': return out.sort(num((g) => g.totalMinutes, -1));
        case 'hours_asc': return out.sort(num((g) => g.totalMinutes, 1));
        case 'days_desc': return out.sort(num((g) => g.days, -1));
        case 'days_asc': return out.sort(num((g) => g.days, 1));
        case 'avg_desc': return out.sort(num((g) => g.avgMinutes, -1));
        case 'avg_asc': return out.sort(num((g) => g.avgMinutes, 1));
        case 'name_asc':
        default: return out.sort(byName);
    }
}
