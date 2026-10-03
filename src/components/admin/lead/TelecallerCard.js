import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusStackBar from './StatusStackBar';
import { LEAD_STATUS, FILTER_STATUSES } from '../../../constants/leadConstants';
import { getImageUrl } from '../../../utils/imageUtils';
import { timeAgo } from '../../../utils/leadUtils';

const ROLE_LABEL = { telecaller: 'Telecaller', admin: 'Admin', other: 'Staff' };

const initials = (name = '') =>
    name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

function Stat({ label, value, color, theme }) {
    return (
        <View style={styles.stat}>
            <Text style={[styles.statValue, { color: color || theme.colors.textPrimary }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]} numberOfLines={1}>{label}</Text>
        </View>
    );
}

// One row of the admin overview: who, how many leads, in what state.
export default function TelecallerCard({ row, theme, onPress }) {
    const C = theme.colors;
    const avatar = row.profileImage ? { uri: getImageUrl(row.profileImage) } : null;
    const hasLeads = row.total > 0;
    const topStatuses = FILTER_STATUSES.filter((s) => (row.byStatus?.[s] || 0) > 0);

    return (
        <TouchableOpacity
            activeOpacity={0.82}
            onPress={onPress}
            style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, ...theme.shadow.soft }]}
        >
            <View style={styles.head}>
                {avatar ? (
                    <Image source={avatar} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: C.surfaceHigh }]}>
                        <Text style={{ color: C.primary, fontWeight: '800', fontSize: 15 }}>{initials(row.leadBy)}</Text>
                    </View>
                )}

                <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.textPrimary }]} numberOfLines={1}>{row.leadBy}</Text>
                    <Text style={[styles.sub, { color: C.textMuted }]} numberOfLines={1}>
                        {ROLE_LABEL[row.role] || 'Staff'}
                        {row.lastActivityAt ? ` · active ${timeAgo(row.lastActivityAt)}` : ''}
                    </Text>
                </View>

                <View style={styles.totalWrap}>
                    <Text style={[styles.total, { color: hasLeads ? C.textPrimary : C.textMuted }]}>{row.total}</Text>
                    <Text style={[styles.statLabel, { color: C.textMuted }]}>{row.total === 1 ? 'lead' : 'leads'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </View>

            {hasLeads ? (
                <>
                    <View style={{ marginTop: 12 }}>
                        <StatusStackBar byStatus={row.byStatus} theme={theme} />
                    </View>

                    <View style={styles.legend}>
                        {topStatuses.map((s) => (
                            <View key={s} style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: LEAD_STATUS[s].color }]} />
                                <Text style={{ color: C.textSecondary, fontSize: 11.5 }}>
                                    {LEAD_STATUS[s].label} <Text style={{ fontWeight: '800', color: C.textPrimary }}>{row.byStatus[s]}</Text>
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={[styles.stats, { borderTopColor: C.border }]}>
                        <Stat label="Today" value={row.createdToday} theme={theme} />
                        <Stat label="Follow-ups" value={row.followUpsToday} color={row.followUpsToday ? '#e2a731' : undefined} theme={theme} />
                        <Stat label="Overdue" value={row.overdueFollowUps} color={row.overdueFollowUps ? '#FF6B6B' : undefined} theme={theme} />
                        <Stat label="Converted" value={`${row.converted} · ${row.conversionRate}%`} color="#2ECC9A" theme={theme} />
                    </View>
                </>
            ) : (
                <Text style={[styles.none, { color: C.textMuted }]}>No leads in this period</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 15.5, fontWeight: '800' },
    sub: { fontSize: 12, marginTop: 2 },
    totalWrap: { alignItems: 'center', minWidth: 44 },
    total: { fontSize: 22, fontWeight: '900' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    stats: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 14, fontWeight: '800' },
    statLabel: { fontSize: 11, marginTop: 2 },
    none: { fontSize: 13, marginTop: 10 },
});
