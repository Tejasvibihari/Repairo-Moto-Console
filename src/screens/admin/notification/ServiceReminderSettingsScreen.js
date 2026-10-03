// src/screens/admin/notification/ServiceReminderSettingsScreen.js
// Admin: control the automatic "time for your next service" reminders.
import React, { useState, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Switch, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import PopUp from '../../../components/common/PopUp';
import { notificationAdminService } from '../../../services/notificationAdminService';

const PLACEHOLDERS = ['{{name}}', '{{bike}}', '{{lastServiceDate}}', '{{days}}'];
const SAMPLE = { name: 'Ravi', bike: 'Honda Shine', lastServiceDate: '12 Aug 2026', days: '45' };
const preview = (t) => String(t || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => SAMPLE[k] ?? '');

const hourLabel = (h) => `${((h + 11) % 12) + 1}${h % 24 >= 12 && h !== 24 ? ' PM' : ' AM'}`;

export default function ServiceReminderSettingsScreen({ navigation }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const c = theme.colors;

    const [cfg, setCfg] = useState(null);
    const [saving, setSaving] = useState(false);
    const [popup, setPopup] = useState(null);
    const [customDays, setCustomDays] = useState('');
    const [upcoming, setUpcoming] = useState([]);

    const load = useCallback(async () => {
        try {
            const [config, ups] = await Promise.all([
                notificationAdminService.getReminderConfig(),
                notificationAdminService.listFollowUps('pending'),
            ]);
            setCfg(config);
            setUpcoming(ups.followUps || []);
        } catch (e) {
            setPopup({ title: 'Could not load', message: e.message });
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const set = (patch) => setCfg((p) => ({ ...p, ...patch }));

    const save = async () => {
        setSaving(true);
        try {
            const saved = await notificationAdminService.updateReminderConfig({
                enabled: cfg.enabled,
                defaultDelayDays: cfg.defaultDelayDays,
                title: cfg.title,
                body: cfg.body,
                sendFromHour: cfg.sendFromHour,
                sendUntilHour: cfg.sendUntilHour,
                skipIfRebooked: cfg.skipIfRebooked,
            });
            setCfg(saved);
            setPopup({ title: 'Saved', message: saved.enabled ? 'Automatic reminders are on.' : 'Settings saved. Automatic reminders are off.' });
        } catch (e) {
            setPopup({ title: 'Could not save', message: e.message });
        } finally {
            setSaving(false);
        }
    };

    if (!cfg) {
        return (
            <TabScreenWrapper greeting="Service Reminders" showMenuIcon>
                <View style={styles.center}><ActivityIndicator color={c.primary} size="large" /></View>
                <PopUp primaryColor={c.primary} visible={!!popup} title={popup?.title} message={popup?.message} primaryLabel="OK"
                    onPrimary={() => setPopup(null)} onClose={() => setPopup(null)} />
            </TabScreenWrapper>
        );
    }

    const input = [styles.input, { color: c.textPrimary, borderColor: c.border, backgroundColor: c.surface }];
    const isPreset = (cfg.presetDays || []).includes(cfg.defaultDelayDays);

    return (
        <TabScreenWrapper greeting="Service Reminders" showMenuIcon>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
                    <Ionicons name="chevron-back" size={18} color={c.primary} />
                    <Text style={{ color: c.primary, fontWeight: '700' }}>Notifications</Text>
                </TouchableOpacity>

                <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={styles.rowBetween}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Automatic reminders</Text>
                            <Text style={[styles.hint, { color: c.textMuted }]}>
                                After a service is completed, the customer gets a push reminder after the delay below.
                                Only services completed after you switch this on are included.
                            </Text>
                        </View>
                        <Switch value={cfg.enabled} onValueChange={(v) => set({ enabled: v })}
                            trackColor={{ false: c.border, true: c.primary }} />
                    </View>
                </View>

                <Text style={[styles.label, { color: c.textSecondary }]}>Remind after</Text>
                <View style={styles.row}>
                    {(cfg.presetDays || []).map((d) => {
                        const on = cfg.defaultDelayDays === d;
                        return (
                            <TouchableOpacity key={d} onPress={() => { set({ defaultDelayDays: d }); setCustomDays(''); }}
                                style={[styles.chip, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary + '22' : c.surface }]}>
                                <Text style={{ color: on ? c.primary : c.textPrimary, fontWeight: '800' }}>{d} days</Text>
                            </TouchableOpacity>
                        );
                    })}
                    <TextInput
                        style={[...input, styles.daysInput, !isPreset && { borderColor: c.primary }]}
                        placeholder="Other" placeholderTextColor={c.textMuted} keyboardType="number-pad" maxLength={3}
                        value={customDays || (!isPreset ? String(cfg.defaultDelayDays) : '')}
                        onChangeText={(t) => {
                            const v = t.replace(/[^0-9]/g, '');
                            setCustomDays(v);
                            if (v) set({ defaultDelayDays: Number(v) });
                        }}
                    />
                </View>
                <Text style={[styles.hint, { color: c.textMuted }]}>
                    You can also change the timing for a single booking from that order's screen.
                </Text>

                <Text style={[styles.label, { color: c.textSecondary }]}>Message</Text>
                <TextInput style={input} value={cfg.title} onChangeText={(t) => set({ title: t })} maxLength={80}
                    placeholder="Title" placeholderTextColor={c.textMuted} />
                <TextInput style={[...input, styles.multiline]} value={cfg.body} onChangeText={(t) => set({ body: t })}
                    maxLength={400} multiline placeholder="Message" placeholderTextColor={c.textMuted} />
                <Text style={[styles.hint, { color: c.textMuted }]}>
                    Placeholders: {PLACEHOLDERS.join('  ')}
                </Text>

                <View style={[styles.preview, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
                    <Text style={[styles.hint, { color: c.textMuted, marginBottom: 4 }]}>PREVIEW</Text>
                    <Text style={{ color: c.textPrimary, fontWeight: '800' }}>{preview(cfg.title)}</Text>
                    <Text style={{ color: c.textSecondary, marginTop: 2 }}>{preview(cfg.body)}</Text>
                </View>

                <Text style={[styles.label, { color: c.textSecondary }]}>Send window (IST)</Text>
                <View style={styles.row}>
                    <Stepper c={c} label="From" value={cfg.sendFromHour} min={0} max={cfg.sendUntilHour - 1}
                        onChange={(v) => set({ sendFromHour: v })} />
                    <Stepper c={c} label="Until" value={cfg.sendUntilHour} min={cfg.sendFromHour + 1} max={24}
                        onChange={(v) => set({ sendUntilHour: v })} />
                </View>
                <Text style={[styles.hint, { color: c.textMuted }]}>Reminders due outside this window wait for the next morning.</Text>

                <View style={[styles.rowBetween, { marginTop: 16 }]}>
                    <Text style={[styles.cardTitle, { color: c.textPrimary, flex: 1 }]}>Skip if customer already booked again</Text>
                    <Switch value={cfg.skipIfRebooked} onValueChange={(v) => set({ skipIfRebooked: v })} trackColor={{ false: c.border, true: c.primary }} />
                </View>

                <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85}
                    style={[styles.saveBtn, { backgroundColor: c.primary, opacity: saving ? 0.6 : 1 }]}>
                    {saving ? <ActivityIndicator color="#1a1a1a" /> : <Text style={styles.saveText}>Save settings</Text>}
                </TouchableOpacity>

                <Text style={[styles.section, { color: c.textPrimary }]}>Upcoming reminders</Text>
                {upcoming.length === 0 ? (
                    <Text style={[styles.hint, { color: c.textMuted }]}>None scheduled yet.</Text>
                ) : upcoming.map((o) => (
                    <View key={o._id} style={[styles.upRow, { borderColor: c.border, backgroundColor: c.surface }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: c.textPrimary, fontWeight: '800' }}>#{o.orderId} · {o.name}</Text>
                            <Text style={[styles.hint, { color: c.textMuted }]}>{o.selectedBrand} {o.selectedModel}</Text>
                        </View>
                        <Text style={{ color: c.primary, fontWeight: '800' }}>
                            {new Date(o.followUp.remindAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' })}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            <PopUp primaryColor={c.primary} visible={!!popup} title={popup?.title} message={popup?.message} primaryLabel="OK"
                onPrimary={() => setPopup(null)} onClose={() => setPopup(null)} />
        </TabScreenWrapper>
    );
}

function Stepper({ c, label, value, min, max, onChange }) {
    return (
        <View style={[styles.stepper, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Text style={[styles.hint, { color: c.textMuted }]}>{label}</Text>
            <TouchableOpacity disabled={value <= min} onPress={() => onChange(value - 1)} hitSlop={8}>
                <Ionicons name="remove-circle-outline" size={22} color={value <= min ? c.border : c.primary} />
            </TouchableOpacity>
            <Text style={{ color: c.textPrimary, fontWeight: '800', minWidth: 48, textAlign: 'center' }}>{hourLabel(value)}</Text>
            <TouchableOpacity disabled={value >= max} onPress={() => onChange(value + 1)} hitSlop={8}>
                <Ionicons name="add-circle-outline" size={22} color={value >= max ? c.border : c.primary} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: { padding: 20, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 6 },
    cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, alignItems: 'center' },
    label: { fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
    hint: { fontSize: 12 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 10 },
    multiline: { minHeight: 90, textAlignVertical: 'top' },
    daysInput: { width: 76, marginBottom: 0, paddingVertical: 8, textAlign: 'center' },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
    preview: { padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 6 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    saveBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 14, marginTop: 20 },
    saveText: { fontSize: 14, fontWeight: '900', color: '#1a1a1a' },
    section: { fontSize: 18, fontWeight: '900', marginTop: 30, marginBottom: 10 },
    upRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
});
