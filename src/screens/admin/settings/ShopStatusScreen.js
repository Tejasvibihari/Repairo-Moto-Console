// src/screens/admin/settings/ShopStatusScreen.js
//
// Admin control for the customer app:
//   1. Shop open/closed switch with a fully customisable message (+ optional auto-reopen)
//   2. Daily service hours — outside them customers can only book Schedule Repair.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Alert,
    RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import { shopStatusService } from '../../../services/adminSettingsService';

// ── Presets (tap to fill the message; everything stays editable) ─────────────
const PRESETS = [
    {
        key: 'diwali', label: '🪔 Diwali', emoji: '🪔', title: 'Happy Diwali!',
        message: 'Wishing you and your family a very Happy Diwali! Our workshop is closed to celebrate the festival of lights with our loved ones. We will be back soon to keep you on the road. Sorry for the inconvenience.',
    },
    {
        key: 'holi', label: '🎨 Holi', emoji: '🎨', title: 'Happy Holi!',
        message: 'Wishing you a colourful and joyful Holi! We are closed today to celebrate with our families and will be back shortly. Sorry for the inconvenience.',
    },
    {
        key: 'eid', label: '🌙 Eid', emoji: '🌙', title: 'Eid Mubarak!',
        message: 'Eid Mubarak to you and your family! We are closed for the celebrations and will be back soon. Thank you for your understanding.',
    },
    {
        key: 'christmas', label: '🎄 Christmas', emoji: '🎄', title: 'Merry Christmas!',
        message: 'Merry Christmas and warm wishes to you and your loved ones! We are closed for the holiday and will be back soon. Sorry for the inconvenience.',
    },
    {
        key: 'newyear', label: '🎉 New Year', emoji: '🎉', title: 'Happy New Year!',
        message: 'Wishing you a safe, happy and prosperous New Year! We are closed to celebrate and will be back soon. Sorry for the inconvenience.',
    },
    {
        key: 'national', label: '🇮🇳 National Day', emoji: '🇮🇳', title: 'Happy Independence Day!',
        message: 'Wishing you a very happy national holiday! Our workshop is closed today and will reopen shortly. Sorry for the inconvenience.',
    },
    {
        key: 'maintenance', label: '🔧 Maintenance', emoji: '🔧', title: 'Under maintenance',
        message: 'We are making some improvements to serve you better. The app is temporarily unavailable — please check back soon. Sorry for the inconvenience.',
    },
    {
        key: 'closed', label: '🙏 Closed today', emoji: '🙏', title: 'Closed today',
        message: 'Sorry for the inconvenience — we are closed today due to an unavoidable reason. We will be back very soon. Thank you for your patience and understanding.',
    },
];

