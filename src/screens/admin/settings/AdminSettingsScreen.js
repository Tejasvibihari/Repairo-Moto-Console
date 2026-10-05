import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Alert,
    RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import TabScreenWrapper from '../../../components/common/TabScreenWrapper';
import PopUp from '../../../components/common/PopUp';
import { appVersionService } from '../../../services/appVersionService';
import { adminSettingsService } from '../../../services/adminSettingsService';

// The two apps + two platforms we can independently force-update.
const APP_PLATFORM_COMBOS = [
    { app: 'mobile', platform: 'android', label: 'Customer App · Android' },
    { app: 'mobile', platform: 'ios', label: 'Customer App · iOS' },
    { app: 'console', platform: 'android', label: 'Console App · Android' },
    { app: 'console', platform: 'ios', label: 'Console App · iOS' },
];

const emptyForm = {
    latestVersion: '',
    minRequiredVersion: '',
    storeUrl: '',
    updateMessage: 'A new version is available.',
    forceUpdate: false,
};

function Field({ label, value, onChangeText, theme, placeholder, keyboardType, multiline = false, numberOfLines = 1 }) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textMuted}
                keyboardType={keyboardType}
                multiline={multiline}
                numberOfLines={numberOfLines}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                    styles.input,
                    {
                        color: theme.colors.textPrimary,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surfaceLow,
                    },
                    multiline && styles.multilineInput,
                ]}
            />
        </View>
    );
}

