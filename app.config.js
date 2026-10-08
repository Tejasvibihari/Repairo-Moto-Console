// app.config.js
// Dynamic config — ensures EXPO_PUBLIC_ env vars are available at build time.
// Locally, Expo loads .env automatically.
// On EAS cloud builds, set the same variables via `eas secret:create`.

export default ({ config }) => {
  return {
    ...config,
    "name": "Console Repairo Moto",
    "slug": "repairo-moto-console",
    version: "2.0.0",
    orientation: "portrait",
    icon: "./assets/console.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    plugins: [
      [
        "expo-notifications",
        {
          icon: "./assets/console.png",
          color: "#e2a731",
          defaultChannel: "orders",
        },
      ],
      [
        "expo-location",
        {
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
          locationAlwaysAndWhenInUsePermission:
            "Repairo Moto shares your live location with dispatch only while you are Online.",
          locationWhenInUsePermission:
            "Repairo Moto records your location when you mark attendance, and shares it with dispatch while you are Online.",
        },
      ],
    ],
    ios: {
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: ["location"],
      },
      config: {
        googleMapsApiKey: "AIzaSyC-RRm-8NLc8XCOz89NbdpTdQvIr1if76c",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/console.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.roottechnology.repairomotoconsole",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
        "POST_NOTIFICATIONS",
      ],
      versionCode: 6,
      googleServicesFile: "./google-services.json",
      config: {
        googleMaps: {
          apiKey: "AIzaSyC-RRm-8NLc8XCOz89NbdpTdQvIr1if76c",
        },
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      // Expose the API URL via expo-constants as a reliable fallback
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://api.repairomoto.in",
      eas: {
        projectId: "cf007c76-9360-4e3c-b663-403dc0f884c7",
      },
    },
    owner: "tejasvibihari",
  };
};
