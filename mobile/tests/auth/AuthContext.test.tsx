/**
 * The session lifecycle in AuthProvider: restore, sign-in, sign-out, session
 * expiry, forced and voluntary password changes. Router-free: where the app
 * navigates for each state is covered by tests/navigation.
 */
import type { ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { ApiFailure } from "@/api/errors";
import { apiEvents } from "@/api/events";
import { authService } from "@/api/services/auth";
import { useAuth } from "@/contexts/AuthContext";
import { PREF_KEYS } from "@/lib/storage";
import { makeUser } from "../fixtures/user";
import { resetDevice, seedSignedInDevice, seedSignedOutDevice } from "../helpers";
import { Providers } from "../renderWithProviders";

jest.mock("@/api/services/auth", () => ({
  authService: { me: jest.fn(), login: jest.fn(), logout: jest.fn(), changePassword: jest.fn() },
}));

const auth = authService as jest.Mocked<typeof authService>;
const secure = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const wrapper = ({ children }: { children: ReactNode }) => <Providers>{children}</Providers>;

const mount = async () => {
  const hook = await renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.status).not.toBe("booting"));
  return hook;
};

beforeEach(async () => {
  await resetDevice();
  jest.clearAllMocks();
});

describe("restore", () => {
  it("is signed out with no stored session, without calling the server", async () => {
    await seedSignedOutDevice();
    const { result } = await mount();
    expect(result.current.status).toBe("signedOut");
    expect(auth.me).not.toHaveBeenCalled();
  });

  it("restores a stored session through /auth/me", async () => {
    await seedSignedInDevice();
    auth.me.mockResolvedValue(makeUser(["PARENT"]));
    const { result } = await mount();
    expect(result.current.status).toBe("signedIn");
    expect(result.current.user?.roles).toEqual(["PARENT"]);
  });

  it("drops a session the server refuses", async () => {
    await seedSignedInDevice();
    auth.me.mockRejectedValue(new ApiFailure({ message: "expired", status: 401, isSessionExpired: true }));
    const { result } = await mount();
    expect(result.current.status).toBe("signedOut");
    expect(secure.size).toBe(0);
  });

  it("keeps the session when the server can't be reached, and can retry", async () => {
    await seedSignedInDevice();
    auth.me.mockRejectedValueOnce(new ApiFailure({ message: "Can't reach the school server.", isNetwork: true }));
    const { result } = await mount();
    expect(result.current.status).toBe("restoreError");
    expect(result.current.restoreError).toBe("Can't reach the school server.");
    expect(secure.get("sms.refreshToken")).toBe("refresh-token");

    auth.me.mockResolvedValue(makeUser(["STUDENT"]));
    await act(() => result.current.retryRestore());
    expect(result.current.status).toBe("signedIn");
  });

  it("ignores a keychain session left from a previous install", async () => {
    // Tokens present but the install flag is not (fresh install on iOS).
    await SecureStore.setItemAsync("sms.accessToken", "old");
    await SecureStore.setItemAsync("sms.refreshToken", "old");
    const { result } = await mount();
    expect(result.current.status).toBe("signedOut");
    expect(auth.me).not.toHaveBeenCalled();
    expect(secure.size).toBe(0);
  });
});

describe("sign in", () => {
  it("stores the tokens in secure storage only and sets the user", async () => {
    await seedSignedOutDevice();
    auth.login.mockResolvedValue({ user: makeUser(["STUDENT"]), accessToken: "acc-token", refreshToken: "ref-token" });
    const { result } = await mount();

    await act(() => result.current.login({ identifier: "stu20240001", password: "x" }));

    expect(result.current.status).toBe("signedIn");
    expect(secure.get("sms.accessToken")).toBe("acc-token");
    expect(secure.get("sms.refreshToken")).toBe("ref-token");
    const everything = JSON.stringify(await AsyncStorage.multiGet(await AsyncStorage.getAllKeys()));
    expect(everything).not.toContain("acc-token");
    expect(everything).not.toContain("ref-token");
  });

  it("removes a previous user's drafts and cache before signing someone in", async () => {
    await seedSignedOutDevice();
    await AsyncStorage.setItem("sms.draft.7.attendance", "{}");
    await AsyncStorage.setItem("sms.cache.7", "{}");
    auth.login.mockResolvedValue({ user: makeUser(["TEACHER"]), accessToken: "a", refreshToken: "r" });
    const { result } = await mount();
    await act(() => result.current.login({ identifier: "teacher1", password: "x" }));
    expect(await AsyncStorage.getItem("sms.draft.7.attendance")).toBeNull();
    expect(await AsyncStorage.getItem("sms.cache.7")).toBeNull();
  });

  it("passes a failed sign-in to the caller and stays signed out", async () => {
    await seedSignedOutDevice();
    auth.login.mockRejectedValue(new ApiFailure({ message: "Invalid username or password", status: 401 }));
    const { result } = await mount();
    await expect(result.current.login({ identifier: "x", password: "y" })).rejects.toThrow("Invalid username or password");
    expect(result.current.status).toBe("signedOut");
    expect(secure.size).toBe(0);
  });
});

