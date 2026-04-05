import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    mode: "light",       // "light" | "dark"
    userOverride: false, // false = follow system, true = user manually chose
};

const themeSlice = createSlice({
    name: "theme",
    initialState,
    reducers: {
        // Called when user manually taps the toggle — locks in their choice
        toggleTheme: (state) => {
            state.userOverride = true;
            state.mode = state.mode === "light" ? "dark" : "light";
        },

        // Called when user manually picks a specific theme
        setTheme: (state, action) => {
            state.userOverride = true;
            state.mode = action.payload; // "light" | "dark"
        },

        // Called on app startup / OS theme change — only applies if no user override
        syncSystemTheme: (state, action) => {
            if (!state.userOverride) {
                state.mode = action.payload;
                // console.log("🌗 System theme synced to:", action.payload);
            } else {
                // console.log("🔒 User override active, ignoring system theme");
            }
        },
        // Resets user override — app goes back to following system
        resetToSystemTheme: (state) => {
            state.userOverride = false;
        },
    },
});

export const {
    toggleTheme,
    setTheme,
    syncSystemTheme,
    resetToSystemTheme,
} = themeSlice.actions;

export default themeSlice.reducer;