// src/screens/employee/booking/EmployeeOrderDetailScreen.js
// ─── Employee view: mechanic workflow + edit parts/services ───────────────────

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Animated, Platform, Alert, ActivityIndicator, Linking,
    TextInput, Modal, Dimensions, Keyboard, Image,
    KeyboardAvoidingView,
    RefreshControl,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axiosClient from '../../../services/axiosClient';
import PopUp from '../../../components/common/PopUp';
import { getImageUrl } from '../../../utils/imageUtils';
import MechanicRatingsCard from '../../../components/common/MechanicRatingCard';

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    pending: { label: 'Pending', bg: 'rgba(158,142,120,0.18)', text: '#9E8E78', dot: '#9E8E78' },
    in_progress: { label: 'In Progress', bg: 'rgba(226,167,49,0.18)', text: '#E2A731', dot: '#E2A731' },
    mechanic_assigned: { label: 'Mechanic Assigned', bg: 'rgba(52,152,219,0.18)', text: '#3498DB', dot: '#3498DB' },
    mechanic_arrived: { label: 'Mechanic Arrived', bg: 'rgba(155,89,182,0.18)', text: '#9B59B6', dot: '#9B59B6' },
    completion_requested: { label: 'Completion Requested', bg: 'rgba(46,204,154,0.12)', text: '#2ECC9A', dot: '#2ECC9A' },
    work_completed: { label: 'Work Completed', bg: 'rgba(46,204,154,0.12)', text: '#2ECC9A', dot: '#2ECC9A' },
    completed: { label: 'Completed', bg: 'rgba(46,204,154,0.18)', text: '#1b7a5c', dot: '#2ECC9A' },
    invoice_generated: { label: 'Invoice Generated', bg: 'rgba(155,89,182,0.18)', text: '#9B59B6', dot: '#9B59B6' },
    cancelled: { label: 'Cancelled', bg: 'rgba(255,107,107,0.18)', text: '#FF6B6B', dot: '#FF6B6B' },
};


const compressImage = async (uri) => {
    const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }], // downscale — height auto-scales proportionally
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result; // { uri, width, height }
};
const getStatusConfig = (status = '') => {
    const key = status.toLowerCase().trim().replace(/\s+/g, '_');
    return STATUS_CONFIG[key] ?? STATUS_CONFIG.pending;
};

const normalizeStatus = (status = '') => status.toLowerCase().trim().replace(/\s+/g, '_');

