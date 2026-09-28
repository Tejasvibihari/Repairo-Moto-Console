// src/components/admin/dashboard/DashboardFilterSheet.js
//
// Bottom sheet used by AdminDashboardScreen.
//
//   <DashboardFilterSheet
//     visible={open}
//     filters={filters}            // { period, from, to, city, serviceType, mechanicId }
//     options={options}            // { cities, serviceTypes, mechanics } from /api/admin/dashboard/filters
//     onApply={(next) => ...}
//     onClose={() => ...}
//   />

import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../../styles/Theme';

export const PERIOD_OPTIONS = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: '7 Days' },
    { key: 'last30', label: '30 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
    { key: 'custom', label: 'Custom' },
];

export const DEFAULT_FILTERS = {
    period: 'month',
    from: '',
    to: '',
    city: '',
    serviceType: '',
    mechanicId: '',
};

// Number of filters on top of the period (drives the badge on the filter button)
export const countActiveFilters = (f) =>
    [f.city, f.serviceType, f.mechanicId].filter(Boolean).length;

const isValidDate = (s) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

export const validateCustomRange = (from, to) => {
    if (!isValidDate(from) || !isValidDate(to)) return 'Enter both dates as YYYY-MM-DD';
    if (to < from) return '"To" date must be on or after "From"';
    return null;
};

// ── small pieces ─────────────────────────────────────────────────────────────
const Label = ({ children, theme }) => (
    <Text style={[s.label, { color: theme.colors.textMuted }]}>{children}</Text>
);

const Pill = ({ label, active, onPress, theme }) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={[
            s.pill,
            {
                backgroundColor: active ? theme.colors.primary : theme.colors.surfaceLow,
                borderColor: active ? theme.colors.primary : theme.colors.border,
            },
        ]}
    >
        <Text
            style={{
                fontSize: 12.5,
                color: active ? '#1a1a1a' : theme.colors.textSecondary,
                fontWeight: active ? '700' : '500',
            }}
            numberOfLines={1}
        >
            {label}
        </Text>
    </TouchableOpacity>
);

