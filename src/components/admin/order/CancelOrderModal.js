// Asks for a cancellation reason before cancelling an order.
// Used by admin / manager screens. The server requires 5–300 characters.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

export const CANCEL_REASON_MIN = 5;
export const CANCEL_REASON_MAX = 300;

const QUICK_REASONS = [
    'Customer requested cancellation',
    'Customer not reachable',
    'Outside service area',
    'Mechanic not available',
    'Duplicate booking',
];

export default function CancelOrderModal({ visible, onClose, onSubmit, loading = false, orderLabel, theme }) {
    const [reason, setReason] = useState('');
    const [touched, setTouched] = useState(false);

    useEffect(() => { if (visible) { setReason(''); setTouched(false); } }, [visible]);

    const trimmed = reason.trim();
    const tooShort = trimmed.length < CANCEL_REASON_MIN;

    const submit = () => {
        setTouched(true);
        if (tooShort || loading) return;
        onSubmit(trimmed);
    };

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
                <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[s.title, { color: theme.colors.textPrimary }]}>Cancel Order{orderLabel ? ` #${orderLabel}` : ''}?</Text>
                    <Text style={[s.sub, { color: theme.colors.textMuted }]}>
                        The customer and everyone assigned to this order will be notified with this reason.
                    </Text>

                    <View style={s.chips}>
                        {QUICK_REASONS.map(r => (
                            <TouchableOpacity
                                key={r}
                                onPress={() => setReason(r)}
                                style={[s.chip, { borderColor: theme.colors.border, backgroundColor: reason === r ? theme.colors.primary + '22' : 'transparent' }]}
                            >
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{r}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={[s.input, {
                            color: theme.colors.textPrimary,
                            backgroundColor: theme.colors.surfaceLow,
                            borderColor: touched && tooShort ? '#FF6B6B' : theme.colors.border,
                        }]}
                        placeholder="Reason for cancellation"
                        placeholderTextColor={theme.colors.textMuted}
                        value={reason}
                        onChangeText={setReason}
                        maxLength={CANCEL_REASON_MAX}
                        multiline
                        textAlignVertical="top"
                    />
                    <Text style={{ color: touched && tooShort ? '#FF6B6B' : theme.colors.textMuted, fontSize: 11, marginTop: 4 }}>
                        {touched && tooShort ? `Enter at least ${CANCEL_REASON_MIN} characters. ` : ''}{trimmed.length}/{CANCEL_REASON_MAX}
                    </Text>

                    <View style={s.row}>
                        <TouchableOpacity style={[s.btn, { borderColor: theme.colors.border, borderWidth: 1 }]} onPress={onClose} disabled={loading}>
                            <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Keep Order</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.btn, { backgroundColor: '#FF6B6B', opacity: loading ? 0.7 : 1 }]} onPress={submit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Cancel Order</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
    card: { borderRadius: 18, borderWidth: 1, padding: 18 },
    title: { fontSize: 17, fontWeight: '800' },
    sub: { fontSize: 12, marginTop: 6, marginBottom: 12, lineHeight: 17 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
    input: { minHeight: 84, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
    row: { flexDirection: 'row', gap: 10, marginTop: 14 },
    btn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
