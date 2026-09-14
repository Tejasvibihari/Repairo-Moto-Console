import { useEffect, useState } from "react";
import * as Application from "expo-application";
import axios from "axios";

// Simple semver compare: returns true if a < b
function isOlder(a, b) {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] || 0, y = pb[i] || 0;
        if (x < y) return true;
        if (x > y) return false;
    }
    return false;
}

export default function useVersionCheck(apiBaseUrl) {
    const [updateInfo, setUpdateInfo] = useState({ visible: false, force: false, message: "", storeUrl: "" });

    useEffect(() => {
        const check = async () => {
            try {
                const currentVersion = Application.nativeApplicationVersion; // from app.json "version"
                const { data } = await axios.get(`${apiBaseUrl}/api/app-version`, {
                    params: { platform: "android" },
                });

                const force = data.forceUpdate || isOlder(currentVersion, data.minRequiredVersion);
                const shouldPrompt = force || isOlder(currentVersion, data.latestVersion);

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