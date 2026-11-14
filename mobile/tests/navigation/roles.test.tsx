/**
 * Role navigation over the real route tree (src/app): where each role lands,
 * what it may not open, the forced password change, and session restore.
 * The API is mocked at the service boundary; guards are UX (the backend still
 * checks every call), so these tests check that the UX follows the roles.
 */
import path from "path";
import { renderRouter, screen, waitFor } from "expo-router/testing-library";
import { ApiFailure } from "@/api/errors";
import { authService } from "@/api/services/auth";
import { queryClient } from "@/lib/queryClient";
import { makeUser } from "../fixtures/user";
import { resetDevice, seedSignedInDevice, seedSignedOutDevice } from "../helpers";

jest.mock("@/api/services/auth", () => ({
  authService: { me: jest.fn(), login: jest.fn(), logout: jest.fn(), changePassword: jest.fn() },
}));

const me = authService.me as jest.Mock;

// Mounting the whole route tree takes a few seconds the first time.
jest.setTimeout(30_000);

beforeEach(async () => {
  await resetDevice();
  queryClient.clear();
  me.mockReset();
});

// Absolute, from this file: on Windows a cwd-relative path can differ in drive-letter
// case from Jest's module registry and load React twice.
const APP = path.resolve(__dirname, "../../src/app");

describe("home area per role", () => {
  it.each([
    [["STUDENT"], "/student"],
    [["PARENT"], "/parent"],
    [["TEACHER"], "/teacher"],
    [["EXAM_OFFICER"], "/exam"],
    [["ACCOUNTANT"], "/finance"],
    [["ADMIN"], "/admin"],
    [["SUPER_ADMIN"], "/admin"],
  ])("%j opens on %s", async (roles, path) => {
    await seedSignedInDevice();
    me.mockResolvedValue(makeUser(roles));
    await renderRouter(APP, { initialUrl: "/" });
    await waitFor(() => expect(screen).toHavePathname(path));
  });
});

describe("areas a role may not open", () => {
  it.each([
    [["STUDENT"], "/parent", "/student"],
    [["STUDENT"], "/admin", "/student"],
    [["PARENT"], "/student", "/parent"],
    [["PARENT"], "/finance", "/parent"],
    [["TEACHER"], "/admin", "/teacher"],
    [["TEACHER"], "/exam", "/teacher"],
    [["ACCOUNTANT"], "/admin", "/finance"],
    [["EXAM_OFFICER"], "/finance", "/exam"],
    [["ADMIN"], "/finance", "/admin"],
  ])("%j asking for %s ends up on %s", async (roles, wanted, home) => {
    await seedSignedInDevice();
    me.mockResolvedValue(makeUser(roles));
    await renderRouter(APP, { initialUrl: wanted });
    await waitFor(() => expect(screen).toHavePathname(home));
  });

  it("lets a user with two roles open both areas", async () => {
    await seedSignedInDevice();
    me.mockResolvedValue(makeUser(["TEACHER", "PARENT"]));
    await renderRouter(APP, { initialUrl: "/parent" });
    await waitFor(() => expect(screen).toHavePathname("/parent"));
  });
});

describe("session", () => {
  it("shows sign-in when there is no stored session", async () => {
    await seedSignedOutDevice();
    await renderRouter(APP, { initialUrl: "/" });
    await waitFor(() => expect(screen).toHavePathname("/login"));
    expect(me).not.toHaveBeenCalled();
  });

  it("shows onboarding on the very first launch", async () => {
    await renderRouter(APP, { initialUrl: "/" });
    await waitFor(() => expect(screen).toHavePathname("/onboarding"));
  });

  it("refuses a protected area without a session", async () => {
    await seedSignedOutDevice();
    await renderRouter(APP, { initialUrl: "/admin" });
    await waitFor(() => expect(screen).toHavePathname("/login"));
  });

  it("sends a user with an admin-set password to the change-password screen, and nowhere else", async () => {
    await seedSignedInDevice();
    me.mockResolvedValue(makeUser(["STUDENT"], { mustChangePassword: true }));
    await renderRouter(APP, { initialUrl: "/student" });
    await waitFor(() => expect(screen).toHavePathname("/change-password"));
    expect(await screen.findByText("Choose your own password")).toBeTruthy();
  });

  it("signs out when the stored session is refused", async () => {
    await seedSignedInDevice();
    me.mockRejectedValue(new ApiFailure({ message: "Your session has ended.", status: 401, isSessionExpired: true }));
    await renderRouter(APP, { initialUrl: "/" });
    await waitFor(() => expect(screen).toHavePathname("/login"));
  });

  it("keeps the session and offers a retry when the server can't be reached", async () => {
    await seedSignedInDevice();
    me.mockRejectedValue(new ApiFailure({ message: "Can't reach the school server.", isNetwork: true }));
    await renderRouter(APP, { initialUrl: "/" });
    expect(await screen.findByText("We couldn't reach the server to restore your session.")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
    expect(screen.getByText("Sign out")).toBeTruthy();
  });

  it("shows sign-in to a user with no known role", async () => {
    await seedSignedInDevice();
    me.mockResolvedValue(makeUser(["JANITOR"]));
    await renderRouter(APP, { initialUrl: "/" });
    expect(await screen.findByText("This account can't use the app")).toBeTruthy();
  });
});