describe("sign out and session end", () => {
  it("wipes tokens, drafts and the cache on sign-out, keeping preferences", async () => {
    await seedSignedInDevice();
    await AsyncStorage.setItem("sms.draft.42.marks", "{}");
    await AsyncStorage.setItem("sms.seen.42", "{}");
    auth.me.mockResolvedValue(makeUser(["TEACHER"]));
    auth.logout.mockResolvedValue(undefined);
    const { result } = await mount();

    await act(() => result.current.logout());

    expect(auth.logout).toHaveBeenCalled();
    expect(result.current.status).toBe("signedOut");
    expect(secure.size).toBe(0);
    expect(await AsyncStorage.getItem("sms.draft.42.marks")).toBeNull();
    expect(await AsyncStorage.getItem("sms.seen.42")).toBeNull();
    expect(await AsyncStorage.getItem(PREF_KEYS.onboardingDone)).toBe("true");
  });

  it("signs out on this phone even when the server can't be reached", async () => {
    await seedSignedInDevice();
    auth.me.mockResolvedValue(makeUser(["STUDENT"]));
    auth.logout.mockRejectedValue(new ApiFailure({ message: "offline", isNetwork: true }));
    const { result } = await mount();
    await act(() => result.current.logout());
    expect(result.current.status).toBe("signedOut");
    expect(secure.size).toBe(0);
  });

  it("ends the session when the API reports the refresh token is refused", async () => {
    await seedSignedInDevice();
    auth.me.mockResolvedValue(makeUser(["ACCOUNTANT"]));
    const { result } = await mount();
    await act(async () => {
      apiEvents.emit({ type: "session-expired" });
    });
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    expect(result.current.notice).toBe("Your session has ended. Please sign in again.");
  });

  it("flags a required password change when the API refuses for that reason", async () => {
    await seedSignedInDevice();
    auth.me.mockResolvedValue(makeUser(["ACCOUNTANT"]));
    const { result } = await mount();
    await act(async () => {
      apiEvents.emit({ type: "password-change-required" });
    });
    expect(result.current.user?.mustChangePassword).toBe(true);
  });

  it("reloads the profile after a 403 (roles may have changed), at most every 10 s", async () => {
    await seedSignedInDevice();
    auth.me.mockResolvedValue(makeUser(["TEACHER"]));
    const { result } = await mount();
    auth.me.mockClear();
    auth.me.mockResolvedValue(makeUser(["TEACHER", "EXAM_OFFICER"]));
    const now = Date.now();
    const spy = jest.spyOn(Date, "now").mockReturnValue(now + 11_000);

    await act(async () => {
      apiEvents.emit({ type: "forbidden", url: "/exam-results/exams", message: "no" });
      apiEvents.emit({ type: "forbidden", url: "/exam-results/exams", message: "no" });
    });
    await waitFor(() => expect(result.current.user?.roles).toContain("EXAM_OFFICER"));
    expect(auth.me).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe("password change", () => {
  it("forced: keeps this phone signed in with the new session", async () => {
    await seedSignedInDevice();
    auth.me.mockResolvedValueOnce(makeUser(["STUDENT"], { mustChangePassword: true })).mockResolvedValue(makeUser(["STUDENT"]));
    auth.changePassword.mockResolvedValue({ session: { accessToken: "new-a", refreshToken: "new-r" }, message: "Password changed. Welcome!" });
    const { result } = await mount();
    expect(result.current.user?.mustChangePassword).toBe(true);

    let outcome: { signedOut: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.changePassword("Temp1234", "Mine12345");
    });

    expect(outcome?.signedOut).toBe(false);
    expect(result.current.status).toBe("signedIn");
    expect(result.current.user?.mustChangePassword).toBe(false);
    expect(secure.get("sms.accessToken")).toBe("new-a");
  });

  it("voluntary: signs out, because the server ended every session", async () => {
    await seedSignedInDevice();
    auth.me.mockResolvedValue(makeUser(["PARENT"]));
    auth.changePassword.mockResolvedValue({ session: null, message: "Password changed successfully. Please login again." });
    const { result } = await mount();
    await act(async () => {
      await result.current.changePassword("Old12345", "New12345");
    });
    expect(result.current.status).toBe("signedOut");
    expect(result.current.notice).toBe("Password changed. Sign in with your new password.");
    expect(secure.size).toBe(0);
  });
});
