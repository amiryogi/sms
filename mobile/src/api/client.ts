import axios, { isAxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { ApiFailure, toApiFailure } from "./errors";
import { apiEvents, type ApiEvent } from "./events";
import type { TokenStore } from "./tokenStore";
import type { ApiEnvelope, Page, PaginatedEnvelope } from "./types";

/**
 * The one HTTP client of the app (modelled on frontend/src/api/apiClient.js).
 *
 * - Attaches the access token from memory.
 * - On a 401, refreshes ONCE for all concurrent requests (single flight). The
 *   backend rotates refresh tokens, and a rotated token presented again more
 *   than 10 s later revokes every session the user has, so two parallel
 *   refreshes would sign the user out everywhere.
 * - Only a 400/401/403 answer to the refresh ends the session. A network error,
 *   429 or 5xx keeps the tokens: a bad connection must not sign anyone out.
 * - Retries the original request once with the new token.
 * - 403 PASSWORD_CHANGE_REQUIRED and other 403s are announced on apiEvents.
 * - Every failure reaches callers as an ApiFailure.
 */

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const NO_REFRESH_PATHS = ["/auth/login", "/auth/refresh-token"];
const isNoRefresh = (config?: InternalAxiosRequestConfig) => NO_REFRESH_PATHS.some((p) => (config?.url ?? "").includes(p));

export const DEFAULT_TIMEOUT_MS = 20_000;
export const UPLOAD_TIMEOUT_MS = 120_000;

export type ApiClientOptions = {
  baseURL: string;
  tokenStore: TokenStore;
  emit?: (event: ApiEvent) => void;
  timeoutMs?: number;
};

export type ApiClient = {
  http: AxiosInstance;
  /** Exposed for tests: the refresh in flight, if any. */
  refreshInFlight: () => boolean;
};

export const createApiClient = ({ baseURL, tokenStore, emit = apiEvents.emit, timeoutMs = DEFAULT_TIMEOUT_MS }: ApiClientOptions): ApiClient => {
  // eslint-disable-next-line import/no-named-as-default-member -- axios.create is the documented API
  const http = axios.create({
    baseURL,
    timeout: timeoutMs,
    headers: { Accept: "application/json" },
  });

  http.interceptors.request.use((config) => {
    const token = tokenStore.getAccessToken();
    if (token && !isNoRefresh(config)) config.headers.set("Authorization", `Bearer ${token}`);
    return config;
  });

  let refreshPromise: Promise<string> | null = null;

  const refresh = (): Promise<string> => {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refreshToken = tokenStore.getRefreshToken();
        if (!refreshToken) {
          throw new ApiFailure({ message: "Your session has ended. Please sign in again.", status: 401, isSessionExpired: true });
        }
        try {
          // A bare request: it must not pass through these interceptors.
          const res = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken?: string }>>(
            `${baseURL}/auth/refresh-token`,
            { refreshToken },
            { timeout: timeoutMs, headers: { Accept: "application/json" } },
          );
          const { accessToken, refreshToken: rotated } = res.data.data;
          await tokenStore.set({ accessToken, refreshToken: rotated ?? refreshToken });
          emit({ type: "token-refreshed" });
          return accessToken;
        } catch (error) {
          const failure = toApiFailure(error);
          if ([400, 401, 403].includes(failure.status)) {
            throw new ApiFailure({
              message: "Your session has ended. Please sign in again.",
              status: failure.status,
              code: failure.code,
              isSessionExpired: true,
            });
          }
          throw failure;
        }
      })().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  };

  http.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!isAxiosError(error)) throw toApiFailure(error);
      const original = error.config as RetriableConfig | undefined;
      const status = error.response?.status;

      if (status === 401 && original && !original._retry && !isNoRefresh(original)) {
        original._retry = true;

        // A refresh may have finished while this request was in flight: if the
        // token changed since it was sent, just retry with the current one.
        const sentWith = original.headers?.get?.("Authorization");
        const current = tokenStore.getAccessToken();
        if (current && sentWith && sentWith !== `Bearer ${current}` && !refreshPromise) {
          original.headers.set("Authorization", `Bearer ${current}`);
          return http(original);
        }

        try {
          const token = await refresh();
          original.headers.set("Authorization", `Bearer ${token}`);
          return await http(original);
        } catch (refreshError) {
          const failure = toApiFailure(refreshError);
          if (failure.isSessionExpired) {
            await tokenStore.clear();
            emit({ type: "session-expired" });
          }
          throw failure;
        }
      }

      const failure = toApiFailure(error);
      if (failure.isPasswordChangeRequired) {
        emit({ type: "password-change-required" });
      } else if (status === 403) {
        emit({ type: "forbidden", url: original?.url ?? "", message: failure.message });
      }
      throw failure;
    },
  );

  return { http, refreshInFlight: () => refreshPromise !== null };
};

/** `data` of a `{ success, message, data }` answer. */
export const unwrap = <T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> => promise.then((res) => res.data.data);

/** Rows and pagination of a paginated answer. */
export const unwrapPage = <T>(promise: Promise<{ data: PaginatedEnvelope<T> }>): Promise<Page<T>> =>
  promise.then((res) => ({ rows: res.data.data, pagination: res.data.pagination }));

/** The whole envelope, when the message matters (e.g. "Already recorded as RCP-…"). */
export const unwrapWithMessage = <T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<{ data: T; message: string }> =>
  promise.then((res) => ({ data: res.data.data, message: res.data.message }));
