import React from "react";
import { Modal, View, Text, TouchableOpacity, Linking, BackHandler, Platform, StyleSheet } from "react-native";

export default function UpdateModal({ visible, force, message, storeUrl, onLater }) {
    const handleUpdate = () => {
        if (storeUrl) Linking.openURL(storeUrl);
    };

    const handleExit = () => {
        // iOS does not allow apps to programmatically terminate themselves —
        // Apple rejects apps that try. On iOS we just keep the modal up
        // (non-dismissable, onRequestClose is a no-op) instead of an Exit button.
        if (Platform.OS === "android") BackHandler.exitApp();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { }}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>Update Available</Text>
                    <Text style={styles.message}>{message}</Text>

                    <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate}>
                        <Text style={styles.updateText}>Update Now</Text>
                    </TouchableOpacity>

                    {force ? (
                        Platform.OS === "android" ? (
                            <TouchableOpacity style={styles.exitBtn} onPress={handleExit}>
                                <Text style={styles.exitText}>Exit</Text>
                            </TouchableOpacity>
                        ) : null
                    ) : (
                        <TouchableOpacity style={styles.exitBtn} onPress={onLater}>
                            <Text style={styles.exitText}>Later</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
    card: { width: "85%", backgroundColor: "#fff", borderRadius: 12, padding: 20 },
    title: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
    message: { fontSize: 14, color: "#444", marginBottom: 20 },
    updateBtn: { backgroundColor: "#007AFF", padding: 12, borderRadius: 8, marginBottom: 10, alignItems: "center" },
    updateText: { color: "#fff", fontWeight: "600" },
    exitBtn: { padding: 12, borderRadius: 8, alignItems: "center" },
    exitText: { color: "#666" },
});
