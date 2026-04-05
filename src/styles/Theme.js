export const LightTheme = {
    colors: {
        primary: "#e2a731",
        secondary: "#292929",
        tertiary: "#FFF8EC",   // warm cream — amber-tinted white
        neutral: "#1a1a1a",

        background: "#FFF8EC",
        surface: "#FFFFFF",

        surfaceLow: "#FFF4E0",
        surfaceHigh: "#FDECC8",
        surfaceHighest: "#F9E0A0",

        textPrimary: "#1a1a1a",
        textSecondary: "#6B5E4A",   // warm brown-gray, not cold gray
        textMuted: "#9E8E78",

        border: "rgba(226,167,49,0.2)",

        success: "#2ECC9A",
        error: "#FF6B6B",
        warning: "#e2a731",
    },
    gradient: ["#e2a731", "#292929"],
    shadow: {
        soft: {
            shadowColor: "#e2a731",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 5,
        },
    },
};

export const DarkTheme = {
    colors: {
        primary: "#e2a731",
        secondary: "#292929",
        tertiary: "#1C1610",   // warm charcoal — amber-tinted near-black
        neutral: "#1a1a1a",

        background: "#1C1610",
        surface: "#292929",

        surfaceLow: "#231E14",
        surfaceHigh: "#2E2618",
        surfaceHighest: "#3A301E",

        textPrimary: "#F0EAD6",   // warm off-white, never pure white
        textSecondary: "#C4A882",   // warm tan
        textMuted: "#7A6A52",

        border: "rgba(226,167,49,0.15)",

        success: "#2ECC9A",
        error: "#FF6B6B",
        warning: "#e2a731",
    },
    gradient: ["#e2a731", "#1C1610"],
    shadow: {
        soft: {
            shadowColor: "#e2a731",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 28,
            elevation: 6,
        },
    },
};