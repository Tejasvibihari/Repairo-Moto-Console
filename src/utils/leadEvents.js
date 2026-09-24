// src/utils/leadEvents.js
// Tiny pub/sub so the Leads list can refresh after a lead is created or edited
// on another screen, without threading callbacks through navigation params.

const listeners = new Set();

export const leadEvents = {
    subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
    emit() {
        listeners.forEach((fn) => {
            try { fn(); } catch (_) { /* a bad listener must not break others */ }
        });
    },
};
