// FollowUpReminderCard.js
// Shown on the admin order screen: pick when this customer gets their
// "time for your next service" reminder (30 / 45 / 60 days…) or turn it off.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationAdminService } from '../../../services/notificationAdminService';

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default function FollowUpReminderCard({ order, theme, onChanged, showAlert }) {
    const c = theme.colors;
    const fu = order?.followUp || {};
    const [presets, setPresets] = useState([30, 45, 60, 90]);
    const [defaultDays, setDefaultDays] = useState(45);
    const [enabledGlobally, setEnabledGlobally] = useState(true);
    const [custom, setCustom] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        notificationAdminService.getReminderConfig()
            .then((cfg) => {
                setPresets(cfg.presetDays || [30, 45, 60, 90]);
                setDefaultDays(cfg.defaultDelayDays);
                setEnabledGlobally(!!cfg.enabled);
            })
            .catch(() => { });
    }, []);

    // Nothing to remind: not an app customer, or the booking was cancelled
    if (!order?.userId || order.status === 'Cancelled') return null;

    const apply = async (payload, okMessage) => {
        setBusy(true);
        try {
            await notificationAdminService.setOrderFollowUp(order._id, payload);
            await onChanged?.();
            showAlert?.('Reminder updated', okMessage);
        } catch (e) {
            showAlert?.('Error', e.message);
        } finally {
            setBusy(false);
        }
    };

    const chosen = fu.remindAfterDays;
    const done = order.status === 'Completed';

    let statusLine;
    if (fu.status === 'sent') statusLine = `Reminder sent on ${fmt(fu.sentAt)}.`;
    else if (fu.disabled) statusLine = 'Reminder is turned off for this booking.';
    else if (fu.status === 'skipped') statusLine = fu.skipReason || 'Reminder was skipped.';
    else if (fu.status === 'pending' && fu.remindAt) statusLine = `Customer will be reminded on ${fmt(fu.remindAt)} (${chosen} days after service).`;
    else if (chosen) statusLine = `Will be scheduled ${chosen} days after the service is completed.`;
    else statusLine = enabledGlobally
        ? `Default: ${defaultDays} days after the service is completed.`
        : 'Automatic reminders are switched off in settings. Choosing a delay here will not send anything until they are on.';

    const locked = fu.status === 'sent';

    return (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.head}>
                <Ionicons name="alarm-outline" size={18} color={c.primary} />
                <Text style={[styles.title, { color: c.textPrimary }]}>Next-service reminder</Text>
                {busy && <ActivityIndicator size="small" color={c.primary} />}
            </View>
            <Text style={[styles.status, { color: c.textSecondary }]}>{statusLine}</Text>

            {!locked && (
                <>
                    <View style={styles.row}>
                        {presets.map((d) => {
                            const on = chosen === d && !fu.disabled;
                            return (
                                <TouchableOpacity key={d} disabled={busy}
                                    onPress={() => apply({ days: d }, `Customer will be reminded ${d} days after the service.`)}
                                    style={[styles.chip, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary + '22' : 'transparent' }]}>
                                    <Text style={{ color: on ? c.primary : c.textPrimary, fontWeight: '800', fontSize: 12 }}>{d}d</Text>
                                </TouchableOpacity>
                            );
                        })}
                        <TextInput style={[styles.input, { color: c.textPrimary, borderColor: c.border }]} placeholder="days"
                            placeholderTextColor={c.textMuted} keyboardType="number-pad" maxLength={3}
                            value={custom} onChangeText={(t) => setCustom(t.replace(/[^0-9]/g, ''))} />
                        <TouchableOpacity disabled={busy || !custom} onPress={() => { apply({ days: Number(custom) }, `Customer will be reminded ${custom} days after the service.`); setCustom(''); }}
                            style={[styles.chip, { borderColor: c.primary, opacity: custom ? 1 : 0.4 }]}>
                            <Text style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>Set</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity disabled={busy} onPress={() => apply({ disabled: !fu.disabled }, fu.disabled ? 'Reminder turned back on.' : 'Reminder turned off for this booking.')}>
                        <Text style={{ color: fu.disabled ? c.primary : '#FF6B6B', fontWeight: '800', fontSize: 12 }}>
                            {fu.disabled ? 'Turn reminder back on' : 'Turn off for this booking'}
                        </Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: { padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 12 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    title: { fontSize: 14, fontWeight: '800', flex: 1 },
    status: { fontSize: 12, marginBottom: 10 },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, borderWidth: 1 },
    input: { width: 60, borderWidth: 1, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6, textAlign: 'center', fontSize: 12 },
});
