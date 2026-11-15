/**
 * Sign-in and change-password screens: validation, server messages, what is sent.
 *
 * Every test loads a fresh module registry (jest.resetModules + require): typing
 * into these forms left React state behind that blanked the next test's render
 * in Jest (each test passed alone). Fresh modules per test keep them independent.
 */
import type * as RTL from "@testing-library/react-native";
import type { ApiFailure as ApiFailureType } from "@/api/errors";
import type { authService as AuthService } from "@/api/services/auth";
import type { schoolService as SchoolService } from "@/api/services/school";

jest.mock("@/api/services/auth", () => ({
  authService: { me: jest.fn(), login: jest.fn(), logout: jest.fn(), changePassword: jest.fn() },
}));
jest.mock("@/api/services/school", () => ({ schoolService: { publicByCode: jest.fn() } }));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  Stack: { Screen: () => null },
}));

// The pure entry registers no Jest hooks (they can't be added inside beforeEach).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cleanup: typeof RTL.cleanup;
let fireEvent: typeof RTL.fireEvent;
let rtl: typeof RTL;
let waitFor: typeof RTL.waitFor;
let AsyncStorage: typeof import("@react-native-async-storage/async-storage").default;
let ApiFailure: typeof ApiFailureType;
let auth: jest.Mocked<typeof AuthService>;
let school: jest.Mocked<typeof SchoolService>;
let LoginScreen: typeof import("@/features/auth/LoginScreen").LoginScreen;
let ChangePasswordScreen: typeof import("@/features/auth/ChangePasswordScreen").ChangePasswordScreen;
let PREF_KEYS: typeof import("@/lib/storage").PREF_KEYS;
let makeUser: typeof import("../fixtures/user").makeUser;
let seedSignedInDevice: () => Promise<void>;
let seedSignedOutDevice: () => Promise<void>;
let renderWithProviders: typeof import("../renderWithProviders").renderWithProviders;

beforeEach(async () => {
  jest.resetModules();
  rtl = require("@testing-library/react-native/pure");
  ({ cleanup, fireEvent, waitFor } = rtl);
  const storage = require("@react-native-async-storage/async-storage");
  AsyncStorage = storage.default ?? storage;
  ({ ApiFailure } = require("@/api/errors"));
  auth = require("@/api/services/auth").authService;
  school = require("@/api/services/school").schoolService;
  ({ LoginScreen } = require("@/features/auth/LoginScreen"));
  ({ ChangePasswordScreen } = require("@/features/auth/ChangePasswordScreen"));
  ({ PREF_KEYS } = require("@/lib/storage"));
  ({ makeUser } = require("../fixtures/user"));
  ({ renderWithProviders } = require("../renderWithProviders"));
  const helpers = require("../helpers");
  ({ seedSignedInDevice, seedSignedOutDevice } = helpers);
  await helpers.resetDevice();
});

afterEach(async () => {
  await cleanup();
});

describe("LoginScreen", () => {
  const fill = (identifier: string, password: string) => {
    fireEvent.changeText(rtl.screen.getByLabelText("Username or email"), identifier);
    fireEvent.changeText(rtl.screen.getByLabelText("Password"), password);
    fireEvent.press(rtl.screen.getByRole("button", { name: "Sign in" }));
  };

  it("asks for both fields before calling the server", async () => {
    await seedSignedOutDevice();
    await renderWithProviders(<LoginScreen />);
    fireEvent.press(await rtl.screen.findByRole("button", { name: "Sign in" }));
    expect(await rtl.screen.findByText("Enter your username or email")).toBeTruthy();
    expect(rtl.screen.getByText("Enter your password")).toBeTruthy();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it("sends the trimmed username and remembers the school code", async () => {
    await seedSignedOutDevice();
    auth.login.mockResolvedValue({ user: makeUser(["STUDENT"]), accessToken: "a", refreshToken: "r" });
    await renderWithProviders(<LoginScreen />);
    await rtl.screen.findByLabelText("Username or email");
    fill("  stu20240001 ", "password123");
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith({ identifier: "stu20240001", password: "password123", schoolCode: undefined }));
    await waitFor(async () => expect(await AsyncStorage.getItem(PREF_KEYS.schoolCode)).toBe(JSON.stringify("DEMO001")));
  });

  it("shows the server's message for wrong credentials", async () => {
    await seedSignedOutDevice();
    auth.login.mockRejectedValue(new ApiFailure({ message: "Invalid username or password", status: 401 }));
    await renderWithProviders(<LoginScreen />);
    await rtl.screen.findByLabelText("Username or email");
    fill("nobody", "wrong");
    expect(await rtl.screen.findByText("Invalid username or password")).toBeTruthy();
  });

  it("explains that a forgotten password is reset by the school (no email reset exists)", async () => {
    await seedSignedOutDevice();
    await renderWithProviders(<LoginScreen />);
    expect(await rtl.screen.findByText(/Ask your school office to reset it/)).toBeTruthy();
  });

  it("shows the school's name from the remembered code, and sends that code", async () => {
    await seedSignedOutDevice();
    await AsyncStorage.setItem(PREF_KEYS.schoolCode, JSON.stringify("DEMO001"));
    school.publicByCode.mockResolvedValue({
      name: "Shree Vidya Mandir",
      code: "DEMO001",
      brandColor: "#0f766e",
      logoUrl: null,
      tagline: "Learning for life",
      address: null,
      phone: null,
      email: null,
      website: null,
    });
    auth.login.mockResolvedValue({ user: makeUser(["PARENT"]), accessToken: "a", refreshToken: "r" });
    await renderWithProviders(<LoginScreen />);
    expect(await rtl.screen.findByRole("header", { name: "Shree Vidya Mandir" })).toBeTruthy();
    expect(rtl.screen.getByText("Learning for life")).toBeTruthy();
    fill("p.stu20240001", "password123");
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith(expect.objectContaining({ schoolCode: "DEMO001" })));
  });
});

