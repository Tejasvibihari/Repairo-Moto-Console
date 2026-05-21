import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../../styles/Theme'; // adjust path
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import AdminManualOrderForm from '../../../components/admin/order/AdminManualOrderForm';
import useOrder from '../../../hooks/useOrder';
import PopUp from '../../../components/common/PopUp';

// ─── Success Modal ────────────────────────────────────────────────────────────
const SuccessModal = ({ visible, orderId, onClose, colors }) => (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
        <View style={m.overlay}>
            <View style={[m.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={m.emoji}>🎉</Text>
                <Text style={[m.title, { color: colors.textPrimary }]}>Order Created!</Text>
                {!!orderId && (
                    <View style={[m.badge, { backgroundColor: colors.surfaceHigh }]}>
                        <Text style={[m.badgeLabel, { color: colors.textMuted }]}>ORDER ID</Text>
                        <Text style={[m.badgeValue, { color: colors.primary }]}>{orderId}</Text>
                    </View>
                )}
                <Text style={[m.sub, { color: colors.textSecondary }]}>
                    The manual order has been placed successfully.
                </Text>
                <TouchableOpacity onPress={onClose} style={[m.btn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
                    <Text style={m.btnText}>Create Another</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

const m = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    card: { width: '100%', borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center' },
    emoji: { fontSize: 48, marginBottom: 12 },
    title: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
    badge: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center', marginBottom: 16, width: '100%' },
    badgeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
    badgeValue: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
    sub: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    btn: { width: '100%', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const AdminManualOrder = () => {
    // ✅ Read theme mode from Redux store
    const themeMode = useSelector((state) => state.theme.mode);
    const colors = themeMode === 'dark' ? DarkTheme.colors : LightTheme.colors;

    const { createManualOrder, createLoading, createError, clearCreateError } = useOrder();
    const [successModal, setSuccessModal] = useState({ visible: false, orderId: null });
    const [errorPopup, setErrorPopup] = useState({ visible: false, message: '' });

    const handleSubmit = async (payload) => {
        try {
            clearCreateError();
            const res = await createManualOrder(payload);
            setSuccessModal({ visible: true, orderId: res?.data?.orderId || null });
        } catch (err) {
            setErrorPopup({ visible: true, message: err?.message || 'Something went wrong. Please try again.' });
        }
    };

    return (
        <TabScreenWrapper greeting="Create Order" showMenuIcon={true}>
            <View style={[s.content, { backgroundColor: colors.background }]}>
                {/* Error Banner */}
                {!!createError && (
                    <View style={[s.errorBanner, { backgroundColor: colors.error + '18', borderColor: colors.error }]}>
                        <Text style={[s.errorText, { color: colors.error }]}>⚠️  {createError}</Text>
                        <TouchableOpacity onPress={clearCreateError}>
                            <Text style={[s.errorDismiss, { color: colors.error }]}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <AdminManualOrderForm onSubmit={handleSubmit} loading={createLoading} />
            </View>

            <SuccessModal
                visible={successModal.visible}
                orderId={successModal.orderId}
                onClose={() => setSuccessModal({ visible: false, orderId: null })}
                colors={colors}
            />
            
            <PopUp
                visible={errorPopup.visible}
                title="Order Failed"
                message={errorPopup.message}
                primaryLabel="Okay"
                onPrimary={() => setErrorPopup({ visible: false, message: '' })}
                onClose={() => setErrorPopup({ visible: false, message: '' })}
            />
        </TabScreenWrapper>
    );
};

export default AdminManualOrder;

const s = StyleSheet.create({
    content: { flex: 1 },
    errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
    errorText: { flex: 1, fontSize: 13, fontWeight: '500' },
    errorDismiss: { fontSize: 16, fontWeight: '700', paddingLeft: 12 },
});