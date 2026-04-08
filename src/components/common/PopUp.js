import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../styles/Theme';

export default function PopUp({ visible, title, message, primaryLabel, secondaryLabel, onPrimary, onSecondary, onClose }) {
    const mode = useSelector((state) => state.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const colors = theme.colors;

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={onSecondary}>
                            <Text style={{ color: colors.textPrimary }}>{secondaryLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.error }]} onPress={onPrimary}>
                            <Text style={styles.primaryText}>{primaryLabel}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    box: {
        width: '80%',
        padding: 20,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    message: {
        fontSize: 14,
        marginBottom: 20,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    secondaryBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    primaryBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    primaryText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});