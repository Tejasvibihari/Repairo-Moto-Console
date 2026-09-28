// src/screens/admin/notification/AdminNotificationsScreen.js
// Admin: send an offer / announcement now or schedule it, and see what was sent.
import React, { useState, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import RescheduleModal from '../../../components/admin/order/RescheduleModal';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import PopUp from '../../../components/common/PopUp';
import { notificationAdminService } from '../../../services/notificationAdminService';

const AUDIENCES = [
    { key: 'all_users', label: 'All customers', icon: 'people-outline' },
    { key: 'inactive_days', label: 'Not booked in…', icon: 'time-outline' },
];
const INACTIVE_PRESETS = [30, 60, 90];

const STATUS_COLOR = { sent: '#2ECC9A', scheduled: '#e2a731', sending: '#e2a731', cancelled: '#9E8E78', failed: '#FF6B6B' };

// RescheduleModal returns ('2026-10-03', '10:00 AM') in IST → absolute instant
const toInstant = (ymd, time) => {
    const m = time.match(/^(\d{2}):(\d{2}) (AM|PM)$/);
    const h = (parseInt(m[1], 10) % 12) + (m[3] === 'PM' ? 12 : 0);
    return new Date(`${ymd}T${String(h).padStart(2, '0')}:${m[2]}:00+05:30`);
};

const fmt = (d) => new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
});

