import React, { useState, useEffect, useMemo } from 'react';
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
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import LeadCard from '../../../components/telecaller/LeadCard';
import { useLeads } from '../../../hooks/useLeads';
import { FILTER_STATUSES, LEAD_STATUS } from '../../../constants/leadConstants';
import { getLeadByName } from '../../../utils/leadUtils';

export default function LeadsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const user = useSelector((s) => s.auth.user);

    const [searchText, setSearchText] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');

    // The dashboard can deep-link here with a status filter.
    useEffect(() => {
        if (route.params?.ts) setStatus(route.params.status || '');
    }, [route.params?.ts]); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounce the search box.
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchText.trim()), 400);
        return () => clearTimeout(t);
    }, [searchText]);

    // A telecaller only works their own leads (server builds `leadBy` the same way).
    const leadBy = useMemo(() => getLeadByName(user), [user]);

    const { items, total, loading, loadingMore, refreshing, error, refresh, loadMore } = useLeads({
        leadBy,
        status,
        search,
    });

    const openLead = (lead) => navigation.navigate('LeadDetail', { leadId: lead._id, lead });

    const Empty = () => {
        if (loading) return null;
        return (
            <View style={styles.empty}>
                <Ionicons
                    name={error ? 'cloud-offline-outline' : 'people-outline'}
                    size={44}
                    color={C.textMuted}
                />
                <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
                    {error ? 'Could not load leads' : search || status ? 'No leads match' : 'No leads yet'}
                </Text>
                <Text style={[styles.emptyText, { color: C.textSecondary }]}>
                    {error || (search || status ? 'Try a different search or filter.' : 'Add your first lead to start calling.')}
                </Text>
                {error ? (
                    <TouchableOpacity onPress={refresh} style={[styles.emptyBtn, { backgroundColor: C.primary }]}>
                        <Text style={styles.emptyBtnText}>Try again</Text>
                    </TouchableOpacity>
                ) : !search && !status ? (
                    <TouchableOpacity onPress={() => navigation.navigate('LeadForm')} style={[styles.emptyBtn, { backgroundColor: C.primary }]}>
                        <Text style={styles.emptyBtnText}>Add a lead</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        );
    };

    return (
        <TabScreenWrapper greeting="Leads" showMenuIcon showBookingIcon={false}>
            <View style={styles.root}>
                {/* Search */}
                <View style={[styles.searchBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Ionicons name="search-outline" size={18} color={C.textMuted} />
                    <TextInput
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholder="Search name, phone, vehicle"
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
                                        {
                                            borderColor: active ? color : C.border,
                                            backgroundColor: active ? `${color}22` : C.surface,
                                        },
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
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={C.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => <LeadCard lead={item} theme={theme} onPress={() => openLead(item)} />}
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

                {/* Add lead */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('LeadForm')}
                    activeOpacity={0.85}
                    style={[styles.fab, { backgroundColor: C.primary, ...theme.shadow.soft }]}
                    accessibilityLabel="Add lead"
                >
                    <Ionicons name="add" size={28} color="#1a1a1a" />
                </TouchableOpacity>
            </View>
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 16 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, height: 46, marginTop: 8,
    },
    searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 0 },
    filterWrap: { marginTop: 12, marginHorizontal: -16 },
    filterRow: { paddingHorizontal: 16, gap: 8 },
    filterChip: { paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    count: { fontSize: 12.5, fontWeight: '600', marginTop: 12, marginBottom: 8 },
    list: { paddingBottom: 170, paddingTop: 2 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 24, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 6 },
    emptyText: { fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
    emptyBtn: { marginTop: 10, paddingHorizontal: 22, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    emptyBtnText: { color: '#1a1a1a', fontWeight: '800' },
    fab: {
        position: 'absolute', right: 20, bottom: 108,
        width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    },
});
