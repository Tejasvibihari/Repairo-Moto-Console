import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Animated, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import useAdminChat from '../../../hooks/useAdminChat';

function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatDateLabel(ts) {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const DateSeparator = ({ label, theme }) => (
    <View style={styles.dateSepRow}>
        <View style={[styles.dateSepLine, { backgroundColor: theme.colors.border }]} />
        <Text style={[styles.dateSepText, { color: theme.colors.textMuted }]}>{label}</Text>
        <View style={[styles.dateSepLine, { backgroundColor: theme.colors.border }]} />
    </View>
);

const MessageBubble = React.memo(({ msg, theme, isDark }) => {
    const isAdmin = msg.senderType === 'admin' || msg.senderType === 'employee';
    const isPending = !!msg._pending;
    const isFailed = !!msg._failed;

    const slideX = useRef(new Animated.Value(isAdmin ? 18 : -18)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideX, { toValue: 0, speed: 22, bounciness: 4, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
    }, []);

    const bubbleBg = isAdmin ? theme.colors.primary : (isDark ? '#2E2618' : '#FFF4E0');
    const textColor = isAdmin ? '#1a1a1a' : theme.colors.textPrimary;

    return (
        <Animated.View style={[styles.bubbleRow, isAdmin ? styles.bubbleRowUser : styles.bubbleRowBot, { opacity, transform: [{ translateX: slideX }] }]}>
            {!isAdmin && (
                <View style={[styles.botAvatar, { backgroundColor: `${theme.colors.primary}22` }]}>
                    <Ionicons name="person" size={13} color={theme.colors.primary} />
                </View>
            )}
            <View style={[styles.bubbleCol, isAdmin && { alignItems: 'flex-end' }]}>
                <View style={[styles.bubble, isAdmin ? styles.bubbleUser : styles.bubbleBot, { backgroundColor: bubbleBg }, !isAdmin && { borderColor: theme.colors.border, borderWidth: 1 }, isFailed && { opacity: 0.5 }]}>
                    {msg.senderType === 'employee' ? <Text style={{ fontSize: 9, color: '#333', fontWeight: 'bold', marginBottom: 2 }}>Employee</Text> : null}
                    <Text style={[styles.bubbleText, { color: textColor }]}>{msg.message}</Text>
                </View>
                <View style={[styles.tsRow, isAdmin && { flexDirection: 'row-reverse' }]}>
                    <Text style={[styles.tsText, { color: theme.colors.textMuted }]}>{formatTime(msg.createdAt)}</Text>
                    {isAdmin && (
                        <Ionicons name={isFailed ? 'alert-circle' : isPending ? 'time-outline' : msg.isRead ? 'checkmark-done' : 'checkmark'} size={12} color={isFailed ? theme.colors.error : msg.isRead ? '#5B9CF6' : theme.colors.textMuted} />
                    )}
                </View>
            </View>
        </Animated.View>
    );
});

function TypingIndicator({ theme, isDark }) {
    const d1 = useRef(new Animated.Value(0)).current;
    const d2 = useRef(new Animated.Value(0)).current;
    const d3 = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const a = (d, delay) => Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }), Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }), Animated.delay(560)])).start();
        a(d1, 0); a(d2, 160); a(d3, 320);
    }, []);
    const dot = (d) => ({ width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.primary, opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }), transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] });
    return (
        <View style={[styles.bubbleRow, styles.bubbleRowBot]}>
            <View style={[styles.botAvatar, { backgroundColor: `${theme.colors.primary}22` }]}><Ionicons name="person" size={13} color={theme.colors.primary} /></View>
            <View style={[styles.bubble, styles.bubbleBot, { backgroundColor: isDark ? '#2E2618' : '#FFF4E0', borderColor: theme.colors.border, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 18 }]}>
                <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                    <Animated.View style={dot(d1)} /><Animated.View style={dot(d2)} /><Animated.View style={dot(d3)} />
                </View>
            </View>
        </View>
    );
}