export default function AdminNotificationsScreen({ navigation }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const c = theme.colors;

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [audienceType, setAudienceType] = useState('all_users');
    const [inactiveDays, setInactiveDays] = useState('60');
    const [scheduleOn, setScheduleOn] = useState(false);
    const [scheduledFor, setScheduledFor] = useState(null); // Date | null
    const [pickerOpen, setPickerOpen] = useState(false);

    const [count, setCount] = useState(null);
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [popup, setPopup] = useState(null); // { title, message, onPrimary?, primaryLabel?, secondaryLabel? }

    const audience = useCallback(() => (
        audienceType === 'inactive_days'
            ? { type: 'inactive_days', inactiveDays: Number(inactiveDays) || 0 }
            : { type: 'all_users' }
    ), [audienceType, inactiveDays]);

    const loadHistory = useCallback(async () => {
        try {
            const res = await notificationAdminService.listCampaigns();
            setHistory(res.campaigns || []);
        } catch (e) {
            // history is secondary — keep the form usable
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

    // Live "this will reach N customers" hint
    useFocusEffect(useCallback(() => {
        let cancelled = false;
        setCount(null);
        if (audienceType === 'inactive_days' && !Number(inactiveDays)) return;
        const t = setTimeout(async () => {
            try {
                const r = await notificationAdminService.previewAudience(audience());
                if (!cancelled) setCount(r.count);
            } catch (e) { if (!cancelled) setCount(null); }
        }, 400);
        return () => { cancelled = true; clearTimeout(t); };
    }, [audienceType, inactiveDays, audience]));

    const send = async () => {
        setPopup(null);
        setSending(true);
        try {
            const res = await notificationAdminService.createCampaign({
                title: title.trim(),
                body: body.trim(),
                audience: audience(),
                scheduledFor: scheduleOn && scheduledFor ? scheduledFor.toISOString() : undefined,
            });
            setTitle(''); setBody(''); setScheduleOn(false); setScheduledFor(null);
            setPopup({ title: scheduleOn ? 'Scheduled' : 'Sent', message: res.message });
            loadHistory();
        } catch (e) {
            setPopup({ title: 'Could not send', message: e.message });
        } finally {
            setSending(false);
        }
    };

    const confirmSend = () => {
        if (!title.trim() || !body.trim()) {
            return setPopup({ title: 'Missing details', message: 'Add a title and a message first.' });
        }
        if (scheduleOn && !scheduledFor) {
            return setPopup({ title: 'Pick a time', message: 'Choose the date and time to send this.' });
        }
        const who = count == null ? 'the selected customers' : `${count} customer${count === 1 ? '' : 's'}`;
        setPopup({
            title: scheduleOn ? 'Schedule notification?' : 'Send notification now?',
            message: scheduleOn
                ? `"${title.trim()}" will go to ${who} on ${fmt(scheduledFor)}.`
                : `"${title.trim()}" will be sent to ${who} immediately. This cannot be undone.`,
            primaryLabel: scheduleOn ? 'Schedule' : 'Send',
            secondaryLabel: 'Cancel',
            onPrimary: send,
        });
    };

    const cancelScheduled = async (id) => {
        try {
            await notificationAdminService.cancelCampaign(id);
            loadHistory();
        } catch (e) {
            setPopup({ title: 'Could not cancel', message: e.message });
        }
    };

    const input = [styles.input, { color: c.textPrimary, borderColor: c.border, backgroundColor: c.surface }];

    return (
        <TabScreenWrapper greeting="Notifications" showMenuIcon>
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={false} onRefresh={loadHistory} tintColor={c.primary} />}
            >
                <TouchableOpacity
                    style={[styles.linkCard, { backgroundColor: c.surface, borderColor: c.border }]}
                    onPress={() => navigation.navigate('ServiceReminderSettings')}
                    activeOpacity={0.85}
                >
                    <Ionicons name="alarm-outline" size={22} color={c.primary} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.linkTitle, { color: c.textPrimary }]}>Automatic service reminders</Text>
                        <Text style={[styles.hint, { color: c.textMuted }]}>Choose when customers are reminded (30 / 45 / 60 days…) and edit the message.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                </TouchableOpacity>

                <Text style={[styles.section, { color: c.textPrimary }]}>Send an offer or announcement</Text>

                <TextInput style={input} placeholder="Title  e.g. 20% off on general service" placeholderTextColor={c.textMuted}
                    value={title} onChangeText={setTitle} maxLength={80} />
                <TextInput style={[...input, styles.multiline]} placeholder="Message" placeholderTextColor={c.textMuted}
                    value={body} onChangeText={setBody} maxLength={400} multiline />
                <Text style={[styles.counter, { color: c.textMuted }]}>{body.length}/400</Text>

                <Text style={[styles.label, { color: c.textSecondary }]}>Send to</Text>
                <View style={styles.row}>
                    {AUDIENCES.map((a) => {
                        const on = audienceType === a.key;
                        return (
                            <TouchableOpacity key={a.key} onPress={() => setAudienceType(a.key)} activeOpacity={0.85}
                                style={[styles.pill, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary + '22' : c.surface }]}>
                                <Ionicons name={a.icon} size={15} color={on ? c.primary : c.textMuted} />
                                <Text style={[styles.pillText, { color: on ? c.primary : c.textSecondary }]}>{a.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {audienceType === 'inactive_days' && (
                    <View style={styles.row}>
                        {INACTIVE_PRESETS.map((d) => (
                            <TouchableOpacity key={d} onPress={() => setInactiveDays(String(d))}
                                style={[styles.chip, { borderColor: String(d) === inactiveDays ? c.primary : c.border }]}>
                                <Text style={{ color: c.textPrimary, fontWeight: '700' }}>{d} days</Text>
                            </TouchableOpacity>
                        ))}
                        <TextInput style={[...input, styles.daysInput]} keyboardType="number-pad" value={inactiveDays}
                            onChangeText={(t) => setInactiveDays(t.replace(/[^0-9]/g, ''))} maxLength={3} />
                    </View>
                )}

                <Text style={[styles.hint, { color: c.textMuted }]}>
                    {count == null ? 'Calculating audience…' : `Will reach ${count} customer${count === 1 ? '' : 's'}`}
                </Text>

                <View style={[styles.row, { alignItems: 'center', marginTop: 10 }]}>
                    <TouchableOpacity onPress={() => setScheduleOn((v) => !v)} style={styles.row} activeOpacity={0.8}>
                        <Ionicons name={scheduleOn ? 'checkbox' : 'square-outline'} size={22} color={c.primary} />
                        <Text style={[styles.pillText, { color: c.textPrimary }]}>Schedule for later</Text>
                    </TouchableOpacity>
                </View>
                {scheduleOn && (
                    <TouchableOpacity style={[styles.chip, { borderColor: c.border, alignSelf: 'flex-start' }]} onPress={() => setPickerOpen(true)}>
                        <Ionicons name="calendar-outline" size={14} color={c.primary} />
                        <Text style={{ color: c.textPrimary, fontWeight: '700' }}>
                            {'  '}{scheduledFor ? fmt(scheduledFor) : 'Choose date & time'}
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity onPress={confirmSend} disabled={sending} activeOpacity={0.85}
                    style={[styles.sendBtn, { backgroundColor: c.primary, opacity: sending ? 0.6 : 1 }]}>
                    {sending ? <ActivityIndicator color="#1a1a1a" /> : (
                        <>
                            <Ionicons name={scheduleOn ? 'calendar' : 'paper-plane'} size={16} color="#1a1a1a" />
                            <Text style={styles.sendText}>{scheduleOn ? 'Schedule' : 'Send now'}</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={[styles.section, { color: c.textPrimary, marginTop: 28 }]}>Recent</Text>
                {loading ? <ActivityIndicator color={c.primary} /> : history.length === 0 ? (
                    <Text style={[styles.hint, { color: c.textMuted }]}>Nothing sent yet.</Text>
                ) : history.map((h) => (
                    <View key={h._id} style={[styles.histCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <View style={styles.histTop}>
                            <Text style={[styles.histTitle, { color: c.textPrimary }]} numberOfLines={1}>{h.title}</Text>
                            <Text style={[styles.badge, { color: STATUS_COLOR[h.status], borderColor: STATUS_COLOR[h.status] }]}>{h.status}</Text>
                        </View>
                        <Text style={[styles.histBody, { color: c.textSecondary }]} numberOfLines={2}>{h.body}</Text>
                        <Text style={[styles.hint, { color: c.textMuted }]}>
                            {h.status === 'scheduled' ? `Goes out ${fmt(h.scheduledFor)}`
                                : h.status === 'sent' ? `${h.recipientCount} customers · ${fmt(h.sentAt)}`
                                    : h.status === 'failed' ? (h.error || 'Failed') : fmt(h.createdAt)}
                        </Text>
                        {h.status === 'scheduled' && (
                            <TouchableOpacity onPress={() => cancelScheduled(h._id)} style={{ marginTop: 6 }}>
                                <Text style={{ color: '#FF6B6B', fontWeight: '800', fontSize: 12 }}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </ScrollView>

            <RescheduleModal
                visible={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSubmit={({ preferredDate, preferredTime }) => {
                    setScheduledFor(toInstant(preferredDate, preferredTime));
                    setPickerOpen(false);
                }}
                theme={theme}
                isDark={mode === 'dark'}
                title="Schedule notification"
                subtitle="Pick when this should be sent (IST)."
                reasonLabel="Note (not sent)"
            />

            <PopUp
                primaryColor={c.primary}
                visible={!!popup}
                title={popup?.title}
                message={popup?.message}
                primaryLabel={popup?.primaryLabel || 'OK'}
                secondaryLabel={popup?.secondaryLabel}
                onPrimary={popup?.onPrimary || (() => setPopup(null))}
                onSecondary={() => setPopup(null)}
                onClose={() => setPopup(null)}
            />
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, paddingBottom: 60 },
    linkCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 22 },
    linkTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
    section: { fontSize: 18, fontWeight: '900', marginBottom: 12, letterSpacing: -0.3 },
    label: { fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 10 },
    multiline: { minHeight: 90, textAlignVertical: 'top' },
    counter: { fontSize: 11, textAlign: 'right', marginTop: -4, marginBottom: 6 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
    pillText: { fontSize: 13, fontWeight: '700' },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    daysInput: { width: 70, marginBottom: 0, paddingVertical: 8, textAlign: 'center' },
    hint: { fontSize: 12 },
    sendBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, marginTop: 16 },
    sendText: { fontSize: 14, fontWeight: '900', color: '#1a1a1a' },
    histCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
    histTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    histTitle: { flex: 1, fontSize: 14, fontWeight: '800' },
    histBody: { fontSize: 13, marginVertical: 4 },
    badge: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
});