// ── Time / date helpers (all IST) ────────────────────────────────────────────
const IST_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const fmt12 = (t) => {
    if (!/^\d{2}:\d{2}$/.test(t || '')) return '--:--';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const istParts = (date) => {
    const iso = new Date(date.getTime() + IST_MS).toISOString(); // IST wall-clock as ISO
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};

const addDaysIST = (n) => istParts(new Date(Date.now() + n * DAY_MS)).date;

const isValidDateStr = (s) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const toReopenISO = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}:00+05:30`).toISOString();

const fmtReopen = (dateStr, timeStr) => {
    if (!isValidDateStr(dateStr)) return '';
    const d = new Date(toReopenISO(dateStr, timeStr));
    const day = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
    return `${day} · ${fmt12(timeStr)}`;
};

// Server status → editable draft
const toDraft = (st) => {
    const stillClosed = !!st.isClosed; // effective; an auto-lifted closure loads as "open"
    const re = stillClosed && st.reopenAt ? istParts(new Date(st.reopenAt)) : null;
    return {
        isClosed: stillClosed,
        emoji: st.emoji || '',
        title: st.title || '',
        message: st.message || '',
        reopenDate: re ? re.date : '',
        reopenTime: re ? re.time : '10:00',
        hoursEnabled: !!st.serviceHours?.enabled,
        openTime: st.serviceHours?.openTime || '10:00',
        closeTime: st.serviceHours?.closeTime || '17:00',
    };
};

// ── Time picker (no native dependency: hour / minute / AM-PM pills) ──────────
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function TimePickerModal({ visible, value, title, onConfirm, onClose, theme }) {
    const [h12, setH12] = useState(10);
    const [min, setMin] = useState(0);
    const [pm, setPm] = useState(false);

    useEffect(() => {
        if (!visible) return;
        const [h, m] = (value || '10:00').split(':').map(Number);
        setH12(h % 12 === 0 ? 12 : h % 12);
        setMin(m - (m % 5));
        setPm(h >= 12);
    }, [visible, value]);

    const confirm = () => {
        const h24 = (h12 % 12) + (pm ? 12 : 0);
        onConfirm(`${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    };

    const Pill = ({ label, active, onPress, wide }) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[
                tpStyles.pill,
                wide && { flex: 1 },
                {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceLow,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                },
            ]}
        >
            <Text style={{ fontWeight: active ? '800' : '600', color: active ? '#1a1a1a' : theme.colors.textPrimary }}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
            <View style={tpStyles.overlay}>
                <View style={[tpStyles.box, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[tpStyles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
                    <Text style={[tpStyles.big, { color: theme.colors.primary }]}>
                        {h12}:{String(min).padStart(2, '0')} {pm ? 'PM' : 'AM'}
                    </Text>

                    <Text style={[tpStyles.label, { color: theme.colors.textMuted }]}>HOUR</Text>
                    <View style={tpStyles.grid}>
                        {HOURS.map((h) => <Pill key={h} label={String(h)} active={h12 === h} onPress={() => setH12(h)} />)}
                    </View>

                    <Text style={[tpStyles.label, { color: theme.colors.textMuted }]}>MINUTE</Text>
                    <View style={tpStyles.grid}>
                        {MINUTES.map((m) => <Pill key={m} label={String(m).padStart(2, '0')} active={min === m} onPress={() => setMin(m)} />)}
                    </View>

                    <View style={[tpStyles.grid, { marginTop: 12 }]}>
                        <Pill wide label="AM" active={!pm} onPress={() => setPm(false)} />
                        <Pill wide label="PM" active={pm} onPress={() => setPm(true)} />
                    </View>

                    <View style={tpStyles.actions}>
                        <TouchableOpacity onPress={onClose} style={tpStyles.cancel}>
                            <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={confirm} style={[tpStyles.ok, { backgroundColor: theme.colors.primary }]}>
                            <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Set time</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const tpStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    box: { width: '100%', maxWidth: 380, borderRadius: 22, borderWidth: 1, padding: 20 },
    title: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
    big: { fontSize: 34, fontWeight: '900', textAlign: 'center', marginVertical: 8, letterSpacing: -0.5 },
    label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 8, marginBottom: 6 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { minWidth: 48, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancel: { flex: 1, paddingVertical: 13, alignItems: 'center' },
    ok: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 14 },
});

// ── Small building blocks ────────────────────────────────────────────────────
const Card = ({ children, theme, style }) => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, style]}>{children}</View>
);

const Label = ({ children, theme }) => (
    <Text style={[styles.label, { color: theme.colors.textMuted }]}>{children}</Text>
);

const Chip = ({ label, active, onPress, theme }) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[
            styles.chip,
            {
                backgroundColor: active ? theme.colors.primary : theme.colors.surfaceLow,
                borderColor: active ? theme.colors.primary : theme.colors.border,
            },
        ]}
    >
        <Text style={{ fontSize: 12.5, fontWeight: active ? '800' : '600', color: active ? '#1a1a1a' : theme.colors.textPrimary }}>{label}</Text>
    </TouchableOpacity>
);