export default function AdminChatDetail({ route, navigation }) {
    const { orderId, orderNumber, customerName } = route.params;

    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const { messages, loading, sending, connected, userTyping, hasMore, sendMessage, sendTyping, loadMore } = useAdminChat(orderId);

    const [inputText, setInputText] = useState('');
    const [inputHeight, setInputHeight] = useState(0);

    const listRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
        });
        return () => show.remove();
    }, []);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }, []);

    useEffect(() => {
        if (!loading) scrollToBottom();
    }, [messages.length, userTyping, loading]);

    const typingTimer = useRef(null);
    const handleTextChange = useCallback((text) => {
        setInputText(text);
        sendTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => sendTyping(false), 2000);
    }, [sendTyping]);

    const handleSend = useCallback(() => {
        const trimmed = inputText.trim();
        if (!trimmed) return;
        sendTyping(false);
        sendMessage(trimmed);
        setInputText('');
        inputRef.current?.focus();
    }, [inputText, sendMessage, sendTyping]);

    const listData = useMemo(() => {
        const items = [];
        let lastLabel = null;
        for (const msg of messages) {
            const label = formatDateLabel(msg.createdAt);
            if (label !== lastLabel) {
                items.push({ type: 'date', id: `date_${msg._id ?? msg.createdAt}`, label });
                lastLabel = label;
            }
            items.push({ type: 'msg', ...msg });
        }
        if (userTyping) items.push({ type: 'typing', id: 'typing_indicator' });
        return items;
    }, [messages, userTyping]);

    const renderItem = useCallback(({ item }) => {
        if (item.type === 'date') return <DateSeparator label={item.label} theme={theme} />;
        if (item.type === 'typing') return <TypingIndicator theme={theme} isDark={isDark} />;
        return <MessageBubble msg={item} theme={theme} isDark={isDark} />;
    }, [theme, isDark]);

    const canSend = inputText.trim().length > 0 && !sending;

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: isDark ? '#2E2618' : '#FFF4E0', borderColor: theme.colors.border }]} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <View style={[styles.supportAvatar, { backgroundColor: `${theme.colors.primary}22` }]}>
                        <Ionicons name="person" size={18} color={theme.colors.primary} />
                        <View style={[styles.onlineDot, { backgroundColor: connected ? '#2ECC9A' : theme.colors.textMuted, borderColor: theme.colors.background }]} />
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>{customerName || 'Customer'}</Text>
                        <Text style={[styles.headerSub, { color: theme.colors.textSecondary }]}>{orderNumber}</Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView style={styles.kavFlex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 50 : 0}>
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        ref={listRef}
                        data={listData}
                        keyExtractor={(item) => String(item._id ?? item.id)}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={scrollToBottom}
                        onScrollBeginDrag={({ nativeEvent }) => {
                            if (nativeEvent.contentOffset.y < 40 && hasMore) loadMore();
                        }}
                        keyboardDismissMode="interactive"
                        keyboardShouldPersistTaps="handled"
                    />
                )}

                <View style={[styles.inputBar, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
                    <View style={[styles.inputWrap, { backgroundColor: isDark ? '#2E2618' : '#FFF4E0', borderColor: canSend ? theme.colors.primary : theme.colors.border }]}>
                        <TextInput
                            ref={inputRef}
                            style={[styles.input, { color: theme.colors.textPrimary }]}
                            placeholder="Type a reply..."
                            placeholderTextColor={theme.colors.textMuted}
                            value={inputText}
                            onChangeText={handleTextChange}
                            multiline
                            maxLength={500}
                            onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                            blurOnSubmit={false}
                            onSubmitEditing={Platform.OS === 'android' ? handleSend : undefined}
                            returnKeyType={Platform.OS === 'android' ? 'send' : 'default'}
                            scrollEnabled={inputHeight > 80}
                        />
                    </View>
                    <TouchableOpacity style={[styles.sendBtn, { backgroundColor: canSend ? theme.colors.primary : isDark ? '#2E2618' : '#F0E8D0' }]} onPress={handleSend} disabled={!canSend}>
                        {sending ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Ionicons name="send" size={18} color={canSend ? '#1a1a1a' : theme.colors.textMuted} />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 }, kavFlex: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10, zIndex: 10 },
    backBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    supportAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
    headerTitle: { fontSize: 16, fontWeight: '800' },
    headerSub: { fontSize: 12, fontWeight: '600' },
    listContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    dateSepRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 10 },
    dateSepLine: { flex: 1, height: StyleSheet.hairlineWidth },
    dateSepText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
    bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6, gap: 7 },
    bubbleRowUser: { flexDirection: 'row-reverse' },
    bubbleRowBot: { flexDirection: 'row' },
    bubbleCol: { maxWidth: '78%', gap: 3 },
    botAvatar: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4, flexShrink: 0 },
    bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    bubbleUser: { borderBottomRightRadius: 4 },
    bubbleBot: { borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 14, lineHeight: 21 },
    tsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tsText: { fontSize: 10, fontWeight: '500' },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
    inputWrap: { flex: 1, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 7, maxHeight: 120, justifyContent: 'center' },
    input: { fontSize: 14, lineHeight: 20, minHeight: Platform.OS === 'android' ? 36 : undefined, padding: 0 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: Platform.OS === 'ios' ? 0 : 2 },
});
