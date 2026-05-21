import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Animated,
    ActivityIndicator,
    RefreshControl,
    Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import axiosClient from '../../../services/axiosClient';
import PopUp from '../../../components/common/PopUp';

// ─── Search Bar ───────────────────────────────────────────────────────────────
const SearchBar = ({ value, onChange, theme, isDark }) => {
    const [focused, setFocused] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(borderAnim, { toValue: focused ? 1 : 0, duration: 180, useNativeDriver: false }).start();
    }, [focused]);

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.border, theme.colors.primary],
    });

    return (
        <Animated.View
            style={[
                searchStyles.wrap,
                { backgroundColor: isDark ? theme.colors.surfaceHigh : '#FFFFFF', borderColor },
            ]}
        >
            <Ionicons
                name="search"
                size={18}
                color={value ? theme.colors.primary : theme.colors.textMuted}
                style={searchStyles.icon}
            />
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Search brands or models..."
                placeholderTextColor={theme.colors.textMuted}
                style={[searchStyles.input, { color: theme.colors.textPrimary }]}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="search"
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const searchStyles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
    },
    icon: { marginRight: 10 },
    input: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
});

// ─── Model Row ────────────────────────────────────────────────────────────────
// model: { _id, name }  — embedded sub-document
const ModelRow = ({ model, theme, onEdit, onDelete }) => (
    <View style={[modelStyles.row, { borderBottomColor: theme.colors.border }]}>
        <View style={modelStyles.info}>
            <Text style={[modelStyles.name, { color: theme.colors.textPrimary }]}>{model.name}</Text>
        </View>
        <View style={modelStyles.actions}>
            <TouchableOpacity
                onPress={() => onEdit(model)}
                style={[modelStyles.actionBtn, { backgroundColor: `${theme.colors.primary}20` }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
                <Ionicons name="pencil" size={13} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => onDelete(model)}
                style={[modelStyles.actionBtn, { backgroundColor: `${theme.colors.error}20` }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
                <Ionicons name="trash-outline" size={13} color={theme.colors.error} />
            </TouchableOpacity>
        </View>
    </View>
);

const modelStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    info: { flex: 1 },
    name: { fontSize: 14, fontWeight: '600', letterSpacing: 0.1 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    actionBtn: { padding: 6, borderRadius: 8 },
});

// ─── Brand Card ───────────────────────────────────────────────────────────────
// brand: { _id, brandName, models: [{ _id, name }] }
const BrandCard = ({
    brand,
    expanded,
    onToggle,
    onEditBrand,
    onDeleteBrand,
    onEditModel,
    onDeleteModel,
    onAddModel,
    theme,
    isDark,
    index,
}) => {
    const heightAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const slideY = useRef(new Animated.Value(24)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const models = brand.models ?? [];
    // 46px per model row + 46px for "Add Model" footer row
    const expandedHeight = models.length * 46 + 46;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 70, useNativeDriver: true }),
            Animated.spring(slideY, { toValue: 0, speed: 18, bounciness: 4, delay: index * 70, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(heightAnim, {
                toValue: expanded ? expandedHeight : 0,
                duration: 260,
                useNativeDriver: false,
            }),
            Animated.timing(rotateAnim, {
                toValue: expanded ? 1 : 0,
                duration: 220,
                useNativeDriver: true,
            }),
        ]).start();
    }, [expanded, expandedHeight]);

    const chevronRotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <Animated.View
            style={[
                cardStyles.card,
                {
                    backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
                    borderColor: theme.colors.border,
                    opacity,
                    transform: [{ translateY: slideY }],
                },
            ]}
        >
            {/* ── Hero banner ── */}
            <View style={[cardStyles.hero, { backgroundColor: isDark ? '#2E2618' : '#FFF4E0' }]}>
                <Text style={[cardStyles.heroTag, { color: theme.colors.textMuted }]}>
                    WORKSHOP CATALOG
                </Text>
                <MaterialCommunityIcons
                    name="motorbike"
                    size={32}
                    color={theme.colors.primary}
                    style={{ opacity: 0.35 }}
                />
            </View>

            {/* ── Brand name + actions row ── */}
            <TouchableOpacity
                onPress={onToggle}
                activeOpacity={0.82}
                style={cardStyles.nameRow}
            >
                <View style={cardStyles.nameLeft}>
                    <Text style={[cardStyles.brandName, { color: theme.colors.textPrimary }]}>
                        {brand.brandName.toUpperCase()}
                    </Text>
                    <Text style={[cardStyles.modelCount, { color: theme.colors.textMuted }]}>
                        {models.length} {models.length === 1 ? 'Model' : 'Models'} Registered
                    </Text>
                </View>

                <View style={cardStyles.brandActions}>
                    <TouchableOpacity
                        onPress={() => onEditBrand(brand)}
                        style={[cardStyles.iconBtn, { backgroundColor: `${theme.colors.primary}20` }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="pencil" size={14} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onDeleteBrand(brand)}
                        style={[cardStyles.iconBtn, { backgroundColor: `${theme.colors.error}20` }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                    <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                        <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                    </Animated.View>
                </View>
            </TouchableOpacity>

            {/* ── Animated models section ── */}
            <Animated.View
                style={[
                    cardStyles.modelList,
                    {
                        height: heightAnim,
                        overflow: 'hidden',
                        borderTopColor: theme.colors.border,
                    },
                ]}
            >
                {/* Thin divider only when expanded */}
                <View style={[cardStyles.divider, { backgroundColor: theme.colors.border }]} />

                {models.length === 0 ? (
                    <View style={cardStyles.emptyModels}>
                        <Text style={[cardStyles.emptyText, { color: theme.colors.textMuted }]}>
                            No models yet. Tap below to add one.
                        </Text>
                    </View>
                ) : (
                    models.map((m) => (
                        <ModelRow
                            key={m._id}
                            model={m}
                            theme={theme}
                            onEdit={(model) => onEditModel(brand, model)}
                            onDelete={(model) => onDeleteModel(brand, model)}
                        />
                    ))
                )}

                {/* Add model footer */}
                <TouchableOpacity
                    onPress={() => onAddModel(brand)}
                    activeOpacity={0.75}
                    style={[cardStyles.addModelRow, { borderTopColor: theme.colors.border }]}
                >
                    <Ionicons name="add-circle-outline" size={15} color={theme.colors.primary} />
                    <Text style={[cardStyles.addModelText, { color: theme.colors.primary }]}>
                        ADD MODEL
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
};

const cardStyles = StyleSheet.create({
    card: { borderRadius: 20, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    heroTag: { fontSize: 9, fontWeight: '800', letterSpacing: 2 },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    nameLeft: { flex: 1 },
    brandName: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginBottom: 2 },
    modelCount: { fontSize: 11, letterSpacing: 0.5 },
    brandActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: { padding: 7, borderRadius: 9 },
    modelList: {},
    divider: { height: StyleSheet.hairlineWidth },
    emptyModels: { paddingVertical: 14, alignItems: 'center' },
    emptyText: { fontSize: 12 },
    addModelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    addModelText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
});

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ theme, onAdd }) => (
    <View style={emptyStyles.wrap}>
        <MaterialCommunityIcons
            name="motorbike"
            size={64}
            color={theme.colors.primary}
            style={{ opacity: 0.25, marginBottom: 16 }}
        />
        <Text style={[emptyStyles.title, { color: theme.colors.textPrimary }]}>No Brands Found</Text>
        <Text style={[emptyStyles.sub, { color: theme.colors.textMuted }]}>
            Start by adding your first brand to the workshop catalog.
        </Text>
        <TouchableOpacity onPress={onAdd} style={[emptyStyles.btn, { backgroundColor: theme.colors.primary }]}>
            <Text style={emptyStyles.btnText}>ADD FIRST BRAND</Text>
        </TouchableOpacity>
    </View>
);

