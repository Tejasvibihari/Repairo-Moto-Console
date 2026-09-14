// src/screens/admin/banner/AdminBannerListScreen.js
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import PopUp from '../../../components/common/PopUp';
import useBanner from '../../../hooks/useBanner';
import { getImageUrl } from '../../../utils/imageUtils';
import { BANNER_ASPECT_RATIO } from '../../../utils/bannerImage';

// ─── Limit summary chip ─────────────────────────────────────────────────────
const LimitChips = ({ meta, theme, isDark }) => (
    <View style={styles.chipRow}>
        <View style={[styles.chip, { backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
            <Ionicons name="images-outline" size={13} color={theme.colors.textMuted} />
            <Text style={[styles.chipText, { color: theme.colors.textSecondary }]}>
                {meta.total}/{meta.maxTotal} created
            </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
            <Ionicons name="eye-outline" size={13} color={theme.colors.textMuted} />
            <Text style={[styles.chipText, { color: theme.colors.textSecondary }]}>
                {meta.active}/{meta.maxActive} visible
            </Text>
        </View>
    </View>
);

// ─── Banner Card ────────────────────────────────────────────────────────────
const BannerCard = ({
    banner,
    index,
    total,
    theme,
    isDark,
    onEdit,
    onDelete,
    onToggle,
    onMoveUp,
    onMoveDown,
    togglingId,
    reorderingId,
}) => (
    <View
        style={[
            cardStyles.card,
            { backgroundColor: isDark ? theme.colors.surface : '#FFFFFF', borderColor: theme.colors.border },
        ]}
    >
        <View style={[cardStyles.imageWrap, { aspectRatio: BANNER_ASPECT_RATIO, backgroundColor: theme.colors.surfaceLow }]}>
            <Image source={{ uri: getImageUrl(banner.image) }} style={cardStyles.image} resizeMode="cover" />
            <View style={[cardStyles.orderBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={cardStyles.orderBadgeText}>#{index + 1}</Text>
            </View>
            {!banner.isActive && (
                <View style={cardStyles.hiddenOverlay}>
                    <Text style={cardStyles.hiddenOverlayText}>HIDDEN</Text>
                </View>
            )}
        </View>

        <View style={cardStyles.body}>
            <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[cardStyles.title, { color: theme.colors.textPrimary }]}>
                    {banner.title?.trim() || 'Untitled banner'}
                </Text>
                {!!banner.link && (
                    <Text numberOfLines={1} style={[cardStyles.link, { color: theme.colors.textMuted }]}>
                        {banner.link}
                    </Text>
                )}
            </View>
            <Switch
                value={!!banner.isActive}
                onValueChange={() => onToggle(banner)}
                disabled={togglingId === banner._id}
                trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}90` }}
                thumbColor={banner.isActive ? theme.colors.primary : '#f4f3f4'}
            />
        </View>

        <View style={[cardStyles.actionsRow, { borderTopColor: theme.colors.border }]}>
            <View style={cardStyles.reorderGroup}>
                <TouchableOpacity
                    onPress={() => onMoveUp(banner)}
                    disabled={index === 0 || !!reorderingId}
                    style={[cardStyles.reorderBtn, index === 0 && cardStyles.reorderBtnDisabled]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="arrow-up" size={15} color={index === 0 ? theme.colors.textMuted : theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => onMoveDown(banner)}
                    disabled={index === total - 1 || !!reorderingId}
                    style={[cardStyles.reorderBtn, index === total - 1 && cardStyles.reorderBtnDisabled]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="arrow-down" size={15} color={index === total - 1 ? theme.colors.textMuted : theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 18 }}>
                <TouchableOpacity onPress={() => onEdit(banner)} style={cardStyles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="pencil-outline" size={15} color={theme.colors.primary} />
                    <Text style={[cardStyles.actionText, { color: theme.colors.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(banner)} style={cardStyles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={15} color={theme.colors.error} />
                    <Text style={[cardStyles.actionText, { color: theme.colors.error }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
);

// ─── Empty state ─────────────────────────────────────────────────────────────
const EmptyState = ({ theme }) => (
    <View style={styles.emptyWrap}>
        <MaterialCommunityIcons name="image-multiple-outline" size={54} color={theme.colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No banners yet</Text>
        <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
            Tap "New Banner" to add your first offer or announcement banner.
        </Text>
    </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function AdminBannerListScreen({ navigation }) {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const {
        data: banners,
        meta,
        loading,
        error,
        refetch,
        deleteBanner,
        toggleBanner,
        reorderBanners,
        mutationLoading,
    } = useBanner();

    const [refreshing, setRefreshing] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [reorderingId, setReorderingId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [popup, setPopup] = useState({ visible: false, title: '', message: '' });

    const showPopup = (title, message) => setPopup({ visible: true, title, message });
    const closePopup = () => setPopup((p) => ({ ...p, visible: false }));

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleToggle = async (banner) => {
        setTogglingId(banner._id);
        try {
            await toggleBanner(banner);
        } catch (err) {
            showPopup('Error', err.message || 'Failed to update banner status.');
        } finally {
            setTogglingId(null);
        }
    };

    const swapOrder = async (a, b) => {
        setReorderingId(a._id);
        try {
            await reorderBanners([
                { id: a._id, order: b.order },
                { id: b._id, order: a.order },
            ]);
        } catch (err) {
            showPopup('Error', err.message || 'Failed to reorder banners.');
        } finally {
            setReorderingId(null);
        }
    };

    const handleMoveUp = (banner) => {
        const idx = banners.findIndex((b) => b._id === banner._id);
        if (idx <= 0) return;
        swapOrder(banner, banners[idx - 1]);
    };

    const handleMoveDown = (banner) => {
        const idx = banners.findIndex((b) => b._id === banner._id);
        if (idx === -1 || idx >= banners.length - 1) return;
        swapOrder(banner, banners[idx + 1]);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const target = deleteTarget;
        setDeleteTarget(null);
        try {
            await deleteBanner(target._id);
        } catch (err) {
            showPopup('Error', err.message || 'Failed to delete banner.');
        }
    };

    const canCreate = meta.total < meta.maxTotal;

    const handleCreatePress = () => {
        if (!canCreate) {
            showPopup(
                'Limit reached',
                `You already have ${meta.maxTotal} banners. Delete one before creating a new one.`
            );
            return;
        }
        navigation.navigate('AdminBannerForm', { meta });
    };

    return (
        <TabScreenWrapper greeting="Banners" showMenuIcon>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Text style={[styles.headline, { color: theme.colors.textPrimary }]}>Banners</Text>
                    <TouchableOpacity
                        onPress={handleCreatePress}
                        activeOpacity={0.85}
                        style={[styles.addBtn, { backgroundColor: canCreate ? theme.colors.primary : theme.colors.border }]}
                    >
                        <Ionicons name="add" size={18} color="#1a1a1a" />
                        <Text style={styles.addBtnText}>New Banner</Text>
                    </TouchableOpacity>
                </View>

                <LimitChips meta={meta} theme={theme} isDark={isDark} />

                {loading && banners.length === 0 ? (
                    <View style={styles.loaderWrap}>
                        <ActivityIndicator color={theme.colors.primary} size="large" />
                    </View>
                ) : (
                    <FlatList
                        data={banners}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item, index }) => (
                            <BannerCard
                                banner={item}
                                index={index}
                                total={banners.length}
                                theme={theme}
                                isDark={isDark}
                                togglingId={togglingId}
                                reorderingId={reorderingId}
                                onToggle={handleToggle}
                                onMoveUp={handleMoveUp}
                                onMoveDown={handleMoveDown}
                                onEdit={(b) => navigation.navigate('AdminBannerForm', { banner: b, meta })}
                                onDelete={(b) => setDeleteTarget(b)}
                            />
                        )}
                        contentContainerStyle={[
                            { paddingBottom: insets.bottom + 32, paddingTop: 4 },
                            banners.length === 0 && { flex: 1 },
                        ]}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                        }
                        ListEmptyComponent={<EmptyState theme={theme} />}
                    />
                )}

                {!!error && banners.length === 0 && !loading && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                )}
            </View>

            <PopUp
                visible={popup.visible}
                title={popup.title}
                message={popup.message}
                primaryLabel="Okay"
                onPrimary={closePopup}
                onClose={closePopup}
            />

            <PopUp
                visible={!!deleteTarget}
                title="Delete Banner"
                message="Delete this banner? This cannot be undone."
                primaryLabel={mutationLoading ? 'Deleting...' : 'Delete'}
                secondaryLabel="Cancel"
                onPrimary={confirmDelete}
                onSecondary={() => setDeleteTarget(null)}
                onClose={() => setDeleteTarget(null)}
            />
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    headline: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12,
    },
    addBtnText: { fontSize: 12, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.3 },
    chipRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    chipText: { fontSize: 11, fontWeight: '700' },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 14 },
    emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
    errorText: { textAlign: 'center', fontSize: 13, marginTop: 10 },
});

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 14,
    },
    imageWrap: { width: '100%', position: 'relative' },
    image: { width: '100%', height: '100%' },
    orderBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
    },
    orderBadgeText: { fontSize: 11, fontWeight: '900', color: '#1a1a1a' },
    hiddenOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
    },
    hiddenOverlayText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    body: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, gap: 10 },
    title: { fontSize: 14, fontWeight: '700' },
    link: { fontSize: 11, marginTop: 3 },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    reorderGroup: { flexDirection: 'row', gap: 14 },
    reorderBtn: { padding: 2 },
    reorderBtnDisabled: { opacity: 0.4 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionText: { fontSize: 11.5, fontWeight: '700' },
});