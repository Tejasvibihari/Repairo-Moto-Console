// src/hooks/useCooldown.js
// Countdown for "resend code" buttons. Stores the moment the cool-down ENDS (not a decrementing counter),
// so it stays correct when the app is in the background or the screen re-renders.
import { useCallback, useEffect, useState } from 'react';

export const formatCountdown = (seconds) => {
    const s = Math.max(0, Math.floor(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function useCooldown() {
    const [endsAt, setEndsAt] = useState(0);
    const [left, setLeft] = useState(0);

    useEffect(() => {
        if (!endsAt) { setLeft(0); return undefined; }
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
            setLeft(remaining);
            if (remaining === 0) setEndsAt(0);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [endsAt]);

    const start = useCallback((seconds) => setEndsAt(Date.now() + Math.max(1, seconds) * 1000), []);
    return { left, start };
}
