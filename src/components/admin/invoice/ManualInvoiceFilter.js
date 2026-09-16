// components/admin/invoice/ManualInvoiceFilter.js
import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    Animated, ScrollView, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../../styles/Theme';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES = [
    { value: 'all', label: 'All', icon: 'apps-outline' },
    { value: 'paid', label: 'Paid', icon: 'checkmark-circle-outline' },
    { value: 'unpaid', label: 'Unpaid', icon: 'alert-circle-outline' },
    { value: 'draft', label: 'Draft', icon: 'time-outline' },
    { value: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'amount_high', label: 'Amount: High → Low' },
    { value: 'amount_low', label: 'Amount: Low → High' },
];

// ─── Chip ─────────────────────────────────────────────────────────────────────
const Chip = ({ label, icon, active, onPress, theme }) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={[
            chipS.chip,
            {
                backgroundColor: active ? theme.colors.primary : theme.colors.surfaceLow,
                borderColor: active ? theme.colors.primary : theme.colors.border,
            },
        ]}
    >
        {icon && (
            <Ionicons
                name={icon}
                size={13}
                color={active ? '#1a1a1a' : theme.colors.textSecondary}
            />
        )}
        <Text style={[chipS.label, { color: active ? '#1a1a1a' : theme.colors.textSecondary }]}>
            {label}
        </Text>
    </TouchableOpacity>
);
const chipS = StyleSheet.create({
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 12, borderWidth: 1,
    },
    label: { fontSize: 12, fontWeight: '600' },
});

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ label, C }) => (
    <Text style={[secS.label, { color: C.textMuted }]}>{label}</Text>
);
const secS = StyleSheet.create({
    label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10, marginTop: 4 },
});

// ─── Small input ──────────────────────────────────────────────────────────────
const FilterInput = ({ value, onChangeText, placeholder, icon, theme }) => {
    const C = theme.colors;
    return (
        <View style={[finS.wrap, { backgroundColor: C.surfaceLow, borderColor: C.border }]}>
            <Ionicons name={icon || 'search-outline'} size={14} color={C.textMuted} />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={C.textMuted}
                style={[finS.input, { color: C.textPrimary }]}
            />
            {value?.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="close-circle" size={14} color={C.textMuted} />
                </TouchableOpacity>
            )}
        </View>
    );
};
const finS = StyleSheet.create({
    wrap: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderRadius: 10, borderWidth: 1,
        paddingHorizontal: 10, paddingVertical: 9,
        marginBottom: 8,
    },
    input: { flex: 1, fontSize: 13 },
});

// ─── Date range picker row ─────────────────────────────────────────────────────
const DateRow = ({ label, value, onChangeText, placeholder, C }) => (
    <View style={dateS.row}>
        <Text style={[dateS.label, { color: C.textMuted }]}>{label}</Text>
        <View style={[dateS.input, { backgroundColor: C.surfaceLow, borderColor: C.border }]}>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={C.textMuted}
                style={{ flex: 1, fontSize: 13, color: C.textPrimary }}
                keyboardType="numeric"
            />
        </View>
    </View>
);
const dateS = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    label: { width: 48, fontSize: 12, fontWeight: '600' },
    input: {
        flex: 1, flexDirection: 'row', borderRadius: 10, borderWidth: 1,
        paddingHorizontal: 10, paddingVertical: 9,
    },
});

// ─── Main Filter Sheet ────────────────────────────────────────────────────────
/**
 * Props:
 *   visible          : boolean
 *   onClose          : () => void
 *   filters          : { status, sortBy, customerName, vehicleBrand, vehicleModel, startDate, endDate }
 *   onApply          : (filters) => void
 *   onReset          : () => void
 */