const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (val) =>
    `₹${Number(val ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Small reusable components ────────────────────────────────────────────────
const SectionLabel = ({ label, theme }) => (
    <Text style={[sectionStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
);
const sectionStyles = StyleSheet.create({
    label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
});

const Divider = ({ theme, style }) => (
    <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }, style]} />
);

const InfoTile = ({ icon, label, value, theme, accent = false, iconLib = 'ion' }) => {
    const IconComp = iconLib === 'mci' ? MaterialCommunityIcons : Ionicons;
    return (
        <View style={tileStyles.tile}>
            <View style={[tileStyles.iconWrap, { backgroundColor: accent ? `${theme.colors.primary}22` : theme.colors.surfaceHigh }]}>
                <IconComp name={icon} size={15} color={accent ? theme.colors.primary : theme.colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[tileStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
                <Text style={[tileStyles.value, { color: accent ? theme.colors.primary : theme.colors.textPrimary }]} numberOfLines={1}>
                    {value || '—'}
                </Text>
            </View>
        </View>
    );
};
const tileStyles = StyleSheet.create({
    tile: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 1 },
    value: { fontSize: 13.5, fontWeight: '600' },
});

const Card = ({ children, theme, style }) => (
    <View style={[cardStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.primary }, style]}>
        {children}
    </View>
);
const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 3,
    },
});

const getServiceChipStyle = (type) => {
    if (type === 'Schedule Repair') return { label: 'Scheduled', icon: 'calendar-outline', bg: 'rgba(46,204,154,0.15)', text: '#2ECC9A', border: 'rgba(46,204,154,0.3)' };
    if (type === 'Emergency Repair') return { label: 'Emergency', icon: 'alert-circle-outline', bg: 'rgba(255,107,107,0.15)', text: '#FF6B6B', border: 'rgba(255,107,107,0.3)' };
    return { label: type || '—', icon: 'help-circle-outline', bg: 'rgba(128,128,128,0.15)', text: '#888', border: 'rgba(128,128,128,0.3)' };
};

// ─── Map Component ────────────────────────────────────────────────────────────
const LocationMap = ({ coordinates, city, theme }) => {
    const [placeName, setPlaceName] = useState('');
    const [mapReady, setMapReady] = useState(false);
    const lat = coordinates[1];
    const lng = coordinates[0];

    useEffect(() => {
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
            .then(r => r.json())
            .then(d => setPlaceName(d.display_name ?? city))
            .catch(() => setPlaceName(city));
    }, [lat, lng]);

    const openExternalMap = () => {
        const url = Platform.select({ ios: `maps:0,0?q=${lat},${lng}`, android: `geo:0,0?q=${lat},${lng}` });
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(url || fallbackUrl).catch(() => Linking.openURL(fallbackUrl));
    };

    return (
        <View style={[mapStyles.wrapper, { borderColor: theme.colors.border, shadowColor: theme.colors.primary }]}>
            <View style={[mapStyles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
                <View style={[mapStyles.iconWrap, { backgroundColor: `${theme.colors.primary}22` }]}>
                    <Ionicons name="location" size={14} color={theme.colors.primary} />
                </View>
                <Text style={[mapStyles.placeName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                    {placeName || city || 'Loading location…'}
                </Text>
            </View>
            <MapView
                provider={PROVIDER_GOOGLE}
                style={mapStyles.map}
                onMapReady={() => setMapReady(true)}
                initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                zoomEnabled scrollEnabled pitchEnabled rotateEnabled
                showsPointsOfInterest showsBuildings showsCompass showsScale zoomControlEnabled
            >
                {mapReady && <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor={theme.colors.primary} />}
            </MapView>
            <View style={[mapStyles.footer, { backgroundColor: theme.colors.surfaceLow, borderTopColor: theme.colors.border }]}>
                <Ionicons name="navigate-outline" size={12} color={theme.colors.textMuted} />
                <Text style={[mapStyles.coordText, { color: theme.colors.textMuted }]}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
                <TouchableOpacity style={[mapStyles.viewMapBtn, { backgroundColor: theme.colors.primary }]} onPress={openExternalMap} activeOpacity={0.8}>
                    <Ionicons name="map-outline" size={12} color="#fff" />
                    <Text style={mapStyles.viewMapText}>View on Map</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
const mapStyles = StyleSheet.create({
    wrapper: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 12, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    placeName: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
    map: { width: '100%', height: 220 },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
    coordText: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3, flex: 1 },
    viewMapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
    viewMapText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

// ─── OTP Input Component ──────────────────────────────────────────────────────
const OtpInput = ({ value, onChange, theme }) => {
    const inputs = useRef([]);
    const digits = value.split('');

    const handleChange = (text, index) => {
        const cleaned = text.replace(/[^0-9]/g, '').slice(-1);
        const newDigits = [...digits];
        newDigits[index] = cleaned;
        onChange(newDigits.join(''));
        if (cleaned && index < 3) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    return (
        <View style={otpStyles.row}>
            {[0, 1, 2, 3].map((i) => (
                <TextInput
                    key={i}
                    ref={(r) => (inputs.current[i] = r)}
                    style={[
                        otpStyles.box,
                        {
                            borderColor: digits[i] ? theme.colors.primary : theme.colors.border,
                            backgroundColor: digits[i] ? `${theme.colors.primary}14` : theme.colors.surfaceLow,
                            color: theme.colors.textPrimary,
                        },
                    ]}
                    value={digits[i] || ''}
                    onChangeText={(t) => handleChange(t, i)}
                    onKeyPress={(e) => handleKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                />
            ))}
        </View>
    );
};
const otpStyles = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 8 },
    box: {
        width: 56, height: 60, borderRadius: 14, borderWidth: 2,
        fontSize: 24, fontWeight: '900',
    },
});

// ─── COD Collect Cash Modal ───────────────────────────────────────────────────
const CodModal = ({
    visible,
    onClose,
    onConfirm,
    theme,
    amount,
    submitting,
}) => {
    const insets = useSafeAreaInsets();
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        if (visible) setConfirmed(false);
    }, [visible]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={codModalStyles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={[
                    codModalStyles.sheet,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 24,
                    },
                ]}>
                    {/* Handle */}
                    <View style={[codModalStyles.handle, { backgroundColor: theme.colors.border }]} />

                    {/* Header */}
                    <View style={[codModalStyles.header, { borderBottomColor: theme.colors.border }]}>
                        <View style={[codModalStyles.headerIcon, { backgroundColor: 'rgba(46,204,154,0.15)' }]}>
                            <Ionicons name="cash-outline" size={22} color="#2ECC9A" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[codModalStyles.title, { color: theme.colors.textPrimary }]}>
                                Collect Cash Payment
                            </Text>
                            <Text style={[codModalStyles.subtitle, { color: theme.colors.textMuted }]}>
                                Confirm cash received from customer
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[codModalStyles.closeBtn, { backgroundColor: theme.colors.surfaceLow }]}
                        >
                            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Amount Display */}
                    <View style={codModalStyles.body}>
                        <View style={[codModalStyles.amountCard, { backgroundColor: 'rgba(46,204,154,0.08)', borderColor: 'rgba(46,204,154,0.25)' }]}>
                            <Text style={[codModalStyles.amountLabel, { color: theme.colors.textMuted }]}>
                                AMOUNT TO COLLECT
                            </Text>
                            <Text style={codModalStyles.amountValue}>
                                {formatCurrency(amount)}
                            </Text>
                            <View style={codModalStyles.amountMethodRow}>
                                <Ionicons name="cash" size={14} color="#2ECC9A" />
                                <Text style={[codModalStyles.amountMethod, { color: theme.colors.textSecondary }]}>
                                    Cash on Delivery
                                </Text>
                            </View>
                        </View>

                        {/* Checklist */}
                        <View style={[codModalStyles.checklistCard, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                            <Text style={[codModalStyles.checklistTitle, { color: theme.colors.textSecondary }]}>
                                Before confirming, ensure:
                            </Text>
                            {[
                                'You have received the exact cash amount',
                                'Customer is satisfied with the service',
                                'Hand over any replaced parts if requested',
                            ].map((item, i) => (
                                <View key={i} style={codModalStyles.checkRow}>
                                    <View style={[codModalStyles.checkDot, { backgroundColor: '#2ECC9A20' }]}>
                                        <Ionicons name="checkmark" size={11} color="#2ECC9A" />
                                    </View>
                                    <Text style={[codModalStyles.checkText, { color: theme.colors.textSecondary }]}>
                                        {item}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Confirm Toggle */}
                        <TouchableOpacity
                            onPress={() => setConfirmed(prev => !prev)}
                            style={[
                                codModalStyles.confirmToggle,
                                {
                                    borderColor: confirmed ? '#2ECC9A' : theme.colors.border,
                                    backgroundColor: confirmed ? 'rgba(46,204,154,0.08)' : theme.colors.surfaceLow,
                                },
                            ]}
                            activeOpacity={0.75}
                        >
                            <View style={[
                                codModalStyles.checkbox,
                                {
                                    backgroundColor: confirmed ? '#2ECC9A' : 'transparent',
                                    borderColor: confirmed ? '#2ECC9A' : theme.colors.border,
                                },
                            ]}>
                                {confirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                            <Text style={[codModalStyles.confirmToggleText, { color: theme.colors.textPrimary }]}>
                                I confirm I have collected {formatCurrency(amount)} in cash
                            </Text>
                        </TouchableOpacity>

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={() => onConfirm(amount)}
                            disabled={!confirmed || submitting}
                            style={[
                                codModalStyles.submitBtn,
                                {
                                    backgroundColor: '#2ECC9A',
                                    opacity: confirmed && !submitting ? 1 : 0.45,
                                },
                            ]}
                            activeOpacity={0.85}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                    <Text style={codModalStyles.submitBtnTxt}>
                                        Mark as Paid — {formatCurrency(amount)}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const codModalStyles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 24,
    },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
    subtitle: { fontSize: 12, fontWeight: '500', marginTop: 1 },
    closeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    body: { paddingHorizontal: 20, paddingTop: 20, gap: 14 },
    amountCard: {
        borderRadius: 18, borderWidth: 1.5,
        alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16,
    },
    amountLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
    amountValue: { fontSize: 36, fontWeight: '900', color: '#2ECC9A', letterSpacing: 0.5 },
    amountMethodRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
    amountMethod: { fontSize: 12, fontWeight: '600' },
    checklistCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
    checklistTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    checkDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    checkText: { flex: 1, fontSize: 12.5, fontWeight: '500', lineHeight: 18 },
    confirmToggle: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: 14, borderWidth: 1.5,
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 6, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    confirmToggleText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 16, borderRadius: 14,
    },
    submitBtnTxt: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
});

// ─── Photo + OTP Modal (with Keyboard Avoiding) ─────────────────────────────────
const PhotoOtpModal = ({
    visible,
    onClose,
    onSubmit,
    onResendOtp,
    theme,
    title,
    subtitle,
    photoLabel,
    onRequestOtp,
    submitting,
    resending,
    stepLabel,
    hasPendingPhoto = false,
}) => {
    const insets = useSafeAreaInsets();
    const [photo, setPhoto] = useState(null);
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(hasPendingPhoto ? 'otp' : 'photo');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvent, (e) => {
            setKeyboardVisible(true);
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            setKeyboardVisible(false);
            setKeyboardHeight(0);
        });
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    useEffect(() => {
        if (visible) {
            setStep(hasPendingPhoto ? 'otp' : 'photo');
            setOtp('');
            if (!hasPendingPhoto) setPhoto(null);
        } else {
            Keyboard.dismiss();
            setPhoto(null);
            setOtp('');
            setKeyboardVisible(false);
            setKeyboardHeight(0);
        }
    }, [visible, hasPendingPhoto]);

    const pickPhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Camera access is needed to take a photo.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsEditing: false,
        });
        if (!result.canceled && result.assets?.[0]) {
            const compressed = await compressImage(result.assets[0].uri);
            setPhoto({ ...result.assets[0], uri: compressed.uri });
        }
    };

    const handlePhotoNext = async () => {
        if (!photo) {
            Alert.alert('Photo required', `Please take the ${photoLabel} before continuing.`);
            return;
        }
        try {
            await onRequestOtp(photo);
            setStep('otp');
        } catch (err) {
            console.log(err)
            Alert.alert('Upload Failed', err?.response?.data?.message || 'Could not upload photo. Please try again.');
        }
    };

    const handleSubmitOtp = async () => {
        if (otp.length < 4) {
            Alert.alert('Enter OTP', 'Please enter the complete 4-digit OTP.');
            return;
        }
        await onSubmit(otp);
    };

    const handleRetakePhoto = () => {
        setPhoto(null);
        setOtp('');
        setStep('photo');
    };

    const scrollBottomPad = keyboardVisible
        ? keyboardHeight + 16
        : insets.bottom + 20;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={() => { Keyboard.dismiss(); onClose(); }}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={photoOtpStyles.keyboardAvoid}
                keyboardVerticalOffset={0}
            >
                <View style={photoOtpStyles.overlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
                    <View
                        style={[
                            photoOtpStyles.sheet,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                            },
                        ]}
                    >
                        <View style={[photoOtpStyles.handle, { backgroundColor: theme.colors.border }]} />

                        <View style={[photoOtpStyles.header, { borderBottomColor: theme.colors.border }]}>
                            <View style={[photoOtpStyles.headerIcon, { backgroundColor: `${theme.colors.primary}18` }]}>
                                <Ionicons name={step === 'photo' ? 'camera-outline' : 'keypad-outline'} size={22} color={theme.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[photoOtpStyles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
                                <Text style={[photoOtpStyles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
                            </View>
                            <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }}
                                style={[photoOtpStyles.closeBtn, { backgroundColor: theme.colors.surfaceLow }]}>
                                <Ionicons name="close" size={18} color={theme.colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <View style={photoOtpStyles.stepRow}>
                            <View style={[photoOtpStyles.stepDot, { backgroundColor: theme.colors.primary }]}>
                                <Ionicons name="camera" size={12} color="#fff" />
                            </View>
                            <View style={[photoOtpStyles.stepLine, { backgroundColor: step === 'otp' ? theme.colors.primary : theme.colors.border }]} />
                            <View style={[photoOtpStyles.stepDot, { backgroundColor: step === 'otp' ? theme.colors.primary : theme.colors.border }]}>
                                <Ionicons name="keypad" size={12} color="#fff" />
                            </View>
                        </View>

                        <ScrollView
                            contentContainerStyle={[photoOtpStyles.body, { paddingBottom: scrollBottomPad }]}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            {step === 'photo' ? (
                                <>
                                    <Text style={[photoOtpStyles.stepTitle, { color: theme.colors.textPrimary }]}>
                                        Step 1: Take {photoLabel}
                                    </Text>
                                    <Text style={[photoOtpStyles.stepHint, { color: theme.colors.textMuted }]}>
                                        Take a clear photo of the bike {photoLabel === 'before photo' ? 'before starting repairs' : 'after completing repairs'}.
                                    </Text>

                                    <TouchableOpacity
                                        onPress={pickPhoto}
                                        activeOpacity={0.8}
                                        style={[photoOtpStyles.photoBox, {
                                            borderColor: photo ? theme.colors.primary : theme.colors.border,
                                            backgroundColor: photo ? `${theme.colors.primary}08` : theme.colors.surfaceLow,
                                        }]}
                                    >
                                        {photo ? (
                                            <View style={{ width: '100%', height: '100%' }}>
                                                <Image source={{ uri: photo.uri }} style={photoOtpStyles.photoPreview} resizeMode="cover" />
                                                <View style={photoOtpStyles.retakeOverlay}>
                                                    <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
                                                    <Text style={photoOtpStyles.retakeText}>Retake</Text>
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={photoOtpStyles.photoPlaceholder}>
                                                <View style={[photoOtpStyles.cameraIconWrap, { backgroundColor: `${theme.colors.primary}20` }]}>
                                                    <Ionicons name="camera-outline" size={32} color={theme.colors.primary} />
                                                </View>
                                                <Text style={[photoOtpStyles.photoPlaceholderTitle, { color: theme.colors.textPrimary }]}>
                                                    Tap to Open Camera
                                                </Text>
                                                <Text style={[photoOtpStyles.photoPlaceholderHint, { color: theme.colors.textMuted }]}>
                                                    {photoLabel} is required
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handlePhotoNext}
                                        style={[photoOtpStyles.primaryBtn, { backgroundColor: theme.colors.primary, opacity: photo ? 1 : 0.55 }]}
                                        activeOpacity={0.85}
                                        disabled={!photo || submitting}
                                    >
                                        {submitting ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <>
                                                <Text style={photoOtpStyles.primaryBtnTxt}>Continue & Send OTP</Text>
                                                <Ionicons name="arrow-forward" size={18} color="#fff" />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <Text style={[photoOtpStyles.stepTitle, { color: theme.colors.textPrimary }]}>
                                        Step 2: Enter Customer OTP
                                    </Text>
                                    <Text style={[photoOtpStyles.stepHint, { color: theme.colors.textMuted }]}>
                                        A 4-digit OTP has been sent to the customer. Ask the customer for the code.
                                    </Text>

                                    {photo && (
                                        <View style={photoOtpStyles.photoThumbRow}>
                                            <Image source={{ uri: photo.uri }} style={photoOtpStyles.photoThumb} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[photoOtpStyles.photoThumbLabel, { color: theme.colors.textSecondary }]}>
                                                    Photo captured ✓
                                                </Text>
                                                <Text style={[photoOtpStyles.photoThumbSub, { color: theme.colors.textMuted }]}>
                                                    {photoLabel}
                                                </Text>
                                            </View>
                                            <View style={[photoOtpStyles.checkBadge, { backgroundColor: '#2ECC9A20' }]}>
                                                <Ionicons name="checkmark-circle" size={22} color="#2ECC9A" />
                                            </View>
                                        </View>
                                    )}

                                    <View style={[photoOtpStyles.otpCard, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                                        <View style={photoOtpStyles.otpCardHeader}>
                                            <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.primary} />
                                            <Text style={[photoOtpStyles.otpCardTitle, { color: theme.colors.textPrimary }]}>
                                                Customer Verification OTP
                                            </Text>
                                        </View>
                                        <OtpInput value={otp} onChange={setOtp} theme={theme} />

                                        <TouchableOpacity
                                            onPress={onResendOtp}
                                            disabled={resending}
                                            style={photoOtpStyles.resendRow}
                                        >
                                            {resending
                                                ? <ActivityIndicator size="small" color={theme.colors.primary} />
                                                : <Text style={[photoOtpStyles.resendTxt, { color: theme.colors.primary }]}>
                                                    Resend OTP
                                                </Text>
                                            }
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        onPress={handleRetakePhoto}
                                        style={[photoOtpStyles.retakeBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLow }]}
                                        activeOpacity={0.75}
                                    >
                                        <Ionicons name="camera-reverse-outline" size={16} color={theme.colors.textSecondary} />
                                        <Text style={[photoOtpStyles.retakeBtnTxt, { color: theme.colors.textSecondary }]}>
                                            Retake Photo & Restart
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleSubmitOtp}
                                        style={[photoOtpStyles.primaryBtn, { backgroundColor: '#2ECC9A', opacity: otp.length === 4 ? 1 : 0.55 }]}
                                        activeOpacity={0.85}
                                        disabled={otp.length < 4 || submitting}
                                    >
                                        {submitting ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <>
                                                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                                                <Text style={photoOtpStyles.primaryBtnTxt}>{stepLabel}</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const photoOtpStyles = StyleSheet.create({
    keyboardAvoid: { flex: 1 },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1,
        borderLeftWidth: 1, borderRightWidth: 1, shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.2,
        shadowRadius: 24, elevation: 24, maxHeight: '90%',
    },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
    headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
    subtitle: { fontSize: 12, fontWeight: '500', marginTop: 1 },
    closeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 0 },
    stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    stepLine: { width: 48, height: 2, borderRadius: 1, marginHorizontal: 4 },
    body: { paddingHorizontal: 20, paddingTop: 4 },
    stepTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
    stepHint: { fontSize: 12.5, lineHeight: 18, marginBottom: 18 },
    photoBox: {
        width: '100%', height: 200, borderRadius: 18, borderWidth: 2,
        borderStyle: 'dashed', overflow: 'hidden', marginBottom: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    photoPreview: { width: '100%', height: '100%' },
    retakeOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.5)',
    },
    retakeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    photoPlaceholder: { alignItems: 'center', gap: 8, padding: 16 },
    cameraIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    photoPlaceholderTitle: { fontSize: 14, fontWeight: '700' },
    photoPlaceholderHint: { fontSize: 12 },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 4,
    },
    primaryBtnTxt: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
    photoThumbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, borderRadius: 14, backgroundColor: 'rgba(46,204,154,0.08)' },
    photoThumb: { width: 52, height: 52, borderRadius: 10 },
    photoThumbLabel: { fontSize: 13, fontWeight: '700' },
    photoThumbSub: { fontSize: 11, marginTop: 2 },
    checkBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    otpCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
    otpCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    otpCardTitle: { fontSize: 13, fontWeight: '700' },
    resendRow: { alignItems: 'center', marginTop: 12 },
    resendTxt: { fontSize: 13, fontWeight: '700' },
    retakeBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 7, paddingVertical: 11, borderRadius: 12, borderWidth: 1, marginBottom: 12,
    },
    retakeBtnTxt: { fontSize: 13, fontWeight: '600' },
});

// ─── Repair Photos Gallery ────────────────────────────────────────────────────
const RepairPhotosCard = ({ beforePhotos = [], afterPhotos = [], theme }) => {
    const hasAny = beforePhotos.length > 0 || afterPhotos.length > 0;
    if (!hasAny) return null;

    const PhotoStrip = ({ photos, label, accentColor, accentBg }) => (
        <View style={photoGalleryStyles.strip}>
            <View style={photoGalleryStyles.stripHeader}>
                <View style={[photoGalleryStyles.stripTag, { backgroundColor: accentBg }]}>
                    <Ionicons name="camera-outline" size={11} color={accentColor} />
                    <Text style={[photoGalleryStyles.stripLabel, { color: accentColor }]}>{label}</Text>
                </View>
                <Text style={[photoGalleryStyles.stripCount, { color: theme.colors.textMuted }]}>
                    {photos.length} photo{photos.length !== 1 ? 's' : ''}
                </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={photoGalleryStyles.photoRow}>
                {photos.map((p, i) => {
                    const uri = getImageUrl(p);
                    return (
                        <View key={i} style={[photoGalleryStyles.photoWrap, { borderColor: accentColor + '40' }]}>
                            <Image source={{ uri }} style={photoGalleryStyles.photo} resizeMode="cover" />
                            <View style={[photoGalleryStyles.photoIndex, { backgroundColor: accentColor }]}>
                                <Text style={photoGalleryStyles.photoIndexTxt}>{i + 1}</Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );

    return (
        <Card theme={theme}>
            <SectionLabel label="Repair Photos" theme={theme} />
            {beforePhotos.length > 0 && (
                <PhotoStrip photos={beforePhotos} label="BEFORE" accentColor="#3498DB" accentBg="rgba(52,152,219,0.12)" />
            )}
            {beforePhotos.length > 0 && afterPhotos.length > 0 && (
                <Divider theme={theme} style={{ marginVertical: 12 }} />
            )}
            {afterPhotos.length > 0 && (
                <PhotoStrip photos={afterPhotos} label="AFTER" accentColor="#2ECC9A" accentBg="rgba(46,204,154,0.12)" />
            )}
        </Card>
    );
};

const photoGalleryStyles = StyleSheet.create({
    strip: { marginBottom: 4 },
    stripHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    stripTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    stripLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    stripCount: { fontSize: 11, fontWeight: '500' },
    photoRow: { gap: 8, paddingBottom: 4 },
    photoWrap: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, position: 'relative' },
    photo: { width: '100%', height: '100%' },
    photoIndex: { position: 'absolute', top: 4, left: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    photoIndexTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
});

// ─── Mechanic Action Strip ─────────────────────────────────────────────────────
const MechanicActionStrip = ({
    status,
    theme,
    onMarkArrived,
    onStartWork,
    onCompleteWork,
    onCollectCash,
    arrivedLoading,
}) => {
    const s = normalizeStatus(status);

    if (s === 'pending' || s === 'mechanic_assigned') {
        return (
            <View style={[actionStyles.strip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={actionStyles.stripLeft}>
                    <View style={[actionStyles.stripIcon, { backgroundColor: 'rgba(155,89,182,0.15)' }]}>
                        <Ionicons name="navigate-circle-outline" size={20} color="#9B59B6" />
                    </View>
                    <View>
                        <Text style={[actionStyles.stripTitle, { color: theme.colors.textPrimary }]}>Ready at location?</Text>
                        <Text style={[actionStyles.stripSub, { color: theme.colors.textMuted }]}>Confirm your arrival</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={onMarkArrived}
                    disabled={arrivedLoading}
                    style={[actionStyles.actionBtn, { backgroundColor: '#9B59B6' }]}
                    activeOpacity={0.85}
                >
                    {arrivedLoading
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <>
                            <Ionicons name="pin" size={15} color="#fff" />
                            <Text style={actionStyles.actionBtnTxt}>Mark Arrived</Text>
                        </>
                    }
                </TouchableOpacity>
            </View>
        );
    }

    if (s === 'mechanic_arrived') {
        return (
            <View style={[actionStyles.strip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={actionStyles.stripLeft}>
                    <View style={[actionStyles.stripIcon, { backgroundColor: 'rgba(226,167,49,0.15)' }]}>
                        <Ionicons name="construct-outline" size={20} color="#E2A731" />
                    </View>
                    <View>
                        <Text style={[actionStyles.stripTitle, { color: theme.colors.textPrimary }]}>Ready to begin?</Text>
                        <Text style={[actionStyles.stripSub, { color: theme.colors.textMuted }]}>Take photo & get OTP</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={onStartWork}
                    style={[actionStyles.actionBtn, { backgroundColor: '#E2A731' }]}
                    activeOpacity={0.85}
                >
                    <Ionicons name="play-circle-outline" size={15} color="#fff" />
                    <Text style={actionStyles.actionBtnTxt}>Start Work</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (s === 'in_progress' || s === 'work_started' || s === 'completion_requested') {
        return (
            <View style={[actionStyles.strip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={actionStyles.stripLeft}>
                    <View style={[actionStyles.stripIcon, { backgroundColor: 'rgba(46,204,154,0.15)' }]}>
                        <Ionicons name="checkmark-done-circle-outline" size={20} color="#2ECC9A" />
                    </View>
                    <View>
                        <Text style={[actionStyles.stripTitle, { color: theme.colors.textPrimary }]}>Work finished?</Text>
                        <Text style={[actionStyles.stripSub, { color: theme.colors.textMuted }]}>Take after photo & verify</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={onCompleteWork}
                    style={[actionStyles.actionBtn, { backgroundColor: '#2ECC9A' }]}
                    activeOpacity={0.85}
                >
                    <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                    <Text style={actionStyles.actionBtnTxt}>Complete</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (s === 'work_completed') {
        return (
            <View style={[actionStyles.strip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={actionStyles.stripLeft}>
                    <View style={[actionStyles.stripIcon, { backgroundColor: 'rgba(46,204,154,0.15)' }]}>
                        <Ionicons name="checkmark-done-circle-outline" size={20} color="#2ECC9A" />
                    </View>
                    <View>
                        <Text style={[actionStyles.stripTitle, { color: theme.colors.textPrimary }]}>Work Completed</Text>
                        <Text style={[actionStyles.stripSub, { color: theme.colors.textMuted }]}>Awaiting invoice generation</Text>
                    </View>
                </View>
            </View>
        );
    }

    // ── NEW: Invoice Generated — COD collection ───────────────────────────────
    if (s === 'invoice_generated') {
        return (
            <View style={[actionStyles.strip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={actionStyles.stripLeft}>
                    <View style={[actionStyles.stripIcon, { backgroundColor: 'rgba(46,204,154,0.15)' }]}>
                        <Ionicons name="cash-outline" size={20} color="#2ECC9A" />
                    </View>
                    <View>
                        <Text style={[actionStyles.stripTitle, { color: theme.colors.textPrimary }]}>
                            Collect Payment
                        </Text>
                        <Text style={[actionStyles.stripSub, { color: theme.colors.textMuted }]}>
                            Invoice ready — collect cash from customer
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={onCollectCash}
                    style={[actionStyles.actionBtn, { backgroundColor: '#2ECC9A' }]}
                    activeOpacity={0.85}
                >
                    <Ionicons name="cash" size={15} color="#fff" />
                    <Text style={actionStyles.actionBtnTxt}>Collect Cash</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return null;
};

const actionStyles = StyleSheet.create({
    strip: {
        alignItems: 'flex-start',
        padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    stripLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginBottom: 10 },
    stripIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    stripTitle: { fontSize: 13.5, fontWeight: '800', letterSpacing: 0.1 },
    stripSub: { fontSize: 11, marginTop: 1, fontWeight: '500' },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 12, minWidth: 100, justifyContent: 'center',
    },
    actionBtnTxt: { fontSize: 12.5, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },
});

// ─── Save Changes Banner ──────────────────────────────────────────────────────
const SaveChangesBanner = ({ theme, onSave, saving }) => (
    <View style={[actionStyles.strip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={actionStyles.stripLeft}>
            <View style={[actionStyles.stripIcon, { backgroundColor: 'rgba(52,152,219,0.15)' }]}>
                <Ionicons name="save-outline" size={20} color="#3498DB" />
            </View>
            <View>
                <Text style={[actionStyles.stripTitle, { color: theme.colors.textPrimary }]}>Unsaved changes</Text>
                <Text style={[actionStyles.stripSub, { color: theme.colors.textMuted }]}>Parts & services modified</Text>
            </View>
        </View>
        <TouchableOpacity
            onPress={onSave}
            disabled={saving}
            style={[actionStyles.actionBtn, { backgroundColor: '#3498DB' }]}
            activeOpacity={0.85}
        >
            {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="cloud-upload-outline" size={15} color="#fff" />
                    <Text style={actionStyles.actionBtnTxt}>Save</Text>
                </>
            }
        </TouchableOpacity>
    </View>
);

// ─── Workflow Status Timeline ─────────────────────────────────────────────────
const WORKFLOW_STEPS = [
    { key: 'pending', label: 'Pending' },
    { key: 'mechanic_assigned', label: 'Assigned' },
    { key: 'mechanic_arrived', label: 'Arrived' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completion_requested', label: 'Completion Requested' },
    { key: 'work_completed', label: 'Work Done' },
    { key: 'invoice_generated', label: 'Invoice' },
    { key: 'completed', label: 'Completed' },
];

const WorkflowTimeline = ({ status, theme }) => {
    const current = normalizeStatus(status);
    const currentIdx = WORKFLOW_STEPS.findIndex(s => s.key === current);

    return (
        <Card theme={theme} style={{ marginBottom: 12 }}>
            <SectionLabel label="Order Progress" theme={theme} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                <View style={timelineStyles.row}>
                    {WORKFLOW_STEPS.map((step, idx) => {
                        const done = idx < currentIdx;
                        const active = idx === currentIdx;
                        const color = done ? '#2ECC9A' : active ? theme.colors.primary : theme.colors.border;
                        return (
                            <View key={step.key} style={timelineStyles.step}>
                                {idx > 0 && (
                                    <View style={[timelineStyles.line, { backgroundColor: done || active ? theme.colors.primary : theme.colors.border }]} />
                                )}
                                <View style={[timelineStyles.dot, {
                                    backgroundColor: done ? '#2ECC9A' : active ? theme.colors.primary : theme.colors.surfaceHigh,
                                    borderColor: color,
                                }]}>
                                    {done
                                        ? <Ionicons name="checkmark" size={10} color="#fff" />
                                        : active
                                            ? <View style={timelineStyles.activePulse} />
                                            : null
                                    }
                                </View>
                                <Text style={[timelineStyles.label, {
                                    color: active ? theme.colors.primary : done ? '#2ECC9A' : theme.colors.textMuted,
                                    fontWeight: active ? '800' : '500',
                                }]}>
                                    {step.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </Card>
    );
};

const timelineStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
    step: { alignItems: 'center', width: 72 },
    line: { position: 'absolute', top: 9, right: '50%', left: -36, height: 2, zIndex: 0 },
    dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 1, marginBottom: 6 },
    activePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
    label: { fontSize: 9.5, letterSpacing: 0.4, textAlign: 'center', lineHeight: 13 },
});

// ─── Add/Edit Item Drawer ──────────────────────────────────────────────────────
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISCOUNT_TYPES = ['None', 'Flat', 'Percentage'];
const genId = () => Math.random().toString(36).substr(2, 9);

const AddItemDrawer = ({ visible, type, onClose, onSave, theme, editItem }) => {
    const isDark = theme === DarkTheme;
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [price, setPrice] = useState('');
    const [discountType, setDiscountType] = useState('None');
    const [discountValue, setDiscountValue] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
        const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    useEffect(() => {
        if (visible) {
            if (editItem) {
                setName(editItem.name || ''); setQuantity(String(editItem.quantity || 1));
                setPrice(String(editItem.price || 0)); setDiscountType(editItem.discountType || 'None');
                setDiscountValue(String(editItem.discountValue || 0));
            } else {
                setName(''); setQuantity('1'); setPrice(''); setDiscountType('None'); setDiscountValue('');
            }
        } else { Keyboard.dismiss(); setKeyboardHeight(0); }
    }, [visible, editItem]);

    const unitPrice = parseFloat(price) || 0;
    const qty = parseFloat(quantity) || 0;
    const subtotal = unitPrice * qty;
    const discAmt = discountType === 'Percentage'
        ? subtotal * (parseFloat(discountValue) || 0) / 100
        : discountType === 'Flat' ? parseFloat(discountValue) || 0 : 0;
    const total = Math.max(0, subtotal - discAmt);

    const handleSave = () => {
        Keyboard.dismiss();
        if (!name.trim()) {
            Alert.alert('Missing Name', `Please enter a ${type} name.`);
            return;
        }
        const parsedPrice = parseFloat(price);
        const finalPrice = isNaN(parsedPrice) ? 0 : parsedPrice;
        const finalQty = parseFloat(quantity) || 1;

        onSave({
            id: editItem?.id || genId(),
            type,
            name: name.trim(),
            quantity: finalQty,
            price: finalPrice,
            discountType,
            discountValue: parseFloat(discountValue) || 0,
        });
        onClose();
    };

    const inputStyle = {
        backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
    };

    const isPartType = type === 'part';
    const accentColor = isPartType ? '#3498DB' : '#2ECC9A';
    const accentBg = isPartType ? 'rgba(52,152,219,0.12)' : 'rgba(46,204,154,0.12)';
    const androidLift = Platform.OS === 'android' ? keyboardHeight : 0;
    const scrollBottomPad = keyboardHeight > 0 ? (Platform.OS === 'android' ? 12 : 0) : insets.bottom + 12;
    const maxSheetHeight = keyboardHeight > 0 ? SCREEN_HEIGHT - keyboardHeight - (insets.top || 44) - 16 : SCREEN_HEIGHT * 0.88;

    return (
        <Modal visible={visible} transparent animationType="slide"
            onRequestClose={() => { Keyboard.dismiss(); onClose(); }} statusBarTranslucent>
            <View style={addItemStyles.modalRoot}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
                <Animated.View style={[addItemStyles.sheet, {
                    backgroundColor: theme.colors.surface, borderColor: theme.colors.border,
                    maxHeight: maxSheetHeight, transform: [{ translateY: -androidLift }],
                }]}>
                    <View style={[addItemStyles.handle, { backgroundColor: theme.colors.border }]} />
                    <View style={[addItemStyles.sheetHeader, { borderBottomColor: theme.colors.border }]}>
                        <View style={[addItemStyles.typeIcon, { backgroundColor: accentBg }]}>
                            <Ionicons name={isPartType ? 'construct-outline' : 'checkmark-circle-outline'} size={20} color={accentColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[addItemStyles.sheetTitle, { color: theme.colors.textPrimary }]}>
                                {editItem ? 'Edit' : 'Add'} {isPartType ? 'Part / Consumable' : 'Service'}
                            </Text>
                            <Text style={[addItemStyles.sheetSubtitle, { color: theme.colors.textMuted }]}>
                                {isPartType ? 'Enter part details and pricing' : 'Enter service details and charges'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }}
                            style={[addItemStyles.closeBtn, { backgroundColor: theme.colors.surfaceLow }]}>
                            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={[addItemStyles.sheetScroll, { paddingBottom: scrollBottomPad }]}
                        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
                        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'} bounces={false}>
                        <View style={addItemStyles.fieldGroup}>
                            <Text style={[addItemStyles.fieldLabel, { color: theme.colors.textMuted }]}>
                                {isPartType ? 'PART NAME *' : 'SERVICE NAME *'}
                            </Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder={isPartType ? 'e.g. Brake Pad, Engine Oil...' : 'e.g. Oil Change, Wheel Alignment...'}
                                placeholderTextColor={theme.colors.textMuted + '60'}
                                style={[addItemStyles.input, inputStyle]}
                                returnKeyType="next"
                            />
                        </View>
                        <View style={addItemStyles.twoCol}>
                            <View style={[addItemStyles.fieldGroup, { flex: 1 }]}>
                                <Text style={[addItemStyles.fieldLabel, { color: theme.colors.textMuted }]}>QUANTITY *</Text>
                                <TextInput
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    placeholder="1"
                                    placeholderTextColor={theme.colors.textMuted + '60'}
                                    keyboardType="decimal-pad"
                                    style={[addItemStyles.input, inputStyle]}
                                />
                            </View>
                            <View style={[addItemStyles.fieldGroup, { flex: 1.6 }]}>
                                <Text style={[addItemStyles.fieldLabel, { color: theme.colors.textMuted }]}>
                                    UNIT PRICE (₹) <Text style={{ fontWeight: 'normal' }}>(optional)</Text>
                                </Text>
                                <TextInput
                                    value={price}
                                    onChangeText={setPrice}
                                    placeholder="0.00"
                                    placeholderTextColor={theme.colors.textMuted + '60'}
                                    keyboardType="decimal-pad"
                                    style={[addItemStyles.input, inputStyle]}
                                />
                            </View>
                        </View>
                        <View style={addItemStyles.fieldGroup}>
                            <Text style={[addItemStyles.fieldLabel, { color: theme.colors.textMuted }]}>DISCOUNT TYPE</Text>
                            <View style={addItemStyles.discRow}>
                                {DISCOUNT_TYPES.map((dt) => (
                                    <TouchableOpacity key={dt} onPress={() => { Keyboard.dismiss(); setDiscountType(dt); }}
                                        style={[addItemStyles.discBtn, {
                                            borderColor: discountType === dt ? accentColor : theme.colors.border,
                                            backgroundColor: discountType === dt ? accentBg : theme.colors.surfaceLow,
                                        }]}>
                                        <Text style={[addItemStyles.discBtnTxt, {
                                            color: discountType === dt ? accentColor : theme.colors.textMuted,
                                            fontWeight: discountType === dt ? '800' : '500',
                                        }]}>
                                            {dt === 'None' ? 'No Discount' : dt === 'Flat' ? '₹ Flat' : '% Off'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        {discountType !== 'None' && (
                            <View style={addItemStyles.fieldGroup}>
                                <Text style={[addItemStyles.fieldLabel, { color: theme.colors.textMuted }]}>
                                    {discountType === 'Flat' ? 'DISCOUNT AMOUNT (₹)' : 'DISCOUNT PERCENTAGE (%)'}
                                </Text>
                                <TextInput value={discountValue} onChangeText={setDiscountValue} placeholder="0"
                                    placeholderTextColor={theme.colors.textMuted + '60'} keyboardType="decimal-pad"
                                    style={[addItemStyles.input, inputStyle]} returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss} />
                            </View>
                        )}
                        {price !== '' && (
                            <View style={[addItemStyles.previewCard, { backgroundColor: accentBg, borderColor: accentColor + '30' }]}>
                                <Text style={[addItemStyles.previewTitle, { color: accentColor }]}>PRICE PREVIEW</Text>
                                <View style={addItemStyles.previewRow}>
                                    <Text style={[addItemStyles.previewLabel, { color: theme.colors.textSecondary }]}>Subtotal</Text>
                                    <Text style={[addItemStyles.previewVal, { color: theme.colors.textSecondary }]}>{formatCurrency(subtotal)}</Text>
                                </View>
                                {discAmt > 0 && (
                                    <View style={addItemStyles.previewRow}>
                                        <Text style={[addItemStyles.previewLabel, { color: '#2ECC9A' }]}>Discount</Text>
                                        <Text style={[addItemStyles.previewVal, { color: '#2ECC9A' }]}>-{formatCurrency(discAmt)}</Text>
                                    </View>
                                )}
                                <View style={[addItemStyles.previewRow, addItemStyles.previewTotalRow, { borderTopColor: accentColor + '25' }]}>
                                    <Text style={[addItemStyles.previewTotalLabel, { color: theme.colors.textPrimary }]}>Total</Text>
                                    <Text style={[addItemStyles.previewTotalVal, { color: accentColor }]}>{formatCurrency(total)}</Text>
                                </View>
                            </View>
                        )}
                        <TouchableOpacity onPress={handleSave}
                            style={[addItemStyles.saveBtn, { backgroundColor: accentColor, shadowColor: accentColor }]} activeOpacity={0.85}>
                            <Ionicons name={editItem ? 'checkmark-circle' : 'add-circle'} size={20} color="#fff" />
                            <Text style={addItemStyles.saveBtnTxt}>{editItem ? 'Update' : 'Add'} {isPartType ? 'Part' : 'Service'}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const addItemStyles = StyleSheet.create({
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 20 },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    sheetTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
    sheetSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 1 },
    closeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    sheetScroll: { paddingHorizontal: 20, paddingTop: 18 },
    fieldGroup: { marginBottom: 16 },
    fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 7 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '600' },
    twoCol: { flexDirection: 'row', gap: 12, marginBottom: 0 },
    discRow: { flexDirection: 'row', gap: 8 },
    discBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5, alignItems: 'center' },
    discBtnTxt: { fontSize: 12 },
    previewCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 18 },
    previewTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
    previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    previewLabel: { fontSize: 13, fontWeight: '500' },
    previewVal: { fontSize: 13, fontWeight: '600' },
    previewTotalRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 4, marginBottom: 0 },
    previewTotalLabel: { fontSize: 15, fontWeight: '900' },
    previewTotalVal: { fontSize: 18, fontWeight: '900' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginBottom: 8, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    saveBtnTxt: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
});

// ─── Item Card ─────────────────────────────────────────────────────────────────
const ItemCard = ({ item, onEdit, onRemove, theme, readOnly = false }) => {
    const isPartType = item.type === 'part';
    const accentColor = isPartType ? '#3498DB' : '#2ECC9A';
    const accentBg = isPartType ? 'rgba(52,152,219,0.08)' : 'rgba(46,204,154,0.08)';
    const unitPrice = parseFloat(item.price) || 0;
    const qty = parseFloat(item.quantity) || 0;
    const subtotal = unitPrice * qty;
    const discAmt = item.discountType === 'Percentage'
        ? subtotal * (parseFloat(item.discountValue) || 0) / 100
        : item.discountType === 'Flat' ? parseFloat(item.discountValue) || 0 : 0;
    const total = Math.max(0, subtotal - discAmt);
    const hasDiscount = discAmt > 0;

    return (
        <View style={[itemCardStyles.wrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[itemCardStyles.accentBar, { backgroundColor: accentColor }]} />
            <View style={itemCardStyles.body}>
                <View style={itemCardStyles.topRow}>
                    <View style={[itemCardStyles.typeTag, { backgroundColor: accentBg }]}>
                        <Ionicons name={isPartType ? 'construct-outline' : 'checkmark-circle-outline'} size={10} color={accentColor} />
                        <Text style={[itemCardStyles.typeText, { color: accentColor }]}>{isPartType ? 'PART' : 'SERVICE'}</Text>
                    </View>
                    <Text style={[itemCardStyles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>{item.name || 'Unnamed'}</Text>
                    {!readOnly && (
                        <View style={itemCardStyles.actions}>
                            <TouchableOpacity onPress={() => onEdit(item)} style={[itemCardStyles.actionBtn, { backgroundColor: 'rgba(52,152,219,0.1)' }]} activeOpacity={0.75}>
                                <Ionicons name="pencil-outline" size={13} color="#3498DB" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onRemove(item.id)} style={[itemCardStyles.actionBtn, { backgroundColor: 'rgba(255,107,107,0.1)' }]} activeOpacity={0.75}>
                                <Ionicons name="trash-outline" size={13} color="#FF6B6B" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                <View style={itemCardStyles.metaRow}>
                    <View style={[itemCardStyles.metaChip, { backgroundColor: theme.colors.surfaceLow }]}>
                        <Text style={[itemCardStyles.metaTxt, { color: theme.colors.textSecondary }]}>Qty: {item.quantity}</Text>
                    </View>
                    <View style={[itemCardStyles.metaChip, { backgroundColor: theme.colors.surfaceLow }]}>
                        <Text style={[itemCardStyles.metaTxt, { color: theme.colors.textSecondary }]}>{formatCurrency(unitPrice)} / unit</Text>
                    </View>
                    {hasDiscount && (
                        <View style={[itemCardStyles.metaChip, { backgroundColor: 'rgba(46,204,154,0.1)' }]}>
                            <Text style={[itemCardStyles.metaTxt, { color: '#2ECC9A' }]}>
                                {item.discountType === 'Percentage' ? `${item.discountValue}% off` : `-${formatCurrency(discAmt)}`}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={[itemCardStyles.priceRow, { borderTopColor: theme.colors.border }]}>
                    {hasDiscount && <Text style={[itemCardStyles.strikePrice, { color: theme.colors.textMuted }]}>{formatCurrency(subtotal)}</Text>}
                    <View style={itemCardStyles.priceRight}>
                        {hasDiscount && <Text style={[itemCardStyles.discSaved, { color: '#2ECC9A' }]}>Saved {formatCurrency(discAmt)}</Text>}
                        <Text style={[itemCardStyles.totalPrice, { color: accentColor }]}>{formatCurrency(total)}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const itemCardStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    accentBar: { width: 4 },
    body: { flex: 1, padding: 13 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
    typeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    typeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
    name: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },
    actions: { flexDirection: 'row', gap: 6 },
    actionBtn: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    metaTxt: { fontSize: 11, fontWeight: '600' },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9 },
    strikePrice: { fontSize: 12, fontWeight: '500', textDecorationLine: 'line-through' },
    priceRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
    discSaved: { fontSize: 11, fontWeight: '700' },
    totalPrice: { fontSize: 16, fontWeight: '900' },
});

// ─── Editable Items Section ────────────────────────────────────────────────────
const EditableItemsSection = ({ title, type, items, onAdd, onEdit, onRemove, theme, readOnly = false }) => {
    const isPartType = type === 'part';
    const accentColor = isPartType ? '#3498DB' : '#2ECC9A';
    const accentBg = isPartType ? 'rgba(52,152,219,0.12)' : 'rgba(46,204,154,0.12)';

    return (
        <Card theme={theme}>
            <View style={eiStyles.row}>
                <View style={eiStyles.left}>
                    <View style={[eiStyles.iconWrap, { backgroundColor: accentBg }]}>
                        <Ionicons name={isPartType ? 'construct-outline' : 'checkmark-circle-outline'} size={14} color={accentColor} />
                    </View>
                    <Text style={[eiStyles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
                    {items.length > 0 && (
                        <View style={[eiStyles.badge, { backgroundColor: accentBg }]}>
                            <Text style={[eiStyles.badgeTxt, { color: accentColor }]}>{items.length}</Text>
                        </View>
                    )}
                </View>
                {!readOnly && (
                    <TouchableOpacity onPress={onAdd} style={[eiStyles.addBtn, { backgroundColor: accentColor, shadowColor: accentColor }]} activeOpacity={0.82}>
                        <Ionicons name="add" size={16} color="#fff" />
                        <Text style={eiStyles.addTxt}>Add {isPartType ? 'Part' : 'Service'}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {items.length === 0 ? (
                readOnly ? (
                    <View style={[eiStyles.empty, { backgroundColor: accentBg, borderColor: accentColor + '30' }]}>
                        <Ionicons name={isPartType ? 'construct-outline' : 'checkmark-circle-outline'} size={26} color={accentColor} />
                        <Text style={[eiStyles.emptyTitle, { color: theme.colors.textPrimary }]}>No {isPartType ? 'parts' : 'services'} added</Text>
                    </View>
                ) : (
                    <TouchableOpacity onPress={onAdd} style={[eiStyles.empty, { backgroundColor: accentBg, borderColor: accentColor + '30' }]} activeOpacity={0.75}>
                        <View style={[eiStyles.emptyIconWrap, { backgroundColor: accentColor + '18' }]}>
                            <Ionicons name={isPartType ? 'construct-outline' : 'checkmark-circle-outline'} size={26} color={accentColor} />
                        </View>
                        <Text style={[eiStyles.emptyTitle, { color: theme.colors.textPrimary }]}>No {isPartType ? 'parts' : 'services'} added yet</Text>
                        <Text style={[eiStyles.emptyHint, { color: theme.colors.textMuted }]}>Tap to add</Text>
                    </TouchableOpacity>
                )
            ) : (
                <>
                    {items.map((item) => (
                        <ItemCard key={item.id} item={item} onEdit={readOnly ? undefined : onEdit} onRemove={readOnly ? undefined : onRemove} theme={theme} readOnly={readOnly} />
                    ))}
                    {!readOnly && (
                        <TouchableOpacity onPress={onAdd} style={[eiStyles.addMore, { borderColor: accentColor + '40', backgroundColor: accentColor + '10' }]} activeOpacity={0.75}>
                            <Ionicons name="add-circle-outline" size={16} color={accentColor} />
                            <Text style={[eiStyles.addMoreTxt, { color: accentColor }]}>Add Another {isPartType ? 'Part' : 'Service'}</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
        </Card>
    );
};

const eiStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
    badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
    badgeTxt: { fontSize: 11, fontWeight: '800' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 11, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    addTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },
    empty: { alignItems: 'center', padding: 24, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', gap: 6 },
    emptyIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    emptyTitle: { fontSize: 14, fontWeight: '800' },
    emptyHint: { fontSize: 12 },
    addMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: 11, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 4 },
    addMoreTxt: { fontSize: 13, fontWeight: '700' },
});

// ─── Financial Breakdown ──────────────────────────────────────────────────────
const FinancialBreakdownCard = ({ order, theme }) => {
    const { total = {} } = order;
    const { subTotal = 0, discount = 0, referralDiscount = 0, cgst = 0, sgst = 0, cgstRate, sgstRate, total: grandTotal = 0, finalPayable = grandTotal } = total;
    const showTaxes = (cgst > 0 || sgst > 0) && (cgstRate || sgstRate);

    return (
        <Card theme={theme}>
            <SectionLabel label="Financial Breakdown" theme={theme} />
            <View>
                {[
                    { label: 'Subtotal', value: formatCurrency(subTotal), color: theme.colors.textSecondary },
                    discount > 0 ? { label: 'Discount', value: `-${formatCurrency(discount)}`, color: '#2ECC9A' } : null,
                    referralDiscount > 0 ? { label: 'Referral Discount', value: `-${formatCurrency(referralDiscount)}`, color: '#2ECC9A' } : null,
                    showTaxes ? { label: `CGST (${cgstRate}%)`, value: formatCurrency(cgst), color: theme.colors.textSecondary } : null,
                    showTaxes ? { label: `SGST (${sgstRate}%)`, value: formatCurrency(sgst), color: theme.colors.textSecondary } : null,
                ].filter(Boolean).map((row, i) => (
                    <View key={i} style={finStyles.row}>
                        <Text style={[finStyles.label, { color: row.color }]}>{row.label}</Text>
                        <Text style={[finStyles.value, { color: row.color }]}>{row.value}</Text>
                    </View>
                ))}
                <Divider theme={theme} style={{ marginVertical: 10 }} />
                <View style={finStyles.row}>
                    <Text style={[finStyles.grandLabel, { color: theme.colors.textPrimary }]}>TOTAL AMOUNT</Text>
                    <Text style={[finStyles.grandValue, { color: theme.colors.primary }]}>{formatCurrency(finalPayable)}</Text>
                </View>
                <Text style={[finStyles.taxNote, { color: theme.colors.textMuted }]}>Tax inclusive</Text>
            </View>
        </Card>
    );
};

const finStyles = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    label: { fontSize: 13, fontWeight: '500' },
    value: { fontSize: 13, fontWeight: '600' },
    grandLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
    grandValue: { fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
    taxNote: { fontSize: 10, textAlign: 'right', marginTop: 2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EmployeeOrderDetail({ route, navigation }) {
    const orderIdParam = route?.params?.order?._id || route?.params?.orderId;
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const insets = useSafeAreaInsets();
    const position = useSelector((state) => state.auth?.user?.position);
    const isDelivery = position?.toLowerCase() === 'delivery';
    const [refreshing, setRefreshing] = useState(false);
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [arrivedLoading, setArrivedLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [originalItems, setOriginalItems] = useState([]);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [drawerType, setDrawerType] = useState('part');
    const [editingItem, setEditingItem] = useState(null);

    // Photo+OTP modal state
    const [startWorkModal, setStartWorkModal] = useState(false);
    const [completeWorkModal, setCompleteWorkModal] = useState(false);
    const [photoModalSubmitting, setPhotoModalSubmitting] = useState(false);
    const [resendingOtp, setResendingOtp] = useState(false);

    // ── COD modal state ───────────────────────────────────────────────────────
    const [codModalVisible, setCodModalVisible] = useState(false);
    const [codSubmitting, setCodSubmitting] = useState(false);

    // Popup state
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupConfig, setPopupConfig] = useState({});

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    const showPopup = (title, message, primaryLabel = 'OK', secondaryLabel = null, onPrimary = null, onSecondary = null) => {
        setPopupConfig({
            title, message, primaryLabel, secondaryLabel,
            onPrimary: () => { setPopupVisible(false); onPrimary?.(); },
            onSecondary: () => { setPopupVisible(false); onSecondary?.(); },
        });
        setPopupVisible(true);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchOrder();
        setRefreshing(false);
    }, []);

    const fetchOrder = useCallback(async () => {
        if (!orderIdParam) { setLoading(false); return; }
        try {
            setLoading(true);
            const response = await axiosClient.get(`/api/admin/order/getorderbyid/${orderIdParam}`);
            const fetched = response.data;
            setOrder(fetched);

            const builtItems = [];
            (fetched.partsUsed || []).forEach(p => builtItems.push({
                id: genId(), type: 'part',
                name: p.partName || '', quantity: p.quantity || 1, price: p.price || 0,
                discountType: p.discountType || 'None', discountValue: p.discountPrice || 0,
            }));
            (fetched.serviceProvided || []).forEach(s => builtItems.push({
                id: genId(), type: 'service',
                name: s.serviceName || '', quantity: s.quantity || 1, price: s.price || 0,
                discountType: s.discountType || 'None', discountValue: s.discountPrice || 0,
            }));
            setItems(builtItems);
            setOriginalItems(builtItems);
        } catch (err) {
            Alert.alert('Error', 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    }, [orderIdParam]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, speed: 16, bounciness: 4, useNativeDriver: true }),
        ]).start();
    }, []);

    const hasItemChanges = JSON.stringify(items.map(i => ({ ...i, id: '' }))) !== JSON.stringify(originalItems.map(i => ({ ...i, id: '' })));

    const hasPendingBeforePhoto = Boolean(order?.workStartOtp?.pendingPhotoPath);
    const hasPendingAfterPhoto = Boolean(order?.workCompleteOtp?.pendingPhotoPath);

    // ── Derived: COD payable amount ───────────────────────────────────────────
    // Use total.total (pre-referral, pre-wallet) for COD since no online payment
    const codPayableAmount = order?.total?.total ?? order?.total?.finalPayable ?? 0;

    // ── API Actions ──────────────────────────────────────────────────────────
    const handleMarkArrived = async () => {
        setArrivedLoading(true);
        try {
            await axiosClient.put(`/api/admin/order/${order._id}/mechanic-arrived`);
            await fetchOrder();
        } catch (err) {
            showPopup('Error', err?.response?.data?.message || 'Failed to mark arrival.');
        } finally {
            setArrivedLoading(false);
        }
    };

    const handleRequestWorkStart = async (photo) => {
        setPhotoModalSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('beforePhoto', {
                uri: photo.uri,
                name: `before-${Date.now()}.jpg`,
                type: 'image/jpeg',
            });
            await axiosClient.post(`/api/admin/order/${order._id}/request-work-start`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            await fetchOrder();
        } catch (err) {
            throw err;
        } finally {
            setPhotoModalSubmitting(false);
        }
    };

    const handleVerifyWorkStart = async (otp) => {
        setPhotoModalSubmitting(true);
        try {
            await axiosClient.post(`/api/admin/order/${order._id}/verify-work-start`, { otp });
            setStartWorkModal(false);
            await fetchOrder();
            showPopup('Work Started! ⚙️', 'Order status is now "In Progress". You can now add parts and services.');
        } catch (err) {
            showPopup('Verification Failed', err?.response?.data?.message || 'Incorrect OTP. Please try again.');
        } finally {
            setPhotoModalSubmitting(false);
        }
    };

    const handleResendWorkStartOtp = async () => {
        setResendingOtp(true);
        try {
            await axiosClient.post(`/api/admin/order/${order._id}/resend-work-start-otp`);
            Alert.alert('OTP Resent', 'A new OTP has been sent to the customer.');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to resend OTP.';
            Alert.alert('Error', msg);
        } finally {
            setResendingOtp(false);
        }
    };

    const handleRequestCompleteWork = async (photo) => {
        setPhotoModalSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('afterPhoto', {
                uri: photo.uri,
                name: `after-${Date.now()}.jpg`,
                type: 'image/jpeg',
            });
            await axiosClient.post(`/api/admin/order/${order._id}/complete-work`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            await fetchOrder();
        } catch (err) {
            throw err;
        } finally {
            setPhotoModalSubmitting(false);
        }
    };

    const handleConfirmCompletion = async (otp) => {
        setPhotoModalSubmitting(true);
        try {
            await axiosClient.post(`/api/admin/order/${order._id}/confirm-completion`, { otp });
            setCompleteWorkModal(false);
            await fetchOrder();
            showPopup('Work Completed! ✅', 'The order has been marked as Work Completed and the customer has been notified.');
        } catch (err) {
            showPopup('Verification Failed', err?.response?.data?.message || 'Incorrect OTP. Please try again.');
        } finally {
            setPhotoModalSubmitting(false);
        }
    };

    const handleResendCompletionOtp = async () => {
        setResendingOtp(true);
        try {
            await axiosClient.post(`/api/admin/order/${order._id}/resend-completion-otp`);
            Alert.alert('OTP Resent', 'A new completion OTP has been sent to the customer.');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to resend OTP.';
            Alert.alert('Error', msg);
        } finally {
            setResendingOtp(false);
        }
    };

    // ── COD payment handler ───────────────────────────────────────────────────
    /**
     * Calls POST /api/admin/order/:id/mark-paid-cod
     * amountCollected is passed so the backend records the exact amount received.
     */
    const handleCollectCash = async (amountCollected) => {
        setCodSubmitting(true);
        try {
            const response = await axiosClient.post(
                `/api/admin/order/${order._id}/mark-paid-cod`,
                { amountCollected: Number(amountCollected) }
            );
            setCodModalVisible(false);
            await fetchOrder();
            showPopup(
                'Payment Collected ✅',
                `Cash payment of ${formatCurrency(amountCollected)} recorded successfully. Invoice has been generated and the customer has been notified.`,
                'OK',
            );
        } catch (err) {
            setCodModalVisible(false);
            showPopup(
                'Error',
                err?.response?.data?.message || 'Failed to record cash payment. Please try again.',
            );
        } finally {
            setCodSubmitting(false);
        }
    };

    const handleSaveItems = async () => {
        if (!order) return;
        setSaving(true);
        try {
            const parts = items.filter(i => i.type === 'part').map(i => ({
                partName: i.name, quantity: i.quantity, price: i.price,
                discountType: i.discountType !== 'None' ? i.discountType : undefined,
                discountPrice: i.discountValue || 0,
            }));
            const services = items.filter(i => i.type === 'service').map(i => ({
                serviceName: i.name, quantity: i.quantity, price: i.price,
                discountPrice: i.discountValue || 0,
            }));
            await axiosClient.put(`/api/admin/order/bookings/${order._id}/update-parts`, { partsUsed: parts, serviceProvided: services });
            showPopup('Saved ✓', 'Parts and services updated successfully.', 'OK', null, () => fetchOrder());
        } catch (err) {
            showPopup('Error', err?.response?.data?.message || 'Failed to update items.');
        } finally {
            setSaving(false);
        }
    };

    const removeItem = useCallback((id) => {
        showPopup('Remove Item', 'Are you sure you want to remove this item?', 'Remove', 'Cancel',
            () => setItems((prev) => prev.filter((i) => i.id !== id)));
    }, []);

    const openAddDrawer = useCallback((type) => { setEditingItem(null); setDrawerType(type); setDrawerVisible(true); }, []);
    const openEditDrawer = useCallback((item) => { setEditingItem(item); setDrawerType(item.type); setDrawerVisible(true); }, []);
    const handleSaveItem = useCallback((savedItem) => {
        setItems((prev) => {
            const exists = prev.find((i) => i.id === savedItem.id);
            return exists ? prev.map((i) => i.id === savedItem.id ? savedItem : i) : [...prev, savedItem];
        });
    }, []);

    // ── Derived state ────────────────────────────────────────────────────────
    const currentStatus = normalizeStatus(order?.status || '');
    const isInProgress = currentStatus === 'in_progress';
    const isInvoiceGenerated = currentStatus === 'invoice_generated';
    const canEditItems = !isDelivery && isInProgress;
    const showFinancials = !isDelivery;
    // Show COD button only for mechanics (not delivery) when invoice is generated
    // and payment is not yet collected
    const showCodAction = !isDelivery && isInvoiceGenerated && order?.paymentStatus !== 'paid';

    if (loading) {
        return (
            <View style={[styles.screen, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!order) {
        return (
            <View style={[styles.screen, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="alert-circle-outline" size={40} color={theme.colors.textMuted} />
                <Text style={[{ color: theme.colors.textMuted, marginTop: 10, fontSize: 14 }]}>Order not found</Text>
            </View>
        );
    }

    const {
        orderId = '#--', name = 'Unknown', email = '', contactNo = '--', city = '',
        selectedBrand = '', selectedModel = '', cc = '', bs = '', services = [],
        serviceType = '', preferredDate = null, preferredTime = '', status = 'pending',
        createdAt = null, userLocation = null,
        beforePhotos = [], afterPhotos = [],
    } = order;

    const sc = getStatusConfig(status);
    const serviceChip = getServiceChipStyle(serviceType);
    const bikeInfo = [selectedBrand, selectedModel].filter(Boolean).join(' ');
    const bikeSpecs = [cc ? `${cc}cc` : null, bs ? bs.toUpperCase() : null].filter(Boolean).join(' · ');
    const coordStr = userLocation?.coordinates?.length === 2
        ? `${userLocation.coordinates[1].toFixed(4)}, ${userLocation.coordinates[0].toFixed(4)}`
        : null;
    const partsItems = items.filter(i => i.type === 'part');
    const servicesItems = items.filter(i => i.type === 'service');

    return (
        <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
            <ScreenWrapper title="Order Details">
                <Animated.ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
                    showsVerticalScrollIndicator={false}
                    style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.colors.primary]}
                            tintColor={theme.colors.primary}
                            progressBackgroundColor={theme.colors.surface}
                        />
                    }
                >
                    {/* Order ID Row */}
                    <View style={styles.orderRefRow}>
                        <View>
                            <Text style={[styles.orderRefLabel, { color: theme.colors.textMuted }]}>ORDER REFERENCE</Text>
                            <Text style={[styles.orderRefId, { color: theme.colors.primary }]}>{orderId}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                            <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
                            <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
                        </View>
                    </View>

                    {/* Workflow Timeline */}
                    <WorkflowTimeline status={status} theme={theme} />

                    {/* ── Mechanic Action Strip ── */}
                    {!isDelivery && (
                        <MechanicActionStrip
                            status={status}
                            theme={theme}
                            onMarkArrived={handleMarkArrived}
                            onStartWork={() => setStartWorkModal(true)}
                            onCompleteWork={() => setCompleteWorkModal(true)}
                            onCollectCash={() => setCodModalVisible(true)}
                            arrivedLoading={arrivedLoading}
                        />
                    )}

                    <Divider theme={theme} style={{ marginBottom: 14 }} />

                    {/* Vehicle Details */}
                    <Card theme={theme}>
                        <SectionLabel label="Vehicle Details" theme={theme} />
                        <View style={styles.bikeHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.bikeName, { color: theme.colors.textPrimary }]}>{bikeInfo || '—'}</Text>
                                {bikeSpecs ? <Text style={[styles.bikeSpecs, { color: theme.colors.textMuted }]}>{bikeSpecs}</Text> : null}
                            </View>
                            <Ionicons name="bicycle" size={28} color={theme.colors.primary} style={{ opacity: 0.7 }} />
                        </View>
                        {services.length > 0 && (
                            <View style={styles.chipRow}>
                                {services.map((s, i) => (
                                    <View key={i} style={[styles.serviceTag, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.border }]}>
                                        <Text style={[styles.serviceTagText, { color: theme.colors.textSecondary }]}>{s}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        {serviceType && (
                            <View style={[styles.serviceTypeChip, { backgroundColor: serviceChip.bg, borderColor: serviceChip.border }]}>
                                <Ionicons name={serviceChip.icon} size={12} color={serviceChip.text} />
                                <Text style={[styles.serviceTypeText, { color: serviceChip.text }]}>{serviceChip.label}</Text>
                            </View>
                        )}
                    </Card>

                    {/* Customer Info */}
                    <Card theme={theme}>
                        <SectionLabel label="Customer Information" theme={theme} />
                        <InfoTile icon="person-outline" label="Full Name" value={name} theme={theme} accent />
                        <InfoTile icon="call-outline" label="Contact" value={contactNo} theme={theme} />
                        <InfoTile icon="mail-outline" label="Email" value={email} theme={theme} />
                        <InfoTile icon="location-outline" label="City" value={city} theme={theme} />
                        {coordStr && <InfoTile icon="navigate-outline" label="Coordinates" value={coordStr} theme={theme} />}
                    </Card>

                    {/* Appointment */}
                    <Card theme={theme}>
                        <SectionLabel label="Appointment" theme={theme} />
                        <InfoTile icon="calendar-outline" label="Preferred Date" value={formatDate(preferredDate)} theme={theme} />
                        <InfoTile icon="time-outline" label="Preferred Time" value={preferredTime || '—'} theme={theme} />
                    </Card>

                    {/* Parts & Services */}
                    {canEditItems ? (
                        <>
                            <EditableItemsSection title="Parts Used" type="part" items={partsItems}
                                onAdd={() => openAddDrawer('part')} onEdit={openEditDrawer} onRemove={removeItem} theme={theme} />
                            <EditableItemsSection title="Services Provided" type="service" items={servicesItems}
                                onAdd={() => openAddDrawer('service')} onEdit={openEditDrawer} onRemove={removeItem} theme={theme} />
                        </>
                    ) : (
                        <>
                            <EditableItemsSection title="Parts Used" type="part" items={partsItems}
                                onAdd={() => { }} onEdit={() => { }} onRemove={() => { }} theme={theme} readOnly />
                            <EditableItemsSection title="Services Provided" type="service" items={servicesItems}
                                onAdd={() => { }} onEdit={() => { }} onRemove={() => { }} theme={theme} readOnly />
                            {!isDelivery && !isInProgress && ['pending', 'mechanic_assigned', 'mechanic_arrived'].includes(currentStatus) && (
                                <View style={[styles.editHint, { backgroundColor: `${theme.colors.primary}10`, borderColor: `${theme.colors.primary}30` }]}>
                                    <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
                                    <Text style={[styles.editHintTxt, { color: theme.colors.textSecondary }]}>
                                        Parts & services can be added once work is "In Progress"
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    {/* Save Changes Banner */}
                    {canEditItems && hasItemChanges && (
                        <SaveChangesBanner theme={theme} onSave={handleSaveItems} saving={saving} />
                    )}

                    {/* ── Repair Photos ── */}
                    <RepairPhotosCard
                        beforePhotos={beforePhotos}
                        afterPhotos={afterPhotos}
                        theme={theme}
                    />

                    {/* Location Map */}
                    {userLocation?.coordinates?.length === 2 && (
                        <LocationMap coordinates={userLocation.coordinates} city={city} theme={theme} />
                    )}

                    {/* Financial Breakdown */}
                    {showFinancials && <FinancialBreakdownCard order={order} theme={theme} />}

                    <MechanicRatingsCard order={order} theme={theme} />
                    <Text style={[styles.metaNote, { color: theme.colors.textMuted }]}>
                        Created {formatDate(createdAt)}
                    </Text>
                    <View style={{ height: 16 }} />
                </Animated.ScrollView>
            </ScreenWrapper>

            {/* ── Start Work Modal ── */}
            <PhotoOtpModal
                visible={startWorkModal}
                onClose={() => setStartWorkModal(false)}
                onRequestOtp={handleRequestWorkStart}
                onSubmit={handleVerifyWorkStart}
                onResendOtp={handleResendWorkStartOtp}
                theme={theme}
                title="Start Work"
                subtitle="Verify with customer before beginning repairs"
                photoLabel="before photo"
                submitting={photoModalSubmitting}
                resending={resendingOtp}
                stepLabel="Verify & Start Work"
                hasPendingPhoto={hasPendingBeforePhoto}
            />

            {/* ── Complete Work Modal ── */}
            <PhotoOtpModal
                visible={completeWorkModal}
                onClose={() => setCompleteWorkModal(false)}
                onRequestOtp={handleRequestCompleteWork}
                onSubmit={handleConfirmCompletion}
                onResendOtp={handleResendCompletionOtp}
                theme={theme}
                title="Complete Work"
                subtitle="Verify with customer that work is done"
                photoLabel="after photo"
                submitting={photoModalSubmitting}
                resending={resendingOtp}
                stepLabel="Confirm Completion"
                hasPendingPhoto={hasPendingAfterPhoto}
            />

            {/* ── COD Collect Cash Modal ── */}
            <CodModal
                visible={codModalVisible}
                onClose={() => setCodModalVisible(false)}
                onConfirm={handleCollectCash}
                theme={theme}
                amount={codPayableAmount}
                submitting={codSubmitting}
            />

            {canEditItems && (
                <AddItemDrawer
                    visible={drawerVisible}
                    type={drawerType}
                    onClose={() => { setDrawerVisible(false); setEditingItem(null); }}
                    onSave={handleSaveItem}
                    theme={theme}
                    editItem={editingItem}
                />
            )}

            <PopUp
                visible={popupVisible}
                title={popupConfig.title}
                message={popupConfig.message}
                primaryLabel={popupConfig.primaryLabel}
                secondaryLabel={popupConfig.secondaryLabel}
                onPrimary={popupConfig.onPrimary}
                onSecondary={popupConfig.onSecondary}
                onClose={() => setPopupVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { paddingHorizontal: 1, paddingTop: 16 },
    orderRefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    orderRefLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    orderRefId: { fontSize: 22, fontWeight: '900', letterSpacing: 0.4, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    bikeHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    bikeName: { fontSize: 17, fontWeight: '800' },
    bikeSpecs: { fontSize: 12, marginTop: 3, fontWeight: '500' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
    serviceTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    serviceTagText: { fontSize: 12, fontWeight: '600' },
    serviceTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginTop: 8 },
    serviceTypeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
    metaNote: { fontSize: 11, textAlign: 'center', marginTop: 8, letterSpacing: 0.2 },
    editHint: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
    editHintTxt: { flex: 1, fontSize: 12.5, fontWeight: '500', lineHeight: 17 },
});