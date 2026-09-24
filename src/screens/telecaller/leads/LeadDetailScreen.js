import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    AppState,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import StatusBadge from '../../../components/telecaller/StatusBadge';
import LeadStatusSheet from '../../../components/telecaller/LeadStatusSheet';
import { leadService, getErrorMessage } from '../../../services/leadService';
import { leadEvents } from '../../../utils/leadEvents';
import { CLOSING_STATUSES, sourceLabel } from '../../../constants/leadConstants';
import {
    callNumber,
    openWhatsApp,
    openMap,
    followUpState,
    formatDateTime,
    timeAgo,
} from '../../../utils/leadUtils';

const FOLLOW_UP_COLOR = { overdue: '#FF6B6B', today: '#e2a731', upcoming: '#2ECC9A' };
const FOLLOW_UP_TEXT = { overdue: 'Overdue', today: 'Due today', upcoming: 'Scheduled' };

function Section({ title, theme, children, right }) {
    const C = theme.colors;
    return (
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{title}</Text>
                {right}
            </View>
            {children}
        </View>
    );
}

function Row({ label, value, theme }) {
    if (!value) return null;
    return (
        <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.colors.textMuted }]}>{label}</Text>
            <Text style={[styles.rowValue, { color: theme.colors.textPrimary }]}>{value}</Text>
        </View>
    );
}