// What customers will see — mirrors the customer app's closed screen
const Preview = ({ draft, theme, isDark }) => {
    const reopen = draft.reopenDate ? fmtReopen(draft.reopenDate, draft.reopenTime) : '';
    return (
        <View style={[styles.preview, { backgroundColor: isDark ? '#150F08' : '#FFF3D6', borderColor: theme.colors.primary }]}>
            <Text style={styles.previewEmoji}>{draft.emoji || '🛠️'}</Text>
            <Text style={[styles.previewTitle, { color: theme.colors.textPrimary }]}>{draft.title || 'Title'}</Text>
            <Text style={[styles.previewMsg, { color: theme.colors.textSecondary }]}>{draft.message || 'Your message will appear here.'}</Text>
            {!!reopen && (
                <View style={[styles.previewPill, { backgroundColor: `${theme.colors.primary}22` }]}>
                    <Ionicons name="time-outline" size={13} color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Back on {reopen}</Text>
                </View>
            )}
        </View>
    );
};

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function ShopStatusScreen() {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const [server, setServer] = useState(null);       // last status from API
    const [draft, setDraft] = useState(null);
    const [saved, setSaved] = useState(null);         // draft snapshot that matches the server
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);       // { type, text }
    const [picker, setPicker] = useState(null);       // 'open' | 'close' | 'reopen' | null

    const apply = useCallback((st) => {
        const d = toDraft(st);
        setServer(st);
        setDraft(d);
        setSaved(d);
    }, []);

    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            setError(null);
            apply(await shopStatusService.get());
        } catch (e) {
            setError(e?.response?.data?.message || e.message || 'Failed to load shop status');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [apply]);

    useEffect(() => { load(); }, [load]);

    const set = (patch) => { setNotice(null); setDraft((d) => ({ ...d, ...patch })); };

    const dirty = useMemo(() => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

    const validate = () => {
        if (!draft.title.trim()) return 'Please enter a title.';
        if (!draft.message.trim()) return 'Please enter a message for customers.';
        if (draft.hoursEnabled && draft.openTime >= draft.closeTime) return 'Closing time must be after opening time.';
        if (draft.isClosed && draft.reopenDate) {
            if (!isValidDateStr(draft.reopenDate)) return 'Enter the reopen date as YYYY-MM-DD.';
            if (new Date(toReopenISO(draft.reopenDate, draft.reopenTime)) <= new Date()) return 'Reopen time must be in the future.';
        }
        return null;
    };

    const doSave = async () => {
        setSaving(true);
        setNotice(null);
        try {
            const st = await shopStatusService.update({
                isClosed: draft.isClosed,
                title: draft.title.trim(),
                message: draft.message.trim(),
                emoji: draft.emoji.trim(),
                reopenAt: draft.isClosed && draft.reopenDate ? toReopenISO(draft.reopenDate, draft.reopenTime) : null,
                serviceHours: { enabled: draft.hoursEnabled, openTime: draft.openTime, closeTime: draft.closeTime },
            });
            apply(st);
            setNotice({ type: 'success', text: st.isClosed ? 'Saved — the customer app is now closed.' : 'Saved — the customer app is open.' });
        } catch (e) {
            setNotice({ type: 'error', text: e?.response?.data?.message || e.message || 'Save failed' });
        } finally {
            setSaving(false);
        }
    };

    const onSave = () => {
        const problem = validate();
        if (problem) return setNotice({ type: 'error', text: problem });

        // Closing the whole app is high-impact — make the admin confirm it.
        if (draft.isClosed && !server?.isClosed) {
            Alert.alert(
                'Close the customer app?',
                'Customers will not be able to book or use anything until you reopen it' +
                (draft.reopenDate ? ` (or until ${fmtReopen(draft.reopenDate, draft.reopenTime)}).` : '.'),
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Close app', style: 'destructive', onPress: doSave },
                ]
            );
        } else {
            doSave();
        }
    };

    const applyPreset = (p) => set({ emoji: p.emoji, title: p.title, message: p.message });

    const pickTime = (val) => {
        if (picker === 'open') set({ openTime: val });
        else if (picker === 'close') set({ closeTime: val });
        else if (picker === 'reopen') set({ reopenTime: val });
        setPicker(null);
    };

    const quickReopen = [
        { label: 'Manual', days: null },
        { label: 'Tomorrow', days: 1 },
        { label: '2 days', days: 2 },
        { label: '3 days', days: 3 },
        { label: '1 week', days: 7 },
    ];

    // ── states ──
    if (loading && !draft) {
        return (
            <TabScreenWrapper greeting="Shop Status" showMenuIcon>
                <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </TabScreenWrapper>
        );
    }

    if (error && !draft) {
        return (
            <TabScreenWrapper greeting="Shop Status" showMenuIcon>
                <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                    <Ionicons name="cloud-offline-outline" size={44} color={theme.colors.textMuted} />
                    <Text style={[styles.errTitle, { color: theme.colors.textPrimary }]}>Couldn't load shop status</Text>
                    <Text style={{ color: theme.colors.textMuted, textAlign: 'center' }}>{error}</Text>
                    <TouchableOpacity onPress={() => load()} style={[styles.retry, { backgroundColor: theme.colors.primary }]}>
                        <Text style={{ fontWeight: '800', color: '#1a1a1a' }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </TabScreenWrapper>
        );
    }

    const liveClosed = !!server?.isClosed;
    const liveEmergency = !!server?.emergencyAvailable;

    return (
        <TabScreenWrapper greeting="Shop Status" showMenuIcon>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    style={{ flex: 1, backgroundColor: theme.colors.background }}
                    contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 120 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(true); }}
                            tintColor={theme.colors.primary}
                            colors={[theme.colors.primary]}
                        />
                    }
                >
                    {/* ── Live state ── */}
                    <View style={[styles.live, { backgroundColor: liveClosed ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', borderColor: liveClosed ? '#EF4444' : '#10B981' }]}>
                        <View style={[styles.liveDot, { backgroundColor: liveClosed ? '#EF4444' : '#10B981' }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.liveTitle, { color: theme.colors.textPrimary }]}>
                                {liveClosed ? 'Customer app is CLOSED' : 'Customer app is OPEN'}
                            </Text>
                            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                                {liveClosed
                                    ? 'Customers see the closed message and cannot book.'
                                    : liveEmergency
                                        ? 'Schedule and Emergency bookings are available.'
                                        : 'Only Schedule bookings — Emergency is paused (outside service hours).'}
                            </Text>
                        </View>
                    </View>

                    {/* ── Closure switch ── */}
                    <Card theme={theme}>
                        <View style={styles.switchRow}>
                            <View style={[styles.iconBox, { backgroundColor: draft.isClosed ? 'rgba(239,68,68,0.15)' : `${theme.colors.primary}22` }]}>
                                <Ionicons name="storefront-outline" size={22} color={draft.isClosed ? '#EF4444' : theme.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Close the shop</Text>
                                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                                    Blocks the whole customer app — for festivals, events or holidays.
                                </Text>
                            </View>
                            <Switch
                                value={draft.isClosed}
                                onValueChange={(v) => set({ isClosed: v })}
                                trackColor={{ false: theme.colors.border, true: '#EF4444' }}
                                thumbColor="#fff"
                            />
                        </View>
                    </Card>

                    {/* ── Message ── */}
                    <Card theme={theme} style={!draft.isClosed && { opacity: 0.6 }}>
                        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Closed message</Text>
                        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginBottom: 12 }}>
                            Shown to customers while the shop is closed. Pick a template or write your own.
                        </Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                            {PRESETS.map((p) => (
                                <Chip key={p.key} label={p.label} theme={theme}
                                    active={draft.title === p.title && draft.message === p.message}
                                    onPress={() => applyPreset(p)} />
                            ))}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                            <View style={{ width: 70 }}>
                                <Label theme={theme}>EMOJI</Label>
                                <TextInput
                                    value={draft.emoji}
                                    onChangeText={(v) => set({ emoji: v })}
                                    maxLength={4}
                                    textAlign="center"
                                    style={[styles.input, { fontSize: 22, color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLow }]}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Label theme={theme}>TITLE</Label>
                                <TextInput
                                    value={draft.title}
                                    onChangeText={(v) => set({ title: v })}
                                    maxLength={80}
                                    placeholder="Happy Diwali!"
                                    placeholderTextColor={theme.colors.textMuted}
                                    style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLow }]}
                                />
                            </View>
                        </View>

                        <Label theme={theme}>MESSAGE</Label>
                        <TextInput
                            value={draft.message}
                            onChangeText={(v) => set({ message: v })}
                            maxLength={500}
                            multiline
                            textAlignVertical="top"
                            placeholder="Sorry for the inconvenience…"
                            placeholderTextColor={theme.colors.textMuted}
                            style={[styles.input, styles.multiline, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLow }]}
                        />
                        <Text style={{ alignSelf: 'flex-end', fontSize: 11, color: theme.colors.textMuted, marginTop: 4 }}>{draft.message.length}/500</Text>

                        {/* Auto reopen */}
                        <Label theme={theme}>REOPEN</Label>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {quickReopen.map((q) => {
                                const active = q.days === null ? !draft.reopenDate : draft.reopenDate === addDaysIST(q.days);
                                return (
                                    <Chip key={q.label} label={q.label} theme={theme} active={active}
                                        onPress={() => set({ reopenDate: q.days === null ? '' : addDaysIST(q.days) })} />
                                );
                            })}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <TextInput
                                value={draft.reopenDate}
                                onChangeText={(v) => set({ reopenDate: v.trim() })}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={theme.colors.textMuted}
                                keyboardType="numbers-and-punctuation"
                                maxLength={10}
                                style={[styles.input, { flex: 1, color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLow }]}
                            />
                            <TouchableOpacity
                                onPress={() => setPicker('reopen')}
                                activeOpacity={0.8}
                                style={[styles.timeBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLow }]}
                            >
                                <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                                <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{fmt12(draft.reopenTime)}</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: theme.colors.textMuted, fontSize: 11.5, marginTop: 8 }}>
                            {draft.reopenDate
                                ? `The app reopens by itself on ${fmtReopen(draft.reopenDate, draft.reopenTime) || 'the date above'}.`
                                : 'Manual — the app stays closed until you switch it back on.'}
                        </Text>
                    </Card>

                    {/* ── Preview ── */}
                    <View>
                        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>What customers will see</Text>
                        <Preview draft={draft} theme={theme} isDark={isDark} />
                    </View>

                    {/* ── Service hours ── */}
                    <Card theme={theme}>
                        <View style={styles.switchRow}>
                            <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}22` }]}>
                                <Ionicons name="time-outline" size={22} color={theme.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Service hours</Text>
                                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                                    Emergency bookings are only allowed inside these hours (IST).
                                </Text>
                            </View>
                            <Switch
                                value={draft.hoursEnabled}
                                onValueChange={(v) => set({ hoursEnabled: v })}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor="#fff"
                            />
                        </View>

                        {draft.hoursEnabled && (
                            <>
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                                    {[['OPENS', 'open', draft.openTime], ['CLOSES', 'close', draft.closeTime]].map(([lbl, key, val]) => (
                                        <TouchableOpacity
                                            key={key}
                                            onPress={() => setPicker(key)}
                                            activeOpacity={0.8}
                                            style={[styles.hoursBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLow }]}
                                        >
                                            <Text style={[styles.label, { color: theme.colors.textMuted, marginTop: 0 }]}>{lbl}</Text>
                                            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary }}>{fmt12(val)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {draft.openTime >= draft.closeTime && (
                                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>Closing time must be after opening time.</Text>
                                )}
                                <View style={[styles.info, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                                    <Ionicons name="information-circle-outline" size={15} color={theme.colors.textMuted} />
                                    <Text style={{ flex: 1, color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 }}>
                                        Outside {fmt12(draft.openTime)} – {fmt12(draft.closeTime)} customers can still open the app but can only book a
                                        Schedule Repair. Emergency Repair is switched off.
                                    </Text>
                                </View>
                            </>
                        )}
                    </Card>

                    {!!notice && (
                        <View style={[styles.notice, {
                            backgroundColor: notice.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            borderColor: notice.type === 'error' ? '#EF4444' : '#10B981',
                        }]}>
                            <Ionicons name={notice.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={17}
                                color={notice.type === 'error' ? '#EF4444' : '#10B981'} />
                            <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 13 }}>{notice.text}</Text>
                        </View>
                    )}
                </ScrollView>

                {/* ── Sticky save bar ── */}
                <View style={[styles.saveBar, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border, paddingBottom: insets.bottom + 12 }]}>
                    {dirty && (
                        <TouchableOpacity onPress={() => { setDraft(saved); setNotice(null); }} style={styles.resetBtn} disabled={saving}>
                            <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>Reset</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={onSave}
                        disabled={!dirty || saving}
                        activeOpacity={0.85}
                        style={[styles.saveBtn, {
                            backgroundColor: draft.isClosed && dirty ? '#EF4444' : theme.colors.primary,
                            opacity: !dirty || saving ? 0.5 : 1,
                        }]}
                    >
                        {saving
                            ? <ActivityIndicator color="#1a1a1a" />
                            : <Text style={{ fontSize: 15, fontWeight: '800', color: draft.isClosed && dirty ? '#fff' : '#1a1a1a' }}>
                                {dirty ? (draft.isClosed && !server?.isClosed ? 'Save & Close App' : 'Save Changes') : 'No changes'}
                            </Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <TimePickerModal
                visible={!!picker}
                theme={theme}
                title={picker === 'open' ? 'Opening time' : picker === 'close' ? 'Closing time' : 'Reopen time'}
                value={picker === 'open' ? draft?.openTime : picker === 'close' ? draft?.closeTime : draft?.reopenTime}
                onConfirm={pickTime}
                onClose={() => setPicker(null)}
            />
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
    errTitle: { fontSize: 17, fontWeight: '800', marginTop: 6 },
    retry: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
    card: { borderRadius: 20, borderWidth: 1, padding: 16 },
    cardTitle: { fontSize: 15.5, fontWeight: '800' },
    sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
    label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 14, marginBottom: 6 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
    multiline: { minHeight: 110, lineHeight: 20 },
    chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    live: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
    liveDot: { width: 12, height: 12, borderRadius: 6 },
    liveTitle: { fontSize: 14.5, fontWeight: '800' },
    timeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
    hoursBtn: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
    info: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 12 },
    notice: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12 },
    preview: { borderWidth: 1.5, borderRadius: 22, padding: 22, alignItems: 'center', gap: 8 },
    previewEmoji: { fontSize: 44 },
    previewTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
    previewMsg: { fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
    previewPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginTop: 4 },
    saveBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
    resetBtn: { paddingHorizontal: 18, justifyContent: 'center' },
    saveBtn: { flex: 1, borderRadius: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
});
