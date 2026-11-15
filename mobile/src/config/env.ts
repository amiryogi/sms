import Constants from "expo-constants";

/**
 * Build-time configuration. EXPO_PUBLIC_* values are inlined into the bundle by
 * Expo (public by design: never put a secret in one). See .env.example.
 */
export type AppEnv = "development" | "preview" | "production";

const appEnv = ((Constants.expoConfig?.extra as { appEnv?: string } | undefined)?.appEnv ?? "development") as AppEnv;

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";

/** API base including /api/v1, without a trailing slash. */
export const API_URL = rawApiUrl.replace(/\/+$/, "");

/** Where uploads and logos are served: the API URL minus /api/v1. */
export const API_ORIGIN = API_URL.replace(/\/api\/v1$/, "");

export const APP_ENV: AppEnv = appEnv;

export const IS_PRODUCTION = APP_ENV === "production";

/** Empty when the build has no API URL: the app shows a configuration error instead of guessing. */
export const API_CONFIGURED = /^https?:\/\//.test(API_URL) && (!IS_PRODUCTION || API_URL.startsWith("https://"));
