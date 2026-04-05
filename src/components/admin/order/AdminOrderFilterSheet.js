// src/components/admin/OrderFilterSheet.js
//
// Usage:
//   <OrderFilterSheet
//     visible={showFilter}
//     currentFilters={filters}          // from useOrder hook
//     onApply={(newFilters) => {
//       setFilters(newFilters);          // useOrder's applyFilters
//       setShowFilter(false);
//     }}
//     onClose={() => setShowFilter(false)}
//   />
//
// Sends these filter keys to the API (match your backend query params):
//   status        → 'pending' | 'in_progress' | 'completed' | 'cancelled' | ''
//   dateRange     → 'today' | 'week' | 'month' | 'custom' | ''
//   dateFrom      → 'YYYY-MM-DD' (only when dateRange === 'custom')
//   dateTo        → 'YYYY-MM-DD' (only when dateRange === 'custom')
//   mechanic      → free-text mechanic name / id
//   serviceType   → 'emergency' | 'scheduled' | 'inspection' | 'other' | ''
//   sortBy        → 'date_desc' | 'date_asc' | 'status' | 'amount_desc'

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Animated,
    ScrollView,
    TextInput,
    Platform,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../../styles/Theme';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_H * 0.82;

// ─── Option sets ──────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses', icon: 'ellipse-outline' },
    { value: 'pending', label: 'Pending', icon: 'time-outline' },
    { value: 'in_progress', label: 'In Progress', icon: 'sync-outline' },
    { value: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
    { value: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
];

const DATE_RANGE_OPTIONS = [
    { value: '', label: 'Any Time', icon: 'calendar-outline' },
    { value: 'today', label: 'Today', icon: 'today-outline' },
    { value: 'week', label: 'This Week', icon: 'calendar-number-outline' },
    { value: 'month', label: 'This Month', icon: 'calendar-clear-outline' },
    { value: 'custom', label: 'Custom Range', icon: 'options-outline' },
];

const SERVICE_OPTIONS = [
    { value: '', label: 'All Services', icon: 'construct-outline' },
    { value: 'emergency', label: 'Emergency Repair', icon: 'flash-outline' },
    { value: 'scheduled', label: 'Scheduled Service', icon: 'clipboard-outline' },
    { value: 'inspection', label: 'Inspection', icon: 'search-outline' },
    { value: 'oil_change', label: 'Oil Change', icon: 'water-outline' },
    { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const SORT_OPTIONS = [
    { value: 'date_desc', label: 'Newest First', icon: 'arrow-down-outline' },
    { value: 'date_asc', label: 'Oldest First', icon: 'arrow-up-outline' },
    { value: 'status', label: 'By Status', icon: 'funnel-outline' },
    { value: 'amount_desc', label: 'Highest Amount', icon: 'trending-up-outline' },
];

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, theme }) => (
    <Text style={[secStyles.title, { color: theme.colors.textMuted }]}>{title}</Text>
);
const secStyles = StyleSheet.create({
    title: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, marginBottom: 10, marginTop: 20 },
});

