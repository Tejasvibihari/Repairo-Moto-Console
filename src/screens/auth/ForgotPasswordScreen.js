import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LightTheme } from '../../styles/Theme';

const C = LightTheme.colors;

export default function ForgotPasswordScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.text}>This is a dummy forgot password screen.</Text>

                <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
                    <Text style={styles.buttonText}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    content: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: C.textPrimary, marginBottom: 15 },
    text: { fontSize: 16, color: C.textSecondary, marginBottom: 30 },
    button: {
        backgroundColor: C.primary,
        padding: 15,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});
