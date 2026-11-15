import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform, type AppStateStatus } from "react-native";
import type { ApiFailure } from "@/api/errors";

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiFailure;
    queryMeta: {
      /** Keep this read-only query on the device (src/lib/persistence.ts). */
      persist?: boolean;
    };
  }
}

/** Retry only what might succeed next time: no retry for 4xx answers or a cancelled request. */
export const shouldRetry = (failureCount: number, error: ApiFailure | Error) => {
  const e = error as Partial<ApiFailure>;
  if (e.isCancelled || e.isSessionExpired) return false;
  if (typeof e.status === "number" && e.status >= 400 && e.status < 500) return false;
  return failureCount < 2;
};

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 24 * 60 * 60 * 1000, // long enough to persist and restore
        retry: shouldRetry,
        refetchOnReconnect: true,
      },
      mutations: {
        // Writes are never retried automatically: attendance, marks and
        // payments must be resent only by the person, on purpose.
        retry: false,
      },
    },
  });

export const queryClient = createQueryClient();

/** Refetch stale queries when the app comes back to the foreground. */
export const connectAppStateToQuery = () => {
  const onChange = (status: AppStateStatus) => {
    if (Platform.OS !== "web") focusManager.setFocused(status === "active");
  };
  const sub = AppState.addEventListener("change", onChange);
  return () => sub.remove();
};
