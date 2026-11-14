/**
 * Push-notification registration against the real backend (test database),
 * through the app's service: the phone is registered for whoever is signed in,
 * and signing out removes it.
 */
import type { ApiFailure } from "@/api/errors";
import { tokenStore } from "@/api/http";
import { authService } from "@/api/services/auth";
import { deviceService } from "@/api/services/devices";
import { ACCOUNTS, signInAs } from "./session";

const TOKEN = `ExponentPushToken[contract${Date.now().toString(36).padEnd(14, "0").slice(0, 14)}]`;

afterAll(async () => {
  // Leave no registration behind, whoever holds it last.
  await signInAs(ACCOUNTS.accountant);
  await deviceService.unregister(TOKEN).catch(() => undefined);
  await tokenStore.clear();
});

test("a signed-in user registers and unregisters this phone", async () => {
  await signInAs(ACCOUNTS.accountant);
  const device = await deviceService.register(TOKEN, "android");
  expect(device).toMatchObject({ id: expect.any(Number), platform: "android" });
  // Registering again is the same row.
  expect((await deviceService.register(TOKEN, "android")).id).toBe(device.id);
  await expect(deviceService.unregister(TOKEN)).resolves.toBeUndefined();
});

test("the server refuses anything that is not an Expo push token", async () => {
  await signInAs(ACCOUNTS.accountant);
  const err = (await deviceService.register("not-a-token", "android").then(
    () => null,
    (e: unknown) => e,
  )) as ApiFailure | null;
  expect(err?.status).toBe(400);
});

test("registration needs a session", async () => {
  await tokenStore.clear();
  const err = (await deviceService.register(TOKEN, "ios").then(
    () => null,
    (e: unknown) => e,
  )) as ApiFailure | null;
  expect(err?.status).toBe(401);
});

test("signing out ends pushes to the phone: the next user can take it over", async () => {
  await signInAs(ACCOUNTS.accountant);
  const first = await deviceService.register(TOKEN, "android");
  await authService.logout();
  await signInAs(ACCOUNTS.accountant);
  // The row was deleted at sign-out, so this is a new registration.
  const second = await deviceService.register(TOKEN, "android");
  expect(second.id).not.toBe(first.id);
});
