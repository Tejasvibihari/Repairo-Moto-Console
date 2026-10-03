import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import LeadCard from '../../../components/telecaller/LeadCard';
import { useLeads } from '../../../hooks/useLeads';
import { FILTER_STATUSES, LEAD_STATUS, RANGE_LABEL } from '../../../constants/leadConstants';

// Admin view of the lead list. Opened from the overview with optional
// params: { leadBy, status, range }.
export default function AdminLeadsListScreen() {
    const navigation = useNavigation();
    const { params } = useRoute();
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;

    const [leadBy, setLeadBy] = useState(params?.leadBy || '');
    const [status, setStatus] = useState(params?.status || '');
    const range = params?.range || 'all';

    const [searchText, setSearchText] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const t = setTimeout(() => setSearch(searchText.trim()), 400);
        return () => clearTimeout(t);
    }, [searchText]);

    const { items, total, loading, loadingMore, refreshing, error, refresh, loadMore } = useLeads({
        leadBy,
        status,
        search,
        range,
    });

    const filtered = !!(search || status || leadBy);

    const Empty = () => {
        if (loading) return null;
        return (
            <View style={styles.empty}>
                <Ionicons name={error ? 'cloud-offline-outline' : 'people-outline'} size={44} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
                    {error ? 'Could not load leads' : filtered ? 'No leads match' : 'No leads yet'}
                </Text>
                <Text style={[styles.emptyText, { color: C.textSecondary }]}>
                    {error || (filtered ? 'Try a different search or filter.' : 'Leads added by the team will show up here.')}
                </Text>
                {error && (
                    <TouchableOpacity onPress={refresh} style={[styles.emptyBtn, { backgroundColor: C.primary }]}>
                        <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Try again</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <ScreenWrapper title={leadBy ? `${leadBy}'s leads` : 'All leads'} noPadding>
            <View style={styles.root}>
                {/* Active owner + range */}
                <View style={styles.contextRow}>
                    {!!leadBy && (
                        <TouchableOpacity
                            onPress={() => setLeadBy('')}
                            activeOpacity={0.8}
                            style={[styles.ctxChip, { backgroundColor: `${C.primary}22`, borderColor: C.primary }]}
                            accessibilityLabel="Clear lead owner filter"
                        >
                            <Ionicons name="person-circle-outline" size={15} color={C.primary} />
                            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 12.5 }} numberOfLines={1}>{leadBy}</Text>
                            <Ionicons name="close" size={14} color={C.primary} />
                        </TouchableOpacity>
                    )}
                    <View style={[styles.ctxChip, { backgroundColor: C.surface, borderColor: C.border }]}>
                        <Ionicons name="calendar-outline" size={14} color={C.textMuted} />
                        <Text style={{ color: C.textSecondary, fontWeight: '600', fontSize: 12.5 }}>{RANGE_LABEL[range]}</Text>
                    </View>
                </View>

                {/* Search */}
                <View style={[styles.searchBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Ionicons name="search-outline" size={18} color={C.textMuted} />
                    <TextInput
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholder="Search name, phone, vehicle, telecaller"
                        placeholderTextColor={C.textMuted}
                        style={[styles.searchInput, { color: C.textPrimary }]}
                        returnKeyType="search"
                    />
                    {!!searchText && (
                        <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close-circle" size={18} color={C.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Status filter */}
                <View style={styles.filterWrap}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                        {[''].concat(FILTER_STATUSES).map((key) => {
                            const active = status === key;
                            const cfg = key ? LEAD_STATUS[key] : null;
                            const color = cfg?.color || C.primary;
                            return (
                                <TouchableOpacity
                                    key={key || 'all'}
                                    onPress={() => setStatus(key)}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.filterChip,
                                        { borderColor: active ? color : C.border, backgroundColor: active ? `${color}22` : C.surface },
                                    ]}
                                >
                                    <Text style={{ color: active ? color : C.textSecondary, fontWeight: '700', fontSize: 13 }}>
                                        {cfg ? cfg.label : 'All'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {!loading && !error && (
                    <Text style={[styles.count, { color: C.textMuted }]}>
                        {total} {total === 1 ? 'lead' : 'leads'}
                    </Text>
                )}

                {loading ? (
                    <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <LeadCard
                                lead={item}
                                theme={theme}
                                showOwner
                                onPress={() => navigation.navigate('LeadDetail', { leadId: item._id, lead: item })}
                            />
                        )}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.4}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.primary} colors={[C.primary]} />}
                        ListEmptyComponent={Empty}
                        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={C.primary} /> : null}
                    />
                )}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 16 },
    contextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    ctxChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 15, borderWidth: 1, maxWidth: '100%' },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, height: 46, marginTop: 10 },
    searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 0 },
    filterWrap: { marginTop: 12, marginHorizontal: -16 },
    filterRow: { paddingHorizontal: 16, gap: 8 },
    filterChip: { paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    count: { fontSize: 12.5, fontWeight: '600', marginTop: 12, marginBottom: 8 },
    list: { paddingBottom: 60, paddingTop: 2 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 24, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 6 },
    emptyText: { fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
    emptyBtn: { marginTop: 10, paddingHorizontal: 22, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
