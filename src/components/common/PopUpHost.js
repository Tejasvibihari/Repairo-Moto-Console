// src/components/common/PopUpHost.js
//
// Renders the popups raised with showPopUp() (utils/popupService.js) using the shared PopUp
// component. Mount ONCE, inside the redux Provider (see App.js).
//
//   1-2 buttons → PopUp's normal primary / secondary buttons
//   3+ buttons  → PopUp's stacked `actions` (e.g. "Go offline?": Take a Break / Sign Out / Stay Online)
//   style 'destructive' → red button, anything else → theme primary; style 'cancel' → the quiet button
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import PopUp from './PopUp';
import { subscribePopUps } from '../../utils/popupService';
import { LightTheme, DarkTheme } from '../../styles/Theme';

const NEXT_DELAY_MS = 250;     // let the closing fade finish before the next queued popup opens

export default function PopUpHost() {
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const colors = (mode === 'dark' ? DarkTheme : LightTheme).colors;

    const queueRef = useRef([]);
    const currentRef = useRef(null);
    const closingRef = useRef(false);
    const timerRef = useRef(null);
    const [current, setCurrent] = useState(null);

    const pump = useCallback(() => {
        if (currentRef.current || closingRef.current || !queueRef.current.length) return;
        currentRef.current = queueRef.current.shift();
        setCurrent(currentRef.current);
    }, []);

    useEffect(() => {
        const unsubscribe = subscribePopUps((item) => {
            queueRef.current.push(item);
            pump();
        });
        return () => {
            unsubscribe();
            clearTimeout(timerRef.current);
        };
    }, [pump]);

    // Close the popup, then run the tapped button's handler. A handler that raises another
    // popup (e.g. an error after "Remove") simply queues it behind the short closing delay.
    const finish = useCallback((handler) => {
        currentRef.current = null;
        closingRef.current = true;
        setCurrent(null);
        try {
            handler?.();
        } finally {
            timerRef.current = setTimeout(() => {
                closingRef.current = false;
                pump();
            }, NEXT_DELAY_MS);
        }
    }, [pump]);

    if (!current) return null;

    const { buttons, options } = current;
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const colorFor = (b) => (b.style === 'destructive' ? colors.error : colors.primary);
    const press = (b) => () => finish(b.onPress);

    // Android back button: ignored when cancelable:false; otherwise acts like the Cancel button
    const onClose = () => {
        if (options.cancelable === false) return;
        if (cancelBtn) finish(cancelBtn.onPress);
        else if (options.cancelable) finish(options.onDismiss);
    };

    if (buttons.length <= 2) {
        const two = buttons.length === 2;
        const secondary = two ? (cancelBtn || buttons[0]) : null;
        const primary = two ? buttons.find((b) => b !== secondary) : buttons[0];
        return (
            <PopUp
                key={current.id}
                visible
                title={current.title}
                message={current.message}
                primaryLabel={primary.text}
                primaryColor={colorFor(primary)}
                onPrimary={press(primary)}
                secondaryLabel={secondary?.text}
                onSecondary={secondary ? press(secondary) : undefined}
                onClose={onClose}
            />
        );
    }

    // 3+ buttons: stacked, "cancel" last
    const ordered = [...buttons.filter((b) => b.style !== 'cancel'), ...buttons.filter((b) => b.style === 'cancel')];
    return (
        <PopUp
            key={current.id}
            visible
            title={current.title}
            message={current.message}
            actions={ordered.map((b) => ({
                label: b.text,
                onPress: press(b),
                color: colorFor(b),
                variant: b.style === 'cancel' ? 'ghost' : 'solid',
            }))}
            onClose={onClose}
        />
    );
}
