/**
 * Push notifications in the app: which screen a notification opens, and
 * registering this phone with the server. The native module is mocked.
 */
import { hrefForPush, parsePushData } from "@/features/push/pushLinks";
import { makeUser } from "../fixtures/user";
import { fresh, type Fresh } from "../isolated";

jest.setTimeout(20000);

const TOKEN = "ExponentPushToken[abcdefghijklmnopqrstuv]";

type Response = { actionIdentifier: string; notification: { request: { identifier: string; content: { data: unknown } } } };
const notif = {
  permission: { granted: true, canAskAgain: true } as { granted: boolean; canAskAgain: boolean },
  afterAsk: { granted: true, canAskAgain: true } as { granted: boolean; canAskAgain: boolean },
  last: null as Response | null,
  onTap: null as ((r: Response) => void) | null,
};

jest.mock("expo-notifications", () => ({
  DEFAULT_ACTION_IDENTIFIER: "default",
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => notif.permission),
  requestPermissionsAsync: jest.fn(async () => notif.afterAsk),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: "ExponentPushToken[abcdefghijklmnopqrstuv]" })),
  getLastNotificationResponseAsync: jest.fn(async () => notif.last),
  clearLastNotificationResponseAsync: jest.fn(async () => undefined),
  addNotificationResponseReceivedListener: jest.fn((fn: (r: Response) => void) => {
    notif.onTap = fn;
    return { remove: jest.fn() };
  }),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock("expo-device", () => ({ isDevice: true }));
jest.mock("@/api/services/auth", () => ({ authService: { me: jest.fn(), login: jest.fn(), logout: jest.fn(), changePassword: jest.fn() } }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  ExecutionEnvironment: { StoreClient: "storeClient", Standalone: "standalone", Bare: "bare" },
  default: { executionEnvironment: "standalone", expoConfig: { version: "1.0.0", extra: { eas: { projectId: "project-1" } } }, easConfig: null },
}));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Stack: { Screen: () => null } }));

describe("which screen a notification opens", () => {
  it("reads the data defensively", () => {
    expect(parsePushData({ type: "notice", id: 7 })).toEqual({ type: "notice", id: 7 });
    expect(parsePushData({ type: "notice", id: "7" })).toEqual({ type: "notice", id: 7 }); // some platforms deliver strings
    expect(parsePushData({ type: "result", examId: 3, studentId: 10 })).toEqual({ type: "result", examId: 3, studentId: 10 });
    expect(parsePushData({ type: "attendance", studentId: 10 })).toEqual({ type: "attendance", studentId: 10 });
    for (const bad of [null, "x", {}, { type: "notice" }, { type: "notice", id: -1 }, { type: "notice", id: "1/../../admin" }, { type: "fees", id: 1 }]) {
      expect(parsePushData(bad)).toBeNull();
    }
  });

  it("maps each kind to a route the role can open", () => {
    expect(hrefForPush({ type: "notice", id: 7 }, ["teacher"])).toBe("/shared/notice/7");
    expect(hrefForPush({ type: "assignment", id: 4, studentId: 10 }, ["parent"])).toBe("/shared/assignment/4?studentId=10");
    expect(hrefForPush({ type: "graded", id: 4, studentId: 10 }, ["student"])).toBe("/shared/assignment/4?studentId=10");
    expect(hrefForPush({ type: "result", examId: 3, studentId: 10 }, ["parent"])).toBe("/shared/report-card/10/3");
    expect(hrefForPush({ type: "attendance", studentId: 10 }, ["parent"])).toBe("/parent/attendance");
    expect(hrefForPush({ type: "attendance" }, ["student"])).toBe("/student/attendance");
  });

  it("opens nothing for a role the notification is not for", () => {
    expect(hrefForPush({ type: "assignment", id: 4 }, ["finance"])).toBeNull();
    expect(hrefForPush({ type: "result", examId: 3, studentId: 10 }, ["teacher"])).toBeNull();
    expect(hrefForPush({ type: "result", examId: 3 }, ["student"])).toBeNull();
    expect(hrefForPush({ type: "attendance" }, ["admin"])).toBeNull();
  });
});

describe("registering this phone", () => {
  let m: Fresh;
  let register: jest.Mock;

  beforeEach(async () => {
    notif.permission = { granted: true, canAskAgain: true };
    notif.afterAsk = { granted: true, canAskAgain: true };
    notif.last = null;
    notif.onTap = null;
    m = await fresh();
    register = jest.fn(async () => ({ id: 1, platform: "ios", lastSeenAt: "" }));
    m.req<typeof import("@/api/services/devices")>("@/api/services/devices").deviceService.register = register;
    await m.helpers.seedSignedInDevice();
    m.req<{ authService: { me: jest.Mock } }>("@/api/services/auth").authService.me.mockResolvedValue(makeUser(["TEACHER"]));
  });

  const gate = () => m.req<typeof import("@/features/push/PushGate")>("@/features/push/PushGate").PushGate;
  const push = () => m.req<typeof import("@/features/push/pushNotifications")>("@/features/push/pushNotifications");
  const router = () => m.req<{ router: { push: jest.Mock } }>("expo-router").router;

  it("sends the Expo token to the server once permission is given", async () => {
    const PushGate = gate();
    await m.render(<PushGate />, { signedIn: true });
    await m.rtl.waitFor(() => expect(register).toHaveBeenCalledWith(TOKEN, expect.stringMatching(/^(ios|android)$/)));
    expect(push().getPushToken()).toBe(TOKEN);
  });

  it("asks once, and registers nothing when the person says no", async () => {
    notif.permission = { granted: false, canAskAgain: true };
    notif.afterAsk = { granted: false, canAskAgain: false };
    const PushGate = gate();
    await m.render(<PushGate />, { signedIn: true });
    const N = m.req<{ requestPermissionsAsync: jest.Mock }>("expo-notifications");
    await m.rtl.waitFor(() => expect(N.requestPermissionsAsync).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(register).not.toHaveBeenCalled();
    expect(push().getPushToken()).toBeNull();
  });

  it("keeps working when the server cannot be reached", async () => {
    register.mockRejectedValueOnce(new Error("Network Error"));
    await expect(push().registerForPush({ ask: true })).resolves.toBe("error");
  });

  it("opens the screen of a tapped notification, including the one that launched the app", async () => {
    notif.last = { actionIdentifier: "default", notification: { request: { identifier: "n1", content: { data: { type: "notice", id: 7 } } } } };
    const PushGate = gate();
    await m.render(<PushGate />, { signedIn: true });
    await m.rtl.waitFor(() => expect(router().push).toHaveBeenCalledWith("/shared/notice/7"));

    // The same notification reported again by the listener opens nothing twice.
    notif.onTap?.(notif.last);
    expect(router().push).toHaveBeenCalledTimes(1);

    // Data the app does not understand opens nothing.
    notif.onTap?.({ actionIdentifier: "default", notification: { request: { identifier: "n2", content: { data: { type: "fees", id: 1 } } } } });
    expect(router().push).toHaveBeenCalledTimes(1);
  });
});
