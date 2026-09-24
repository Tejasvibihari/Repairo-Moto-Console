import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import StatusBadge from '../../../components/telecaller/StatusBadge';
import { leadService, getErrorMessage } from '../../../services/leadService';
import { leadEvents } from '../../../utils/leadEvents';
import { LEAD_STATUS, FILTER_STATUSES } from '../../../constants/leadConstants';
import { followUpState, formatDateTime, timeAgo } from '../../../utils/leadUtils';

export default function TelecallerDashboardScreen() {
    const navigation = useNavigation();
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const user = useSelector((s) => s.auth.user);
    const firstName = user?.firstName || 'there';

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchDashboard = useCallback(async () => {
        try {
            setError(null);
            const res = await leadService.dashboard();
            setData(res.data);
        } catch (e) {
            setError(getErrorMessage(e, 'Could not load your dashboard.'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Refresh whenever the tab comes into view, and after any lead change.
    useFocusEffect(useCallback(() => { fetchDashboard(); }, [fetchDashboard]));
    useEffect(() => leadEvents.subscribe(fetchDashboard), [fetchDashboard]);

    const goToLeads = (status = '') => navigation.navigate('Leads', { status, ts: Date.now() });

    const greeting = () => {
        const h = new Date().getHours();
        return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    };

    const stats = data && [
        { key: 'total', label: 'Total leads', value: data.totalAssigned, icon: 'people-outline', color: '#3B82F6', onPress: () => goToLeads('') },
        { key: 'new', label: 'Added today', value: data.newToday, icon: 'sparkles-outline', color: '#8B5CF6', onPress: () => goToLeads('new') },
        { key: 'fu', label: 'Follow-ups today', value: data.followUpsToday, icon: 'alarm-outline', color: '#e2a731', onPress: () => goToLeads('follow_up') },
        { key: 'booked', label: 'Booked', value: data.bookedCount, icon: 'calendar-outline', color: '#2ECC9A', onPress: () => goToLeads('booked') },
    ];

    const counts = data?.countsByStatus || {};
    const pipeline = FILTER_STATUSES.filter((s) => counts[s] > 0);
    const maxCount = Math.max(1, ...pipeline.map((s) => counts[s]));

    return (
        <TabScreenWrapper greeting="Dashboard" showMenuIcon showBookingIcon={false}>
            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
            ) : error && !data ? (
                <View style={styles.center}>
                    <Ionicons name="cloud-offline-outline" size={44} color={C.textMuted} />
                    <Text style={[styles.errTitle, { color: C.textPrimary }]}>Could not load dashboard</Text>
                    <Text style={{ color: C.textSecondary, textAlign: 'center', marginTop: 4 }}>{error}</Text>
                    <TouchableOpacity onPress={() => { setLoading(true); fetchDashboard(); }} style={[styles.retry, { backgroundColor: C.primary }]}>
                        <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Try again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); }} tintColor={C.primary} colors={[C.primary]} />}
                >
                    <Text style={[styles.hello, { color: C.textPrimary }]}>{greeting()}, {firstName}</Text>
                    <Text style={[styles.sub, { color: C.textSecondary }]}>
                        {data.followUpsToday > 0
                            ? `You have ${data.followUpsToday} follow-up${data.followUpsToday === 1 ? '' : 's'} today.`
                            : 'No follow-ups scheduled for today.'}
                    </Text>

                    <View style={styles.grid}>
                        {stats.map((s) => (
                            <TouchableOpacity
                                key={s.key}
                                activeOpacity={0.82}
                                onPress={s.onPress}
                                style={[styles.stat, { backgroundColor: C.surface, borderColor: C.border, ...theme.shadow.soft }]}
                            >
                                <View style={[styles.statIcon, { backgroundColor: `${s.color}1F` }]}>
                                    <Ionicons name={s.icon} size={20} color={s.color} />
                                </View>
                                <Text style={[styles.statValue, { color: C.textPrimary }]}>{s.value ?? 0}</Text>
                                <Text style={[styles.statLabel, { color: C.textSecondary }]}>{s.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('LeadForm')}
                        activeOpacity={0.85}
                        style={[styles.addBtn, { backgroundColor: C.primary }]}
                    >
                        <Ionicons name="add-circle-outline" size={20} color="#1a1a1a" />
                        <Text style={styles.addBtnText}>Add a lead</Text>
                    </TouchableOpacity>

                    {pipeline.length > 0 && (
                        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Lead status</Text>
                            {pipeline.map((s) => (
                                <TouchableOpacity key={s} activeOpacity={0.75} onPress={() => goToLeads(s)} style={styles.barRow}>
                                    <Text style={[styles.barLabel, { color: C.textSecondary }]} numberOfLines={1}>{LEAD_STATUS[s].label}</Text>
                                    <View style={[styles.barTrack, { backgroundColor: C.surfaceLow }]}>
                                        <View style={[styles.barFill, { width: `${(counts[s] / maxCount) * 100}%`, backgroundColor: LEAD_STATUS[s].color }]} />
                                    </View>
                                    <Text style={[styles.barCount, { color: C.textPrimary }]}>{counts[s]}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                        <View style={styles.cardHead}>
                            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Recent leads</Text>
                            <TouchableOpacity onPress={() => goToLeads('')}>
                                <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>See all</Text>
                            </TouchableOpacity>
                        </View>
                        {(data.recentLeads || []).length === 0 ? (
                            <Text style={{ color: C.textMuted, fontSize: 13 }}>Leads you add will show up here.</Text>
                        ) : (
                            data.recentLeads.slice(0, 6).map((l) => {
                                const fu = l.followUp?.date ? followUpState(l.followUp) : null;
                                return (
                                    <TouchableOpacity
                                        key={l._id}
                                        activeOpacity={0.75}
                                        onPress={() => navigation.navigate('LeadDetail', { leadId: l._id })}
                                        style={[styles.recent, { borderTopColor: C.border }]}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: 14.5 }} numberOfLines={1}>{l.customer?.name}</Text>
                                            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                                                {fu === 'overdue' || fu === 'today' ? `Follow-up ${formatDateTime(l.followUp.date)}` : timeAgo(l.createdAt)}
                                            </Text>
                                        </View>
                                        <StatusBadge status={l.status} />
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                </ScrollView>
            )}
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errTitle: { fontSize: 17, fontWeight: '800', marginTop: 10 },
    retry: { marginTop: 14, paddingHorizontal: 22, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 16, paddingBottom: 130, gap: 14 },
    hello: { fontSize: 22, fontWeight: '800' },
    sub: { fontSize: 14, marginTop: -8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
    stat: { width: '48%', borderRadius: 18, borderWidth: 1, padding: 14, gap: 6 },
    statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    statValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    statLabel: { fontSize: 12.5, fontWeight: '600' },
    addBtn: { height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    addBtnText: { color: '#1a1a1a', fontWeight: '800', fontSize: 15 },
    card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '800' },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    barLabel: { width: 96, fontSize: 12.5, fontWeight: '600' },
    barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 4 },
    barCount: { width: 28, textAlign: 'right', fontSize: 13, fontWeight: '700' },
    recent: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
