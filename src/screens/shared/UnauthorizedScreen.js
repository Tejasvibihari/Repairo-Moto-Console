import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { LightTheme } from '../../styles/Theme';

const C = LightTheme.colors;

export default function UnauthorizedScreen() {
    const dispatch = useDispatch();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Unauthorized Access</Text>
                <Text style={styles.text}>You do not have permission to view this content.</Text>

                <TouchableOpacity style={styles.button} onPress={() => dispatch(logout())}>
                    <Text style={styles.buttonText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    content: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#ff3333', marginBottom: 15 },
    text: { fontSize: 16, color: C.textSecondary, marginBottom: 30, textAlign: 'center' },
    button: {
        backgroundColor: C.primary,
        padding: 15,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});
