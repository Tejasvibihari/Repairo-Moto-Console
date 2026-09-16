import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import axios from "axios";

// Simple semver-ish compare: returns true if a < b
function isOlder(a, b) {
    const pa = String(a).split(".").map(Number);
    const pb = String(b).split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] || 0, y = pb[i] || 0;
        if (x < y) return true;
        if (x > y) return false;
    }
    return false;
}

// appKey identifies WHICH app is checking in — "console" here. The backend
// stores a separate version config per (app, platform) pair, since Console
// and the customer app ship independently with their own version numbers.
export default function useVersionCheck(apiBaseUrl, appKey = "console") {
    const [updateInfo, setUpdateInfo] = useState({ visible: false, force: false, message: "", storeUrl: "" });

    useEffect(() => {
        const check = async () => {
            try {
                const currentVersion = Application.nativeApplicationVersion; // from app.json "version"
                if (!currentVersion) return; // can't compare safely, don't risk a false prompt

                const platform = Platform.OS === "ios" ? "ios" : "android";

                const { data } = await axios.get(`${apiBaseUrl}/api/app-version`, {
                    params: { app: appKey, platform },
                });

                const force = !!data.forceUpdate || isOlder(currentVersion, data.minRequiredVersion);

                // Exact-version-match rule: the app must match the version currently
                // live on the store. Any mismatch (not just being behind) triggers
                // the update prompt; being strictly below minRequiredVersion (or the
                // manual forceUpdate flag) makes it non-dismissable.
                const isExactMatch = currentVersion === data.latestVersion;
                const shouldPrompt = force || !isExactMatch;

                if (shouldPrompt) {
                    setUpdateInfo({
                        visible: true,
                        force,
                        message: data.updateMessage,
                        storeUrl: data.storeUrl,
                    });
                }
            } catch (err) {
                console.log("Version check failed:", err.message); // fail silently, don't block app on network error
            }
        };
        check();
    }, []);

    return [updateInfo, setUpdateInfo];
}