// ─── Option pill row ──────────────────────────────────────────────────────────
const OptionGroup = ({ options, selected, onSelect, theme }) => (
    <View style={optStyles.wrap}>
        {options.map((opt) => {
            const isActive = selected === opt.value;
            return (
                <TouchableOpacity
                    key={opt.value}
                    onPress={() => onSelect(opt.value)}
                    activeOpacity={0.75}
                    style={[
                        optStyles.pill,
                        {
                            backgroundColor: isActive ? theme.colors.primary : theme.colors.surfaceLow,
                            borderColor: isActive ? theme.colors.primary : theme.colors.border,
                        },
                    ]}
                >
                    <Ionicons
                        name={opt.icon}
                        size={13}
                        color={isActive ? '#1a1a1a' : theme.colors.textSecondary}
                    />
                    <Text
                        style={[
                            optStyles.label,
                            {
                                color: isActive ? '#1a1a1a' : theme.colors.textSecondary,
                                fontWeight: isActive ? '700' : '500',
                            },
                        ]}
                    >
                        {opt.label}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
);
const optStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1,
    },
    label: { fontSize: 12.5, letterSpacing: 0.1 },
});

// ─── Date input (simple text — swap for DateTimePicker if needed) ─────────────
const DateInput = ({ label, value, onChange, theme, isDark }) => {
    const [focused, setFocused] = useState(false);
    return (
        <View style={{ flex: 1 }}>
            <Text style={[diStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textMuted}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={[
                    diStyles.input,
                    {
                        backgroundColor: isDark ? theme.colors.surfaceLow : theme.colors.surfaceLow,
                        borderColor: focused ? theme.colors.primary : theme.colors.border,
                        color: theme.colors.textPrimary,
                    },
                ]}
            />
        </View>
    );
};
const diStyles = StyleSheet.create({
    label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        fontSize: 13,
    },
});

// ─── Mechanic search input ────────────────────────────────────────────────────
const MechanicInput = ({ value, onChange, theme, isDark }) => {
    const [focused, setFocused] = useState(false);
    return (
        <View
            style={[
                miStyles.box,
                {
                    backgroundColor: theme.colors.surfaceLow,
                    borderColor: focused ? theme.colors.primary : theme.colors.border,
                },
            ]}
        >
            <Ionicons name="build-outline" size={15} color={focused ? theme.colors.primary : theme.colors.textMuted} />
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Mechanic name or ID…"
                placeholderTextColor={theme.colors.textMuted}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={[miStyles.input, { color: theme.colors.textPrimary }]}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={15} color={theme.colors.textMuted} />
                </TouchableOpacity>
            )}
        </View>
    );
};
const miStyles = StyleSheet.create({
    box: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    },
    input: { flex: 1, fontSize: 13, padding: 0, margin: 0 },
});

