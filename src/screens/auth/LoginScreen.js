import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import { ROLES } from '../../constants/roles';
import { LightTheme } from '../../styles/Theme';

const C = LightTheme.colors;

export default function LoginScreen({ navigation }) {
    const dispatch = useDispatch();

    const handleDummyLogin = (role) => {
        const dummyUser = {
            _id: '123',
            name: `Test ${role}`,
            email: `test${role.toLowerCase()}@example.com`,
            role: role,
        };

        dispatch(loginSuccess({
            token: 'dummy_token_123',
            user: dummyUser,
        }));
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.title}>Welcome to Repairo!</Text>
                <Text style={styles.subtitle}>Select a role to test:</Text>

                {Object.values(ROLES).map((role) => (
                    <TouchableOpacity 
                        key={role} 
                        style={styles.button}
                        onPress={() => handleDummyLogin(role)}
                    >
                        <Text style={styles.buttonText}>Login as {role}</Text>
                    </TouchableOpacity>
                ))}

                <TouchableOpacity 
                    style={styles.forgotBtn}
                    onPress={() => navigation.navigate('ForgotPassword')}
                >
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    scroll: { padding: 20, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    title: { fontSize: 24, fontWeight: 'bold', color: C.textPrimary, marginBottom: 10 },
    subtitle: { fontSize: 16, color: C.textSecondary, marginBottom: 30 },
    button: {
        backgroundColor: C.primary,
        padding: 15,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
    forgotBtn: { marginTop: 20 },
    forgotText: { color: C.primary, fontSize: 14 }
});