function AppVersionCard({ combo, config, onSaved, theme, showToast }) {
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (config) {
            setForm({
                latestVersion: config.latestVersion || '',
                minRequiredVersion: config.minRequiredVersion || '',
                storeUrl: config.storeUrl || '',
                updateMessage: config.updateMessage || 'A new version is available.',
                forceUpdate: !!config.forceUpdate,
            });
        } else {
            setForm(emptyForm);
        }
    }, [config]);

    const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

    const handleSave = async () => {
        if (!form.latestVersion.trim() || !form.minRequiredVersion.trim() || !form.storeUrl.trim()) {
            showToast('error', 'Missing fields', 'Latest version, minimum required version and store URL are all required.');
            return;
        }
        setSaving(true);
        try {
            const saved = await appVersionService.save({
                app: combo.app,
                platform: combo.platform,
                ...form,
            });
            onSaved(saved);
            showToast('success', 'Saved', `${combo.label} version config updated.`);
        } catch (err) {
            const message = err?.response?.data?.message || err.message || 'Something went wrong';
            showToast('error', 'Save failed', message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{combo.label}</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.colors.textMuted }]}>
                        {config
                            ? `Live: v${config.latestVersion} · Min: v${config.minRequiredVersion}${config.forceUpdate ? ' · Force update ON' : ''}`
                            : 'Not configured yet'}
                    </Text>
                </View>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.colors.textMuted}
                />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.cardBody}>
                    <Field
                        label="Latest version (live on store)"
                        value={form.latestVersion}
                        onChangeText={set('latestVersion')}
                        placeholder="e.g. 2.1.0"
                        theme={theme}
                    />
                    <Field
                        label="Minimum required version"
                        value={form.minRequiredVersion}
                        onChangeText={set('minRequiredVersion')}
                        placeholder="e.g. 2.0.0"
                        theme={theme}
                    />
                    <Field
                        label="Store URL"
                        value={form.storeUrl}
                        onChangeText={set('storeUrl')}
                        placeholder="https://play.google.com/store/apps/details?id=..."
                        theme={theme}
                    />
                    <Field
                        label="Update message"
                        value={form.updateMessage}
                        onChangeText={set('updateMessage')}
                        placeholder="A new version is available."
                        theme={theme}
                    />

                    <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.fieldLabel, { color: theme.colors.textMuted, marginBottom: 2 }]}>
                                Force update
                            </Text>
                            <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>
                                When on, users cannot dismiss the update prompt even above the minimum version.
                            </Text>
                        </View>
                        <Switch
                            value={form.forceUpdate}
                            onValueChange={set('forceUpdate')}
                            trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}90` }}
                            thumbColor={form.forceUpdate ? theme.colors.primary : '#f4f3f4'}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: theme.colors.primary, opacity: saving ? 0.7 : 1 }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.saveBtnText}>Save {combo.label} config</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const emptyPaymentForm = {
    upiId: '',
    upiPayeeName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIFSC: '',
    bankName: '',
    bankBranch: '',
};

function PaymentSettingsCard({ settings, onSaved, theme, showToast }) {
    const [form, setForm] = useState(emptyPaymentForm);
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (settings) {
            setForm({
                upiId: settings.upiId || '',
                upiPayeeName: settings.upiPayeeName || '',
                bankAccountName: settings.bankAccountName || '',
                bankAccountNumber: settings.bankAccountNumber || '',
                bankIFSC: settings.bankIFSC || '',
                bankName: settings.bankName || '',
                bankBranch: settings.bankBranch || '',
            });
        }
    }, [settings]);

    const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const saved = await adminSettingsService.update(form);
            onSaved(saved);
            showToast('success', 'Saved', 'Payment & bank details updated.');
        } catch (err) {
            const message = err?.response?.data?.message || err.message || 'Something went wrong';
            showToast('error', 'Save failed', message);
        } finally {
            setSaving(false);
        }
    };

    const configuredSummary = settings?.upiId
        ? `UPI: ${settings.upiId}${settings.bankAccountNumber ? ' · Bank details set' : ''}`
        : 'Not configured yet — QR code won\'t appear on invoices';

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Payment & Bank Details</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.colors.textMuted }]}>{configuredSummary}</Text>
                </View>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.colors.textMuted}
                />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.cardBody}>
                    <Text style={[styles.groupLabel, { color: theme.colors.textMuted }]}>UPI (Scan & Pay QR)</Text>
                    <Field
                        label="UPI ID"
                        value={form.upiId}
                        onChangeText={set('upiId')}
                        placeholder="e.g. repairomoto@okhdfcbank"
                        theme={theme}
                    />
                    <Field
                        label="Payee name shown in customer's UPI app"
                        value={form.upiPayeeName}
                        onChangeText={set('upiPayeeName')}
                        placeholder="e.g. Repairo Moto"
                        theme={theme}
                    />

                    <Text style={[styles.groupLabel, { color: theme.colors.textMuted, marginTop: 6 }]}>Bank Transfer (fallback)</Text>
                    <Field
                        label="Account holder name"
                        value={form.bankAccountName}
                        onChangeText={set('bankAccountName')}
                        placeholder="e.g. Repairo Moto Pvt Ltd"
                        theme={theme}
                    />
                    <Field
                        label="Account number"
                        value={form.bankAccountNumber}
                        onChangeText={set('bankAccountNumber')}
                        placeholder="e.g. 123456789012"
                        keyboardType="number-pad"
                        theme={theme}
                    />
                    <Field
                        label="IFSC code"
                        value={form.bankIFSC}
                        onChangeText={(v) => set('bankIFSC')(v.toUpperCase())}
                        placeholder="e.g. HDFC0001234"
                        theme={theme}
                    />
                    <Field
                        label="Bank name"
                        value={form.bankName}
                        onChangeText={set('bankName')}
                        placeholder="e.g. HDFC Bank"
                        theme={theme}
                    />
                    <Field
                        label="Branch"
                        value={form.bankBranch}
                        onChangeText={set('bankBranch')}
                        placeholder="e.g. Boring Road, Patna"
                        theme={theme}
                    />

                    <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 14, lineHeight: 16 }}>
                        These appear on manually generated invoices as a "Scan & Pay" QR (pre-filled with the amount due) and bank-transfer details. Leave UPI ID blank to hide the QR code.
                    </Text>

                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: theme.colors.primary, opacity: saving ? 0.7 : 1 }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.saveBtnText}>Save Payment & Bank Details</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const todayYmd = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const isValidYmd = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const formatYmd = (value) => {
    if (!isValidYmd(value)) return 'Choose a date';
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    });
};

function DatePickerModal({ visible, value, onSelect, onClose, theme }) {
    const [month, setMonth] = useState(new Date());
    const [selected, setSelected] = useState(value || todayYmd());

    useEffect(() => {
        if (!visible) return;
        const initial = isValidYmd(value) ? value : todayYmd();
        const [year, monthNumber] = initial.split('-').map(Number);
        setSelected(initial);
        setMonth(new Date(year, monthNumber - 1, 1));
    }, [visible, value]);

    const year = month.getFullYear();
    const monthNumber = month.getMonth();
    const firstDay = new Date(year, monthNumber, 1).getDay();
    const daysInMonth = new Date(year, monthNumber + 1, 0).getDate();
    const days = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
        if (index < firstDay) return null;
        const day = index - firstDay + 1;
        return `${year}-${String(monthNumber + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    });

    return (
        <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
            <View style={styles.dateModalOverlay}>
                <View style={[styles.dateModal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={styles.dateModalHeader}>
                        <TouchableOpacity onPress={() => setMonth(new Date(year, monthNumber - 1, 1))}>
                            <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.dateModalTitle, { color: theme.colors.textPrimary }]}>
                            {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </Text>
                        <TouchableOpacity onPress={() => setMonth(new Date(year, monthNumber + 1, 1))}>
                            <Ionicons name="chevron-forward" size={22} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.weekRow}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                            <Text key={`${day}-${index}`} style={[styles.weekDay, { color: theme.colors.textMuted }]}>{day}</Text>
                        ))}
                    </View>
                    <View style={styles.calendarGrid}>
                        {days.map((date, index) => {
                            const disabled = !date || date < todayYmd();
                            const active = date === selected;
                            return (
                                <TouchableOpacity
                                    key={date || `empty-${index}`}
                                    disabled={disabled}
                                    onPress={() => setSelected(date)}
                                    style={[styles.calendarDay, active && { backgroundColor: theme.colors.primary }, disabled && { opacity: 0.25 }]}
                                >
                                    <Text style={{ color: active ? '#1a1a1a' : theme.colors.textPrimary, fontWeight: active ? '800' : '500' }}>
                                        {date ? Number(date.slice(-2)) : ''}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <View style={styles.dateModalActions}>
                        <TouchableOpacity onPress={onClose} style={styles.dateCancel}><Text style={{ color: theme.colors.textPrimary }}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => { onSelect(selected); onClose(); }} style={[styles.dateConfirm, { backgroundColor: theme.colors.primary }]}>
                            <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Choose date</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function BookingPolicyCard({ settings, onSaved, theme, showToast }) {
    const policy = settings?.bookingPolicy || settings || {};
    const [closures, setClosures] = useState([]);
    const [dailyLimit, setDailyLimit] = useState('');
    const [limitMessage, setLimitMessage] = useState('All mechanic slots are full for this date. Please choose another date.');
    const [newDate, setNewDate] = useState('');
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setClosures((settings?.storeClosures || []).map((closure) => ({
            date: closure.date || '',
            title: closure.title || '',
            message: closure.message || '',
        })));
        const limit = policy.dailyOrderLimit;
        setDailyLimit(limit === null || limit === undefined ? '' : String(limit));
        setLimitMessage(policy.limitMessage || 'All mechanic slots are full for this date. Please choose another date.');
    }, [settings]);

    const addClosure = () => {
        if (!isValidYmd(newDate) || newDate < todayYmd()) {
            showToast('error', 'Invalid date', 'Choose today or a future date in YYYY-MM-DD format.');
            return;
        }
        if (closures.some((closure) => closure.date === newDate)) {
            showToast('error', 'Date already added', 'Each closure date can only appear once.');
            return;
        }
        setClosures((current) => [...current, {
            date: newDate,
            title: 'Workshop closed',
            message: 'Our workshop is closed on this date. Please select another date.',
        }].sort((a, b) => a.date.localeCompare(b.date)));
        setNewDate('');
    };

    const updateClosure = (date, key, value) => {
        setClosures((current) => current.map((closure) => closure.date === date ? { ...closure, [key]: value } : closure));
    };

    const save = () => {
        const trimmedLimit = dailyLimit.trim();
        if (trimmedLimit && (!/^\d+$/.test(trimmedLimit) || Number(trimmedLimit) < 1)) {
            showToast('error', 'Invalid daily limit', 'Enter a positive whole number, or leave the field empty for unlimited bookings.');
            return;
        }
        if (!limitMessage.trim()) {
            showToast('error', 'Missing limit message', 'Add the message customers should see when the date is full.');
            return;
        }
        if (closures.some((closure) => !isValidYmd(closure.date) || closure.date < todayYmd() || !closure.title.trim() || !closure.message.trim())) {
            showToast('error', 'Incomplete closure', 'Each closure needs a future date, title and customer-facing message.');
            return;
        }

        Alert.alert(
            'Replace closure dates?',
            'Saving replaces the complete existing closure list with the dates shown here.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Replace and save',
                    onPress: async () => {
                        setSaving(true);
                        try {
                            const payload = {
                                storeClosures: closures,
                                dailyOrderLimit: trimmedLimit ? Number(trimmedLimit) : null,
                                limitMessage: limitMessage.trim(),
                            };
                            const saved = await adminSettingsService.updateBookingPolicy(payload);
                            const savedPolicy = saved?.bookingPolicy || saved || {};
                            onSaved({
                                ...(settings || {}),
                                ...saved,
                                storeClosures: Array.isArray(saved?.storeClosures)
                                    ? saved.storeClosures
                                    : Array.isArray(savedPolicy.storeClosures)
                                        ? savedPolicy.storeClosures
                                        : payload.storeClosures,
                                bookingPolicy: {
                                    ...(settings?.bookingPolicy || {}),
                                    ...(saved?.bookingPolicy || {}),
                                    dailyOrderLimit: savedPolicy.dailyOrderLimit ?? payload.dailyOrderLimit,
                                    limitMessage: savedPolicy.limitMessage || payload.limitMessage,
                                },
                            });
                            showToast('success', 'Saved', 'Booking holidays and daily capacity updated.');
                        } catch (err) {
                            showToast('error', 'Save failed', err?.response?.data?.message || err.message || 'Could not save booking policy.');
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded((value) => !value)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Booking Policy</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.colors.textMuted }]}>
                        {closures.length ? `${closures.length} closure date${closures.length === 1 ? '' : 's'}` : 'No planned closures'}
                        {dailyLimit ? ` · ${dailyLimit} bookings per day` : ' · Unlimited daily bookings'}
                    </Text>
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.cardBody}>
                    <Text style={[styles.groupLabel, { color: theme.colors.textMuted }]}>PLANNED STORE CLOSURES</Text>
                    <View style={[styles.addClosureSection, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                        <Text style={[styles.addClosureTitle, { color: theme.colors.textPrimary }]}>Add a closure date</Text>
                        <Text style={[styles.addClosureHint, { color: theme.colors.textMuted }]}>Choose a date first, then add it to the list below.</Text>
                        <View style={styles.addDateRow}>
                            <TouchableOpacity onPress={() => setDatePickerVisible(true)} style={[styles.dateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                                <Text style={{ color: newDate ? theme.colors.textPrimary : theme.colors.textMuted, flex: 1 }}>{formatYmd(newDate)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={addClosure} style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}>
                                <Ionicons name="add" size={18} color="#1a1a1a" />
                                <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Add date</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.closureListHeader}>
                        <Text style={[styles.groupLabel, { color: theme.colors.textMuted, marginBottom: 0 }]}>CLOSURE DETAILS</Text>
                        <Text style={[styles.closureCount, { color: theme.colors.textMuted }]}>{closures.length} added</Text>
                    </View>
                    {closures.map((closure) => (
                        <View key={closure.date} style={[styles.closureRow, { borderColor: theme.colors.border }]}>
                            <View style={styles.closureRowHeader}>
                                <Text style={[styles.closureDate, { color: theme.colors.textPrimary }]}>{formatYmd(closure.date)}</Text>
                                <TouchableOpacity onPress={() => setClosures((current) => current.filter((item) => item.date !== closure.date))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="trash-outline" size={19} color={theme.colors.error} />
                                </TouchableOpacity>
                            </View>
                            <Field label="Title" value={closure.title} onChangeText={(value) => updateClosure(closure.date, 'title', value)} theme={theme} placeholder="Closed for Diwali" />
                            <Field label="Customer message" value={closure.message} onChangeText={(value) => updateClosure(closure.date, 'message', value)} theme={theme} placeholder="Please select another date." multiline numberOfLines={4} />
                        </View>
                    ))}
                    {closures.length === 0 && (
                        <Text style={[styles.emptyClosures, { color: theme.colors.textMuted }]}>No closure dates added yet.</Text>
                    )}

                    <Text style={[styles.groupLabel, { color: theme.colors.textMuted, marginTop: 14 }]}>DAILY CAPACITY</Text>
                    <Field label="Daily order limit (leave empty for unlimited)" value={dailyLimit} onChangeText={setDailyLimit} theme={theme} placeholder="e.g. 20" keyboardType="number-pad" />
                    <Field label="Limit-reached message" value={limitMessage} onChangeText={setLimitMessage} theme={theme} placeholder="All mechanic slots are full for this date." />
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.colors.primary, opacity: saving ? 0.7 : 1 }]} onPress={save} disabled={saving}>
                        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Booking Policy</Text>}
                    </TouchableOpacity>
                    <DatePickerModal visible={datePickerVisible} value={newDate} onSelect={setNewDate} onClose={() => setDatePickerVisible(false)} theme={theme} />
                </View>
            )}
        </View>
    );
}

