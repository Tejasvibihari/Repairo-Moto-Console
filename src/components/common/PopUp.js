import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function PopUp({ visible, title, message, primaryLabel, secondaryLabel, onPrimary, onSecondary, onClose }) {
    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.box}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={onSecondary}>
                            <Text>{secondaryLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.primaryBtn} onPress={onPrimary}>
                            <Text style={styles.primaryText}>{primaryLabel}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    box: { width: '80%', backgroundColor: 'white', padding: 20, borderRadius: 10 },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    message: { fontSize: 14, marginBottom: 20 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    secondaryBtn: { padding: 10 },
    primaryBtn: { padding: 10, backgroundColor: 'red', borderRadius: 5 },
    primaryText: { color: 'white', fontWeight: 'bold' }
});
