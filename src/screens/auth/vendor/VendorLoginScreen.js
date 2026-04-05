import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../../store/slices/authSlice';
import { ROLES } from '../../../constants/roles';
import { LightTheme } from '../../../styles/Theme';

const C = LightTheme.colors;

export default function VendorLoginScreen({ navigation }) {
    const dispatch = useDispatch();

    const handleLogin = () => {
        dispatch(loginSuccess({
            token: 'dummy_vendor_token',
            user: { _id: '3', name: 'Vendor Shop', email: 'vendor@repairo.com', role: ROLES.VENDOR },
        }));
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Back</Text>
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.title}>Vendor Login</Text>
                
                <TextInput 
                    style={styles.input} 
                    placeholder="Email/Phone" 
                    value="vendor@repairo.com" 
                    editable={false}
                />
                <TextInput 
                    style={styles.input} 
                    placeholder="Password" 
                    value="password123" 
                    secureTextEntry 
                    editable={false}
                />

                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                    <Text style={styles.buttonText}>Login as Vendor</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { padding: 20 },
    backBtn: { color: C.primary, fontSize: 16, fontWeight: 'bold' },
    scroll: { padding: 20, alignItems: 'center' },
    title: { fontSize: 26, fontWeight: 'bold', color: C.textPrimary, marginBottom: 30 },
    input: {
        width: '100%',
        backgroundColor: C.surface,
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: C.border
    },
    button: {
        backgroundColor: C.primary,
        padding: 15,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    forgotText: { color: C.secondary, fontSize: 14 }
});
