// components/admin/AssignmentPanel.js (fixed)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    TextInput,
    Platform,
    Image,
    KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getImageUrl } from '../../../utils/imageUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Status options (same as before)
const STATUS_OPTIONS = [
    { key: 'Pending', label: 'Pending', dot: '#9E8E78', bg: 'rgba(158,142,120,0.18)', text: '#9E8E78', icon: 'time-outline' },
    { key: 'In Progress', label: 'In Progress', dot: '#E2A731', bg: 'rgba(226,167,49,0.18)', text: '#E2A731', icon: 'refresh-outline' },
    // { key: 'Mechanic Assigned', label: 'Mechanic Assigned', dot: '#3498DB', bg: 'rgba(52,152,219,0.18)', text: '#3498DB', icon: 'person-add-outline' },
    { key: 'Completed', label: 'Completed', dot: '#2ECC9A', bg: 'rgba(46,204,154,0.18)', text: '#2ECC9A', icon: 'checkmark-circle-outline' },
    // { key: 'Invoice Generated', label: 'Invoice Generated', dot: '#9B59B6', bg: 'rgba(155,89,182,0.18)', text: '#9B59B6', icon: 'receipt-outline' },
    { key: 'Cancelled', label: 'Cancelled', dot: '#FF6B6B', bg: 'rgba(255,107,107,0.18)', text: '#FF6B6B', icon: 'close-circle-outline' },
];

// SearchBar component (unchanged)
const SearchBar = ({ value, onChange, placeholder, theme }) => (
    <View style={[searchStyles.wrap, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
        <Ionicons name="search-outline" size={15} color={theme.colors.textMuted} />
        <TextInput
            style={[searchStyles.input, { color: theme.colors.textPrimary }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textMuted}
        />
        {value.length > 0 && (
            <TouchableOpacity onPress={() => onChange('')}>
                <Ionicons name="close-circle" size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>
        )}
    </View>
);

const searchStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
    input: { flex: 1, fontSize: 13, fontWeight: '500' },
});

// TabBar (unchanged)
const TabBar = ({ tabs, active, onSelect, theme }) => (
    <View style={[tabStyles.bar, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
        {tabs.map(t => (
            <TouchableOpacity
                key={t.key}
                style={[tabStyles.tab, active === t.key && { backgroundColor: theme.colors.primary + '22' }]}
                onPress={() => onSelect(t.key)}
            >
                <Ionicons name={t.icon} size={14} color={active === t.key ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[tabStyles.label, { color: active === t.key ? theme.colors.primary : theme.colors.textMuted }]}>{t.label}</Text>
            </TouchableOpacity>
        ))}
    </View>
);

const tabStyles = StyleSheet.create({
    bar: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 16, gap: 4 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 9 },
    label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
});

// SelectableRow (unchanged)
const SelectableRow = ({ item, selected, onSelect, theme, subtitle }) => {
    const imageUrl = item.profileImage ? getImageUrl(item.profileImage) : null;
    const hasImage = !!imageUrl;
    return (
        <TouchableOpacity
            style={[
                rowStyles.row,
                {
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                    backgroundColor: selected ? theme.colors.primary + '11' : theme.colors.surfaceLow,
                },
            ]}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
        >
            <View style={[rowStyles.avatar, { backgroundColor: hasImage ? 'transparent' : selected ? theme.colors.primary + '22' : theme.colors.surfaceHigh }]}>
                {hasImage ? (
                    <Image source={{ uri: imageUrl }} style={rowStyles.avatarImage} resizeMode="cover" />
                ) : (
                    <Text style={[rowStyles.avatarText, { color: selected ? theme.colors.primary : theme.colors.textMuted }]}>
                        {(item.firstName || item.vendorName || '?')[0].toUpperCase()}
                    </Text>
                )}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[rowStyles.name, { color: theme.colors.textPrimary }]}>
                    {item.firstName + ' ' + item.lastName || item.vendorName || '—'}
                </Text>
                {subtitle && <Text style={[rowStyles.sub, { color: theme.colors.textMuted }]}>{subtitle}</Text>}
            </View>
            {selected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
        </TouchableOpacity>
    );
};

const rowStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { fontSize: 18, fontWeight: '600' },
    name: { fontSize: 13.5, fontWeight: '700' },
    sub: { fontSize: 11, marginTop: 2, fontWeight: '500' },
});