// ─── Active filter count badge ────────────────────────────────────────────────
export const activeFilterCount = (filters = {}) => {
    let count = 0;
    if (filters.status) count++;
    if (filters.dateRange) count++;
    if (filters.mechanic) count++;
    if (filters.serviceType) count++;
    if (filters.sortBy && filters.sortBy !== 'date_desc') count++;
    return count;
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminOrderFilterSheet({ visible, currentFilters = {}, onApply, onClose }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    // Local draft state — only committed on "Apply"
    const [draft, setDraft] = useState({
        status: '',
        dateRange: '',
        dateFrom: '',
        dateTo: '',
        mechanic: '',
        serviceType: '',
        sortBy: 'date_desc',
        ...currentFilters,
    });

    // Sync draft when sheet opens with latest external filters
    useEffect(() => {
        if (visible) {
            setDraft({
                status: '',
                dateRange: '',
                dateFrom: '',
                dateTo: '',
                mechanic: '',
                serviceType: '',
                sortBy: 'date_desc',
                ...currentFilters,
            });
        }
    }, [visible]);

    const set = useCallback((key) => (val) => setDraft((d) => ({ ...d, [key]: val })), []);

    // Slide animation
    const slideY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(slideY, { toValue: 0, speed: 18, bounciness: 3, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(slideY, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const handleApply = () => {
        // Strip empty strings to keep API params clean
        const cleaned = Object.fromEntries(
            Object.entries(draft).filter(([, v]) => v !== '' && v !== null && v !== undefined)
        );
        // If custom range but dates missing, keep dateRange but clear it gracefully
        if (cleaned.dateRange === 'custom' && (!cleaned.dateFrom || !cleaned.dateTo)) {
            delete cleaned.dateRange;
            delete cleaned.dateFrom;
            delete cleaned.dateTo;
        }
        onApply(cleaned);
    };

    const handleReset = () => {
        const cleared = { sortBy: 'date_desc' };
        setDraft({ status: '', dateRange: '', dateFrom: '', dateTo: '', mechanic: '', serviceType: '', sortBy: 'date_desc' });
        onApply(cleared);
    };

    const appliedCount = activeFilterCount(draft);

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            {/* Overlay */}
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[sheetStyles.overlay, { opacity: overlayOpacity }]} />
            </TouchableWithoutFeedback>

            {/* Sheet */}
            <Animated.View
                style={[
                    sheetStyles.sheet,
                    {
                        backgroundColor: theme.colors.background,
                        paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20,
                        transform: [{ translateY: slideY }],
                    },
                ]}
            >
                {/* Handle */}
                <View style={[sheetStyles.handle, { backgroundColor: theme.colors.border }]} />

                {/* Sheet header */}
                <View style={[sheetStyles.sheetHeader, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[sheetStyles.sheetTitle, { color: theme.colors.textPrimary }]}>
                        Filter Orders
                        {appliedCount > 0 && (
                            <Text style={{ color: theme.colors.primary }}> · {appliedCount}</Text>
                        )}
                    </Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Scrollable filter content */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={sheetStyles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Status */}
                    <SectionHeader title="STATUS" theme={theme} />
                    <OptionGroup
                        options={STATUS_OPTIONS}
                        selected={draft.status}
                        onSelect={set('status')}
                        theme={theme}
                    />

                    {/* Service Type */}
                    <SectionHeader title="SERVICE TYPE" theme={theme} />
                    <OptionGroup
                        options={SERVICE_OPTIONS}
                        selected={draft.serviceType}
                        onSelect={set('serviceType')}
                        theme={theme}
                    />

                    {/* Date Range */}
                    <SectionHeader title="DATE RANGE" theme={theme} />
                    <OptionGroup
                        options={DATE_RANGE_OPTIONS}
                        selected={draft.dateRange}
                        onSelect={set('dateRange')}
                        theme={theme}
                    />

                    {/* Custom range inputs */}
                    {draft.dateRange === 'custom' && (
                        <View style={sheetStyles.dateRow}>
                            <DateInput
                                label="FROM"
                                value={draft.dateFrom}
                                onChange={set('dateFrom')}
                                theme={theme}
                                isDark={isDark}
                            />
                            <View style={{ width: 10 }} />
                            <DateInput
                                label="TO"
                                value={draft.dateTo}
                                onChange={set('dateTo')}
                                theme={theme}
                                isDark={isDark}
                            />
                        </View>
                    )}

                    {/* Mechanic */}
                    <SectionHeader title="MECHANIC" theme={theme} />
                    <MechanicInput
                        value={draft.mechanic}
                        onChange={set('mechanic')}
                        theme={theme}
                        isDark={isDark}
                    />

                    {/* Sort by */}
                    <SectionHeader title="SORT BY" theme={theme} />
                    <OptionGroup
                        options={SORT_OPTIONS}
                        selected={draft.sortBy}
                        onSelect={set('sortBy')}
                        theme={theme}
                    />

                    <View style={{ height: 12 }} />
                </ScrollView>

                {/* Footer action buttons */}
                <View style={[sheetStyles.footer, { borderTopColor: theme.colors.border }]}>
                    <TouchableOpacity
                        onPress={handleReset}
                        activeOpacity={0.75}
                        style={[sheetStyles.resetBtn, { borderColor: theme.colors.border }]}
                    >
                        <Text style={[sheetStyles.resetLabel, { color: theme.colors.textSecondary }]}>Reset</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleApply}
                        activeOpacity={0.8}
                        style={[sheetStyles.applyBtn, { backgroundColor: theme.colors.primary }]}
                    >
                        <Ionicons name="checkmark" size={16} color="#1a1a1a" />
                        <Text style={sheetStyles.applyLabel}>
                            Apply{appliedCount > 0 ? ` (${appliedCount})` : ''}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Modal>
    );
}

const sheetStyles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SHEET_HEIGHT,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    handle: {
        alignSelf: 'center',
        width: 36,
        height: 4,
        borderRadius: 2,
        marginTop: 10,
        marginBottom: 2,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sheetTitle: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 4,
    },
    dateRow: {
        flexDirection: 'row',
        marginTop: 10,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    resetBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    resetLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    applyBtn: {
        flex: 2.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 14,
    },
    applyLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: 0.2,
    },
});