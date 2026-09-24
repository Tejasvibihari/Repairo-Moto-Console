import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LEAD_STATUS, TELECALLER_STATUS_OPTIONS } from '../../constants/leadConstants';
import { followUpPresets, parseCustomDateTime, formatDateTime } from '../../utils/leadUtils';

/**
 * Bottom sheet used to record the outcome of a call:
 * pick a status, optionally schedule a follow-up, optionally add a remark.
 *
 * onSubmit({ status, followUpDate: Date | null, remark: string }) → Promise
 */
export default function LeadStatusSheet({
    visible,
    theme,
    title = 'Update status',
    currentStatus,
    currentFollowUp,
    submitting = false,
    onClose,
    onSubmit,
}) {
    const C = theme.colors;
    const [status, setStatus] = useState(null);
    const [followUpDate, setFollowUpDate] = useState(null);
    const [customText, setCustomText] = useState('');
    const [remark, setRemark] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (visible) {
            setStatus(TELECALLER_STATUS_OPTIONS.includes(currentStatus) ? currentStatus : null);
            setFollowUpDate(currentFollowUp?.date ? new Date(currentFollowUp.date) : null);
            setCustomText('');
            setRemark('');
            setError('');
        }
    }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

    const presets = useMemo(() => (visible ? followUpPresets() : []), [visible]);

    const pickCustom = (text) => {
        setCustomText(text);
        const d = parseCustomDateTime(text);
        if (d) setFollowUpDate(d);
    };

    const submit = async () => {
        if (!status) return setError('Choose what happened on this call.');
        if (status === 'follow_up') {
            if (!followUpDate) return setError('Pick when to follow up.');
            if (followUpDate.getTime() < Date.now() - 60000) return setError('The follow-up time is in the past.');
        }
        setError('');
        await onSubmit({
            status,
            followUpDate: status === 'follow_up' ? followUpDate : null,
            remark: remark.trim(),
        });
    };

    return (
        <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={[styles.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <View style={[styles.grabber, { backgroundColor: C.border }]} />
                    <Text style={[styles.title, { color: C.textPrimary }]}>{title}</Text>

                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        <View style={styles.chipWrap}>
                            {TELECALLER_STATUS_OPTIONS.map((key) => {
                                const cfg = LEAD_STATUS[key];
                                const active = status === key;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        onPress={() => setStatus(key)}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.statusChip,
                                            {
                                                borderColor: active ? cfg.color : C.border,
                                                backgroundColor: active ? `${cfg.color}22` : C.surfaceLow,
                                            },
                                        ]}
                                    >
                                        <Ionicons name={cfg.icon} size={16} color={active ? cfg.color : C.textMuted} />
                                        <Text style={[styles.statusChipText, { color: active ? cfg.color : C.textSecondary }]}>
                                            {cfg.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {status === 'follow_up' && (
                            <View style={styles.block}>
                                <Text style={[styles.label, { color: C.textSecondary }]}>Follow up</Text>
                                <View style={styles.chipWrap}>
                                    {presets.map((p) => {
                                        const active = followUpDate && Math.abs(followUpDate - p.date) < 1000;
                                        return (
                                            <TouchableOpacity
                                                key={p.label}
                                                onPress={() => { setFollowUpDate(p.date); setCustomText(''); }}
                                                style={[
                                                    styles.presetChip,
                                                    {
                                                        borderColor: active ? C.primary : C.border,
                                                        backgroundColor: active ? `${C.primary}22` : C.surfaceLow,
                                                    },
                                                ]}
                                            >
                                                <Text style={{ color: active ? C.primary : C.textSecondary, fontWeight: '700', fontSize: 12.5 }}>
                                                    {p.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                <TextInput
                                    value={customText}
                                    onChangeText={pickCustom}
                                    placeholder="Or type a time: 25/12/2026 16:30"
                                    placeholderTextColor={C.textMuted}
                                    keyboardType="numbers-and-punctuation"
                                    style={[styles.input, { color: C.textPrimary, borderColor: C.border, backgroundColor: C.surfaceLow }]}
                                />
                                {followUpDate && (
                                    <Text style={[styles.hint, { color: C.textSecondary }]}>
                                        Reminder set for {formatDateTime(followUpDate)}
                                    </Text>
                                )}
                            </View>
                        )}

                        <View style={styles.block}>
                            <Text style={[styles.label, { color: C.textSecondary }]}>Remark (optional)</Text>
                            <TextInput
                                value={remark}
                                onChangeText={setRemark}
                                placeholder="What did the customer say?"
                                placeholderTextColor={C.textMuted}
                                multiline
                                style={[styles.input, styles.multiline, { color: C.textPrimary, borderColor: C.border, backgroundColor: C.surfaceLow }]}
                            />
                        </View>

                        {!!error && <Text style={styles.error}>{error}</Text>}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: C.border, borderWidth: 1 }]} disabled={submitting}>
                            <Text style={{ color: C.textPrimary, fontWeight: '700' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={submit} style={[styles.btn, { backgroundColor: C.primary, flex: 1.4 }]} disabled={submitting}>
                            {submitting ? (
                                <ActivityIndicator color="#1a1a1a" />
                            ) : (
                                <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        borderWidth: 1,
        borderBottomWidth: 0,
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 22,
        maxHeight: '88%',
    },
    grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
    title: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statusChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5,
    },
    statusChipText: { fontSize: 13, fontWeight: '700' },
    presetChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
    block: { marginTop: 16, gap: 8 },
    label: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.2 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
    multiline: { minHeight: 76, textAlignVertical: 'top' },
    hint: { fontSize: 12.5 },
    error: { color: '#FF6B6B', fontSize: 13, fontWeight: '600', marginTop: 12 },
    footer: { flexDirection: 'row', gap: 10, marginTop: 16 },
    btn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
