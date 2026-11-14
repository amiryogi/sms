import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Non-sensitive device storage (AsyncStorage). Tokens never go here
 * (src/api/tokenStore.ts). Every key starts with "sms.":
 *
 *   sms.pref.*               preferences that outlive a session (theme, onboarding, school code)
 *   sms.draft.<userId>.*     unsent attendance/marks entries, deleted at sign-out
 *   sms.seen.<userId>        notification "seen" state, deleted at sign-out
 *   sms.user.<userId>.*      small per-user choices (a parent's selected child), deleted at sign-out
 *   sms.cache.<userId>       persisted read-only queries (src/lib/persistence.ts)
 *
 * Every read tolerates a missing or corrupt value.
 */

export const PREF_KEYS = {
  installed: "sms.pref.installed",
  onboardingDone: "sms.pref.onboardingDone",
  colorScheme: "sms.pref.colorScheme",
  schoolCode: "sms.pref.schoolCode",
  lastIdentifier: "sms.pref.lastIdentifier",
  language: "sms.pref.language",
} as const;

export const readJson = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

export const writeJson = async (key: string, value: unknown) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable: preferences are best effort
  }
};

export const removeKey = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // nothing to do
  }
};

export const draftKey = (userId: number, name: string) => `sms.draft.${userId}.${name}`;
export const seenKey = (userId: number) => `sms.seen.${userId}`;
export const userKey = (userId: number, name: string) => `sms.user.${userId}.${name}`;

/** Remove every per-user key on this device: drafts, seen state, cached queries. */
export const clearUserScopedData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const userKeys = keys.filter((k) => ["sms.draft.", "sms.seen.", "sms.cache.", "sms.user."].some((p) => k.startsWith(p)));
    if (userKeys.length) await AsyncStorage.multiRemove(userKeys);
  } catch {
    // best effort; the next sign-in uses its own user id anyway
  }
};
