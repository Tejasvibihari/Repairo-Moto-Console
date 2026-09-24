import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import StatusBadge from '../../../components/telecaller/StatusBadge';
import { leadService, getErrorMessage } from '../../../services/leadService';
import { leadEvents } from '../../../utils/leadEvents';
import { LEAD_SOURCES, sourceLabel } from '../../../constants/leadConstants';
import { digitsOnly, isValidPhone } from '../../../utils/leadUtils';

function Field({ label, theme, error, style, ...inputProps }) {
    const C = theme.colors;
    return (
        <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>{label}</Text>
            <TextInput
                placeholderTextColor={C.textMuted}
                {...inputProps}
                style={[
                    styles.input,
                    { color: C.textPrimary, backgroundColor: C.surface, borderColor: error ? '#FF6B6B' : C.border },
                    style,
                ]}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

export default function LeadFormScreen() {
    const navigation = useNavigation();
    const { params } = useRoute();
    const editing = params?.lead || null;

    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const user = useSelector((s) => s.auth.user);

    const [name, setName] = useState(editing?.customer?.name || '');
    const [phone, setPhone] = useState(editing?.customer?.phone || '');
    const [brand, setBrand] = useState(editing?.vehicle?.brand || '');
    const [model, setModel] = useState(editing?.vehicle?.model || '');
    const [reg, setReg] = useState(editing?.vehicle?.registrationNumber || '');
    const [city, setCity] = useState(editing?.location?.city || '');
    const [address, setAddress] = useState(editing?.location?.address || '');
    const [mapLink, setMapLink] = useState(editing?.location?.googleMapLink || '');
    const [source, setSource] = useState(editing?.source || 'other');
    const [services, setServices] = useState((editing?.serviceInterest || []).join(', '));
    const [remark, setRemark] = useState('');

    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [duplicate, setDuplicate] = useState(null);
    const dupReq = useRef(0);

    // Warn when the number already belongs to a lead (new leads only).
    useEffect(() => {
        if (editing) return;
        const d = digitsOnly(phone);
        if (d.length < 10) { setDuplicate(null); return; }
        const req = ++dupReq.current;
        const t = setTimeout(async () => {
            try {
                const res = await leadService.list({ search: d.slice(-10), limit: 5 });
                if (req !== dupReq.current) return;
                const hit = (res.data || []).find((l) => digitsOnly(l.customer?.phone).endsWith(d.slice(-10)));
                setDuplicate(hit || null);
            } catch (_) { /* the check is best effort */ }
        }, 500);
        return () => clearTimeout(t);
    }, [phone, editing]);

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Enter the customer name.';
        if (!phone.trim()) e.phone = 'Enter a phone number.';
        else if (!isValidPhone(phone)) e.phone = 'Enter a valid phone number.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async () => {
        if (!validate()) return;

        const payload = {
            customer: { name: name.trim(), phone: phone.trim() },
            vehicle: { brand: brand.trim(), model: model.trim(), registrationNumber: reg.trim().toUpperCase() },
            location: { address: address.trim(), city: city.trim(), googleMapLink: mapLink.trim() },
            source,
            serviceInterest: services.split(',').map((s) => s.trim()).filter(Boolean),
        };

        setSaving(true);
        try {
            if (editing) {
                await leadService.update(editing._id, payload);
                leadEvents.emit();
                navigation.goBack();
            } else {
                payload.status = 'new';
                if (remark.trim()) payload.remarks = [{ text: remark.trim(), addedBy: user?._id }];
                const res = await leadService.create(payload);
                leadEvents.emit();
                // Straight to the lead so the telecaller can call right away.
                navigation.replace('LeadDetail', { leadId: res.data._id, lead: res.data });
            }
        } catch (e) {
            Alert.alert(editing ? 'Could not update lead' : 'Could not add lead', getErrorMessage(e, 'Please try again.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScreenWrapper title={editing ? 'Edit lead' : 'New lead'} noPadding>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Text style={[styles.group, { color: C.textPrimary }]}>Customer</Text>
                    <Field label="Name" theme={theme} value={name} onChangeText={setName} placeholder="Customer name" error={errors.name} autoCapitalize="words" />
                    <Field
                        label="Phone"
                        theme={theme}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="10-digit mobile number"
                        keyboardType="phone-pad"
                        error={errors.phone}
                    />
                    {duplicate && (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => navigation.replace('LeadDetail', { leadId: duplicate._id, lead: duplicate })}
                            style={[styles.dup, { borderColor: C.primary, backgroundColor: `${C.primary}18` }]}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 13.5 }}>
                                    This number is already a lead
                                </Text>
                                <Text style={{ color: C.textSecondary, fontSize: 12.5, marginTop: 2 }}>
                                    {duplicate.customer?.name} · added by {duplicate.leadBy}. Tap to open it instead.
                                </Text>
                            </View>
                            <StatusBadge status={duplicate.status} />
                        </TouchableOpacity>
                    )}

                    <Text style={[styles.group, { color: C.textPrimary }]}>Vehicle</Text>
                    <View style={styles.twoCol}>
                        <View style={{ flex: 1 }}>
                            <Field label="Brand" theme={theme} value={brand} onChangeText={setBrand} placeholder="Honda" autoCapitalize="words" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Field label="Model" theme={theme} value={model} onChangeText={setModel} placeholder="Activa" autoCapitalize="words" />
                        </View>
                    </View>
                    <Field label="Registration number" theme={theme} value={reg} onChangeText={setReg} placeholder="BR01AB1234" autoCapitalize="characters" />

                    <Text style={[styles.group, { color: C.textPrimary }]}>Location</Text>
                    <Field label="City" theme={theme} value={city} onChangeText={setCity} placeholder="City" autoCapitalize="words" />
                    <Field label="Address" theme={theme} value={address} onChangeText={setAddress} placeholder="House, street, landmark" multiline style={styles.multiline} />
                    <Field label="Google Maps link" theme={theme} value={mapLink} onChangeText={setMapLink} placeholder="https://maps.app.goo.gl/..." autoCapitalize="none" keyboardType="url" />

                    <Text style={[styles.group, { color: C.textPrimary }]}>Enquiry</Text>
                    <Text style={[styles.label, { color: C.textSecondary }]}>Source</Text>
                    <View style={styles.chipWrap}>
                        {(LEAD_SOURCES.includes(source) ? LEAD_SOURCES : [...LEAD_SOURCES, source]).map((s) => {
                            const active = source === s;
                            return (
                                <TouchableOpacity
                                    key={s}
                                    onPress={() => setSource(s)}
                                    style={[
                                        styles.chip,
                                        { borderColor: active ? C.primary : C.border, backgroundColor: active ? `${C.primary}22` : C.surface },
                                    ]}
                                >
                                    <Text style={{ color: active ? C.primary : C.textSecondary, fontWeight: '700', fontSize: 13 }}>
                                        {sourceLabel(s)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <Field
                        label="Services needed"
                        theme={theme}
                        value={services}
                        onChangeText={setServices}
                        placeholder="General service, brake repair"
                    />
                    {!editing && (
                        <Field
                            label="Note (optional)"
                            theme={theme}
                            value={remark}
                            onChangeText={setRemark}
                            placeholder="Anything worth remembering about this enquiry"
                            multiline
                            style={styles.multiline}
                        />
                    )}

                    <TouchableOpacity
                        onPress={submit}
                        disabled={saving}
                        activeOpacity={0.85}
                        style={[styles.submit, { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 }]}
                    >
                        {saving ? <ActivityIndicator color="#1a1a1a" /> : <Text style={styles.submitText}>{editing ? 'Save changes' : 'Add lead'}</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 48 },
    group: { fontSize: 16, fontWeight: '800', marginTop: 10, marginBottom: 10 },
    field: { marginBottom: 12 },
    label: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.2, marginBottom: 6 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15 },
    multiline: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
    error: { color: '#FF6B6B', fontSize: 12.5, marginTop: 5, fontWeight: '600' },
    twoCol: { flexDirection: 'row', gap: 12 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    chip: { paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    dup: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
    submit: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    submitText: { color: '#1a1a1a', fontWeight: '800', fontSize: 16 },
});
