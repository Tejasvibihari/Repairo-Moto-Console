import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../../store/slices/authSlice';
import { ROLES } from '../../../constants/roles';
import { LightTheme } from '../../../styles/Theme';

const C = LightTheme.colors;

export default function EmployeeLoginScreen({ navigation }) {
    const dispatch = useDispatch();

    const handleLogin = (employeeRole) => {
        dispatch(loginSuccess({
            token: 'dummy_employee_token',
            user: { _id: '2', name: `${employeeRole} User`, email: 'employee@repairo.com', role: employeeRole },
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
                <Text style={styles.title}>Employee Login</Text>
                
                <TextInput 
                    style={styles.input} 
                    placeholder="Email" 
                    value="employee@repairo.com" 
                    editable={false}
                />
                <TextInput 
                    style={styles.input} 
                    placeholder="Password" 
                    value="password123" 
                    secureTextEntry 
                    editable={false}
                />

                <Text style={styles.subtitle}>Select employee type to test:</Text>
                <TouchableOpacity style={styles.button} onPress={() => handleLogin(ROLES.MECHANIC)}>
                    <Text style={styles.buttonText}>Login as Mechanic</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleLogin(ROLES.DELIVERY)}>
                    <Text style={styles.buttonText}>Login as Delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleLogin(ROLES.OPS_MANAGER)}>
                    <Text style={styles.buttonText}>Login as Ops Manager</Text>
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
    title: { fontSize: 26, fontWeight: 'bold', color: C.textPrimary, marginBottom: 20 },
    subtitle: { fontSize: 14, color: C.textSecondary, marginBottom: 10, marginTop: 10 },
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
        backgroundColor: C.secondary,
        padding: 15,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});
