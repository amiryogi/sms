import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * App configuration. Environment:
 *   APP_ENV              development | preview | production (default development)
 *   EXPO_PUBLIC_API_URL  the API including /api/v1 (inlined into the bundle by Expo)
 *
 * A production build refuses a non-HTTPS API URL, and only development builds
 * may talk plain HTTP (a backend on the LAN). See docs/BUILD_AND_DEPLOYMENT.md.
 */
const APP_ENV = (process.env.APP_ENV ?? "development") as "development" | "preview" | "production";
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

if (APP_ENV === "production" && !API_URL.startsWith("https://")) {
  throw new Error(`APP_ENV=production needs an https:// EXPO_PUBLIC_API_URL (got "${API_URL || "nothing"}")`);
}

const IDS = {
  development: { suffix: ".dev", name: "Vidyalaya SMS (dev)" },
  preview: { suffix: ".preview", name: "Vidyalaya SMS (preview)" },
  production: { suffix: "", name: "Vidyalaya SMS" },
} as const;

// Placeholder identifiers until the owner confirms them: they cannot change
// after the first store release (docs/BUILD_AND_DEPLOYMENT.md).
const BUNDLE_ID = "com.vidyalayasms.app";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IDS[APP_ENV].name,
  slug: "vidyalaya-sms",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "vidyalayasms",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID + IDS[APP_ENV].suffix,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: BUNDLE_ID + IDS[APP_ENV].suffix,
    // The offline cache (AsyncStorage) holds student data: keep it out of Google
    // cloud backups. SecureStore is excluded from backups by its own plugin.
    allowBackup: false,
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sharing",
    "expo-font",
    "expo-image",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 160,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: { image: "./assets/splash-icon.png", backgroundColor: "#0f172a" },
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow $(PRODUCT_NAME) to attach photos to assignments.",
        cameraPermission: "Allow $(PRODUCT_NAME) to take photos of your work for assignments.",
        microphonePermission: false,
      },
    ],
    [
      "expo-build-properties",
      {
        // Plain HTTP only for development builds talking to a LAN backend.
        android: { usesCleartextTraffic: APP_ENV === "development" },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnv: APP_ENV,
  },
});
