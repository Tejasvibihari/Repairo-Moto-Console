import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../../styles/Theme'; // adjust path

// ─── Options ──────────────────────────────────────────────────────────────────
const SERVICE_OPTIONS = [
    'Oil Change', 'Tyre Puncture', 'Battery Issue', 'Brake Service',
    'Engine Tune-Up', 'Chain Lubrication', 'Carburettor Cleaning',
    'Spark Plug Replacement', 'Air Filter Cleaning', 'General Checkup', 'Other',
];
const SERVICE_TYPES = ['Schedule Repair', 'Emergency Repair'];
const TIME_SLOTS = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
    '04:00 PM', '05:00 PM', '06:00 PM',
];

const getTomorrowISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
};

// ─── Small reusable pieces ────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, colors }) => (
    <View style={sh.row}>
        <Text style={sh.icon}>{icon}</Text>
        <Text style={[sh.title, { color: colors.primary }]}>{title}</Text>
        <View style={[sh.line, { backgroundColor: colors.border }]} />
    </View>
);
const sh = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 8 },
    icon: { fontSize: 16, marginRight: 8 },
    title: { fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
    line: { flex: 1, height: 1, marginLeft: 12 },
});

const Field = ({ label, required, children, error, colors }) => (
    <View style={fl.wrap}>
        <Text style={[fl.label, { color: colors.textSecondary }]}>
            {label}{required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
        {children}
        {!!error && <Text style={[fl.error, { color: colors.error }]}>{error}</Text>}
    </View>
);
const fl = StyleSheet.create({
    wrap: { marginBottom: 14 },
    label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
    error: { fontSize: 11, marginTop: 4 },
});

const StyledInput = ({ colors, multiline, ...props }) => (
    <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
            inp.base,
            {
                backgroundColor: colors.surfaceLow,
                borderColor: colors.border,
                color: colors.textPrimary,
                height: multiline ? 80 : 46,
                textAlignVertical: multiline ? 'top' : 'center',
            },
        ]}
        multiline={multiline}
        {...props}
    />
);
const inp = StyleSheet.create({
    base: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontWeight: '500' },
});

const ChipGroup = ({ options, selected, onToggle, multi = false, colors }) => (
    <View style={ch.wrap}>
        {options.map((opt) => {
            const active = multi ? selected.includes(opt) : selected === opt;
            return (
                <TouchableOpacity
                    key={opt}
                    onPress={() => onToggle(opt)}
                    style={[ch.chip, { backgroundColor: active ? colors.primary : colors.surfaceLow, borderColor: active ? colors.primary : colors.border }]}
                    activeOpacity={0.75}
                >
                    <Text style={[ch.text, { color: active ? '#fff' : colors.textSecondary }]}>{opt}</Text>
                </TouchableOpacity>
            );
        })}
    </View>
);
const ch = StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    text: { fontSize: 12, fontWeight: '600' },
});

// ─── Form ─────────────────────────────────────────────────────────────────────
const INITIAL = {
    name: '', contactNo: '', email: '', city: '',
    selectedBrand: '', selectedModel: '', modelName: '',
    cc: '', bs: '', services: [], serviceType: 'Schedule Repair',
    otherService: '', preferredDate: getTomorrowISO(),
    preferredTime: '', issues: '', coupon: '',
};