// StatusChip (unchanged)
const StatusChip = ({ option, selected, onSelect }) => (
    <TouchableOpacity
        style={[chipStyles.chip, { backgroundColor: option.bg, borderColor: selected ? option.dot : 'transparent', borderWidth: selected ? 1.5 : 0 }]}
        onPress={() => onSelect(option.key)}
        activeOpacity={0.7}
    >
        <Ionicons name={option.icon} size={13} color={option.text} />
        <Text style={[chipStyles.label, { color: option.text }]}>{option.label}</Text>
        {selected && <Ionicons name="checkmark-circle" size={14} color={option.dot} />}
    </TouchableOpacity>
);

const chipStyles = StyleSheet.create({
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginBottom: 8, marginRight: 8 },
    label: { fontSize: 12, fontWeight: '700' },
});

const SectionHeader = ({ label, theme }) => (
    <Text style={[shStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
);
const shStyles = StyleSheet.create({
    label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
});

// ─── Main Component (FIXED) ───────────────────────────────────────────────────
export default function AssignmentPanel({
    visible,
    onClose,
    order = {},
    theme,
    mechanics = [],
    mechanicsLoading = false,
    vendors = [],
    vendorsLoading = false,
    deliveryBoys = [],
    deliveryBoysLoading = false,
    onAssignMechanic,
    onAssignVendor,
    onAssignDeliveryBoy,
    onUpdateStatus,
    mutationLoading = false,
}) {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    const [activeTab, setActiveTab] = useState('mechanic');
    const [mechanicSearch, setMechanicSearch] = useState('');
    const [vendorSearch, setVendorSearch] = useState('');
    const [deliverySearch, setDeliverySearch] = useState('');
    const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState(null);
    const [selectedMechanic, setSelectedMechanic] = useState(null);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (visible) {
            setSelectedStatus(order.status || null);
            setSelectedMechanic(null);
            setSelectedVendor(null);
            setSelectedDeliveryBoy(null);
            setSuccessMsg('');
            setErrorMsg('');
            setMechanicSearch('');
            setVendorSearch('');
            setDeliverySearch('');
        }
    }, [visible, order]);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, speed: 18, bounciness: 3, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const filteredMechanics = mechanics.filter(m =>
        (m.name || '').toLowerCase().includes(mechanicSearch.toLowerCase()) ||
        (m.position || '').toLowerCase().includes(mechanicSearch.toLowerCase())
    );

    const filteredVendors = vendors.filter(v =>
        (v.vendorName || v.name || '').toLowerCase().includes(vendorSearch.toLowerCase()) ||
        (v.city || '').toLowerCase().includes(vendorSearch.toLowerCase())
    );

    const filteredDeliveryBoys = deliveryBoys.filter(d =>
        (d.name || '').toLowerCase().includes(deliverySearch.toLowerCase()) ||
        (d.position || '').toLowerCase().includes(deliverySearch.toLowerCase())
    );

    const showFeedback = (msg, isError = false) => {
        if (isError) setErrorMsg(msg);
        else setSuccessMsg(msg);
        setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 2500);
    };
    const handleAssignMechanic = useCallback(async () => {
        if (!selectedMechanic) return;
        try {
            await onAssignMechanic(order._id || order.orderId, selectedMechanic._id);
            showFeedback(`Mechanic "${selectedMechanic.name}" assigned`);
        } catch (e) {
            showFeedback(e.message || 'Failed to assign mechanic', true);
        }
    }, [selectedMechanic, order, onAssignMechanic]);

    const handleAssignVendor = useCallback(async () => {
        if (!selectedVendor) return;
        try {
            await onAssignVendor(order._id || order.orderId, selectedVendor._id);
            showFeedback(`Vendor "${selectedVendor.vendorName || selectedVendor.name}" assigned`);
        } catch (e) {
            showFeedback(e.message || 'Failed to assign vendor', true);
        }
    }, [selectedVendor, order, onAssignVendor]);

    const handleAssignDeliveryBoy = useCallback(async () => {
        if (!selectedDeliveryBoy) return;
        try {
            await onAssignDeliveryBoy(order._id || order.orderId, selectedDeliveryBoy._id);
            showFeedback(`Delivery Boy "${selectedDeliveryBoy.name}" assigned`);
        } catch (e) {
            showFeedback(e.message || 'Failed to assign delivery boy', true);
        }
    }, [selectedDeliveryBoy, order, onAssignDeliveryBoy]);

    const handleUpdateStatus = useCallback(async () => {
        if (!selectedStatus) return;
        try {
            await onUpdateStatus(order._id || order.orderId, selectedStatus);
            showFeedback(`Status updated to "${selectedStatus}"`);
        } catch (e) {
            showFeedback(e.message || 'Failed to update status', true);
        }
    }, [selectedStatus, order, onUpdateStatus]);

    const TABS = [
        { key: 'mechanic', label: 'Mechanic', icon: 'construct-outline' },
        { key: 'vendor', label: 'Vendor', icon: 'business-outline' },
        { key: 'delivery', label: 'Delivery', icon: 'bicycle-outline' }, // NEW
        { key: 'status', label: 'Status', icon: 'flag-outline' },
    ];

    const canSave =
        (activeTab === 'mechanic' && selectedMechanic) ||
        (activeTab === 'vendor' && selectedVendor) ||
        (activeTab === 'delivery' && selectedDeliveryBoy) ||
        (activeTab === 'status' && selectedStatus && selectedStatus !== order.status);

    const handleSave = () => {
        if (activeTab === 'mechanic') handleAssignMechanic();
        else if (activeTab === 'vendor') handleAssignVendor();
        else if (activeTab === 'delivery') handleAssignDeliveryBoy();
        else if (activeTab === 'status') handleUpdateStatus();
    };

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
            <Animated.View style={[panelStyles.backdrop, { opacity: backdropAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
            </Animated.View>

            <Animated.View style={[panelStyles.panel, { backgroundColor: theme.colors.surface, transform: [{ translateY: slideAnim }] }]}>
                <View style={[panelStyles.handle, { backgroundColor: theme.colors.border }]} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <View style={panelStyles.header}>
                        <View>
                            <Text style={[panelStyles.title, { color: theme.colors.textPrimary }]}>Manage Order</Text>
                            <Text style={[panelStyles.subtitle, { color: theme.colors.textMuted }]}>{order.orderId || '—'}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={[panelStyles.closeBtn, { backgroundColor: theme.colors.surfaceLow }]}>
                            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <TabBar tabs={TABS} active={activeTab} onSelect={setActiveTab} theme={theme} />

                    <ScrollView
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 16 }}
                    >
                        {/* Mechanic Tab */}
                        {activeTab === 'mechanic' && (
                            <View>
                                {order.assignedMechanic && (
                                    <View style={[panelStyles.currentBadge, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}>
                                        <Ionicons name="person-circle-outline" size={14} color={theme.colors.primary} />
                                        <Text style={[panelStyles.currentText, { color: theme.colors.primary }]}>Current: {order.assignedMechanic}</Text>
                                    </View>
                                )}
                                <SearchBar value={mechanicSearch} onChange={setMechanicSearch} placeholder="Search by name or position…" theme={theme} />
                                {mechanicsLoading ? (
                                    <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
                                ) : filteredMechanics.length === 0 ? (
                                    <Text style={[panelStyles.emptyText, { color: theme.colors.textMuted }]}>No mechanics found</Text>
                                ) : (
                                    filteredMechanics.map(m => (
                                        <SelectableRow
                                            key={m._id}
                                            item={m}
                                            selected={selectedMechanic?._id === m._id}
                                            onSelect={setSelectedMechanic}
                                            theme={theme}
                                            subtitle={[m.position, m.contactNo].filter(Boolean).join(' · ')}
                                        />
                                    ))
                                )}
                            </View>
                        )}

                        {/* Vendor Tab */}
                        {activeTab === 'vendor' && (
                            <View>
                                {order.assignedVendor && (
                                    <View style={[panelStyles.currentBadge, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}>
                                        <Ionicons name="business-outline" size={14} color={theme.colors.primary} />
                                        <Text style={[panelStyles.currentText, { color: theme.colors.primary }]}>Current: {order.assignedVendor}</Text>
                                    </View>
                                )}
                                <SearchBar value={vendorSearch} onChange={setVendorSearch} placeholder="Search by name or city…" theme={theme} />
                                {vendorsLoading ? (
                                    <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
                                ) : filteredVendors.length === 0 ? (
                                    <Text style={[panelStyles.emptyText, { color: theme.colors.textMuted }]}>No vendors found</Text>
                                ) : (
                                    filteredVendors.map(v => (
                                        <SelectableRow
                                            key={v._id}
                                            item={{ ...v, name: v.vendorName || v.name }}
                                            selected={selectedVendor?._id === v._id}
                                            onSelect={setSelectedVendor}
                                            theme={theme}
                                            subtitle={[v.city, v.contactNo].filter(Boolean).join(' · ')}
                                        />
                                    ))
                                )}
                            </View>
                        )}

                        {/* Delivery Boy Tab (NEW) */}
                        {activeTab === 'delivery' && (
                            <View>
                                {order.assignedDelivery && (
                                    <View style={[panelStyles.currentBadge, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}>
                                        <Ionicons name="bicycle-outline" size={14} color={theme.colors.primary} />
                                        <Text style={[panelStyles.currentText, { color: theme.colors.primary }]}>Current: {order.assignedDelivery}</Text>
                                    </View>
                                )}
                                <SearchBar value={deliverySearch} onChange={setDeliverySearch} placeholder="Search by name or position…" theme={theme} />
                                {deliveryBoysLoading ? (
                                    <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
                                ) : filteredDeliveryBoys.length === 0 ? (
                                    <Text style={[panelStyles.emptyText, { color: theme.colors.textMuted }]}>No delivery boys found</Text>
                                ) : (
                                    filteredDeliveryBoys.map(d => (
                                        <SelectableRow
                                            key={d._id}
                                            item={d}
                                            selected={selectedDeliveryBoy?._id === d._id}
                                            onSelect={setSelectedDeliveryBoy}
                                            theme={theme}
                                            subtitle={[d.position, d.contactNo].filter(Boolean).join(' · ')}
                                        />
                                    ))
                                )}
                            </View>
                        )}

                        {/* Status Tab */}
                        {activeTab === 'status' && (
                            <View>
                                <SectionHeader label="Select New Status" theme={theme} />
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                    {STATUS_OPTIONS.map(opt => (
                                        <StatusChip
                                            key={opt.key}
                                            option={opt}
                                            selected={selectedStatus === opt.key}
                                            onSelect={setSelectedStatus}
                                        />
                                    ))}
                                </View>
                                {order.status && (
                                    <View style={[panelStyles.currentBadge, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border, marginTop: 8 }]}>
                                        <Ionicons name="flag-outline" size={14} color={theme.colors.textMuted} />
                                        <Text style={[panelStyles.currentText, { color: theme.colors.textMuted }]}>Current status: {order.status}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {/* Feedback message */}
                    {(successMsg || errorMsg) && (
                        <View style={[panelStyles.feedbackBar, { backgroundColor: successMsg ? 'rgba(46,204,154,0.15)' : 'rgba(255,107,107,0.15)', borderColor: successMsg ? '#2ECC9A' : '#FF6B6B' }]}>
                            <Ionicons name={successMsg ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={14} color={successMsg ? '#2ECC9A' : '#FF6B6B'} />
                            <Text style={[panelStyles.feedbackText, { color: successMsg ? '#2ECC9A' : '#FF6B6B' }]}>{successMsg || errorMsg}</Text>
                        </View>
                    )}

                    {/* Sticky Save Button */}
                    <View style={{ paddingBottom: insets.bottom + 12 }}>
                        <TouchableOpacity
                            style={[
                                panelStyles.saveBtn,
                                {
                                    backgroundColor: canSave ? theme.colors.primary : theme.colors.surfaceHigh,
                                    opacity: mutationLoading ? 0.7 : 1,
                                    borderWidth: canSave ? 0 : 1,
                                    borderColor: theme.colors.border,
                                }
                            ]}
                            onPress={handleSave}
                            disabled={!canSave || mutationLoading}
                            activeOpacity={0.8}
                        >
                            {mutationLoading ? (
                                <ActivityIndicator color={canSave ? '#fff' : theme.colors.textMuted} size="small" />
                            ) : (
                                <>
                                    <Ionicons name="save-outline" size={16} color={canSave ? '#fff' : theme.colors.textMuted} />
                                    <Text style={[panelStyles.saveBtnText, { color: canSave ? '#fff' : theme.colors.textMuted }]}>
                                        {activeTab === 'mechanic' ? 'Assign Mechanic' :
                                            activeTab === 'vendor' ? 'Assign Vendor' :
                                                activeTab === 'delivery' ? 'Assign Delivery Boy' :
                                                    'Update Status'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Animated.View>
        </Modal>
    );
}

const panelStyles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    panel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 18,
        paddingTop: 12,
        maxHeight: SCREEN_HEIGHT * 0.9, // increased to give more room
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 24,
    },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    title: { fontSize: 18, fontWeight: '900', letterSpacing: 0.2 },
    subtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
    currentText: { fontSize: 12, fontWeight: '700' },
    emptyText: { textAlign: 'center', marginTop: 32, fontSize: 13, fontWeight: '500' },
    feedbackBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
    feedbackText: { fontSize: 12.5, fontWeight: '700', flex: 1 },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 15,
        borderRadius: 14,
        marginTop: 8,
    },
    saveBtnText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});