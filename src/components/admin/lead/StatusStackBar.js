import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LEAD_STATUS, FILTER_STATUSES } from '../../../constants/leadConstants';

// One horizontal bar split into coloured segments, one per status.
export default function StatusStackBar({ byStatus = {}, theme, height = 8 }) {
    const segments = FILTER_STATUSES
        .map((s) => ({ key: s, count: byStatus[s] || 0, color: LEAD_STATUS[s].color }))
        .filter((s) => s.count > 0);

    return (
        <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: theme.colors.surfaceHigh }]}>
            {segments.map((s) => (
                <View key={s.key} style={{ flex: s.count, backgroundColor: s.color }} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    track: { flexDirection: 'row', overflow: 'hidden', width: '100%' },
});
