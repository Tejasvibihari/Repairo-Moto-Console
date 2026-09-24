import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LEAD_STATUS } from '../../constants/leadConstants';

export default function StatusBadge({ status }) {
    const cfg = LEAD_STATUS[status] || { label: status || 'Unknown', color: '#9E8E78' };
    return (
        <View style={[styles.badge, { backgroundColor: `${cfg.color}1F` }]}>
            <View style={[styles.dot, { backgroundColor: cfg.color }]} />
            <Text style={[styles.text, { color: cfg.color }]} numberOfLines={1}>
                {cfg.label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },
});
