// src/screens/admin/settings/WhatsAppAlertsScreen.js
//
// Admin: master switch for the WhatsApp message customers get when their order status changes.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { showPopUp } from '../../../utils/popupService';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import { whatsappAlertService } from '../../../services/adminSettingsService';

export default function WhatsAppAlertsScreen() {
    const mode = useSelector((st) => st.theme?.mode || 'light');
    const c = (mode === 'dark' ? DarkTheme : LightTheme).colors;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [enabled, setEnabled] = useState(true);

    const load = useCallback(async () => {
        try {
            setError(null);
            setEnabled(await whatsappAlertService.get());
        } catch (e) {
            setError(e?.response?.data?.message || 'Could not load the setting.');
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const toggle = async (value) => {
        const previous = enabled;
        setEnabled(value);            // instant feedback, rolled back if the server refuses
        setSaving(true);
        try {
            setEnabled(await whatsappAlertService.set(value));
        } catch (e) {
            setEnabled(previous);
            showPopUp('Could not save', e?.response?.data?.message || 'Check your internet and try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <TabScreenWrapper greeting="WhatsApp Alerts" showMenuIcon showBookingIcon={false}>
            {loading ? (
                <View style={s.center}><ActivityIndicator size="large" color={c.primary} /></View>
            ) : error ? (
                <View style={s.center}>
                    <Ionicons name="cloud-offline-outline" size={44} color={c.textMuted} />
                    <Text style={{ color: c.textSecondary, textAlign: 'center', marginTop: 8 }}>{error}</Text>
                    <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={[s.retry, { backgroundColor: c.primary }]}>
                        <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Try again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={s.scroll}>
                    <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <View style={s.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.title, { color: c.textPrimary }]}>Order status on WhatsApp</Text>
                                <Text style={[s.sub, { color: c.textMuted }]}>
                                    {enabled ? 'ON - customers get a WhatsApp message for every order update.' : 'OFF - customers only get the in-app notification.'}
                                </Text>
                            </View>
                            {saving ? <ActivityIndicator color={c.primary} style={{ marginRight: 8 }} /> : null}
                            <Switch
                                value={enabled}
                                onValueChange={toggle}
                                disabled={saving}
                                trackColor={{ false: '#d1d5db', true: `${c.primary}99` }}
                                thumbColor={enabled ? c.primary : '#f4f4f5'}
                            />
                        </View>
                    </View>

                    <View style={[s.info, { backgroundColor: `${c.primary}14`, borderColor: c.border }]}>
                        <Ionicons name="logo-whatsapp" size={18} color={c.primary} />
                        <Text style={[s.infoText, { color: c.textSecondary }]}>
                            Sent to the customer for: booking confirmed, mechanic assigned / on the way / arrived, work started and completed,
                            reschedule, cancellation, invoice and payment. Login and work OTPs are never sent here.
                            In-app and push notifications are not affected by this switch.
                        </Text>
                    </View>
                </ScrollView>
            )}
        </TabScreenWrapper>
    );
}

const s = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    retry: { marginTop: 14, paddingHorizontal: 22, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 16, gap: 14 },
    card: { borderRadius: 18, borderWidth: 1, padding: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { fontSize: 15, fontWeight: '700' },
    sub: { fontSize: 12, marginTop: 3, lineHeight: 17 },
    info: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'flex-start' },
    infoText: { flex: 1, fontSize: 12.5, lineHeight: 18, fontWeight: '500' },
});