const emptyStyles = StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
    title: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    sub: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    btn: { paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14 },
    btnText: { fontSize: 12, fontWeight: '900', letterSpacing: 2, color: '#1a1a1a' },
});

// ─── Expandable FAB ───────────────────────────────────────────────────────────
const ExpandableFAB = ({ onAddBrand, onAddModel, theme, isDark }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const [open, setOpen] = useState(false);
    const expandAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, speed: 14, bounciness: 12, delay: 500, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        Animated.parallel([
            Animated.spring(expandAnim, { toValue: open ? 1 : 0, speed: 20, bounciness: 8, useNativeDriver: true }),
            Animated.timing(rotateAnim, { toValue: open ? 1 : 0, duration: 200, useNativeDriver: true }),
        ]).start();
    }, [open]);

    const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
    const brandTranslateY = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -130] });
    const modelTranslateY = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -70] });
    const subOpacity = expandAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

    return (
        <Animated.View style={[fabStyles.wrap, { transform: [{ scale: scaleAnim }] }]}>
            {/* Backdrop when open */}
            {open && (
                <TouchableOpacity
                    style={fabStyles.backdrop}
                    activeOpacity={1}
                    onPress={() => setOpen(false)}
                />
            )}

            {/* Add Brand mini-FAB */}
            <Animated.View
                style={[
                    fabStyles.miniFabWrap,
                    { transform: [{ translateY: brandTranslateY }], opacity: subOpacity },
                ]}
                pointerEvents={open ? 'auto' : 'none'}
            >
                <TouchableOpacity
                    onPress={() => { setOpen(false); onAddBrand(); }}
                    activeOpacity={0.82}
                    style={[fabStyles.miniBtn, { backgroundColor: isDark ? theme.colors.surface : '#FFFFFF', borderColor: theme.colors.border }]}
                >
                    <Ionicons name="pricetag" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
                <View style={[fabStyles.miniLabel, { backgroundColor: isDark ? theme.colors.surface : '#FFFFFF', borderColor: theme.colors.border }]}>
                    <Text style={[fabStyles.miniLabelText, { color: theme.colors.textPrimary }]}>Add Brand</Text>
                </View>
            </Animated.View>

            {/* Add Model mini-FAB */}
            <Animated.View
                style={[
                    fabStyles.miniFabWrap,
                    { transform: [{ translateY: modelTranslateY }], opacity: subOpacity },
                ]}
                pointerEvents={open ? 'auto' : 'none'}
            >
                <TouchableOpacity
                    onPress={() => { setOpen(false); onAddModel(); }}
                    activeOpacity={0.82}
                    style={[fabStyles.miniBtn, { backgroundColor: isDark ? theme.colors.surface : '#FFFFFF', borderColor: theme.colors.border }]}
                >
                    <MaterialCommunityIcons name="motorbike" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
                <View style={[fabStyles.miniLabel, { backgroundColor: isDark ? theme.colors.surface : '#FFFFFF', borderColor: theme.colors.border }]}>
                    <Text style={[fabStyles.miniLabelText, { color: theme.colors.textPrimary }]}>Add Model</Text>
                </View>
            </Animated.View>

            {/* Main FAB */}
            <TouchableOpacity onPress={() => setOpen(p => !p)} activeOpacity={0.82} style={fabStyles.btn}>
                <Animated.View style={[fabStyles.inner, { backgroundColor: theme.colors.primary, transform: [{ rotate }] }]}>
                    <Ionicons name="add" size={26} color="#1a1a1a" />
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const fabStyles = StyleSheet.create({
    wrap: { position: 'absolute', bottom: 120, right: 20, zIndex: 50, alignItems: 'center' },
    backdrop: { position: 'absolute', top: -1000, left: -1000, right: -1000, bottom: -1000 },
    btn: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#e2a731',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    inner: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
    miniFabWrap: {
        position: 'absolute',
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    miniBtn: {
        width: 42,
        height: 42,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    miniLabel: {
        position: 'absolute',
        right: 52,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    miniLabelText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminBrandCatalog({ navigation }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedBrands, setExpandedBrands] = useState({});

    // PopUp state
    const [popup, setPopup] = useState({
        visible: false,
        title: '',
        message: '',
        primaryLabel: '',
        secondaryLabel: '',
        onConfirm: null,
        onCancel: null,
    });

    // Brand picker for "Add Model" from FAB
    const [brandPickerVisible, setBrandPickerVisible] = useState(false);

    useFocusEffect(
        useCallback(() => { fetchBrands(); }, [])
    );

    const fetchBrands = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await axiosClient.get('/api/admin/brands/getbrands');
            setBrands(Array.isArray(data) ? data : data?.brands ?? []);
        } catch (error) {
            console.error('Fetch brands error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchBrands(true);
    };

    const toggleBrand = (id) =>
        setExpandedBrands((prev) => ({ ...prev, [id]: !prev[id] }));
    // ── Delete entire brand (using PopUp) ──
    const handleDeleteBrand = (brand) => {
        setPopup({
            visible: true,
            title: 'Delete Brand',
            message: `Delete "${brand.brandName}" and all its models? This cannot be undone.`,
            primaryLabel: 'Delete',
            secondaryLabel: 'Cancel',
            onConfirm: async () => {
                closePopup();
                try {
                    await axiosClient.delete(`/api/admin/brands/delete/${brand._id}`);
                    fetchBrands(true);
                } catch (error) {
                    console.error('Delete brand error:', error);
                    setPopup({
                        visible: true,
                        title: 'Error',
                        message: error?.response?.data?.message || 'Failed to delete brand.',
                        primaryLabel: 'Okay',
                        secondaryLabel: '',
                        onConfirm: closePopup,
                        onCancel: closePopup,
                    });
                }
            },
            onCancel: closePopup,
        });
    };

    // ── Delete embedded model (using PopUp) ──
    const handleDeleteModel = (brand, model) => {
        setPopup({
            visible: true,
            title: 'Delete Model',
            message: `Delete "${model.name}" from ${brand.brandName}?`,
            primaryLabel: 'Delete',
            secondaryLabel: 'Cancel',
            onConfirm: async () => {
                closePopup();
                try {
                    await axiosClient.delete(`/api/admin/brands/delete/${brand._id}/models/${model._id}`);
                    fetchBrands(true);
                } catch (error) {
                    console.error('Delete model error:', error);
                    setPopup({
                        visible: true,
                        title: 'Error',
                        message: error?.response?.data?.message || 'Failed to delete model.',
                        primaryLabel: 'Okay',
                        secondaryLabel: '',
                        onConfirm: closePopup,
                        onCancel: closePopup,
                    });
                }
            },
            onCancel: closePopup,
        });
    };

    const closePopup = () => {
        setPopup(prev => ({ ...prev, visible: false }));
    };

    // Filter brands
    const q = search.toLowerCase();
    const filteredBrands = brands.filter(
        (b) =>
            !q ||
            b.brandName.toLowerCase().includes(q) ||
            (b.models ?? []).some((m) => m.name.toLowerCase().includes(q))
    );

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
            <TabScreenWrapper greeting="Workshop Catalog" showMenuIcon showBookingIcon={false}>
                {loading ? (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={[styles.loaderText, { color: theme.colors.textMuted }]}>
                            Loading catalog...
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredBrands}
                        keyExtractor={(item) => item._id}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor={theme.colors.primary}
                                colors={[theme.colors.primary]}
                            />
                        }
                        contentContainerStyle={[
                            styles.list,
                            { paddingBottom: insets.bottom + 120, paddingTop: 8 },
                        ]}
                        ListHeaderComponent={
                            <SearchBar value={search} onChange={setSearch} theme={theme} isDark={isDark} />
                        }
                        ListEmptyComponent={
                            <EmptyState theme={theme} onAdd={() => navigation.navigate('AdminBrandsScreen')} />
                        }
                        renderItem={({ item, index }) => (
                            <BrandCard
                                brand={item}
                                expanded={!!expandedBrands[item._id]}
                                onToggle={() => toggleBrand(item._id)}
                                onEditBrand={(b) => navigation.navigate('AdminBrandsScreen', { brand: b })}
                                onDeleteBrand={handleDeleteBrand}
                                onEditModel={(brand, model) =>
                                    navigation.navigate('AdminAddModelScreen', { brand, model })
                                }
                                onDeleteModel={handleDeleteModel}
                                onAddModel={(brand) =>
                                    navigation.navigate('AdminAddModelScreen', { brand })
                                }
                                theme={theme}
                                isDark={isDark}
                                index={index}
                            />
                        )}
                    />
                )}
            </TabScreenWrapper>

            <ExpandableFAB
                onAddBrand={() => navigation.navigate('AdminBrandsScreen')}
                onAddModel={() => {
                    if (brands.length > 0) {
                        setBrandPickerVisible(true);
                    } else {
                        setPopup({
                            visible: true,
                            title: 'No Brands',
                            message: 'You need to add a brand first before adding models.',
                            primaryLabel: 'Add Brand',
                            secondaryLabel: 'Cancel',
                            onConfirm: () => { closePopup(); navigation.navigate('AdminBrandsScreen'); },
                            onCancel: closePopup,
                        });
                    }
                }}
                theme={theme}
                isDark={isDark}
            />

            {/* Custom PopUp for delete confirmations */}
            <PopUp
                visible={popup.visible}
                title={popup.title}
                message={popup.message}
                primaryLabel={popup.primaryLabel}
                secondaryLabel={popup.secondaryLabel}
                onPrimary={popup.onConfirm}
                onSecondary={popup.onCancel}
                onClose={closePopup}
            />

            {/* Brand Picker Modal for "Add Model" */}
            <Modal visible={brandPickerVisible} transparent animationType="slide" onRequestClose={() => setBrandPickerVisible(false)}>
                <TouchableOpacity
                    style={pickerStyles.backdrop}
                    activeOpacity={1}
                    onPress={() => setBrandPickerVisible(false)}
                />
                <SafeAreaView style={pickerStyles.sheetWrap} edges={['bottom']}>
                    <View style={[pickerStyles.sheet, { backgroundColor: isDark ? theme.colors.surface : '#FFFFFF', borderColor: theme.colors.border }]}>
                        <View style={pickerStyles.handle} />
                        <Text style={[pickerStyles.sheetTitle, { color: theme.colors.textPrimary }]}>Select Brand</Text>
                        <Text style={[pickerStyles.sheetSub, { color: theme.colors.textMuted }]}>Choose which brand to add a model under</Text>
                        <FlatList
                            data={brands}
                            keyExtractor={(item) => item._id}
                            style={{ maxHeight: 300 }}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => {
                                        setBrandPickerVisible(false);
                                        navigation.navigate('AdminAddModelScreen', { brand: item });
                                    }}
                                    activeOpacity={0.7}
                                    style={[pickerStyles.brandRow, { borderBottomColor: theme.colors.border }]}
                                >
                                    <MaterialCommunityIcons name="motorbike" size={18} color={theme.colors.primary} style={{ marginRight: 12 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[pickerStyles.brandName, { color: theme.colors.textPrimary }]}>{item.brandName}</Text>
                                        <Text style={[pickerStyles.brandMeta, { color: theme.colors.textMuted }]}>
                                            {(item.models ?? []).length} models
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity
                            onPress={() => setBrandPickerVisible(false)}
                            style={[pickerStyles.cancelBtn, { backgroundColor: theme.colors.surfaceLow }]}
                        >
                            <Text style={[pickerStyles.cancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    list: { paddingHorizontal: 16 },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
    loaderText: { fontSize: 13, fontWeight: '500' },
});

const pickerStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheetWrap: { justifyContent: 'flex-end' },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderBottomWidth: 0,
        paddingTop: 12,
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ccc',
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    sheetSub: { fontSize: 12, marginBottom: 16, letterSpacing: 0.3 },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    brandName: { fontSize: 15, fontWeight: '700' },
    brandMeta: { fontSize: 11, marginTop: 2 },
    cancelBtn: {
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    cancelText: { fontSize: 14, fontWeight: '600' },
});