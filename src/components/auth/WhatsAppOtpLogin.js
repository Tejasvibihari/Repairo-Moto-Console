// src/components/auth/WhatsAppOtpLogin.js
//
// "Sign in with WhatsApp" for the EMPLOYEE and VENDOR consoles (never admin):
//   number → 6-digit code on WhatsApp → signed in.
//
// The server enforces a 1-minute gap between two codes for the same number. This component mirrors it
// with a visible countdown, and re-syncs the countdown from the server's `retryAfter` whenever the
// server says "wait" (e.g. the app was restarted, or the same number was used on another phone).
import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Keyboard, Platform } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useCooldown, formatCountdown } from '../../hooks/useCooldown';

const OTP_LENGTH = 6;

/** Keep only the 10 digits of an Indian mobile number (accepts pasted +91 / 0 prefixes). */
export const cleanPhone = (value) => {
    let d = String(value ?? '').replace(/\D/g, '');
    if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
    if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
    return d.slice(0, 10);
};
const isValidPhone = (value) => /^[6-9]\d{9}$/.test(cleanPhone(value));

/** Two-tab switch: "PASSWORD" | "WHATSAPP OTP". `mode` is 'password' | 'otp'. */
export function LoginModeTabs({ mode, onChange, C }) {
    const tab = (key, label) => {
        const active = mode === key;
        return (
            <TouchableOpacity
                key={key}
                onPress={() => onChange(key)}
                activeOpacity={0.8}
                style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 6,
                    alignItems: 'center',
                    backgroundColor: active ? C.primary : 'transparent',
                }}
            >
                <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.6, color: active ? C.secondary : C.textMuted }}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };
    return (
        <View style={{
            flexDirection: 'row', padding: 4, marginBottom: 4, borderRadius: 10,
            backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
        }}>
            {tab('password', 'PASSWORD')}
            {tab('otp', 'WHATSAPP OTP')}
        </View>
    );
}

