import React, { useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, RefreshControl, ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    selectNotifications, selectUnreadCount,
    markAsRead, markAllAsRead, setNotifications,
} from '../../store/slices/notificationSlice';
import { selectUser } from '../../store/slices/authSlice';
import { openOrderFromNotification, openChatFromNotification, ORDER_NOTIFICATION_TYPES } from '../../navigation/navigationRef';
import { notificationService } from '../../services/notificationService';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_META = {
    new_order: { icon: 'receipt-outline', color: '#e2a731' },
    order_assigned: { icon: 'person-add-outline', color: '#6C9EE5' },
    order_update: { icon: 'refresh-circle-outline', color: '#2ECC9A' },
    order_cancelled: { icon: 'close-circle-outline', color: '#FF6B6B' },
    order_rescheduled: { icon: 'calendar-outline', color: '#E2A731' },
    invoice_generated: { icon: 'document-text-outline', color: '#9B59B6' },
    delivery_update: { icon: 'bicycle-outline', color: '#3498DB' },
    delivery_assigned: { icon: 'bicycle', color: '#2980B9' },
    mechanic_assigned: { icon: 'build-outline', color: '#E67E22' },
    mechanic_arrived: { icon: 'location-outline', color: '#3498DB' },
    work_started: { icon: 'construct-outline', color: '#E67E22' },
    work_start_otp: { icon: 'key-outline', color: '#9E8E78' },
    work_complete_otp: { icon: 'key-outline', color: '#9E8E78' },
    order_confirmed_complete: { icon: 'checkmark-done-outline', color: '#2ECC9A' },
    payment_received: { icon: 'cash-outline', color: '#2ECC9A' },
    chat: { icon: 'chatbubble-ellipses-outline', color: '#3498DB' },
    general: { icon: 'notifications-outline', color: '#9E8E78' },
};

function NotifCard({ item, theme, onPress }) {
    const meta = TYPE_META[item.type] || TYPE_META.general;
    const isDark = theme === DarkTheme;

    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            activeOpacity={0.78}
            style={[
                cardStyles.row,
                {
                    backgroundColor: item.isRead
                        ? theme.colors.surface
                        : (isDark ? theme.colors.surfaceHigh : '#FFF4E0'),
                    borderColor: item.isRead
                        ? theme.colors.border
                        : 'rgba(226,167,49,0.35)',
                },
            ]}
        >
            <View style={[cardStyles.iconWrap, { backgroundColor: meta.color + '22' }]}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
            </View>
            <View style={cardStyles.textBlock}>
                <Text style={[cardStyles.title, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={[cardStyles.body, { color: theme.colors.textSecondary }]}
                    numberOfLines={2}>
                    {item.body}
                </Text>
                <Text style={[cardStyles.time, { color: theme.colors.textMuted }]}>
                    {timeAgo(item.createdAt)}
                </Text>
            </View>
            {!item.isRead && (
                <View style={[cardStyles.dot, { backgroundColor: theme.colors.primary }]} />
            )}
        </TouchableOpacity>
    );
}

const cardStyles = StyleSheet.create({
    row: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        padding: 14, marginBottom: 8, borderRadius: 14, borderWidth: 1,
    },
    iconWrap: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center', marginTop: 2,
    },
    textBlock: { flex: 1 },
    title: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
    body: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
    time: { fontSize: 11, fontWeight: '500' },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});

export default function NotificationsScreen({ navigation }) {
    const dispatch = useDispatch();
    const notifications = useSelector(selectNotifications);
    const unreadCount = useSelector(selectUnreadCount);
    const user = useSelector(selectUser);
    const mode = useSelector(s => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const [loading, setLoading] = React.useState(false);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const result = await notificationService.getAll();
            dispatch(setNotifications(result.notifications || []));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchNotifications(); }, []);

    const handlePress = async (item) => {
        if (!item.isRead) {
            dispatch(markAsRead(item.id));
            try {
                await notificationService.markRead(item.id);
            } catch (e) {
                console.error('[NotificationScreen] Failed to mark as read:', e);
            }
        }

        // For order-related notifications, navigate to order detail
        const orderId = item.orderId || item.data?.orderId;
        if (!orderId) return;

        if (item.type === 'chat') {
            openChatFromNotification({
                orderId,
                screenOrderId: item.data?.screenOrderId,
                customerName: item.data?.customerName,
            });
            return;
        }

        if (ORDER_NOTIFICATION_TYPES.includes(item.type)) {
            openOrderFromNotification(user, { orderId, screenOrderId: item.data?.screenOrderId });
        }
    };

    const handleMarkAll = async () => {
        dispatch(markAllAsRead());
        await notificationService.markAllRead().catch(() => { });
    };

    return (
        <ScreenWrapper
            title="Notifications"
            rightSlot={
                unreadCount > 0 ? (
                    <TouchableOpacity onPress={handleMarkAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>
                            Mark all read
                        </Text>
                    </TouchableOpacity>
                ) : null
            }
        >
            <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <NotifCard item={item} theme={theme} onPress={handlePress} />
                )}
                contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchNotifications}
                        tintColor={theme.colors.primary} />
                }
                ListEmptyComponent={
                    !loading && (
                        <View style={{ alignItems: 'center', marginTop: 80, gap: 12 }}>
                            <Ionicons name="notifications-off-outline" size={48}
                                color={theme.colors.textMuted} />
                            <Text style={{ color: theme.colors.textMuted, fontSize: 15 }}>
                                No notifications yet
                            </Text>
                        </View>
                    )
                }
            />
        </ScreenWrapper>
    );
}