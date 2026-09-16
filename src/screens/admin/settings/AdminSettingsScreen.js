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

function Field({ label, value, onChangeText, theme, placeholder, keyboardType }) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textMuted}
                keyboardType={keyboardType}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                    styles.input,
                    {
                        color: theme.colors.textPrimary,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surfaceLow,
                    },
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

const AdminSettingsScreen = () => {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;

    const [configs, setConfigs] = useState([]); // raw list from backend
    const [loading, setLoading] = useState(true);
    const [paymentSettings, setPaymentSettings] = useState(null);
    const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(true);
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
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
    switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 16 },
    saveBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});