const AdminSettingsScreen = () => {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;

    const [configs, setConfigs] = useState([]); // raw list from backend
    const [loading, setLoading] = useState(true);
    const [paymentSettings, setPaymentSettings] = useState(null);
    const [bookingSettings, setBookingSettings] = useState(null);
    const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [toast, setToast] = useState({ visible: false, type: 'success', title: '', message: '' });

    const showToast = (type, title, message) => setToast({ visible: true, type, title, message });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await appVersionService.listAll();
            setConfigs(Array.isArray(data) ? data : []);
        } catch (err) {
            const message = err?.response?.data?.message || err.message || 'Could not load version settings';
            showToast('error', 'Load failed', message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadPaymentSettings = useCallback(async () => {
        setPaymentSettingsLoading(true);
        try {
            const data = await adminSettingsService.get();
            setPaymentSettings(data);
            setBookingSettings(data);
        } catch (err) {
            const message = err?.response?.data?.message || err.message || 'Could not load payment settings';
            showToast('error', 'Load failed', message);
        } finally {
            setPaymentSettingsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        loadPaymentSettings();
    }, [load, loadPaymentSettings]);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([load(), loadPaymentSettings()]);
        } finally {
            setRefreshing(false);
        }
    }, [load, loadPaymentSettings]);

    const handleSaved = (savedConfig) => {
        setConfigs((prev) => {
            const others = prev.filter((c) => !(c.app === savedConfig.app && c.platform === savedConfig.platform));
            return [...others, savedConfig];
        });
    };

    const findConfig = (app, platform) =>
        configs.find((c) => c.app === app && c.platform === platform);

    return (
        <TabScreenWrapper greeting="Admin Settings" showMenuIcon={true}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={(
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={refresh}
                            colors={[theme.colors.primary]}
                            tintColor={theme.colors.primary}
                        />
                    )}
                >
                    <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                        App Update Settings
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
                        Control the force-update popup shown by the Customer app and the Console app.
                        Update "Latest version" here every time you publish a new build to the store.
                    </Text>

                    {loading ? (
                        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 30 }} />
                    ) : (
                        APP_PLATFORM_COMBOS.map((combo) => (
                            <AppVersionCard
                                key={`${combo.app}-${combo.platform}`}
                                combo={combo}
                                config={findConfig(combo.app, combo.platform)}
                                onSaved={handleSaved}
                                theme={theme}
                                showToast={showToast}
                            />
                        ))
                    )}

                    <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginTop: 28 }]}>
                        Invoice Payment Settings
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
                        Powers the "Scan & Pay" QR code and bank details shown on manually generated invoices.
                    </Text>
                    {paymentSettingsLoading ? (
                        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 30 }} />
                    ) : (
                        <PaymentSettingsCard
                            settings={paymentSettings}
                            onSaved={setPaymentSettings}
                            theme={theme}
                            showToast={showToast}
                        />
                    )}

                    <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginTop: 28 }]}>Booking Policy</Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>Set planned workshop holidays and the maximum number of bookings accepted on a date.</Text>
                    {paymentSettingsLoading ? (
                        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 30 }} />
                    ) : (
                        <BookingPolicyCard settings={bookingSettings} onSaved={setBookingSettings} theme={theme} showToast={showToast} />
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <PopUp
                visible={toast.visible}
                title={toast.title}
                message={toast.message}
                primaryLabel="OK"
                secondaryLabel=""
                onPrimary={() => setToast((t) => ({ ...t, visible: false }))}
                onSecondary={() => setToast((t) => ({ ...t, visible: false }))}
                onClose={() => setToast((t) => ({ ...t, visible: false }))}
            />
        </TabScreenWrapper>
    );
};

