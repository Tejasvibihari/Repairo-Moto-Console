import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import { callNumber, openWhatsApp, followUpState, formatDateTime, timeAgo } from '../../utils/leadUtils';
import { sourceLabel } from '../../constants/leadConstants';

const FOLLOW_UP_COLOR = { overdue: '#FF6B6B', today: '#e2a731', upcoming: '#2ECC9A' };
const FOLLOW_UP_TEXT = { overdue: 'Overdue', today: 'Due', upcoming: 'Scheduled' };

export default function LeadCard({ lead, theme, onPress }) {
    const C = theme.colors;
    const vehicle = [lead.vehicle?.brand, lead.vehicle?.model].filter(Boolean).join(' ');
    const fuState = lead.status === 'follow_up' || lead.followUp?.date ? followUpState(lead.followUp) : null;
    const services = lead.serviceInterest || [];

    return (
        <TouchableOpacity
            activeOpacity={0.82}
            onPress={onPress}
            style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, ...theme.shadow.soft }]}
        >
            <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.textPrimary }]} numberOfLines={1}>
                        {lead.customer?.name}
                    </Text>
                    <Text style={[styles.phone, { color: C.textSecondary }]}>{lead.customer?.phone}</Text>
                </View>
                <StatusBadge status={lead.status} />
            </View>

            {(vehicle || lead.vehicle?.registrationNumber) && (
                <View style={styles.metaRow}>
                    <Ionicons name="bicycle-outline" size={15} color={C.textMuted} />
                    <Text style={[styles.meta, { color: C.textSecondary }]} numberOfLines={1}>
                        {[vehicle, lead.vehicle?.registrationNumber].filter(Boolean).join(' · ')}
                    </Text>
                </View>
            )}

            {services.length > 0 && (
                <View style={styles.chips}>
                    {services.slice(0, 3).map((s) => (
                        <View key={s} style={[styles.chip, { backgroundColor: C.surfaceLow, borderColor: C.border }]}>
                            <Text style={[styles.chipText, { color: C.textSecondary }]} numberOfLines={1}>{s}</Text>
                        </View>
                    ))}
                    {services.length > 3 && (
                        <Text style={[styles.more, { color: C.textMuted }]}>+{services.length - 3}</Text>
                    )}
                </View>
            )}

            <View style={styles.footer}>
                <View style={{ flex: 1 }}>
                    {fuState ? (
                        <View style={styles.metaRow}>
                            <Ionicons name="alarm-outline" size={15} color={FOLLOW_UP_COLOR[fuState]} />
                            <Text style={[styles.meta, { color: FOLLOW_UP_COLOR[fuState], fontWeight: '700' }]} numberOfLines={1}>
                                {FOLLOW_UP_TEXT[fuState]} {formatDateTime(lead.followUp.date)}
                            </Text>
                        </View>
                    ) : (
                        <Text style={[styles.meta, { color: C.textMuted }]} numberOfLines={1}>
                            {sourceLabel(lead.source || 'other')} · {timeAgo(lead.createdAt)}
                        </Text>
                    )}
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        onPress={() => openWhatsApp(lead.customer?.phone)}
                        style={[styles.actionBtn, { backgroundColor: '#25D3661F' }]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityLabel="Message on WhatsApp"
                    >
                        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => callNumber(lead.customer?.phone)}
                        style={[styles.actionBtn, { backgroundColor: C.primary }]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityLabel="Call customer"
                    >
                        <Ionicons name="call" size={17} color="#1a1a1a" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    name: { fontSize: 16, fontWeight: '800', letterSpacing: 0.1 },
    phone: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    meta: { fontSize: 12.5 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, borderWidth: 1, maxWidth: 140 },
    chipText: { fontSize: 11.5, fontWeight: '600' },
    more: { fontSize: 12, fontWeight: '600' },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
