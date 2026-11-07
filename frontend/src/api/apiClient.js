import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// The only localStorage keys the app owns for auth. Remove these on logout or
// session expiry instead of localStorage.clear(), which wipes unrelated keys.
export const AUTH_STORAGE_KEYS = ['accessToken', 'refreshToken'];

export const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // storage unavailable (private mode etc.) - nothing to clear
    }
  });
};

// App-wide events dispatched on `window` so React code can react to what the
// HTTP layer sees without importing React here.
export const API_EVENTS = {
  FORBIDDEN: 'api:forbidden', // a request was answered 403
  TOKEN_REFRESHED: 'api:token-refreshed', // access token was rotated
  SESSION_EXPIRED: 'api:session-expired', // refresh failed for auth reasons
};

const emit = (name, detail) => {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    // CustomEvent unsupported - events are best-effort UX only
  }
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Requests that must never trigger a refresh attempt on 401.
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh-token'];
const isNoRefreshRequest = (config) =>
  NO_REFRESH_PATHS.some((path) => (config?.url || '').includes(path));

// Single-flight refresh. The backend rotates refresh tokens (the old one is
// revoked on use), so concurrent 401s must share ONE refresh call; otherwise
// every call after the first presents a revoked token and fails.
let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        const err = new Error('No refresh token available');
        err.isSessionExpired = true;
        throw err;
      }

      try {
        // Bare axios on purpose: this call must not pass through these interceptors.
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
        emit(API_EVENTS.TOKEN_REFRESHED);
        return accessToken;
      } catch (err) {
        // Only an auth answer means the session is really over. A network
        // error, 429 or 5xx (backend restarting) keeps the tokens.
        const status = err.response?.status;
        if (status === 400 || status === 401 || status === 403) {
          err.isSessionExpired = true;
        }
        throw err;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

// Response Interceptor: token refresh on 401, app-wide notice on 403
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry && !isNoRefreshRequest(originalRequest)) {
      originalRequest._retry = true;

      // A refresh may already have finished while this request was in flight:
      // if the stored token differs from the one it was sent with, just retry.
      const sentWith = originalRequest.headers?.Authorization;
      const current = localStorage.getItem('accessToken');
      if (current && sentWith && sentWith !== `Bearer ${current}` && !refreshPromise) {
        originalRequest.headers.Authorization = `Bearer ${current}`;
        return apiClient(originalRequest);
      }

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        if (refreshError.isSessionExpired) {
          clearAuthStorage();
          emit(API_EVENTS.SESSION_EXPIRED);
        }
        return Promise.reject(refreshError);
      }
    }

    if (status === 403) {
      emit(API_EVENTS.FORBIDDEN, {
        url: originalRequest?.url,
        method: originalRequest?.method,
        message: error.response?.data?.message,
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
