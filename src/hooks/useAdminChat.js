// hooks/useAdminChat.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import axiosClient from '../services/axiosClient';
import Constants from 'expo-constants';

const SOCKET_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    'https://api.repairomoto.in';

export default function useAdminChat(orderId) {
    const token = useSelector((s) => s.auth.token);
    const userRole = useSelector((s) => s.auth.user?.role || s.auth.role);

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [userTyping, setUserTyping] = useState(false);

    const socketRef = useRef(null);
    const joinedRef = useRef(false);
    const pendingTempIds = useRef(new Set());
    const userTypingTimer = useRef(null);
    const typingTimer = useRef(null);

    // ── Fetch history ────────────────────────────────────────────────────────
    const fetchHistory = useCallback(async (pageNum = 1) => {
        if (!orderId) return;
        try {
            setLoading(true);
            const res = await axiosClient.get(
                `/api/chat/admin/${orderId}/messages?page=${pageNum}&limit=50`
            );
            const incoming = res.data.messages ?? [];
            const pagination = res.data.pagination ?? {};

            setMessages((prev) =>
                pageNum === 1 ? incoming : [...incoming, ...prev]
            );
            setHasMore(pageNum < (pagination.pages ?? 1));
            setPage(pageNum);
        } catch (err) {
            setError(err?.response?.data?.message ?? err.message);
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    const loadMore = useCallback(() => {
        if (hasMore && !loading) fetchHistory(page + 1);
    }, [hasMore, loading, page, fetchHistory]);

    // ── Socket setup ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!orderId || !token) return;

        fetchHistory(1);

        const socket = io(`${SOCKET_URL}/chat`, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            setError(null);
            if (!joinedRef.current) {
                joinedRef.current = true;
                socket.emit('join-order', orderId.toString(), (ack) => {
                    if (ack?.error) {
                        setError(ack.error);
                        joinedRef.current = false;
                    }
                });
            }
        });

        socket.on('disconnect', () => {
            setConnected(false);
            joinedRef.current = false;
        });

        socket.on('connect_error', () => {
            setConnected(false);
            setError('Connection failed. Retrying…');
        });

        socket.on('new-message', (msg) => {
            setMessages((prev) => {
                if (prev.some((m) => m._id === msg._id)) return prev;

                const pendingIds = Array.from(pendingTempIds.current);
                if (pendingIds.length > 0) {
                    const tempId = pendingIds[0];
                    pendingTempIds.current.delete(tempId);
                    return prev.map((m) =>
                        m._id === tempId ? { ...msg, _pending: false } : m
                    );
                }

                return [...prev, msg];
            });
        });

        socket.on('reconnect', () => {
            joinedRef.current = false;
            socket.emit('join-order', orderId.toString(), (ack) => {
                if (!ack?.error) joinedRef.current = true;
            });
        });

        // Typing from user side
        socket.on('user-typing', ({ userType, isTyping }) => {
            if (userType === 'user') {
                setUserTyping(isTyping);
                if (isTyping) {
                    if (userTypingTimer.current) clearTimeout(userTypingTimer.current);
                    userTypingTimer.current = setTimeout(() => setUserTyping(false), 4000);
                }
            }
        });

        return () => {
            joinedRef.current = false;
            pendingTempIds.current.clear();
            socket.disconnect();
            socketRef.current = null;
        };
    }, [orderId, token]);

    // ── Send message ─────────────────────────────────────────────────────────
    const sendMessage = useCallback(async (text, attachments = []) => {
        const trimmed = text?.trim();
        if (!trimmed || !orderId) return;

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        
        // Use 'admin' as fallback for senderType. The backend parses it precisely based on the token.
        const optimistic = {
            _id: tempId,
            orderId,
            senderType: userRole === 'Employee' ? 'employee' : 'admin',
            message: trimmed,
            attachments,
            createdAt: new Date().toISOString(),
            isRead: false,
            _pending: true,
        };

        pendingTempIds.current.add(tempId);
        setMessages((prev) => [...prev, optimistic]);
        setSending(true);

        const replace = (real) => {
            pendingTempIds.current.delete(tempId);
            setMessages((prev) =>
                prev.map((m) => (m._id === tempId ? { ...real, _pending: false } : m))
            );
        };

        const markFailed = () => {
            pendingTempIds.current.delete(tempId);
            setMessages((prev) =>
                prev.map((m) =>
                    m._id === tempId ? { ...m, _failed: true, _pending: false } : m
                )
            );
        };

        try {
            if (socketRef.current?.connected) {
                socketRef.current.emit(
                    'send-message',
                    { orderId: orderId.toString(), message: trimmed, attachments },
                    (ack) => {
                        if (ack?.error) {
                            markFailed();
                        } else if (ack?.message) {
                            replace(ack.message);
                        } else {
                            pendingTempIds.current.delete(tempId);
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m._id === tempId ? { ...m, _pending: false } : m
                                )
                            );
                        }
                        setSending(false);
                    }
                );
            } else {
                const res = await axiosClient.post(`/api/chat/admin/${orderId}/messages`, {
                    message: trimmed,
                    attachments,
                });
                replace(res.data);
                setSending(false);
            }
        } catch {
            markFailed();
            setSending(false);
        }
    }, [orderId, userRole]);

    // ── Typing indicator ─────────────────────────────────────────────────────
    const sendTyping = useCallback((isTyping) => {
        if (!socketRef.current?.connected || !orderId) return;
        socketRef.current.emit('typing', { orderId: orderId.toString(), isTyping });
        if (isTyping) {
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => {
                socketRef.current?.emit('typing', {
                    orderId: orderId.toString(),
                    isTyping: false,
                });
            }, 3000);
        }
    }, [orderId]);

    return {
        messages,
        loading,
        sending,
        connected,
        error,
        hasMore,
        userTyping,
        sendMessage,
        sendTyping,
        loadMore,
        refetch: () => fetchHistory(1),
    };
}