export default function ManualInvoiceFilter({ visible, onClose, filters = {}, onApply, onReset }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    // Local state mirrors incoming filters
    const [local, setLocal] = useState({ ...filters });

    useEffect(() => {
        if (visible) setLocal({ ...filters });
    }, [visible]);

    const set = (key, val) => setLocal((prev) => ({ ...prev, [key]: val }));

    // Sheet animation
    const slideY = useRef(new Animated.Value(600)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideY, { toValue: 0, speed: 18, bounciness: 4, useNativeDriver: true }),
                Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideY, { toValue: 600, duration: 260, useNativeDriver: true }),
                Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const handleApply = () => {
        onApply?.(local);
        onClose?.();
    };

    const handleReset = () => {
        const empty = { status: 'all', sortBy: 'newest', customerName: '', vehicleBrand: '', vehicleModel: '', startDate: '', endDate: '' };
        setLocal(empty);
        onReset?.();
        onClose?.();
    };

    // Count active filters (excluding defaults)
    const activeCount = [
        local.status && local.status !== 'all',
        local.sortBy && local.sortBy !== 'newest',
        local.customerName,
        local.vehicleBrand,
        local.vehicleModel,
        local.startDate,
        local.endDate,
    ].filter(Boolean).length;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
            {/* Overlay */}
            <Animated.View style={[sheetS.overlay, { opacity: overlayOpacity }]}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
            </Animated.View>

            {/* Sheet */}
            <Animated.View
                style={[
                    sheetS.sheet,
                    {
                        backgroundColor: isDark ? C.surface : C.surface,
                        borderColor: C.border,
                        paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 24,
                        transform: [{ translateY: slideY }],
                    },
                ]}
            >
                {/* Handle */}
                <View style={[sheetS.handle, { backgroundColor: C.border }]} />

                {/* Header */}
                <View style={sheetS.header}>
                    <View>
                        <Text style={[sheetS.title, { color: C.textPrimary }]}>Filter Invoices</Text>
                        {activeCount > 0 && (
                            <Text style={[sheetS.subtitle, { color: C.textMuted }]}>
                                {activeCount} filter{activeCount > 1 ? 's' : ''} active
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close" size={22} color={C.textMuted} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={sheetS.body}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Status ────────────────────────────────────────────── */}
                    <SectionHeader label="STATUS" C={C} />
                    <View style={sheetS.chipRow}>
                        {STATUSES.map((s) => (
                            <Chip
                                key={s.value}
                                label={s.label}
                                icon={s.icon}
                                active={local.status === s.value || (!local.status && s.value === 'all')}
                                onPress={() => set('status', s.value)}
                                theme={theme}
                            />
                        ))}
                    </View>

                    {/* ── Sort ─────────────────────────────────────────────── */}
                    <SectionHeader label="SORT BY" C={C} />
                    <View style={sheetS.chipRow}>
                        {SORT_OPTIONS.map((s) => (
                            <Chip
                                key={s.value}
                                label={s.label}
                                active={local.sortBy === s.value || (!local.sortBy && s.value === 'newest')}
                                onPress={() => set('sortBy', s.value)}
                                theme={theme}
                            />
                        ))}
                    </View>

                    {/* ── Customer ──────────────────────────────────────────── */}
                    <SectionHeader label="CUSTOMER" C={C} />
                    <FilterInput
                        value={local.customerName}
                        onChangeText={(v) => set('customerName', v)}
                        placeholder="Customer name..."
                        icon="person-outline"
                        theme={theme}
                    />

                    {/* ── Vehicle ───────────────────────────────────────────── */}
                    <SectionHeader label="VEHICLE" C={C} />
                    <FilterInput
                        value={local.vehicleBrand}
                        onChangeText={(v) => set('vehicleBrand', v)}
                        placeholder="Brand (e.g. Honda)"
                        icon="business-outline"
                        theme={theme}
                    />
                    <FilterInput
                        value={local.vehicleModel}
                        onChangeText={(v) => set('vehicleModel', v)}
                        placeholder="Model (e.g. Activa)"
                        icon="bicycle-outline"
                        theme={theme}
                    />

                    {/* ── Date Range ─────────────────────────────────────────── */}
                    <SectionHeader label="DATE RANGE" C={C} />
                    <DateRow
                        label="From"
                        value={local.startDate}
                        onChangeText={(v) => set('startDate', v)}
                        placeholder="DD/MM/YYYY"
                        C={C}
                    />
                    <DateRow
                        label="To"
                        value={local.endDate}
                        onChangeText={(v) => set('endDate', v)}
                        placeholder="DD/MM/YYYY"
                        C={C}
                    />
                </ScrollView>

                {/* ── Action buttons ────────────────────────────────────────── */}
                <View style={[sheetS.actions, { borderTopColor: C.border }]}>
                    <TouchableOpacity
                        onPress={handleReset}
                        style={[sheetS.resetBtn, { borderColor: C.border, backgroundColor: C.surfaceLow }]}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="refresh-outline" size={16} color={C.textSecondary} />
                        <Text style={[sheetS.resetText, { color: C.textSecondary }]}>Reset</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleApply}
                        style={[sheetS.applyBtn, { backgroundColor: C.primary }]}
                        activeOpacity={0.82}
                    >
                        <Ionicons name="checkmark" size={16} color="#1a1a1a" />
                        <Text style={sheetS.applyText}>Apply Filters</Text>
                        {activeCount > 0 && (
                            <View style={sheetS.countBadge}>
                                <Text style={sheetS.countText}>{activeCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Modal>
    );
}

const sheetS = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        maxHeight: '88%',
    },
    handle: {
        width: 36, height: 4, borderRadius: 2,
        alignSelf: 'center', marginTop: 10, marginBottom: 4,
    },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
    },
    title: { fontSize: 17, fontWeight: '800', letterSpacing: 0.1 },
    subtitle: { fontSize: 11, marginTop: 1 },
    body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    actions: {
        flexDirection: 'row', gap: 10,
        paddingHorizontal: 20, paddingTop: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    resetBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 13, borderRadius: 14, borderWidth: 1,
    },
    resetText: { fontSize: 14, fontWeight: '700' },
    applyBtn: {
        flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 13, borderRadius: 14,
    },
    applyText: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
    countBadge: {
        backgroundColor: '#1a1a1a', borderRadius: 10,
        paddingHorizontal: 6, paddingVertical: 1,
    },
    countText: { fontSize: 10, fontWeight: '800', color: '#e2a731' },
});