const AdminManualOrderForm = ({ onSubmit, loading }) => {
    // ✅ Read theme mode from Redux store
    const themeMode = useSelector((state) => state.theme.mode);
    const colors = themeMode === 'dark' ? DarkTheme.colors : LightTheme.colors;

    const [form, setForm] = useState(INITIAL);
    const [errors, setErrors] = useState({});
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const set = (key, val) => {
        setForm((p) => ({ ...p, [key]: val }));
        if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }));
    };

    const toggleService = (s) => {
        setForm((p) => ({
            ...p,
            services: p.services.includes(s) ? p.services.filter((x) => x !== s) : [...p.services, s],
        }));
        if (errors.services) setErrors((p) => ({ ...p, services: '' }));
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!form.contactNo.trim()) e.contactNo = 'Contact number is required';
        else if (!/^\d{10}$/.test(form.contactNo.trim())) e.contactNo = 'Enter valid 10-digit number';
        if (!form.city.trim()) e.city = 'City is required';
        if (!form.selectedBrand.trim()) e.selectedBrand = 'Brand is required';
        if (!form.selectedModel.trim()) e.selectedModel = 'Model is required';
        if (!form.cc.trim()) e.cc = 'CC is required';
        if (!form.services.length) e.services = 'Select at least one service';
        if (!form.preferredDate) e.preferredDate = 'Date is required';
        if (!form.preferredTime) e.preferredTime = 'Time slot is required';
        return e;
    };

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleSubmit = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); shake(); return; }
        onSubmit({ ...form, city: form.city.toUpperCase(), preferredDate: new Date(form.preferredDate).toISOString() });
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView
                contentContainerStyle={[s.container, { backgroundColor: colors.background }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Customer Info */}
                <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <SectionHeader icon="👤" title="Customer Info" colors={colors} />
                    <Field label="Full Name" required error={errors.name} colors={colors}>
                        <StyledInput colors={colors} placeholder="e.g. Rahul Sharma" value={form.name} onChangeText={(v) => set('name', v)} />
                    </Field>
                    <Field label="Contact Number" required error={errors.contactNo} colors={colors}>
                        <StyledInput colors={colors} placeholder="10-digit mobile number" value={form.contactNo} onChangeText={(v) => set('contactNo', v)} keyboardType="phone-pad" maxLength={10} />
                    </Field>
                    <Field label="Email" error={errors.email} colors={colors}>
                        <StyledInput colors={colors} placeholder="Optional" value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
                    </Field>
                    <Field label="City" required error={errors.city} colors={colors}>
                        <StyledInput colors={colors} placeholder="e.g. Patna" value={form.city} onChangeText={(v) => set('city', v)} />
                    </Field>
                </View>

                {/* Vehicle Info */}
                <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <SectionHeader icon="🏍️" title="Vehicle Info" colors={colors} />
                    <View style={s.row}>
                        <View style={s.half}>
                            <Field label="Brand" required error={errors.selectedBrand} colors={colors}>
                                <StyledInput colors={colors} placeholder="Honda" value={form.selectedBrand} onChangeText={(v) => set('selectedBrand', v)} />
                            </Field>
                        </View>
                        <View style={s.half}>
                            <Field label="Model" required error={errors.selectedModel} colors={colors}>
                                <StyledInput colors={colors} placeholder="CB Shine" value={form.selectedModel} onChangeText={(v) => set('selectedModel', v)} />
                            </Field>
                        </View>
                    </View>
                    <Field label="Model Name / Variant" colors={colors}>
                        <StyledInput colors={colors} placeholder="Optional variant name" value={form.modelName} onChangeText={(v) => set('modelName', v)} />
                    </Field>
                    <View style={s.row}>
                        <View style={s.half}>
                            <Field label="CC" required error={errors.cc} colors={colors}>
                                <StyledInput colors={colors} placeholder="125" value={form.cc} onChangeText={(v) => set('cc', v)} keyboardType="numeric" />
                            </Field>
                        </View>
                        <View style={s.half}>
                            <Field label="BS (Emission)" colors={colors}>
                                <StyledInput colors={colors} placeholder="BS6" value={form.bs} onChangeText={(v) => set('bs', v)} />
                            </Field>
                        </View>
                    </View>
                </View>

                {/* Service Details */}
                <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <SectionHeader icon="🔧" title="Service Details" colors={colors} />
                    <Field label="Service Type" colors={colors}>
                        <ChipGroup options={SERVICE_TYPES} selected={form.serviceType} onToggle={(v) => set('serviceType', v)} colors={colors} />
                    </Field>
                    <Field label="Services Required" required error={errors.services} colors={colors}>
                        <ChipGroup options={SERVICE_OPTIONS} selected={form.services} onToggle={toggleService} multi colors={colors} />
                    </Field>
                    {form.services.includes('Other') && (
                        <Field label="Other Service Details" colors={colors}>
                            <StyledInput colors={colors} placeholder="Describe the other service..." value={form.otherService} onChangeText={(v) => set('otherService', v)} multiline />
                        </Field>
                    )}
                    <Field label="Issues / Description" colors={colors}>
                        <StyledInput colors={colors} placeholder="Describe the problem in detail..." value={form.issues} onChangeText={(v) => set('issues', v)} multiline />
                    </Field>
                </View>

                {/* Schedule */}
                <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <SectionHeader icon="📅" title="Schedule" colors={colors} />
                    <Field label="Preferred Date (YYYY-MM-DD)" required error={errors.preferredDate} colors={colors}>
                        <StyledInput colors={colors} placeholder={getTomorrowISO()} value={form.preferredDate} onChangeText={(v) => set('preferredDate', v)} keyboardType="numbers-and-punctuation" />
                    </Field>
                    <Field label="Preferred Time Slot" required error={errors.preferredTime} colors={colors}>
                        <ChipGroup options={TIME_SLOTS} selected={form.preferredTime} onToggle={(v) => set('preferredTime', v)} colors={colors} />
                    </Field>
                </View>

                {/* Additional */}
                <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <SectionHeader icon="🎟️" title="Additional" colors={colors} />
                    <Field label="Coupon Code" colors={colors}>
                        <StyledInput colors={colors} placeholder="Optional coupon" value={form.coupon} onChangeText={(v) => set('coupon', v)} autoCapitalize="characters" />
                    </Field>
                </View>

                {/* Submit */}
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                    <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85} style={[s.submitBtn, { backgroundColor: colors.primary }]}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>✅  Create Order</Text>}
                    </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity onPress={() => { setForm(INITIAL); setErrors({}); }} activeOpacity={0.7} style={s.resetBtn}>
                    <Text style={[s.resetText, { color: colors.textMuted }]}>Reset Form</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default AdminManualOrderForm;

const s = StyleSheet.create({
    container: { padding: 16, paddingTop: 8 },
    card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
    row: { flexDirection: 'row', gap: 10 },
    half: { flex: 1 },
    submitBtn: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12, shadowColor: '#e2a731', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
    submitText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
    resetBtn: { alignItems: 'center', paddingVertical: 8 },
    resetText: { fontSize: 13, fontWeight: '500' },
});