export default function WhatsAppOtpLogin({ role, C }) {
    const { sendOtp, loginWithOtp } = useAuth();
    const { left, start } = useCooldown();

    const [step, setStep] = useState('phone');     // 'phone' | 'otp'
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [sentTo, setSentTo] = useState('');      // the number the running cool-down belongs to
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const otpRef = useRef(null);
    const doneRef = useRef(false);

    // The server's cool-down is per number: it only blocks THIS number, not a different one.
    const coolingDown = left > 0 && cleanPhone(phone) === sentTo;

    const send = async () => {
        if (busy || coolingDown) return;
        Keyboard.dismiss();
        setError(''); setInfo('');
        const number = cleanPhone(phone);
        if (!isValidPhone(number)) { setError('Enter a valid 10-digit mobile number.'); return; }

        setBusy(true);
        const res = await sendOtp(number, role);
        setBusy(false);

        if (res.success) {
            setSentTo(number); start(res.resendIn);
            setOtp(''); setStep('otp');
            setInfo(`Code sent on WhatsApp to +91 ${number}`);
            setTimeout(() => otpRef.current?.focus(), 250);
            return;
        }
        if (res.status === 429 && res.retryAfter) {
            // Still cooling down (or hourly cap). Show the real remaining time instead of letting them retry.
            setSentTo(number); start(res.retryAfter);
            if (res.retryAfter <= 60) {        // a code was sent a moment ago and is still valid
                setOtp(''); setStep('otp');
                setInfo('A code was already sent. Enter it below, or wait for the timer to resend.');
                setTimeout(() => otpRef.current?.focus(), 250);
            } else {
                setError(res.error);
            }
            return;
        }
        setError(res.error);
        if (res.retryAfter) { setSentTo(number); start(res.retryAfter); }   // delivery failed: server also holds the cool-down
    };

    const verify = async (code) => {
        if (busy || doneRef.current) return;
        if (code.length !== OTP_LENGTH) { setError(`Enter the ${OTP_LENGTH}-digit code.`); return; }
        Keyboard.dismiss();
        setBusy(true); setError('');
        const res = await loginWithOtp(sentTo || cleanPhone(phone), code, role);
        setBusy(false);
        if (res.success) { doneRef.current = true; return; }   // navigation happens on auth state change
        setError(res.error);
        setOtp('');
        setTimeout(() => otpRef.current?.focus(), 100);
    };

    const onOtpChange = (t) => {
        const v = t.replace(/\D/g, '').slice(0, OTP_LENGTH);
        setOtp(v); setError('');
        if (v.length === OTP_LENGTH) verify(v);     // submit as soon as the 6th digit is in
    };

    const s = {
        label: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: C.textMuted, marginBottom: 8, marginTop: 20 },
        input: {
            backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 8,
            paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 16 : 13, fontSize: 14, color: C.textPrimary,
        },
        phoneRow: { flexDirection: 'row', alignItems: 'center' },
        prefix: {
            fontSize: 14, fontWeight: '700', color: C.textPrimary, marginRight: 10,
            backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 8,
            paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 16 : 13,
        },
        btn: (disabled) => ({
            marginTop: 28, backgroundColor: C.primary, borderRadius: 8, paddingVertical: 17, alignItems: 'center',
            flexDirection: 'row', justifyContent: 'center', gap: 10, opacity: disabled ? 0.55 : 1,
        }),
        btnText: { fontSize: 13, fontWeight: '800', letterSpacing: 2, color: C.secondary },
        otpInput: { textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: 10 },
        error: { marginTop: 12, fontSize: 12, color: '#E54D4D', textAlign: 'center' },
        info: { marginTop: 12, fontSize: 12, color: C.textSecondary, textAlign: 'center', lineHeight: 18 },
        links: { marginTop: 22, alignItems: 'center', gap: 14 },
        link: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
    };

    if (step === 'phone') {
        const disabled = busy || coolingDown || cleanPhone(phone).length < 10;
        return (
            <View>
                <Text style={s.label}>MOBILE NUMBER (WHATSAPP)</Text>
                <View style={s.phoneRow}>
                    <Text style={s.prefix}>+91</Text>
                    <TextInput
                        style={[s.input, { flex: 1 }]}
                        placeholder="98765 43210"
                        placeholderTextColor={C.textMuted}
                        value={phone}
                        onChangeText={(t) => { setPhone(cleanPhone(t)); setError(''); }}
                        keyboardType="phone-pad"
                        maxLength={14}
                        returnKeyType="send"
                        onSubmitEditing={send}
                    />
                </View>
                <TouchableOpacity style={s.btn(disabled)} activeOpacity={0.85} onPress={send} disabled={disabled}>
                    {busy ? <ActivityIndicator color={C.secondary} /> : (
                        <Text style={s.btnText}>{coolingDown ? `WAIT ${formatCountdown(left)}` : 'SEND OTP ON WHATSAPP'}</Text>
                    )}
                </TouchableOpacity>
                {!!error && <Text style={s.error}>{error}</Text>}
                <Text style={s.info}>Only registered numbers can sign in. We'll send a 6-digit code on WhatsApp.</Text>
            </View>
        );
    }

    return (
        <View>
            <Text style={s.label}>ENTER THE 6-DIGIT CODE</Text>
            <TextInput
                ref={otpRef}
                style={[s.input, s.otpInput]}
                placeholder="• • • • • •"
                placeholderTextColor={C.textMuted}
                value={otp}
                onChangeText={onOtpChange}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
            />
            <TouchableOpacity
                style={s.btn(busy || otp.length < OTP_LENGTH)}
                activeOpacity={0.85}
                onPress={() => verify(otp)}
                disabled={busy || otp.length < OTP_LENGTH}
            >
                {busy ? <ActivityIndicator color={C.secondary} /> : <Text style={s.btnText}>VERIFY & SIGN IN</Text>}
            </TouchableOpacity>
            {!!error && <Text style={s.error}>{error}</Text>}
            {!error && !!info && <Text style={s.info}>{info}</Text>}

            <View style={s.links}>
                <TouchableOpacity onPress={send} disabled={busy || left > 0} hitSlop={8}>
                    <Text style={[s.link, { color: left > 0 ? C.textMuted : C.primary }]}>
                        {left > 0 ? `RESEND CODE IN ${formatCountdown(left)}` : 'RESEND CODE'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => { setStep('phone'); setOtp(''); setError(''); setInfo(''); }}
                    disabled={busy}
                    hitSlop={8}
                >
                    <Text style={[s.link, { color: C.textSecondary }]}>CHANGE NUMBER</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
