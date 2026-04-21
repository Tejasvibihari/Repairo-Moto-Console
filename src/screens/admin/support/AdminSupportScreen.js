// screens/admin/support/AdminSupportScreen.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import axiosClient from '../../../services/axiosClient';
import ScreenWrapper from '../../../components/common/ScreenWrapper';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.repairomoto.in';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (diffDay === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Live dot (breathing animation) ──────────────────────────────────────────
function LiveDot({ color }) {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scale, { toValue: 1.5, duration: 600, useNativeDriver: true }),
                    Animated.timing(scale, { toValue: 1, duration: 600, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                ]),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <Animated.View
            style={{
                width: 9, height: 9, borderRadius: 5,
                backgroundColor: color,
                transform: [{ scale }],
                opacity,
            }}
        />
    );
}

// ─── Chat list card ───────────────────────────────────────────────────────────
function ChatListItem({ item, theme, isDark, onPress, unreadCount }) {
    const hasUnread = unreadCount > 0;
    const statusColor = ['Completed', 'Paid'].includes(item.status) ? '#2ECC9A' : theme.colors.warning;

    // Slide-in entrance
    const slideX = useRef(new Animated.Value(-20)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideX, { toValue: 0, speed: 20, bounciness: 4, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
    }, []);

    const cardBg = hasUnread
        ? (isDark ? `${theme.colors.primary}14` : `${theme.colors.primary}09`)
        : (isDark ? theme.colors.surface : '#FFFFFF');

    const cardBorder = hasUnread
        ? `${theme.colors.primary}50`
        : theme.colors.border;

    return (
        <Animated.View style={{ opacity, transform: [{ translateX: slideX }] }}>
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                <View style={[
                    styles.card,
                    {
                        backgroundColor: cardBg,
                        borderColor: cardBorder,
                        shadowColor: hasUnread ? theme.colors.primary : '#000',
                        shadowOpacity: hasUnread ? 0.14 : 0.05,
                    },
                ]}>

                    {/* ── Left accent bar (only when unread) ──────── */}
                    {hasUnread && (
                        <View style={[styles.accentBar, { backgroundColor: theme.colors.primary }]} />
                    )}

                    {/* ── Avatar ──────────────────────────────────── */}
                    <View style={[
                        styles.avatarWrap,
                        {
                            backgroundColor: hasUnread
                                ? `${theme.colors.primary}28`
                                : (isDark ? '#2E2618' : '#FFF4E0'),
                        },
                    ]}>
                        <Ionicons
                            name="person"
                            size={18}
                            color={theme.colors.primary}
                        />
                    </View>

                    {/* ── Content ─────────────────────────────────── */}
                    <View style={styles.cardBody}>
                        {/* Row 1: name + time */}
                        <View style={styles.cardRow}>
                            <Text
                                style={[
                                    styles.customerName,
                                    {
                                        color: theme.colors.textPrimary,
                                        fontWeight: hasUnread ? '800' : '600',
                                    },
                                ]}
                                numberOfLines={1}
                            >
                                {item.customerName || 'Unknown Customer'}
                            </Text>

                            <View style={styles.timeWrap}>
                                {/* Live dot next to timestamp when unread */}
                                {hasUnread && (
                                    <LiveDot color={theme.colors.primary} />
                                )}
                                <Text style={[
                                    styles.timeText,
                                    {
                                        color: hasUnread
                                            ? theme.colors.primary
                                            : theme.colors.textMuted,
                                        fontWeight: hasUnread ? '700' : '400',
                                    },
                                ]}>
                                    {formatTime(item.lastMessageAt)}
                                </Text>
                            </View>
                        </View>

                        {/* Row 2: order number + status + unread badge */}
                        <View style={styles.cardRow}>
                            <View style={styles.infoRow}>
                                <Ionicons name="receipt-outline" size={12} color={theme.colors.textMuted} />
                                <Text style={[styles.orderNumber, { color: theme.colors.textSecondary }]}>
                                    {item.orderNumber}
                                </Text>
                            </View>

                            <View style={styles.rightMeta}>
                                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                                    <Text style={[styles.statusText, { color: statusColor }]}>
                                        {item.status}
                                    </Text>
                                </View>

                                {/* Unread count pill */}
                                {hasUnread && (
                                    <View style={[styles.unreadPill, { backgroundColor: theme.colors.primary }]}>
                                        <Text style={styles.unreadPillText}>
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Row 3: message preview (only when unread) */}
                        {hasUnread && item._lastPreview ? (
                            <Text
                                style={[styles.preview, { color: theme.colors.textPrimary }]}
                                numberOfLines={1}
                            >
                                {item._lastPreview}
                            </Text>
                        ) : null}
                    </View>

                    <Ionicons name="chevron-forward" size={15} color={theme.colors.textMuted} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AdminSupportScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const mode = useSelector((s) => s.theme.mode);
    const token = useSelector((s) => s.auth.token);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});   // { orderId: number }
    const [lastPreviews, setLastPreviews] = useState({});   // { orderId: string }

    const socketRef = useRef(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchChats = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await axiosClient.get('/api/chat/admin/orders');
            setChats(res.data ?? []);
        } catch (err) {
            console.error('fetchChats:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const unsub = navigation.addListener('focus', () => fetchChats());
        return unsub;
    }, [navigation, fetchChats]);

    // ── Socket ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!token) return;

        const socket = io(`${SOCKET_URL}/chat`, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 8,
            reconnectionDelay: 2000,
        });
        socketRef.current = socket;

        const joinAll = (list) => {
            list.forEach((c) =>
                socket.emit('join-order', c.orderId?.toString(), () => { })
            );
        };

        socket.on('connect', () => {
            setChats((prev) => { joinAll(prev); return prev; });
        });

        socket.on('new-message', (msg) => {
            if (msg.senderType !== 'user') return;
            const oid = msg.orderId?.toString();

            setUnreadCounts((prev) => ({ ...prev, [oid]: (prev[oid] ?? 0) + 1 }));
            setLastPreviews((prev) => ({ ...prev, [oid]: msg.message }));

            setChats((prev) => {
                const idx = prev.findIndex((c) => c.orderId?.toString() === oid);
                if (idx === -1) { fetchChats(true); return prev; }
                const updated = { ...prev[idx], lastMessageAt: msg.createdAt };
                return [updated, ...prev.filter((_, i) => i !== idx)];
            });
        });

        return () => { socket.disconnect(); socketRef.current = null; };
    }, [token]);

    // Join new rooms when list grows
    useEffect(() => {
        const s = socketRef.current;
        if (!s?.connected || !chats.length) return;
        chats.forEach((c) => s.emit('join-order', c.orderId?.toString(), () => { }));
    }, [chats.length]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchChats();
    }, [fetchChats]);

    const handlePress = useCallback((chat) => {
        const oid = chat.orderId?.toString();
        setUnreadCounts((prev) => ({ ...prev, [oid]: 0 }));
        setLastPreviews((prev) => { const n = { ...prev }; delete n[oid]; return n; });
        navigation.navigate('AdminChatDetail', {
            orderId: chat.orderId,
            orderNumber: chat.orderNumber,
            customerName: chat.customerName,
        });
    }, [navigation]);

    const totalUnread = Object.values(unreadCounts).reduce((s, n) => s + n, 0);

    const enriched = chats.map((c) => ({
        ...c,
        _lastPreview: lastPreviews[c.orderId?.toString()] ?? c._lastPreview,
    }));

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
            <ScreenWrapper title="Chat Support" noPadding>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={enriched}
                        keyExtractor={(item) => String(item.orderId)}
                        renderItem={({ item }) => (
                            <ChatListItem
                                item={item}
                                theme={theme}
                                isDark={isDark}
                                unreadCount={unreadCounts[item.orderId?.toString()] ?? 0}
                                onPress={() => handlePress(item)}
                            />
                        )}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[theme.colors.primary]}
                                tintColor={theme.colors.primary}
                            />
                        }
                        contentContainerStyle={[
                            styles.listContent,
                            enriched.length === 0 && { flex: 1 },
                        ]}
                        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => (
                            <View style={styles.center}>
                                <View style={[styles.emptyIcon, { backgroundColor: `${theme.colors.primary}18` }]}>
                                    <Ionicons name="chatbubbles-outline" size={36} color={theme.colors.primary} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                                    No conversations yet
                                </Text>
                                <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
                                    Customer chats will appear here
                                </Text>
                            </View>
                        )}
                    />
                )}
            </ScreenWrapper>

        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
    headerSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },

    totalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
    },
    totalBadgeText: { fontSize: 12, fontWeight: '800', color: '#1a1a1a' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    listContent: { padding: 14, paddingBottom: 24 },

    emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
    emptySub: { fontSize: 13, textAlign: 'center' },

    // Card
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',          // clips the accent bar neatly
        paddingVertical: 14,
        paddingRight: 14,
        paddingLeft: 14,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 10,
        elevation: 3,
    },

    // Amber left bar — only rendered when hasUnread
    accentBar: {
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: 4,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },

    avatarWrap: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },

    cardBody: { flex: 1, gap: 5 },

    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },

    customerName: { fontSize: 15, flex: 1 },

    timeWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    timeText: { fontSize: 11 },

    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    orderNumber: { fontSize: 12, fontWeight: '600' },

    rightMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },

    statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

    // Unread count pill
    unreadPill: {
        minWidth: 20, height: 20,
        borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 5,
    },
    unreadPillText: { fontSize: 10, fontWeight: '800', color: '#1a1a1a' },

    // Message preview
    preview: { fontSize: 12, fontWeight: '600', letterSpacing: 0.1 },
});