export default AdminSettingsScreen;

const styles = StyleSheet.create({
    content: { padding: 16, paddingBottom: 40 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    sectionSubtitle: { fontSize: 12, marginBottom: 16, lineHeight: 18 },
    card: { borderWidth: 1, borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    cardTitle: { fontSize: 14, fontWeight: '700' },
    cardSubtitle: { fontSize: 11, marginTop: 2 },
    cardBody: { paddingHorizontal: 14, paddingBottom: 16 },
    fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
    groupLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
    multilineInput: { minHeight: 96, textAlignVertical: 'top', paddingTop: 10 },
    switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 16 },
    saveBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    closureRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
    closureRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    closureDate: { fontSize: 13, fontWeight: '800' },
    addClosureSection: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
    addClosureTitle: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
    addClosureHint: { fontSize: 11, lineHeight: 16, marginBottom: 10 },
    closureListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    closureCount: { fontSize: 11 },
    emptyClosures: { fontSize: 12, paddingVertical: 8, marginBottom: 4 },
    addDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateButton: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    addBtn: { minHeight: 44, borderRadius: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    dateModal: { width: '100%', maxWidth: 380, borderWidth: 1, borderRadius: 14, padding: 16 },
    dateModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    dateModalTitle: { fontSize: 16, fontWeight: '800' },
    weekRow: { flexDirection: 'row', marginBottom: 6 },
    weekDay: { width: '14.2857%', textAlign: 'center', fontSize: 11, fontWeight: '700' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarDay: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
    dateModalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 16 },
    dateCancel: { paddingVertical: 10, paddingHorizontal: 8 },
    dateConfirm: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
});