// Type-only: erased from the bundle, so this does not pull SecureStore into the web build.
import type { TokenStore, Tokens } from "./tokenStore";

/**
 * Web only. The web build of the app exists to capture the phone screenshots on the public
 * product site (e2e/mobile-shots); it is never shipped. Browsers have no keychain, so the
 * session lives in sessionStorage (this tab only, gone when it closes). The phone builds use
 * tokenStore.ts (SecureStore). Same exports as that file.
 */
export type { TokenStore, Tokens };

const KEY = "sms.session";

export const createSecureTokenStore = (): TokenStore => {
  let memory: Tokens | null = null;
  const write = (value: Tokens | null) => {
    try {
      if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
      else sessionStorage.removeItem(KEY);
    } catch {
      // storage blocked: the session stays in memory
    }
  };
  return {
    async load() {
      try {
        const raw = sessionStorage.getItem(KEY);
        memory = raw ? (JSON.parse(raw) as Tokens) : null;
      } catch {
        memory = null;
      }
      return memory;
    },
    getAccessToken: () => memory?.accessToken ?? null,
    getRefreshToken: () => memory?.refreshToken ?? null,
    async set(tokens) {
      memory = tokens;
      write(tokens);
    },
    async clear() {
      memory = null;
      write(null);
    },
  };
};

/** In-memory store (tests use the one in tokenStore.ts; kept so both files export the same names). */
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