describe("ChangePasswordScreen", () => {
  const fill = (current: string, next: string, confirm: string, currentLabel = "Temporary password") => {
    fireEvent.changeText(rtl.screen.getByLabelText(currentLabel), current);
    fireEvent.changeText(rtl.screen.getByLabelText("New password"), next);
    fireEvent.changeText(rtl.screen.getByLabelText("Confirm new password"), confirm);
    fireEvent.press(rtl.screen.getByRole("button", { name: "Change password" }));
  };

  const openForced = async () => {
    await seedSignedInDevice();
    auth.me.mockResolvedValue(makeUser(["STUDENT"], { mustChangePassword: true }));
    await renderWithProviders(<ChangePasswordScreen />);
    await rtl.screen.findByText("Choose your own password");
  };

  it.each([
    ["a weak password (the backend's rule)", "Temp1234", "alllowercase1", "alllowercase1", "At least 8 characters, with an uppercase letter, a lowercase letter and a number."],
    ["a confirmation that differs", "Temp1234", "Mine12345", "Mine1234X", "The passwords don't match"],
    ["the same password again", "Mine12345", "Mine12345", "Mine12345", "Choose a password different from the current one"],
  ])("refuses %s before sending", async (_, current, next, confirm, message) => {
    await openForced();
    fill(current, next, confirm);
    await waitFor(() => expect(rtl.screen.getAllByText(message).length).toBeGreaterThan(0));
    expect(auth.changePassword).not.toHaveBeenCalled();
  });

  it("sends a valid change and shows the server's refusal", async () => {
    await seedSignedInDevice();
    auth.me.mockResolvedValue(makeUser(["STUDENT"], { mustChangePassword: true }));
    auth.changePassword.mockRejectedValue(new ApiFailure({ message: "Current password is incorrect", status: 400 }));
    await renderWithProviders(<ChangePasswordScreen />);
    await rtl.screen.findByText("Choose your own password");
    fill("Temp1234", "Mine12345", "Mine12345");
    expect(await rtl.screen.findByText("Current password is incorrect")).toBeTruthy();
    expect(auth.changePassword).toHaveBeenCalledWith("Temp1234", "Mine12345");
  });

  it("offers sign-out (and no way back) when the change is forced", async () => {
    await seedSignedInDevice();
    auth.me.mockResolvedValue(makeUser(["STUDENT"], { mustChangePassword: true }));
    await renderWithProviders(<ChangePasswordScreen />);
    expect(await rtl.screen.findByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("explains the sign-out everywhere for a voluntary change", async () => {
    await seedSignedInDevice();
    auth.me.mockResolvedValue(makeUser(["TEACHER"]));
    await renderWithProviders(<ChangePasswordScreen />);
    expect(await rtl.screen.findByText(/signed out everywhere/)).toBeTruthy();
    expect(rtl.screen.getByLabelText("Current password")).toBeTruthy();
    expect(rtl.screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });
});