export default function DashboardFilterSheet({ visible, filters, options, onApply, onClose }) {
    const mode = useSelector((st) => st.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const insets = useSafeAreaInsets();

    const [draft, setDraft] = useState(filters);
    const [touched, setTouched] = useState(false);

    // Re-seed the draft each time the sheet opens
    useEffect(() => {
        if (visible) {
            setDraft(filters);
            setTouched(false);
        }
    }, [visible, filters]);

    const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

    const customError = useMemo(
        () => (draft.period === 'custom' ? validateCustomRange(draft.from, draft.to) : null),
        [draft.period, draft.from, draft.to]
    );

    // If a city is chosen, only offer mechanics from that city (plus ones with no city set)
    const mechanics = useMemo(() => {
        const all = options?.mechanics || [];
        if (!draft.city) return all;
        return all.filter((m) => !m.city || m.city.toUpperCase() === draft.city.toUpperCase());
    }, [options, draft.city]);

    const handleApply = () => {
        setTouched(true);
        if (customError) return;
        const next = { ...draft };
        if (next.period !== 'custom') { next.from = ''; next.to = ''; }
        // drop a mechanic that no longer belongs to the selected city
        if (next.mechanicId && !mechanics.some((m) => m._id === next.mechanicId)) next.mechanicId = '';
        onApply(next);
    };

    const handleReset = () => setDraft({ ...DEFAULT_FILTERS });

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={s.backdrop} />
            </TouchableWithoutFeedback>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={s.kav}
                pointerEvents="box-none"
            >
                <View
                    style={[
                        s.sheet,
                        {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            paddingBottom: insets.bottom + 12,
                        },
                    ]}
                >
                    <View style={[s.handle, { backgroundColor: theme.colors.border }]} />

                    <View style={s.header}>
                        <Text style={[s.title, { color: theme.colors.textPrimary }]}>Dashboard Filters</Text>
                        <TouchableOpacity onPress={handleReset} activeOpacity={0.7}>
                            <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>Reset</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 12 }}
                    >
                        {/* Date range */}
                        <Label theme={theme}>DATE RANGE</Label>
                        <View style={s.wrap}>
                            {PERIOD_OPTIONS.map((p) => (
                                <Pill
                                    key={p.key}
                                    label={p.label}
                                    active={draft.period === p.key}
                                    onPress={() => set({ period: p.key })}
                                    theme={theme}
                                />
                            ))}
                        </View>

                        {draft.period === 'custom' && (
                            <View style={{ marginTop: 12 }}>
                                <View style={s.dateRow}>
                                    {[['From', 'from'], ['To', 'to']].map(([lbl, key]) => (
                                        <View key={key} style={{ flex: 1 }}>
                                            <Text style={[s.dateLabel, { color: theme.colors.textMuted }]}>{lbl}</Text>
                                            <TextInput
                                                value={draft[key]}
                                                onChangeText={(t) => set({ [key]: t.trim() })}
                                                placeholder="YYYY-MM-DD"
                                                placeholderTextColor={theme.colors.textMuted}
                                                keyboardType="numbers-and-punctuation"
                                                maxLength={10}
                                                style={[
                                                    s.input,
                                                    {
                                                        color: theme.colors.textPrimary,
                                                        backgroundColor: theme.colors.surfaceLow,
                                                        borderColor: touched && customError ? '#EF4444' : theme.colors.border,
                                                    },
                                                ]}
                                            />
                                        </View>
                                    ))}
                                </View>
                                {touched && customError && <Text style={s.error}>{customError}</Text>}
                            </View>
                        )}

                        {/* City */}
                        {options?.cities?.length > 0 && (
                            <>
                                <Label theme={theme}>CITY</Label>
                                <View style={s.wrap}>
                                    <Pill label="All Cities" active={!draft.city} onPress={() => set({ city: '' })} theme={theme} />
                                    {options.cities.map((c) => (
                                        <Pill
                                            key={c}
                                            label={c}
                                            active={draft.city === c}
                                            onPress={() => set({ city: c })}
                                            theme={theme}
                                        />
                                    ))}
                                </View>
                            </>
                        )}

                        {/* Service type */}
                        <Label theme={theme}>SERVICE TYPE</Label>
                        <View style={s.wrap}>
                            <Pill label="All Types" active={!draft.serviceType} onPress={() => set({ serviceType: '' })} theme={theme} />
                            {(options?.serviceTypes || ['Schedule Repair', 'Emergency Repair']).map((t) => (
                                <Pill
                                    key={t}
                                    label={t}
                                    active={draft.serviceType === t}
                                    onPress={() => set({ serviceType: t })}
                                    theme={theme}
                                />
                            ))}
                        </View>

                        {/* Mechanic */}
                        {mechanics.length > 0 && (
                            <>
                                <Label theme={theme}>MECHANIC</Label>
                                <View style={s.wrap}>
                                    <Pill label="All Mechanics" active={!draft.mechanicId} onPress={() => set({ mechanicId: '' })} theme={theme} />
                                    {mechanics.map((m) => (
                                        <Pill
                                            key={m._id}
                                            label={m.name}
                                            active={draft.mechanicId === m._id}
                                            onPress={() => set({ mechanicId: m._id })}
                                            theme={theme}
                                        />
                                    ))}
                                </View>
                            </>
                        )}

                        <Text style={[s.note, { color: theme.colors.textMuted }]}>
                            Users and vendors are not city-based, so those totals are not affected by the city, service or mechanic filters.
                        </Text>
                    </ScrollView>

                    <View style={s.footer}>
                        <TouchableOpacity
                            onPress={onClose}
                            activeOpacity={0.8}
                            style={[s.btn, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border, borderWidth: 1 }]}
                        >
                            <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleApply}
                            activeOpacity={0.85}
                            style={[s.btn, { backgroundColor: theme.colors.primary, flex: 1.4 }]}
                        >
                            <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    kav: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
        maxHeight: '86%',
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        borderWidth: 1,
        borderBottomWidth: 0,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    title: { fontSize: 18, fontWeight: '800' },
    label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, marginTop: 20, marginBottom: 10 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 24, borderWidth: 1, maxWidth: '100%' },
    dateRow: { flexDirection: 'row', gap: 10 },
    dateLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
    error: { color: '#EF4444', fontSize: 12, marginTop: 8 },
    note: { fontSize: 11, lineHeight: 16, marginTop: 22 },
    footer: { flexDirection: 'row', gap: 10, paddingTop: 12 },
    btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
