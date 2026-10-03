import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import TelecallerCard from '../../../components/admin/lead/TelecallerCard';
import { useLeadOverview } from '../../../hooks/useLeadOverview';
import { LEAD_STATUS, FILTER_STATUSES, RANGE_OPTIONS } from '../../../constants/leadConstants';

function Tile({ label, value, color, icon, theme }) {
    const C = theme.colors;
    return (
        <View style={[styles.tile, { backgroundColor: C.surfaceLow, borderColor: C.border }]}>
            <Ionicons name={icon} size={16} color={color} />
            <Text style={[styles.tileValue, { color: C.textPrimary }]}>{value}</Text>
            <Text style={[styles.tileLabel, { color: C.textMuted }]} numberOfLines={1}>{label}</Text>
        </View>
    );
}

export default function AdminLeadsOverviewScreen() {
    const navigation = useNavigation();
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;

    const [range, setRange] = useState('all');
    const { data, loading, refreshing, error, refresh, retry } = useLeadOverview(range);

    const summary = data?.summary;
    const rows = data?.telecallers || [];

    const pipeline = useMemo(() => {
        const by = summary?.byStatus || {};
        const list = FILTER_STATUSES.filter((s) => (by[s] || 0) > 0);
        const max = Math.max(1, ...list.map((s) => by[s]));
        return { list, by, max };
    }, [summary]);

    const openList = (params = {}) =>
        navigation.navigate('AdminLeadsList', { range, ...params });

    return (
        <TabScreenWrapper greeting="Leads" showMenuIcon showBookingIcon={false}>
            {/* Range */}
            <View style={styles.rangeWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeRow}>
                    {RANGE_OPTIONS.map((r) => {
                        const active = range === r.key;
                        return (
                            <TouchableOpacity
                                key={r.key}
                                onPress={() => setRange(r.key)}
                                activeOpacity={0.8}
                                style={[
                                    styles.rangeChip,
                                    {
                                        borderColor: active ? C.primary : C.border,
                                        backgroundColor: active ? `${C.primary}22` : C.surface,
                                    },
                                ]}
                            >
                                <Text style={{ color: active ? C.primary : C.textSecondary, fontWeight: '700', fontSize: 13 }}>
                                    {r.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {loading && !data ? (
                <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
            ) : error && !data ? (
                <View style={styles.center}>
                    <Ionicons name="cloud-offline-outline" size={44} color={C.textMuted} />
                    <Text style={[styles.errTitle, { color: C.textPrimary }]}>Could not load overview</Text>
                    <Text style={{ color: C.textSecondary, textAlign: 'center', marginTop: 4 }}>{error}</Text>
                    <TouchableOpacity onPress={retry} style={[styles.retry, { backgroundColor: C.primary }]}>
                        <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Try again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.primary} colors={[C.primary]} />}
                >
                    {/* Summary */}
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => openList()}
                        style={[styles.hero, { backgroundColor: C.surface, borderColor: C.border, ...theme.shadow.soft }]}
                    >
                        <View style={styles.heroTop}>
                            <View>
                                <Text style={[styles.heroLabel, { color: C.textMuted }]}>Total leads</Text>
                                <Text style={[styles.heroValue, { color: C.textPrimary }]}>{summary?.total ?? 0}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.heroLabel, { color: C.textMuted }]}>Conversion</Text>
                                <Text style={[styles.heroValue, { color: '#2ECC9A' }]}>{summary?.conversionRate ?? 0}%</Text>
                            </View>
                        </View>
                        <Text style={{ color: C.textSecondary, fontSize: 12.5 }}>
                            {summary?.converted ?? 0} converted (booked or completed) · tap to view all leads
                        </Text>

                        <View style={styles.tiles}>
                            <Tile label="Added today" value={summary?.createdToday ?? 0} icon="sparkles-outline" color="#8B5CF6" theme={theme} />
                            <Tile label="Follow-ups today" value={summary?.followUpsToday ?? 0} icon="alarm-outline" color="#e2a731" theme={theme} />
                            <Tile label="Overdue" value={summary?.overdueFollowUps ?? 0} icon="warning-outline" color="#FF6B6B" theme={theme} />
                            <Tile label="Invoiced" value={summary?.invoicesLinked ?? 0} icon="document-text-outline" color="#2ECC9A" theme={theme} />
                        </View>
                    </TouchableOpacity>

                    {/* Status pipeline */}
                    {pipeline.list.length > 0 && (
                        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
                            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>By status</Text>
                            {pipeline.list.map((s) => {
                                const cfg = LEAD_STATUS[s];
                                const count = pipeline.by[s];
                                return (
                                    <TouchableOpacity
                                        key={s}
                                        activeOpacity={0.75}
                                        onPress={() => openList({ status: s })}
                                        style={styles.pipeRow}
                                    >
                                        <Text style={[styles.pipeLabel, { color: C.textSecondary }]} numberOfLines={1}>{cfg.label}</Text>
                                        <View style={[styles.pipeTrack, { backgroundColor: C.surfaceHigh }]}>
                                            <View style={{ width: `${Math.max(4, (count / pipeline.max) * 100)}%`, height: '100%', backgroundColor: cfg.color, borderRadius: 5 }} />
                                        </View>
                                        <Text style={[styles.pipeCount, { color: C.textPrimary }]}>{count}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Per telecaller */}
                    <View style={styles.listHead}>
                        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Team</Text>
                        <Text style={{ color: C.textMuted, fontSize: 12.5 }}>
                            {summary?.activeTelecallers ?? 0} of {summary?.totalTelecallers ?? 0} telecallers active
                        </Text>
                    </View>

                    {rows.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={40} color={C.textMuted} />
                            <Text style={{ color: C.textSecondary, marginTop: 8 }}>No leads or telecallers yet.</Text>
                        </View>
                    ) : (
                        rows.map((row) => (
                            <TelecallerCard
                                key={`${row.leadById || ''}${row.leadBy}`}
                                row={row}
                                theme={theme}
                                onPress={() => openList({ leadBy: row.leadBy })}
                            />
                        ))
                    )}
                </ScrollView>
            )}
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    rangeWrap: { marginTop: 8 },
    rangeRow: { paddingHorizontal: 16, gap: 8 },
    rangeChip: { paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 16, paddingBottom: 150, gap: 12 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errTitle: { fontSize: 17, fontWeight: '800', marginTop: 10 },
    retry: { marginTop: 14, paddingHorizontal: 22, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    hero: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 8 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between' },
    heroLabel: { fontSize: 12.5, fontWeight: '600' },
    heroValue: { fontSize: 32, fontWeight: '900', marginTop: 2 },
    tiles: { flexDirection: 'row', gap: 8, marginTop: 8 },
    tile: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 10, alignItems: 'center', gap: 3 },
    tileValue: { fontSize: 18, fontWeight: '800' },
    tileLabel: { fontSize: 10.5, fontWeight: '600' },
    section: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 4 },
    sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
    pipeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    pipeLabel: { width: 96, fontSize: 12.5, fontWeight: '600' },
    pipeTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
    pipeCount: { width: 32, textAlign: 'right', fontSize: 13.5, fontWeight: '800' },
    listHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 },
    empty: { alignItems: 'center', paddingTop: 30 },
});
