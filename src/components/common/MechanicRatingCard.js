// components/admin/order/MechanicRatingsCard.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '../../services/axiosClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const StarRow = ({ rating = 0, size = 14, theme }) => {
    const filled = Math.round(rating);
    return (
        <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                    key={i}
                    name={i <= filled ? 'star' : 'star-outline'}
                    size={size}
                    color={i <= filled ? '#E2A731' : theme.colors.border}
                />
            ))}
        </View>
    );
};

// ─── Card Wrapper ─────────────────────────────────────────────────────────────
const Card = ({ children, theme, style }) => (
    <View style={[cardStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.primary }, style]}>
        {children}
    </View>
);

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
        elevation: 3,
    },
});

// ─── Main Component ───────────────────────────────────────────────────────────
const MechanicRatingsCard = ({ order, theme }) => {
    const [mechanicsData, setMechanicsData] = useState([]);
    const [loading, setLoading] = useState(false);
    const mechanicIds = order?.mechanicIds ?? [];
    const currentOrderId = order?._id;

    useEffect(() => {
        if (!mechanicIds.length) return;

        const fetchAll = async () => {
            setLoading(true);
            try {
                const results = await Promise.allSettled(
                    mechanicIds.map((id) => {
                        const idStr = typeof id === 'object' ? (id?._id ?? id?.toString()) : id;
                        return axiosClient.get(`/api/admin/employee/getemployee/id/${idStr}`);
                    })
                );

                const fetched = results
                    .filter((r) => r.status === 'fulfilled')
                    .map((r) => r.value?.data?.employee || null)
                    .filter(Boolean);
                setMechanicsData(fetched);
            } catch (_) {
                // fail silently – ratings are supplementary
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [order?._id]);

    // Find the rating for this specific order
    const getOrderRating = (mechanic) => {
        if (!mechanic?.ratings || !currentOrderId) return null;
        return mechanic.ratings.find(
            (r) => r.orderId?.toString() === currentOrderId.toString()
        );
    };

    if (!mechanicIds.length) return null;

    return (
        <Card theme={theme}>
            <View style={styles.headerRow}>
                <View style={[styles.headerIcon, { backgroundColor: 'rgba(226,167,49,0.15)' }]}>
                    <Ionicons name="star" size={14} color="#E2A731" />
                </View>
                <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                    Order Feedback
                </Text>
                <Text style={[styles.headerCount, { color: theme.colors.textMuted }]}>
                    {mechanicIds.length} mechanic{mechanicIds.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {loading ? (
                <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
                        Loading feedback…
                    </Text>
                </View>
            ) : mechanicsData.length === 0 ? (
                <View style={[styles.emptyBox, {
                    backgroundColor: theme.colors.surfaceLow,
                    borderColor: theme.colors.border,
                }]}>
                    <Ionicons name="star-outline" size={22} color={theme.colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                        No ratings yet
                    </Text>
                    <Text style={[styles.emptyHint, { color: theme.colors.textMuted }]}>
                        Customer feedback appears here once submitted
                    </Text>
                </View>
            ) : (
                mechanicsData.map((mechanic, idx) => {
                    const id = mechanic._id ?? String(idx);
                    const firstName = mechanic.firstName ?? '';
                    const lastName = mechanic.lastName ?? '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    const mechanicName = fullName || 'Mechanic';
                    const orderRating = getOrderRating(mechanic);
                    const hasRated = !!orderRating;
                    const starScore = orderRating?.rating ?? 0;
                    const scoreColor = starScore >= 4 ? '#2ECC9A' : starScore >= 3 ? '#E2A731' : '#FF6B6B';

                    return (
                        <View
                            key={id}
                            style={[
                                styles.mechanicBlock,
                                { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLow },
                                idx > 0 && { marginTop: 10 },
                            ]}
                        >
                            {/* Summary row */}
                            <View style={styles.summaryRow}>
                                <View style={[styles.avatar, { backgroundColor: 'rgba(226,167,49,0.15)' }]}>
                                    <Ionicons name="person" size={16} color="#E2A731" />
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.mechanicName, { color: theme.colors.textPrimary }]}>
                                        {mechanicName}
                                    </Text>
                                    {hasRated ? (
                                        <View style={styles.starsRow}>
                                            <StarRow rating={starScore} size={12} theme={theme} />
                                            <Text style={[styles.avgScore, { color: theme.colors.textSecondary }]}>
                                                {starScore}/5
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text style={[styles.noReviewsText, { color: theme.colors.textMuted }]}>
                                            No rating for this order
                                        </Text>
                                    )}
                                </View>

                                {hasRated && (
                                    <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '18' }]}>
                                        <Ionicons name="star" size={10} color={scoreColor} />
                                        <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>
                                            {starScore}/5
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Show review comment if exists */}
                            {hasRated && orderRating.comment ? (
                                <View style={[styles.commentBox, {
                                    backgroundColor: theme.colors.surface,
                                    borderColor: theme.colors.border,
                                    marginTop: 8,
                                }]}>
                                    <Ionicons
                                        name="chatbubble-outline"
                                        size={11}
                                        color={theme.colors.textMuted}
                                        style={{ marginTop: 1 }}
                                    />
                                    <Text style={[styles.commentText, { color: theme.colors.textSecondary }]}>
                                        {orderRating.comment}
                                    </Text>
                                </View>
                            ) : hasRated ? (
                                <Text style={[styles.noCommentText, { color: theme.colors.textMuted }]}>
                                    No written comment
                                </Text>
                            ) : null}

                            {/* Show review date if exists */}
                            {hasRated && orderRating.date && (
                                <Text style={[styles.reviewDate, { color: theme.colors.textMuted, marginTop: 6 }]}>
                                    {formatDate(orderRating.date)}
                                </Text>
                            )}
                        </View>
                    );
                })
            )}
        </Card>
    );
};

const styles = StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    headerIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
    headerCount: { fontSize: 11, fontWeight: '500' },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    loadingText: { fontSize: 13, fontWeight: '500' },
    emptyBox: {
        alignItems: 'center', paddingVertical: 24, borderRadius: 12,
        borderWidth: 1, borderStyle: 'dashed', gap: 6,
    },
    emptyTitle: { fontSize: 13, fontWeight: '700' },
    emptyHint: { fontSize: 11, textAlign: 'center' },
    mechanicBlock: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
    avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    mechanicName: { fontSize: 13.5, fontWeight: '800', marginBottom: 3 },
    starsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    avgScore: { fontSize: 12.5, fontWeight: '800' },
    noReviewsText: { fontSize: 12, fontWeight: '500', textAlign: 'center', paddingVertical: 8 },
    scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
    scoreBadgeText: { fontSize: 11, fontWeight: '800' },
    commentBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 7,
        borderRadius: 9, borderWidth: 1, padding: 9, marginTop: 8,
    },
    commentText: { flex: 1, fontSize: 12.5, fontWeight: '500', lineHeight: 18, fontStyle: 'italic' },
    noCommentText: { fontSize: 11, fontWeight: '500', marginTop: 6 },
    reviewDate: { fontSize: 10, fontWeight: '500' },
});

export default MechanicRatingsCard;