export default function LeadDetailScreen() {
    const navigation = useNavigation();
    const { params } = useRoute();
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const user = useSelector((s) => s.auth.user);

    const [lead, setLead] = useState(params?.lead || null);
    const [loading, setLoading] = useState(!params?.lead);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const [sheet, setSheet] = useState({ visible: false, title: 'Update status' });
    const [saving, setSaving] = useState(false);
    const [remarkText, setRemarkText] = useState('');

    const pendingCall = useRef(false);

    const load = useCallback(async () => {
        try {
            const res = await leadService.get(params.leadId);
            setLead(res.data);
            setError(null);
        } catch (e) {
            setError(getErrorMessage(e, 'Could not load this lead.'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [params.leadId]);

    useEffect(() => { load(); }, [load]);

    // Coming back from the edit form → refetch.
    useEffect(() => leadEvents.subscribe(load), [load]);

    // After the dialer closes, ask how the call went.
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && pendingCall.current) {
                pendingCall.current = false;
                setSheet({ visible: true, title: 'How did the call go?' });
            }
        });
        return () => sub.remove();
    }, []);

    // Opens the invoice that was linked to this lead (read-only for staff).
    const openLinkedInvoice = () => {
        const id = lead?.invoice?.invoiceId;
        if (!id) return;
        navigation.navigate('ManualInvoiceDetail', {
            invoiceId: String(id?._id || id),
            readOnly: true,
        });
    };

    const startCall = async () => {
        pendingCall.current = true;
        const ok = await callNumber(lead.customer?.phone);
        if (!ok) pendingCall.current = false;
    };

    // Persist a partial update and refresh local + list state.
    const save = async (payload) => {
        setSaving(true);
        try {
            const res = await leadService.update(lead._id, payload);
            setLead(res.data);
            leadEvents.emit();
            return true;
        } catch (e) {
            Alert.alert('Could not save', getErrorMessage(e, 'Please try again.'));
            return false;
        } finally {
            setSaving(false);
        }
    };

    // Remarks are stored as one array on the lead, so an update sends the
    // whole array with the new entry appended.
    const withRemark = (text) => [...(lead.remarks || []), { text, addedBy: user?._id }];

    const submitStatus = async ({ status, followUpDate, remark }) => {
        const payload = { status };
        if (status === 'follow_up') {
            payload.followUp = {
                date: followUpDate.toISOString(),
                note: remark || lead.followUp?.note || '',
            };
        } else if (CLOSING_STATUSES.includes(status) && lead.followUp?.date) {
            payload.followUp = { date: null, note: '' };
        }
        if (remark) payload.remarks = withRemark(remark);

        if (await save(payload)) setSheet((s) => ({ ...s, visible: false }));
    };

    const addRemark = async () => {
        const text = remarkText.trim();
        if (!text) return;
        if (await save({ remarks: withRemark(text) })) setRemarkText('');
    };

    const onRefresh = () => { setRefreshing(true); load(); };

    // ── Loading / error ──
    if (loading || !lead) {
        return (
            <ScreenWrapper title="Lead">
                <View style={styles.center}>
                    {loading ? (
                        <ActivityIndicator size="large" color={C.primary} />
                    ) : (
                        <>
                            <Text style={{ color: C.textPrimary, fontWeight: '700', marginBottom: 12 }}>{error}</Text>
                            <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={[styles.retry, { backgroundColor: C.primary }]}>
                                <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Try again</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScreenWrapper>
        );
    }

    const fuState = followUpState(lead.followUp);
    const remarks = [...(lead.remarks || [])].reverse();
    const vehicle = [lead.vehicle?.brand, lead.vehicle?.model].filter(Boolean).join(' ');
    const hasLocation = lead.location?.address || lead.location?.city || lead.location?.googleMapLink ||
        (lead.location?.latitude != null && lead.location?.longitude != null);

    return (
        <ScreenWrapper
            title={lead.customer?.name || 'Lead'}
            noPadding
            rightSlot={
                <TouchableOpacity
                    onPress={() => navigation.navigate('LeadForm', { lead })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Edit lead"
                >
                    <Ionicons name="create-outline" size={22} color={C.textPrimary} />
                </TouchableOpacity>
            }
        >
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
                >
                    {/* Hero */}
                    <View style={[styles.hero, { backgroundColor: C.surface, borderColor: C.border, ...theme.shadow.soft }]}>
                        <View style={styles.heroTop}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.heroName, { color: C.textPrimary }]}>{lead.customer?.name}</Text>
                                <Text style={[styles.heroPhone, { color: C.textSecondary }]}>{lead.customer?.phone}</Text>
                            </View>
                            <StatusBadge status={lead.status} />
                        </View>

                        <View style={styles.heroActions}>
                            <TouchableOpacity onPress={startCall} activeOpacity={0.85} style={[styles.callBtn, { backgroundColor: C.primary }]}>
                                <Ionicons name="call" size={18} color="#1a1a1a" />
                                <Text style={styles.callBtnText}>Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => openWhatsApp(lead.customer?.phone)}
                                activeOpacity={0.85}
                                style={[styles.waBtn, { backgroundColor: '#25D3661F', borderColor: '#25D36655' }]}
                            >
                                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                                <Text style={[styles.callBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => setSheet({ visible: true, title: 'Update status' })}
                            activeOpacity={0.8}
                            style={[styles.statusBtn, { borderColor: C.border, backgroundColor: C.surfaceLow }]}
                        >
                            <Ionicons name="swap-horizontal-outline" size={17} color={C.textPrimary} />
                            <Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: 13.5 }}>Update status</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Follow-up */}
                    {fuState && (
                        <View style={[styles.followUp, { borderColor: FOLLOW_UP_COLOR[fuState], backgroundColor: `${FOLLOW_UP_COLOR[fuState]}14` }]}>
                            <Ionicons name="alarm-outline" size={20} color={FOLLOW_UP_COLOR[fuState]} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: FOLLOW_UP_COLOR[fuState], fontWeight: '800', fontSize: 14 }}>
                                    {FOLLOW_UP_TEXT[fuState]} · {formatDateTime(lead.followUp.date)}
                                </Text>
                                {!!lead.followUp?.note && (
                                    <Text style={{ color: C.textSecondary, fontSize: 13, marginTop: 2 }}>{lead.followUp.note}</Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Interest */}
                    <Section title="Lead details" theme={theme}>
                        <Row label="Source" value={sourceLabel(lead.source || 'other')} theme={theme} />
                        <Row label="Added by" value={lead.leadBy} theme={theme} />
                        <Row label="Created" value={`${formatDateTime(lead.createdAt)} (${timeAgo(lead.createdAt)})`} theme={theme} />
                        {(lead.serviceInterest || []).length > 0 && (
                            <View style={styles.chips}>
                                {lead.serviceInterest.map((s) => (
                                    <View key={s} style={[styles.chip, { backgroundColor: C.surfaceLow, borderColor: C.border }]}>
                                        <Text style={{ color: C.textSecondary, fontSize: 12.5, fontWeight: '600' }}>{s}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        {lead.invoice?.linked && !!lead.invoice?.invoiceId && (
                            <TouchableOpacity
                                onPress={openLinkedInvoice}
                                activeOpacity={0.8}
                                style={styles.invoiceBtn}
                            >
                                <Ionicons name="document-text-outline" size={17} color="#2ECC9A" />
                                <Text style={{ flex: 1, color: '#2ECC9A', fontWeight: '800', fontSize: 13.5 }}>View linked invoice</Text>
                                <Ionicons name="chevron-forward" size={17} color="#2ECC9A" />
                            </TouchableOpacity>
                        )}
                    </Section>

                    {/* Vehicle */}
                    {(vehicle || lead.vehicle?.registrationNumber) && (
                        <Section title="Vehicle" theme={theme}>
                            <Row label="Bike" value={vehicle} theme={theme} />
                            <Row label="Registration" value={lead.vehicle?.registrationNumber} theme={theme} />
                        </Section>
                    )}

                    {/* Location */}
                    {hasLocation && (
                        <Section
                            title="Location"
                            theme={theme}
                            right={
                                <TouchableOpacity onPress={() => openMap(lead.location)} style={styles.mapBtn}>
                                    <Ionicons name="navigate-outline" size={16} color={C.primary} />
                                    <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>Open map</Text>
                                </TouchableOpacity>
                            }
                        >
                            <Row label="Address" value={lead.location?.address} theme={theme} />
                            <Row label="City" value={lead.location?.city} theme={theme} />
                        </Section>
                    )}

                    {/* Remarks */}
                    <Section title={`Remarks (${remarks.length})`} theme={theme}>
                        <View style={[styles.remarkInputWrap, { borderColor: C.border, backgroundColor: C.surfaceLow }]}>
                            <TextInput
                                value={remarkText}
                                onChangeText={setRemarkText}
                                placeholder="Add a remark"
                                placeholderTextColor={C.textMuted}
                                multiline
                                style={[styles.remarkInput, { color: C.textPrimary }]}
                            />
                            <TouchableOpacity
                                onPress={addRemark}
                                disabled={saving || !remarkText.trim()}
                                style={[styles.sendBtn, { backgroundColor: remarkText.trim() ? C.primary : C.border }]}
                                accessibilityLabel="Save remark"
                            >
                                {saving && !sheet.visible ? (
                                    <ActivityIndicator size="small" color="#1a1a1a" />
                                ) : (
                                    <Ionicons name="send" size={16} color="#1a1a1a" />
                                )}
                            </TouchableOpacity>
                        </View>

                        {remarks.length === 0 ? (
                            <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>No remarks yet.</Text>
                        ) : (
                            remarks.map((r, i) => (
                                <View key={r._id || i} style={[styles.remark, { borderLeftColor: C.primary }]}>
                                    <Text style={{ color: C.textPrimary, fontSize: 14, lineHeight: 20 }}>{r.text}</Text>
                                    <Text style={{ color: C.textMuted, fontSize: 11.5, marginTop: 4 }}>
                                        {formatDateTime(r.createdAt)}
                                    </Text>
                                </View>
                            ))
                        )}
                    </Section>
                </ScrollView>
            </KeyboardAvoidingView>

            <LeadStatusSheet
                visible={sheet.visible}
                title={sheet.title}
                theme={theme}
                currentStatus={lead.status}
                currentFollowUp={lead.followUp}
                submitting={saving}
                onClose={() => setSheet((s) => ({ ...s, visible: false }))}
                onSubmit={submitStatus}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40, gap: 12 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    retry: { paddingHorizontal: 22, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    hero: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    heroName: { fontSize: 20, fontWeight: '800' },
    heroPhone: { fontSize: 15, fontWeight: '500', marginTop: 3 },
    heroActions: { flexDirection: 'row', gap: 10 },
    callBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    waBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    callBtnText: { color: '#1a1a1a', fontWeight: '800', fontSize: 15 },
    statusBtn: { height: 44, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    followUp: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
    section: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 15, fontWeight: '800' },
    row: { flexDirection: 'row', gap: 12 },
    rowLabel: { width: 88, fontSize: 13 },
    rowValue: { flex: 1, fontSize: 14, fontWeight: '600' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    invoiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#2ECC9A', backgroundColor: '#2ECC9A14', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
    mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    remarkInputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1, borderRadius: 14, padding: 8 },
    remarkInput: { flex: 1, fontSize: 14, minHeight: 40, maxHeight: 110, paddingHorizontal: 6, paddingVertical: 6, textAlignVertical: 'top' },
    sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    remark: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 2, marginTop: 10 },
});
