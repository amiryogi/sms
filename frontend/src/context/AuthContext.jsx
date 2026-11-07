import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { authService } from "../api/authService";
import { API_EVENTS, clearAuthStorage } from "../api/apiClient";
import { applyBrand } from "../lib/brand";

const AuthContext = createContext(null);

// Minimum gap between automatic profile reloads (after a token refresh or a
// 403), so a misbehaving endpoint cannot make /auth/me loop.
const AUTO_REFRESH_MIN_GAP_MS = 10000;

// Only these mean "your session is over". Anything else (network error, 500
// while the backend restarts, 429) keeps the stored tokens.
const isAuthFailure = (error) =>
  Boolean(error?.isSessionExpired) || error?.response?.status === 401;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  const initializingRef = useRef(true);
  const autoRefreshInFlightRef = useRef(false);
  const lastAutoRefreshRef = useRef(0);

  // The whole UI follows the school's brand colour (School Settings).
  const brandColor = user?.school?.brandColor || null;
  useEffect(() => {
    if (user) applyBrand(brandColor);
  }, [user, brandColor]);

  const initializeAuth = useCallback(async () => {
    initializingRef.current = true;
    setLoading(true);
    setInitError(null);
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const { data } = await authService.getProfile();
        setUser(data);
      } catch (error) {
        console.error("Auth initialization failed:", error);
        if (isAuthFailure(error)) {
          clearAuthStorage();
          setUser(null);
        } else {
          setInitError(
            error?.response?.data?.message ||
              "We couldn't reach the server to restore your session.",
          );
        }
      }
    }
    initializingRef.current = false;
    lastAutoRefreshRef.current = Date.now();
    setLoading(false);
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (credentials) => {
    const { data } = await authService.login(credentials);
    const { user, accessToken, refreshToken } = data;

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setInitError(null);
    setUser(user);
    return user;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      setUser(null);
      clearAuthStorage();
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authService.getProfile();
      setUser(data);
      return data;
    } catch (error) {
      console.error("Failed to refresh user:", error);
      return null;
    }
  }, []);

  // React to what the HTTP layer sees (see api/apiClient.js).
  useEffect(() => {
    // Throttled profile reload so a changed role/permission set is picked up.
    const autoRefresh = async () => {
      if (initializingRef.current || autoRefreshInFlightRef.current) return;
      if (!localStorage.getItem("accessToken")) return;
      if (Date.now() - lastAutoRefreshRef.current < AUTO_REFRESH_MIN_GAP_MS) {
        return;
      }
      autoRefreshInFlightRef.current = true;
      lastAutoRefreshRef.current = Date.now();
      try {
        await refreshUser();
      } finally {
        autoRefreshInFlightRef.current = false;
      }
    };

    const onForbidden = (event) => {
      // A 403 from /auth/me itself must not trigger another /auth/me.
      if ((event.detail?.url || "").includes("/auth/me")) return;
      autoRefresh();
    };
    const onTokenRefreshed = () => autoRefresh();
    const onSessionExpired = () => {
      clearAuthStorage();
      setUser(null);
    };

    window.addEventListener(API_EVENTS.FORBIDDEN, onForbidden);
    window.addEventListener(API_EVENTS.TOKEN_REFRESHED, onTokenRefreshed);
    window.addEventListener(API_EVENTS.SESSION_EXPIRED, onSessionExpired);
    return () => {
      window.removeEventListener(API_EVENTS.FORBIDDEN, onForbidden);
      window.removeEventListener(API_EVENTS.TOKEN_REFRESHED, onTokenRefreshed);
      window.removeEventListener(API_EVENTS.SESSION_EXPIRED, onSessionExpired);
    };
  }, [refreshUser]);

  const signOutLocally = () => {
    clearAuthStorage();
    setUser(null);
    setInitError(null);
  };

  const hasPermission = (permission) => {
    return user?.permissions?.includes(permission);
  };

  // A super admin is an admin everywhere (the backend treats it the same way),
  // so hasRole("ADMIN") is true for them; only hasRole("SUPER_ADMIN") tells
  // the two apart.
  const hasRole = (role) => {
    const roles = user?.roles || [];
    if (roles.includes(role)) return true;
    return role === "ADMIN" && roles.includes("SUPER_ADMIN");
  };

  if (initError && !user) {
    return (
      <div className="loading-screen auth-retry" role="alert">
        <h2>Can't restore your session</h2>
        <p className="text-muted">{initError}</p>
        <p className="text-muted">
          You are still signed in. Check your connection and try again.
        </p>
        <div className="auth-retry-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={initializeAuth}
            disabled={loading}
          >
            {loading ? "Retrying..." : "Retry"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={signOutLocally}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
