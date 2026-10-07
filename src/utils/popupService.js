// src/utils/popupService.js
//
// Imperative API for the app's themed PopUp. Use it exactly like Alert.alert, from anywhere
// (screens, hooks, utils, background-task code) - no component state needed:
//
//   showPopUp('Saved', 'Settings updated.');
//   showPopUp('Remove item?', 'This cannot be undone.', [
//       { text: 'Cancel', style: 'cancel' },
//       { text: 'Remove', style: 'destructive', onPress: remove },
//   ]);
//   showPopUp(title, message, buttons, { cancelable: false });   // Android back button ignored
//
// <PopUpHost /> (mounted once in App.js) renders them with components/common/PopUp.
// Popups raised while another one is open are queued and shown one after the other.
// Kept free of React / react-native imports so background-task files can import it safely.

let listener = null;
const pending = [];            // raised before the host mounted (e.g. very early at app start)
const MAX_PENDING = 20;
let seq = 0;

const toText = (v) => (v == null ? '' : typeof v === 'string' ? v : String(v));

/** @internal used by <PopUpHost /> */
export function subscribePopUps(fn) {
    listener = fn;
    while (pending.length) fn(pending.shift());
    return () => {
        if (listener === fn) listener = null;
    };
}

/**
 * Same signature as Alert.alert(title, message?, buttons?, options?).
 * buttons: [{ text, onPress?, style?: 'default' | 'cancel' | 'destructive' }]  (none given → a single "OK")
 * options: { cancelable?: boolean, onDismiss?: () => void }
 */
export function showPopUp(title, message, buttons, options) {
    const list = Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'OK' }];
    const item = {
        id: ++seq,
        title: toText(title),
        message: toText(message),
        buttons: list.map((b) => ({
            text: toText(b?.text) || 'OK',
            onPress: b?.onPress,
            style: b?.style || 'default',
        })),
        options: options || {},
    };
    if (listener) {
        listener(item);
    } else {
        if (pending.length >= MAX_PENDING) pending.shift();
        pending.push(item);
    }
}
