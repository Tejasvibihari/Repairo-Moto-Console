// src/screens/admin/settings/AdminReferralScreen.js
//
// Admin: find a customer, see their referral wallet, and correct it ("set" an exact value or "adjust" by +/-).
// Every change is stored on the server with who/when/before/after/note.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import { referralAdminService } from '../../../services/referralAdminService';

const money = (n) => `\u20B9${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const name = (u) => `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || 'Customer';

export default function AdminReferralScreen() {
    const mode = useSelector((st) => st.theme?.mode || 'light');
    const c = (mode === 'dark' ? DarkTheme : LightTheme).colors;

    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [detail, setDetail] = useState(null);       // { user, referred }
    const [loadingDetail, setLoadingDetail] = useState(false);

    const [editMode, setEditMode] = useState('adjust');   // 'adjust' | 'set'
    const [vals, setVals] = useState({ referralAmount: '', pendingReferralAmount: '', referralCount: '' });
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const timer = useRef(null);

    const search = useCallback(async (text) => {
        try {
            setSearching(true);
            setResults(await referralAdminService.search(text));
        } catch (e) {
            Alert.alert('Search failed', e?.response?.data?.message || 'Check your internet and try again.');
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => { search(''); }, [search]);
    useEffect(() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => search(q), 400);
        return () => clearTimeout(timer.current);
    }, [q, search]);

    const open = async (id) => {
        try {
            setLoadingDetail(true);
            setDetail(await referralAdminService.get(id));
            setVals({ referralAmount: '', pendingReferralAmount: '', referralCount: '' });
            setNote('');
        } catch (e) {
            Alert.alert('Could not load', e?.response?.data?.message || 'Try again.');
        } finally {
            setLoadingDetail(false);
        }
    };

    const save = async () => {
        const payload = { mode: editMode, note };
        for (const k of Object.keys(vals)) {
            if (vals[k].trim() !== '') payload[k] = vals[k].trim();
        }
        if (Object.keys(payload).length === 2) return Alert.alert('Nothing to save', 'Enter at least one value.');
        try {
            setSaving(true);
            await referralAdminService.update(detail.user._id, payload);
            await open(detail.user._id);
            search(q);
            Alert.alert('Saved', 'Referral details updated.');
        } catch (e) {
            Alert.alert('Could not save', e?.response?.data?.message || 'Check your internet and try again.');
        } finally {
            setSaving(false);
        }
    };

    const u = detail?.user;
    const input = [s.input, { backgroundColor: c.surfaceLow, borderColor: c.border, color: c.textPrimary }];

    const Field = ({ label, k, hint, current, int }) => (
        <View style={{ gap: 4 }}>
            <Text style={[s.label, { color: c.textSecondary }]}>{label} <Text style={{ color: c.textMuted }}>(now {int ? current ?? 0 : money(current)})</Text></Text>
            <TextInput
                value={vals[k]}
                onChangeText={(t) => setVals((p) => ({ ...p, [k]: t.replace(editMode === 'adjust' ? /[^0-9.\-]/g : /[^0-9.]/g, '') }))}
                placeholder={editMode === 'adjust' ? hint : 'New value'}
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                style={input}
            />
        </View>
    );

    return (
        <TabScreenWrapper greeting="Referral Wallets" showMenuIcon showBookingIcon={false}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
                    {!u ? (
                        <>
                            <TextInput
                                value={q} onChangeText={setQ} placeholder="Search name, phone or referral code"
                                placeholderTextColor={c.textMuted} style={input} autoCapitalize="none"
                            />
                            {searching || loadingDetail ? <ActivityIndicator color={c.primary} /> : null}
                            {results.map((r) => (
                                <TouchableOpacity key={r._id} onPress={() => open(r._id)} activeOpacity={0.8}
                                    style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.title, { color: c.textPrimary }]}>{name(r)}</Text>
                                        <Text style={[s.sub, { color: c.textMuted }]}>{r.phone} · {r.referralCode} · {r.accountType}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[s.title, { color: '#2ECC9A' }]}>{money(r.referralAmount)}</Text>
                                        <Text style={[s.sub, { color: c.textMuted }]}>{r.referralCount || 0} referrals</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {!searching && results.length === 0 ? <Text style={{ color: c.textMuted, textAlign: 'center' }}>No customers found.</Text> : null}
                        </>
                    ) : (
                        <>
                            <TouchableOpacity onPress={() => setDetail(null)} style={s.back}>
                                <Ionicons name="chevron-back" size={18} color={c.primary} />
                                <Text style={{ color: c.primary, fontWeight: '700' }}>All customers</Text>
                            </TouchableOpacity>

                            <View style={[s.cardCol, { backgroundColor: c.surface, borderColor: c.border }]}>
                                <Text style={[s.title, { color: c.textPrimary, fontSize: 17 }]}>{name(u)}</Text>
                                <Text style={[s.sub, { color: c.textMuted }]}>{u.phone} · code {u.referralCode} · {u.accountType}</Text>
                                {[
                                    ['Available balance', money(u.referralAmount), '#2ECC9A'],
                                    ['Pending (not yet unlocked)', money(u.pendingReferralAmount), '#E2A731'],
                                    ['Total earned', money(u.totalReferralEarned), c.textPrimary],
                                    [u.accountType === 'business' ? 'Total withdrawn' : 'Used at checkout', money(u.accountType === 'business' ? u.totalWithdrawn : u.totalReferralRedeemed), '#FF6B6B'],
                                    ['Referrals', `${u.referralCount || 0} (${(detail.referred || []).filter((r) => r.referralRewardGranted).length} paid)`, c.textPrimary],
                                ].map(([l, v, col]) => (
                                    <View key={l} style={s.kv}><Text style={{ color: c.textSecondary }}>{l}</Text><Text style={{ color: col, fontWeight: '800' }}>{v}</Text></View>
                                ))}
                            </View>

                            <View style={[s.cardCol, { backgroundColor: c.surface, borderColor: c.border }]}>
                                <Text style={[s.title, { color: c.textPrimary }]}>Edit amounts</Text>
                                <View style={s.seg}>
                                    {[['adjust', 'Add / subtract'], ['set', 'Set exact']].map(([k, l]) => (
                                        <TouchableOpacity key={k} onPress={() => { setEditMode(k); setVals({ referralAmount: '', pendingReferralAmount: '', referralCount: '' }); }}
                                            style={[s.segBtn, { backgroundColor: editMode === k ? c.primary : c.surfaceLow, borderColor: c.border }]}>
                                            <Text style={{ color: editMode === k ? '#1a1a1a' : c.textSecondary, fontWeight: '800' }}>{l}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Field label="Available balance" k="referralAmount" hint="e.g. 50 or -50" current={u.referralAmount} />
                                <Field label="Pending amount" k="pendingReferralAmount" hint="e.g. 50 or -50" current={u.pendingReferralAmount} />
                                <Field label="Referral count" k="referralCount" hint="e.g. 1 or -1" current={u.referralCount} int />
                                <TextInput value={note} onChangeText={setNote} placeholder="Reason (saved in the audit log)" placeholderTextColor={c.textMuted} maxLength={300} style={input} />
                                <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85} style={[s.save, { backgroundColor: c.primary, opacity: saving ? 0.5 : 1 }]}>
                                    {saving ? <ActivityIndicator color="#1a1a1a" /> : <Text style={{ color: '#1a1a1a', fontWeight: '800', fontSize: 15 }}>Save changes</Text>}
                                </TouchableOpacity>
                            </View>

                            <Text style={[s.section, { color: c.textSecondary }]}>Change history</Text>
                            <View style={[s.cardCol, { backgroundColor: c.surface, borderColor: c.border }]}>
                                {(u.referralAdjustments || []).length === 0 ? <Text style={{ color: c.textMuted }}>No manual changes yet.</Text> : null}
                                {[...(u.referralAdjustments || [])].reverse().map((a) => (
                                    <View key={a._id} style={{ gap: 2 }}>
                                        <Text style={{ color: c.textPrimary, fontWeight: '700' }}>
                                            {Object.keys(a.after || {}).map((k) => `${k.replace('referral', '').replace('Amount', '') || 'Balance'}: ${a.before?.[k]} → ${a.after[k]}`).join('  ·  ')}
                                        </Text>
                                        <Text style={[s.sub, { color: c.textMuted }]}>{a.adminName} · {new Date(a.at).toLocaleString('en-IN')}{a.note ? ` · ${a.note}` : ''}</Text>
                                    </View>
                                ))}
                            </View>

                            <Text style={[s.section, { color: c.textSecondary }]}>Withdrawal requests</Text>
                            <View style={[s.cardCol, { backgroundColor: c.surface, borderColor: c.border }]}>
                                {(u.withdrawalRequests || []).length === 0 ? <Text style={{ color: c.textMuted }}>None.</Text> : null}
                                {[...(u.withdrawalRequests || [])].reverse().map((w) => (
                                    <View key={w._id} style={s.kv}>
                                        <Text style={{ color: c.textSecondary }}>{new Date(w.requestDate).toLocaleDateString('en-IN')} · {w.status}</Text>
                                        <Text style={{ color: c.textPrimary, fontWeight: '800' }}>{money(w.amount)}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </TabScreenWrapper>
    );
}

const s = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 120, gap: 12 },
    input: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
    card: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
    cardCol: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
    title: { fontSize: 15, fontWeight: '700' },
    sub: { fontSize: 12, marginTop: 2 },
    label: { fontSize: 12.5, fontWeight: '700' },
    kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    seg: { flexDirection: 'row', gap: 8 },
    segBtn: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    save: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    section: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 },
});
