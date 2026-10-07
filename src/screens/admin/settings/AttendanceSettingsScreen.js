// src/screens/admin/settings/AttendanceSettingsScreen.js
//
// Admin: who gets the WhatsApp message when an employee marks attendance.
// (Admins always get the in-app push notification — that part needs no setup.)
import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Switch,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from 'react-native';
import { showPopUp } from '../../../utils/popupService';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import { attendanceSettingsService } from '../../../services/attendanceService';

// Same rule as the server: 10 digits (India) or 11–15 digits with country code
const cleanNumber = (raw) => {
    const d = String(raw || '').replace(/\D/g, '');
    if (d.length === 10) return `91${d}`;
    if (d.length === 11 && d.startsWith('0')) return `91${d.slice(1)}`;
    if (d.length >= 11 && d.length <= 15) return d;
    return null;
};

const pretty = (n) => (n.startsWith('91') && n.length === 12 ? `+91 ${n.slice(2, 7)} ${n.slice(7)}` : `+${n}`);

export default function AttendanceSettingsScreen() {
    const mode = useSelector((st) => st.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const c = theme.colors;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [dirty, setDirty] = useState(false);

    const [whatsappEnabled, setWhatsappEnabled] = useState(true);
    const [notifyEmployee, setNotifyEmployee] = useState(true);
    const [numbers, setNumbers] = useState([]);

    const [newName, setNewName] = useState('');
    const [newNumber, setNewNumber] = useState('');

    const apply = (st) => {
        setWhatsappEnabled(st.whatsappEnabled);
        setNotifyEmployee(st.notifyEmployee);
        setNumbers(st.numbers || []);
        setDirty(false);
    };

    const load = useCallback(async () => {
        try {
            setLoadError(null);
            apply(await attendanceSettingsService.get());
        } catch (e) {
            setLoadError(e?.response?.data?.message || 'Could not load settings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const touch = (fn) => (...args) => { fn(...args); setDirty(true); };

    const addNumber = () => {
        const number = cleanNumber(newNumber);
        if (!number) return showPopUp('Invalid number', 'Enter a 10-digit mobile number (or include the country code).');
        if (numbers.some((n) => n.number === number)) return showPopUp('Already added', 'This number is already on the list.');
        if (numbers.length >= 20) return showPopUp('Limit reached', 'You can add up to 20 numbers.');
        setNumbers((prev) => [...prev, { name: newName.trim(), number, active: true }]);
        setNewName('');
        setNewNumber('');
        setDirty(true);
    };

    const save = async () => {
        try {
            setSaving(true);
            apply(await attendanceSettingsService.update({ whatsappEnabled, notifyEmployee, numbers }));
            showPopUp('Saved', 'Attendance alert settings updated.');
        } catch (e) {
            showPopUp('Could not save', e?.response?.data?.message || 'Check your internet and try again.');
        } finally {
            setSaving(false);
        }
    };

    const renderSwitchRow = ({ title, sub, value, onChange }) => (
        <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: c.textPrimary }]}>{title}</Text>
                <Text style={[s.rowSub, { color: c.textMuted }]}>{sub}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: '#d1d5db', true: `${c.primary}99` }}
                thumbColor={value ? c.primary : '#f4f4f5'}
            />
        </View>
    );

    return (
        <TabScreenWrapper greeting="Attendance Alerts" showMenuIcon showBookingIcon={false}>
            {loading ? (
                <View style={s.center}><ActivityIndicator size="large" color={c.primary} /></View>
            ) : loadError ? (
                <View style={s.center}>
                    <Ionicons name="cloud-offline-outline" size={44} color={c.textMuted} />
                    <Text style={{ color: c.textSecondary, textAlign: 'center', marginTop: 8 }}>{loadError}</Text>
                    <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={[s.retryBtn, { backgroundColor: c.primary }]}>
                        <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Try again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView
                        style={{ flex: 1, backgroundColor: c.background }}
                        contentContainerStyle={s.scroll}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[s.info, { backgroundColor: `${c.primary}14`, borderColor: c.border }]}>
                            <Ionicons name="notifications-outline" size={18} color={c.primary} />
                            <Text style={[s.infoText, { color: c.textSecondary }]}>
                                You always get a push notification (with the employee&apos;s location) when someone marks attendance.
                                Below you can also send a WhatsApp message to more people.
                            </Text>
                        </View>

                        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                            {renderSwitchRow({
                                title: 'WhatsApp alerts',
                                sub: 'Send a WhatsApp message when attendance is marked',
                                value: whatsappEnabled,
                                onChange: touch(setWhatsappEnabled),
                            })}
                            <View style={[s.divider, { backgroundColor: c.border }]} />
                            {renderSwitchRow({
                                title: 'Message the employee too',
                                sub: "Also send it to the employee's own phone number",
                                value: notifyEmployee,
                                onChange: touch(setNotifyEmployee),
                            })}
                        </View>

                        <Text style={[s.section, { color: c.textSecondary }]}>Extra numbers</Text>

                        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                            {numbers.length === 0 && (
                                <Text style={{ color: c.textMuted, fontSize: 13 }}>
                                    No extra numbers yet. Add the owner, HR or anyone who should get every attendance update.
                                </Text>
                            )}
                            {numbers.map((n, i) => (
                                <View key={n.number} style={[s.numRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.rowTitle, { color: c.textPrimary }]} numberOfLines={1}>{n.name || 'Unnamed'}</Text>
                                        <Text style={[s.rowSub, { color: c.textMuted }]}>{pretty(n.number)}</Text>
                                    </View>
                                    <Switch
                                        value={n.active}
                                        onValueChange={touch((v) => setNumbers((prev) => prev.map((x) => (x.number === n.number ? { ...x, active: v } : x))))}
                                        trackColor={{ false: '#d1d5db', true: `${c.primary}99` }}
                                        thumbColor={n.active ? c.primary : '#f4f4f5'}
                                    />
                                    <TouchableOpacity
                                        onPress={touch(() => setNumbers((prev) => prev.filter((x) => x.number !== n.number)))}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        style={{ marginLeft: 12 }}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={c.error} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                            <Text style={[s.rowTitle, { color: c.textPrimary }]}>Add a number</Text>
                            <TextInput
                                value={newName}
                                onChangeText={setNewName}
                                placeholder="Name (optional)"
                                placeholderTextColor={c.textMuted}
                                maxLength={50}
                                style={[s.input, { backgroundColor: c.surfaceLow, borderColor: c.border, color: c.textPrimary }]}
                            />
                            <TextInput
                                value={newNumber}
                                onChangeText={setNewNumber}
                                placeholder="WhatsApp number, e.g. 98765 43210"
                                placeholderTextColor={c.textMuted}
                                keyboardType="phone-pad"
                                maxLength={20}
                                style={[s.input, { backgroundColor: c.surfaceLow, borderColor: c.border, color: c.textPrimary }]}
                            />
                            <TouchableOpacity
                                onPress={addNumber}
                                activeOpacity={0.85}
                                style={[s.addBtn, { borderColor: c.primary }]}
                            >
                                <Ionicons name="add-circle-outline" size={18} color={c.primary} />
                                <Text style={{ color: c.primary, fontWeight: '800' }}>Add to list</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={save}
                            disabled={!dirty || saving}
                            activeOpacity={0.85}
                            style={[s.saveBtn, { backgroundColor: c.primary, opacity: !dirty || saving ? 0.5 : 1 }]}
                        >
                            {saving ? <ActivityIndicator color="#1a1a1a" /> : <Text style={s.saveText}>{dirty ? 'Save changes' : 'Saved'}</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </TabScreenWrapper>
    );
}

const s = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    retryBtn: { marginTop: 14, paddingHorizontal: 22, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 16, paddingBottom: 120, gap: 14 },
    info: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'flex-start' },
    infoText: { flex: 1, fontSize: 12.5, lineHeight: 18, fontWeight: '500' },
    card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
    section: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    divider: { height: StyleSheet.hairlineWidth },
    rowTitle: { fontSize: 15, fontWeight: '700' },
    rowSub: { fontSize: 12, marginTop: 2 },
    numRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    input: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
    addBtn: { height: 44, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    saveBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    saveText: { color: '#1a1a1a', fontWeight: '800', fontSize: 15 },
});
