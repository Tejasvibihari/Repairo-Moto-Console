// app.config.js
// Dynamic config — ensures EXPO_PUBLIC_ env vars are available at build time.
// Locally, Expo loads .env automatically.
// On EAS cloud builds, set the same variables via `eas secret:create`.

export default ({ config }) => {
  return {
    ...config,
    name: "Repairo Moto Console",
    slug: "repairo-moto-console",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
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
          icon: "./assets/logo72.png",
          color: "#e2a731",
          defaultChannel: "orders",
        },
      ],
    ],
    ios: {
      supportsTablet: true,
      config: {
        googleMapsApiKey: "AIzaSyC-RRm-8NLc8XCOz89NbdpTdQvIr1if76c",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.roottechnology.repairomotoconsole",
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
