import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import axiosClient from '../../../services/axiosClient';
import { io } from 'socket.io-client';
import Constants from 'expo-constants';

const SOCKET_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    'https://api.repairomoto.in';

function formatTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
}

function ChatListItem({ item, theme, isDark, onPress, isGlowing }) {
    const statusColor = item.status === 'Completed' || item.status === 'Paid' ? '#2ECC9A' : theme.colors.warning;
    
    // Glowing animation
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isGlowing) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
                    Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: false })
                ])
            ).start();
        } else {
            glowAnim.stopAnimation();
            glowAnim.setValue(0);
        }
    }, [isGlowing]);

    const animatedBorderColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.border, theme.colors.primary]
    });

    const animatedBgColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [isDark ? '#2E2618' : '#FFF4E0', isDark ? `${theme.colors.primary}22` : `${theme.colors.primary}33`]
    });

    return (
        <TouchableOpacity 
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Animated.View style={[
                styles.itemCard, 
                { 
                    backgroundColor: animatedBgColor, 
                    borderColor: animatedBorderColor,
                    transform: [{ scale: isGlowing ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) : 1 }]
                }
            ]}>
                <View style={styles.itemHeader}>
                    <Text style={[styles.customerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {item.customerName || 'Unknown Customer'}
                    </Text>
                    <Text style={[styles.timeText, { color: isGlowing ? theme.colors.primary : theme.colors.textMuted, fontWeight: isGlowing ? '800' : '500' }]}>
                        {formatTime(item.lastMessageAt)}
                    </Text>
                </View>
                <View style={styles.itemBody}>
                    <View style={styles.infoRow}>
                        <Ionicons name="receipt-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={[styles.orderNumber, { color: theme.colors.textSecondary }]}>
                            {item.orderNumber}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                    </View>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

export default function AdminSupportScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const mode = useSelector((s) => s.theme.mode);
    const token = useSelector((s) => s.auth.token);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [glowingIds, setGlowingIds] = useState(new Set());

    const fetchChats = async () => {
        try {
            const res = await axiosClient.get('/api/chat/admin/orders');
            setChats(res.data); // data is already sorted by lastMessageAt descending backend
        } catch (err) {
            console.error('Error fetching chats:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            setGlowingIds(new Set());
            fetchChats();
        });
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        fetchChats();
        
        if (!token) return;

        // Setup global room connection
        const socket = io(`${SOCKET_URL}/chat`, {
            auth: { token },
            transports: ['websocket']
        });

        socket.on('admin-list-refresh', (updatedOrderId) => {
            // Give glowing effect
            setGlowingIds(prev => new Set(prev).add(updatedOrderId));
            // Remove glow after 15 seconds automatically
            setTimeout(() => {
                setGlowingIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(updatedOrderId);
                    return newSet;
                });
            }, 10000);

            // re-fetch the list
            fetchChats();
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchChats();
    }, []);

    const handleChatPress = (chat) => {
        // remove glow when clicked
        setGlowingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(chat.orderId);
            return newSet;
        });
        
        navigation.navigate('AdminChatDetail', { 
            orderId: chat.orderId,
            orderNumber: chat.orderNumber,
            customerName: chat.customerName 
        });
    };

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Chat Support</Text>
            </View>
            
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={chats}
                    keyExtractor={(item) => item.orderId}
                    renderItem={({ item }) => (
                        <ChatListItem 
                            item={item} 
                            theme={theme} 
                            isDark={isDark} 
                            isGlowing={glowingIds.has(item.orderId)}
                            onPress={() => handleChatPress(item)} 
                        />
                    )}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
                    }
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={() => (
                        <View style={styles.center}>
                            <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.textMuted} />
                            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No active conversations</Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    listContent: { padding: 16, gap: 12, flexGrow: 1 },
    emptyText: { fontSize: 15, fontWeight: '600' },
    
    itemCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 8,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    customerName: {
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
        marginRight: 10,
    },
    timeText: {
        fontSize: 12,
    },
    itemBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    orderNumber: {
        fontSize: 14,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});