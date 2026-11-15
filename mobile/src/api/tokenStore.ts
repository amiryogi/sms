import * as SecureStore from "expo-secure-store";

/**
 * Where the session tokens live: the device keychain / keystore only, never
 * AsyncStorage. The access token is also kept in memory, because every request
 * reads it. Nothing here is ever logged.
 */
export type Tokens = { accessToken: string; refreshToken: string };

export interface TokenStore {
  /** Load from secure storage into memory (once, at start-up). */
  load(): Promise<Tokens | null>;
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  set(tokens: Tokens): Promise<void>;
  clear(): Promise<void>;
}

const ACCESS_KEY = "sms.accessToken";
const REFRESH_KEY = "sms.refreshToken";
const OPTIONS: SecureStore.SecureStoreOptions = {
  // Readable only while the device is unlocked, and never restored to another device.
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const createSecureTokenStore = (): TokenStore => {
  let memory: Tokens | null = null;
  return {
    async load() {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY, OPTIONS),
        SecureStore.getItemAsync(REFRESH_KEY, OPTIONS),
      ]);
      memory = accessToken && refreshToken ? { accessToken, refreshToken } : null;
      return memory;
    },
    getAccessToken: () => memory?.accessToken ?? null,
    getRefreshToken: () => memory?.refreshToken ?? null,
    async set(tokens) {
      memory = tokens;
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken, OPTIONS),
        SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken, OPTIONS),
      ]);
    },
    async clear() {
      memory = null;
      await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY, OPTIONS), SecureStore.deleteItemAsync(REFRESH_KEY, OPTIONS)]);
    },
  };
};

/** In-memory store for tests. */
export const createMemoryTokenStore = (initial: Tokens | null = null): TokenStore => {
  let memory = initial;
  return {
    load: async () => memory,
    getAccessToken: () => memory?.accessToken ?? null,
    getRefreshToken: () => memory?.refreshToken ?? null,
    set: async (t) => {
      memory = t;
    },
    clear: async () => {
      memory = null;
    },
  };
};
