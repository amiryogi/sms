/**
 * Offline cache: only read-only queries marked `meta.persist` that loaded
 * successfully are written, per user; a restart restores them; sign-out
 * (clearUserScopedData) deletes every user's cache from the phone.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { cacheKeyFor, startPersistence } from "@/lib/persistence";
import { clearUserScopedData } from "@/lib/storage";

/** Wait for the throttled write that contains `needle`. */
const waitForWrite = async (key: string, needle: string) => {
  for (let i = 0; i < 200; i += 1) {
    if ((await AsyncStorage.getItem(key))?.includes(needle)) return;
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error("nothing persisted");
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

it("persists marked queries per user, restores them, and sign-out removes them", async () => {
  const first = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  // As the hooks do: portal queries are marked for the device, a register is not.
  first.setQueryDefaults(["portal"], { meta: { persist: true } });
  const stop = await startPersistence(first, 42);
  first.setQueryData(["portal", 7, "overview"], { ok: true });
  first.setQueryData(["attendance", "section", 5, 1, "2026-11-13"], [{ secret: "not for disk" }]);

  await waitForWrite(cacheKeyFor(42), "overview");
  stop();
  const raw = (await AsyncStorage.getItem(cacheKeyFor(42)))!;
  expect(raw).toContain("overview");
  expect(raw).not.toContain("not for disk");

  // "Restart": a new client restores the saved copy.
  const second = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  second.setQueryDefaults(["portal"], { meta: { persist: true } });
  const stop2 = await startPersistence(second, 42);
  expect(second.getQueryData(["portal", 7, "overview"])).toEqual({ ok: true });
  expect(second.getQueryData(["attendance", "section", 5, 1, "2026-11-13"])).toBeUndefined();
  stop2();

  // Another user on the same phone gets nothing of this one's.
  const third = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  const stop3 = await startPersistence(third, 99);
  expect(third.getQueryData(["portal", 7, "overview"])).toBeUndefined();
  stop3();

  await clearUserScopedData();
  expect(await AsyncStorage.getItem(cacheKeyFor(42))).toBeNull();
});
