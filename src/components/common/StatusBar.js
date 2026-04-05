// components/common/DynamicStatusBar.js
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { useSelector } from 'react-redux';

let SystemUI = null;
try { SystemUI = require('expo-system-ui'); } catch (_) { }

export default function DynamicStatusBar() {
    const mode = useSelector((state) => state.theme.mode);
    const isDark = mode === 'dark';

    useEffect(() => {
        SystemUI?.setBackgroundColorAsync?.('transparent');
    }, []);

    return (
        <StatusBar
            hidden={false}
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor="transparent"
            translucent={true}
        />
    );
}