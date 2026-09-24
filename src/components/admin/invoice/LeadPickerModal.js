// components/admin/invoice/LeadPickerModal.js
// Bottom sheet that lists leads which don't have an invoice yet, so the
// admin can link the invoice being created/edited to one of them.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, Modal, TextInput, FlatList, TouchableOpacity,
    ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import { leadService, getErrorMessage } from '../../../services/leadService';
import { LEAD_STATUS } from '../../../constants/leadConstants';

const PAGE_SIZE = 20;

export default function LeadPickerModal({ visible, onClose, onSelect }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const insets = useSafeAreaInsets();

    const [search, setSearch] = useState('');
    const [term, setTerm] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    const pageRef = useRef(1);
    const hasMoreRef = useRef(false);
    const busyRef = useRef(false);
    const seqRef = useRef(0);
    const timer = useRef(null);

    const fetchPage = useCallback(async (page, q) => {
        if (page === 1) {
            seqRef.current += 1; // supersede anything in flight
            setLoading(true);
            setError(null);
        } else {
            if (busyRef.current || !hasMoreRef.current) return;
            busyRef.current = true;
            setLoadingMore(true);
        }
        const seq = seqRef.current;

        try {
            const res = await leadService.list({
                page,
                limit: PAGE_SIZE,
                search: q,
                hasInvoice: 'false', // only leads that can still be linked
            });
            if (seq !== seqRef.current) return;

            const rows = res.data || [];
            setItems((prev) => {
                if (page === 1) return rows;
                const seen = new Set(prev.map((r) => r._id));
                return [...prev, ...rows.filter((r) => !seen.has(r._id))];
            });
            pageRef.current = page;
            hasMoreRef.current = !!res.pagination?.hasNextPage;
        } catch (e) {
            if (seq === seqRef.current) setError(getErrorMessage(e, 'Could not load leads.'));
        } finally {
            if (page === 1) {
                if (seq === seqRef.current) setLoading(false);
            } else {
                busyRef.current = false;
                setLoadingMore(false);
            }
        }
    }, []);

    // Reset the search box each time the sheet opens
    useEffect(() => {
        if (visible) {
            setSearch('');
            setTerm('');
        }
    }, [visible]);

    useEffect(() => {
        if (visible) fetchPage(1, term);
    }, [visible, term, fetchPage]);

    const onChangeSearch = (v) => {
        setSearch(v);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setTerm(v.trim()), 350);
    };

    const renderItem = ({ item }) => {
        const st = LEAD_STATUS[item.status] || { label: item.status, color: C.textMuted };
        const bike = [item.vehicle?.brand, item.vehicle?.model].filter(Boolean).join(' ');
        return (
            <TouchableOpacity
                onPress={() => onSelect(item)}
                activeOpacity={0.78}
                style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[s.name, { color: C.textPrimary }]} numberOfLines={1}>
                        {item.customer?.name || 'Unnamed lead'}
                    </Text>
                    <Text style={[s.sub, { color: C.textMuted }]} numberOfLines={1}>
                        {[item.customer?.phone, bike].filter(Boolean).join('  ·  ')}
                    </Text>
                </View>
                <View style={[s.chip, { backgroundColor: st.color + '22' }]}>
                    <Text style={[s.chipText, { color: st.color }]}>{st.label}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={s.overlay}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                <View style={[s.sheet, { backgroundColor: C.background, paddingBottom: insets.bottom + 8 }]}>
                    <View style={s.header}>
                        <Text style={[s.title, { color: C.textPrimary }]}>Link to a lead</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={22} color={C.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={[s.searchWrap, { backgroundColor: C.surfaceLow, borderColor: C.border }]}>
                        <Ionicons name="search-outline" size={16} color={C.textMuted} />
                        <TextInput
                            value={search}
                            onChangeText={onChangeSearch}
                            placeholder="Search name, phone, vehicle..."
                            placeholderTextColor={C.textMuted}
                            style={[s.searchInput, { color: C.textPrimary }]}
                            autoCorrect={false}
                        />
                    </View>

                    <Text style={[s.hint, { color: C.textMuted }]}>
                        Only leads without an invoice are shown.
                    </Text>

                    {loading ? (
                        <View style={s.center}>
                            <ActivityIndicator size="large" color={C.primary} />
                        </View>
                    ) : error ? (
                        <View style={s.center}>
                            <Text style={{ color: C.textSecondary, textAlign: 'center', marginBottom: 10 }}>{error}</Text>
                            <TouchableOpacity onPress={() => fetchPage(1, term)}>
                                <Text style={{ color: C.primary, fontWeight: '800' }}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={items}
                            keyExtractor={(i) => i._id}
                            renderItem={renderItem}
                            keyboardShouldPersistTaps="handled"
                            onEndReached={() => fetchPage(pageRef.current + 1, term)}
                            onEndReachedThreshold={0.4}
                            ListEmptyComponent={
                                <View style={s.center}>
                                    <Ionicons name="people-outline" size={40} color={C.textMuted} />
                                    <Text style={{ color: C.textMuted, marginTop: 8, textAlign: 'center' }}>
                                        {term ? 'No matching leads without an invoice' : 'No leads available to link'}
                                    </Text>
                                </View>
                            }
                            ListFooterComponent={
                                loadingMore ? <ActivityIndicator color={C.primary} style={{ marginVertical: 14 }} /> : null
                            }
                            contentContainerStyle={{ paddingBottom: 12, flexGrow: 1 }}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: { height: '78%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    title: { fontSize: 17, fontWeight: '800' },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: 14 },
    hint: { fontSize: 11.5, marginTop: 8, marginBottom: 10 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
    name: { fontSize: 14.5, fontWeight: '800' },
    sub: { fontSize: 12.5, marginTop: 2 },
    chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
    chipText: { fontSize: 11, fontWeight: '800' },
});
