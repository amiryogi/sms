import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { QueryClient } from "@tanstack/react-query";
import { persistQueryClientRestore, persistQueryClientSubscribe } from "@tanstack/react-query-persist-client";

/**
 * Read-only data kept on the device for offline use (MOBILE_ARCHITECTURE.md §8).
 *
 * - Only queries marked `meta: { persist: true }` that loaded successfully are written.
 * - The cache is per user (the key holds the user id) and is deleted at sign-out.
 * - Nothing that writes (attendance, marks, payments) is ever queued here.
 */
const PREFIX = "sms.cache.";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
// Bump when cached shapes change in a way old data would break.
const BUSTER = "1";

export const cacheKeyFor = (userId: number) => `${PREFIX}${userId}`;

/** Restore this user's cache, then keep it up to date. Returns the unsubscribe function. */
export const startPersistence = async (queryClient: QueryClient, userId: number): Promise<() => void> => {
  const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: cacheKeyFor(userId), throttleTime: 2000 });
  const options = {
    queryClient,
    persister,
    maxAge: MAX_AGE,
    buster: BUSTER,
    dehydrateOptions: {
      shouldDehydrateQuery: (q: { meta?: { persist?: boolean }; state: { status: string } }) =>
        q.meta?.persist === true && q.state.status === "success",
      shouldDehydrateMutation: () => false,
    },
  };
  try {
    await persistQueryClientRestore(options);
  } catch {
    // A corrupt cache is dropped, never shown.
    await AsyncStorage.removeItem(cacheKeyFor(userId)).catch(() => undefined);
  }
  return persistQueryClientSubscribe(options);
};

/** Delete every persisted cache on this device (sign-out, session expiry). */
export const clearPersistedCaches = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((k) => k.startsWith(PREFIX));
  if (ours.length) await AsyncStorage.multiRemove(ours);
};
