/**
 * Authentication against the real backend (test database), through the app's
 * own client and services: every role signs in, the profile parses, refresh
 * works when the access token is rejected, logout ends the session, and an
 * admin-set password forces a change before anything else.
 */
import { ApiFailure } from "@/api/errors";
import { apiEvents, type ApiEvent } from "@/api/events";
import { http, tokenStore } from "@/api/http";
import { authService } from "@/api/services/auth";
import { schoolService } from "@/api/services/school";
import { homeAreaFor } from "@/utils/roles";
import { ACCOUNTS, signInAs } from "./session";

const events: ApiEvent[] = [];
apiEvents.subscribe((e) => events.push(e));

beforeEach(async () => {
  events.length = 0;
  await tokenStore.clear();
});

describe("sign-in for every role", () => {
  it.each([
    [ACCOUNTS.admin, "ADMIN", "admin"],
    [ACCOUNTS.superadmin, "SUPER_ADMIN", "admin"],
    [ACCOUNTS.teacher, "TEACHER", "teacher"],
    [ACCOUNTS.examOfficer, "EXAM_OFFICER", "exam"],
    [ACCOUNTS.accountant, "ACCOUNTANT", "finance"],
    [ACCOUNTS.student, "STUDENT", "student"],
    [ACCOUNTS.parent, "PARENT", "parent"],
  ])("%s signs in as %s and opens the %s area", async (identifier, role, area) => {
    const user = await signInAs(identifier);
    expect(user.roles).toContain(role);
    expect(homeAreaFor(user.roles)).toBe(area);
    expect(user.school.code).toBe("DEMO001");

    // /auth/me returns the same person and parses with the app's schema.
    const me = await authService.me();
    expect(me.id).toBe(user.id);
    expect(me.roles).toEqual(user.roles);
  });

  it("returns the student's enrolment and the parent's children", async () => {
    const student = await signInAs(ACCOUNTS.student);
    expect(student.student?.id).toEqual(expect.any(Number));
    const parent = await signInAs(ACCOUNTS.parent);
    expect(parent.parent?.children.length).toBeGreaterThan(0);
    expect(parent.parent?.children.map((c) => c.studentId)).toContain(student.student?.id);
  });

  it("signs in with the email too", async () => {
    const user = await authService.login({ identifier: "admin@demo.edu.np", password: "password123" });
    expect(user.user.roles).toContain("ADMIN");
  });

  it("refuses a wrong password with one message that names nothing", async () => {
    await expect(authService.login({ identifier: ACCOUNTS.admin, password: "not-the-password" })).rejects.toMatchObject({
      status: 401,
      message: "Invalid username or password",
    });
    await expect(authService.login({ identifier: "no.such.user", password: "x" })).rejects.toMatchObject({
      status: 401,
      message: "Invalid username or password",
    });
  });

  it("finds the school's public branding by code", async () => {
    const school = await schoolService.publicByCode("demo001");
    expect(school.code).toBe("DEMO001");
    expect(school.name).toEqual(expect.any(String));
    await expect(schoolService.publicByCode("NO-SUCH-SCHOOL")).rejects.toMatchObject({ status: 404 });
  });
});

describe("tokens", () => {
  it("refreshes once and retries when the access token is rejected", async () => {
    await signInAs(ACCOUNTS.teacher);
    const refreshBefore = tokenStore.getRefreshToken();
    // A token the server rejects: the client must refresh and retry by itself.
    await tokenStore.set({ accessToken: "not-a-valid-jwt", refreshToken: refreshBefore! });

    const [a, b, c] = await Promise.all([authService.me(), authService.me(), authService.me()]);

    expect(a.roles).toContain("TEACHER");
    expect(b.id).toBe(a.id);
    expect(c.id).toBe(a.id);
    expect(tokenStore.getRefreshToken()).not.toBe(refreshBefore); // rotated
    expect(events.filter((e) => e.type === "token-refreshed")).toHaveLength(1);
    expect(events.find((e) => e.type === "session-expired")).toBeUndefined();
  });

  it("ends the session after logout: the old refresh token no longer works", async () => {
    await signInAs(ACCOUNTS.accountant);
    const refreshToken = tokenStore.getRefreshToken()!;
    await authService.logout();

    await tokenStore.set({ accessToken: "not-a-valid-jwt", refreshToken });
    const err = (await authService.me().catch((e: unknown) => e)) as ApiFailure;
    expect(err.isSessionExpired).toBe(true);
    expect(events).toContainEqual({ type: "session-expired" });
    expect(tokenStore.getAccessToken()).toBeNull();
  });
});

describe("admin-set password", () => {
  let userId: number | null = null;

  afterAll(async () => {
    if (userId === null) return;
    await signInAs(ACCOUNTS.admin);
    await http.delete(`/users/${userId}`);
  });

  it("forces a change before anything else, then works with the new session", async () => {
    // An account the test creates and removes (never seeded data).
    await signInAs(ACCOUNTS.admin);
    const stamp = Date.now();
    const created = await http.post("/users", {
      firstName: "Contract",
      lastName: `Test${stamp}`,
      username: `contract.${stamp}`,
      role: "ACCOUNTANT",
    });
    userId = created.data.data.id;
    const temporaryPassword: string = created.data.data.temporaryPassword;
    expect(temporaryPassword).toEqual(expect.any(String));

    await tokenStore.clear();
    const user = await signInAs(`contract.${stamp}`, temporaryPassword);
    expect(user.mustChangePassword).toBe(true);

    // Every other route is refused until the password is changed.
    const refused = (await http.get("/fees/dashboard").catch((e: unknown) => e)) as ApiFailure;
    expect(refused.isPasswordChangeRequired).toBe(true);
    expect(events).toContainEqual({ type: "password-change-required" });

    const { session } = await authService.changePassword(temporaryPassword, "Contract123");
    expect(session).not.toBeNull();
    await tokenStore.set(session!);

    const me = await authService.me();
    expect(me.mustChangePassword).toBe(false);
    const dashboard = await http.get("/fees/dashboard");
    expect(dashboard.status).toBe(200);
  });
});
