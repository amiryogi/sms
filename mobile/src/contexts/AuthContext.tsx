import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiEvents } from "@/api/events";
import type { ApiFailure } from "@/api/errors";
import { tokenStore } from "@/api/http";
import type { AuthUser } from "@/api/schemas/auth";
import { authService, type LoginInput } from "@/api/services/auth";
import { clearGeneratedPdfs } from "@/features/report-cards/pdf";
import { startPersistence } from "@/lib/persistence";
import { clearUserScopedData, PREF_KEYS, readJson, writeJson } from "@/lib/storage";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * The session (MOBILE_ARCHITECTURE.md §4).
 *
 *   booting      tokens are being read and /auth/me checked
 *   signedOut    no session
 *   restoreError tokens exist but the server could not be reached: the user is
 *                still signed in and can retry (or sign out on this phone)
 *   signedIn     `user` is set; `user.mustChangePassword` sends them to the
 *                change-password screen before anything else
 */
export type AuthStatus = "booting" | "signedOut" | "restoreError" | "signedIn";

type AuthValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /** Why the restore failed (status "restoreError"). */
  restoreError: string | null;
  /** A one-off message for the sign-in screen ("Your session has ended…"). */
  notice: string | null;
  clearNotice: () => void;
  login: (input: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Wipe this device's session without calling the server (offline sign-out). */
  signOutLocally: (notice?: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ signedOut: boolean; message: string }>;
  refreshUser: () => Promise<AuthUser | null>;
  retryRestore: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

// Minimum gap between automatic profile reloads (after a token refresh or a
// 403), so a misbehaving endpoint cannot make /auth/me loop. Same as the web.
const AUTO_REFRESH_MIN_GAP_MS = 10_000;

const isAuthFailure = (e: unknown) => {
  const f = e as Partial<ApiFailure>;
  return Boolean(f?.isSessionExpired) || f?.status === 401;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const { setBrandColor } = useTheme();
  const [status, setStatus] = useState<AuthStatus>("booting");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const lastAutoRefresh = useRef(0);
  const autoRefreshing = useRef(false);
  const stopPersistence = useRef<(() => void) | null>(null);

  /** Everything this device keeps for a session goes: tokens, cached data, drafts. */
  const wipeLocal = useCallback(async () => {
    stopPersistence.current?.();
    stopPersistence.current = null;
    await tokenStore.clear().catch(() => undefined);
    queryClient.clear();
    await clearUserScopedData();
    clearGeneratedPdfs();
    setUser(null);
    setBrandColor(null);
  }, [queryClient, setBrandColor]);

  const signOutLocally = useCallback(
    async (message?: string) => {
      await wipeLocal();
      setRestoreError(null);
      setNotice(message ?? null);
      setStatus("signedOut");
    },
    [wipeLocal],
  );

  /** Read the stored session and check it with /auth/me. Sets state only after awaiting. */
  const restore = useCallback(async () => {
    // iOS can keep keychain items after the app is deleted: a fresh install
    // must not resume someone's old session.
    const installed = await readJson<boolean>(PREF_KEYS.installed, false);
    if (!installed) {
      await tokenStore.clear().catch(() => undefined);
      await writeJson(PREF_KEYS.installed, true);
    }
    const tokens = await tokenStore.load().catch(() => null);
    if (!tokens) {
      setStatus("signedOut");
      return;
    }
    try {
      const me = await authService.me();
      setUser(me);
      setStatus("signedIn");
    } catch (error) {
      if (isAuthFailure(error)) {
        await wipeLocal();
        setStatus("signedOut");
      } else {
        setRestoreError((error as Error)?.message ?? null);
        setStatus("restoreError");
      }
    }
  }, [wipeLocal]);

  useEffect(() => {
    // Syncs from external systems (secure storage, /auth/me); every setState in
    // restore() runs after an await, never synchronously in this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    restore();
  }, [restore]);

  const retryRestore = useCallback(async () => {
    setStatus("booting");
    setRestoreError(null);
    await restore();
  }, [restore]);

  // Brand colour and the offline cache follow the signed-in user.
  const userId = user?.id ?? null;
  useEffect(() => {
    setBrandColor(user?.school.brandColor ?? null);
  }, [user?.school.brandColor, setBrandColor]);

  useEffect(() => {
    if (status !== "signedIn" || userId === null) return;
    let cancelled = false;
    startPersistence(queryClient, userId).then((stop) => {
      if (cancelled) stop();
      else stopPersistence.current = stop;
    });
    return () => {
      cancelled = true;
      stopPersistence.current?.();
      stopPersistence.current = null;
    };
  }, [status, userId, queryClient]);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authService.me();
      setUser(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  // What the HTTP layer reports (src/api/events.ts).
  useEffect(() => {
    const autoRefresh = async () => {
      if (status !== "signedIn" || autoRefreshing.current) return;
      if (Date.now() - lastAutoRefresh.current < AUTO_REFRESH_MIN_GAP_MS) return;
      autoRefreshing.current = true;
      lastAutoRefresh.current = Date.now();
      try {
        await refreshUser();
      } finally {
        autoRefreshing.current = false;
      }
    };
    return apiEvents.subscribe((event) => {
      switch (event.type) {
        case "session-expired":
          signOutLocally("Your session has ended. Please sign in again.");
          break;
        case "password-change-required":
          setUser((u) => (u ? { ...u, mustChangePassword: true } : u));
          break;
        case "forbidden":
          // Roles may have changed: reload the profile (but never because of /auth/me itself).
          if (!event.url.includes("/auth/me")) autoRefresh();
          break;
        case "token-refreshed":
          autoRefresh();
          break;
      }
    });
  }, [status, refreshUser, signOutLocally]);

  const login = useCallback(
    async (input: LoginInput) => {
      const { user: signedIn, accessToken, refreshToken } = await authService.login(input);
      // A previous user's data must never show for this one.
      queryClient.clear();
      await clearUserScopedData();
      await tokenStore.set({ accessToken, refreshToken });
      lastAutoRefresh.current = Date.now();
      setNotice(null);
      setRestoreError(null);
      setUser(signedIn);
      setStatus("signedIn");
      return signedIn;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Offline or already expired: the local sign-out below still happens.
    }
    await signOutLocally();
  }, [signOutLocally]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const { session, message } = await authService.changePassword(currentPassword, newPassword);
      if (session) {
        // Forced change: this phone stays signed in with the new session.
        await tokenStore.set(session);
        const me = await refreshUser();
        setUser((u) => me ?? (u ? { ...u, mustChangePassword: false } : u));
        return { signedOut: false, message };
      }
      // Voluntary change: the server ended every session.
      await signOutLocally("Password changed. Sign in with your new password.");
      return { signedOut: true, message };
    },
    [refreshUser, signOutLocally],
  );

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      restoreError,
      notice,
      clearNotice: () => setNotice(null),
      login,
      logout,
      signOutLocally,
      changePassword,
      refreshUser,
      retryRestore,
    }),
    [status, user, restoreError, notice, login, logout, signOutLocally, changePassword, refreshUser, retryRestore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

/** The signed-in user, for screens that only render when signed in. */
export const useUser = (): AuthUser => {
  const { user } = useAuth();
  if (!user) throw new Error("useUser needs a signed-in user");
  return user;
};
