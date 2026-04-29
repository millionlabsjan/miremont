const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

const isBuildContext =
  process.env.EAS_BUILD === "true" ||
  process.env.CI === "true" ||
  process.env.EXPO_PREBUILD === "true";

if (!googleMapsApiKey) {
  const message =
    "[app.config] GOOGLE_MAPS_API_KEY is not set. Map tiles will not render. " +
    "Set the GOOGLE_MAPS_API_KEY environment variable locally, or register it as " +
    "an EAS secret (e.g. `eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value <key>`) before building.";

  if (isBuildContext) {
    throw new Error(message);
  }
  console.warn(message);
}

module.exports = ({ config }) => ({
  ...config,
  expo: {
    name: "The Property Catalogue",
    slug: "miremont",
    scheme: "miremont",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      config: {
        googleMapsApiKey,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      [
        "expo-image-picker",
        {
          photosPermission: "Allow The Property Catalogue to access your photos to set your profile picture.",
        },
      ],
    ],
  },
});
