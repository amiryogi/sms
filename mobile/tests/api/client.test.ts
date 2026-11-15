import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { createApiClient, unwrap, unwrapPage } from "@/api/client";
import { ApiFailure, NETWORK_MESSAGE, toApiFailure } from "@/api/errors";
import type { ApiEvent } from "@/api/events";
import { createMemoryTokenStore } from "@/api/tokenStore";

const BASE = "https://api.test/api/v1";

const setup = (tokens = { accessToken: "old-access", refreshToken: "old-refresh" }) => {
  const tokenStore = createMemoryTokenStore(tokens);
  const events: ApiEvent[] = [];
  const client = createApiClient({ baseURL: BASE, tokenStore, emit: (e) => events.push(e) });
  const api = new MockAdapter(client.http); // requests through the client
  const bare = new MockAdapter(axios); // the refresh call (bare axios)
  return { tokenStore, events, client, api, bare };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("auth header", () => {
  it("sends the access token", async () => {
    const { client, api } = setup();
    api.onGet("/students").reply((config) => [200, { success: true, message: "", data: config.headers?.Authorization }]);
    await expect(unwrap(client.http.get("/students"))).resolves.toBe("Bearer old-access");
  });

  it("never sends a token to login", async () => {
    const { client, api } = setup();
    api.onPost("/auth/login").reply((config) => [200, { success: true, message: "", data: config.headers?.Authorization ?? null }]);
    await expect(unwrap(client.http.post("/auth/login", {}))).resolves.toBeNull();
  });
});

describe("refresh on 401", () => {
  it("refreshes once for many concurrent 401s and retries each request", async () => {
    const { client, api, bare, tokenStore, events } = setup();
    let refreshCalls = 0;
    bare.onPost(`${BASE}/auth/refresh-token`).reply(async (config) => {
      refreshCalls += 1;
      expect(JSON.parse(config.data)).toEqual({ refreshToken: "old-refresh" });
      await new Promise((r) => setTimeout(r, 20));
      return [200, { success: true, message: "", data: { accessToken: "new-access", refreshToken: "new-refresh" } }];
    });
    api.onGet(/\/item\/\d/).reply((config) =>
      config.headers?.Authorization === "Bearer new-access"
        ? [200, { success: true, message: "", data: config.url }]
        : [401, { success: false, message: "Token expired" }],
    );

    const results = await Promise.all([1, 2, 3, 4, 5].map((n) => unwrap(client.http.get(`/item/${n}`))));

    expect(results).toEqual(["/item/1", "/item/2", "/item/3", "/item/4", "/item/5"]);
    expect(refreshCalls).toBe(1);
    expect(tokenStore.getRefreshToken()).toBe("new-refresh");
    expect(events.filter((e) => e.type === "token-refreshed")).toHaveLength(1);
  });

  it("ends the session when the refresh token is refused", async () => {
    const { client, api, bare, tokenStore, events } = setup();
    bare.onPost(`${BASE}/auth/refresh-token`).reply(401, { success: false, message: "Invalid or expired refresh token" });
    api.onGet("/me-thing").reply(401, { success: false, message: "Token expired" });

    const err = await client.http.get("/me-thing").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiFailure);
    expect((err as ApiFailure).isSessionExpired).toBe(true);
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(events).toContainEqual({ type: "session-expired" });
  });

  it("keeps the tokens when the refresh fails for a network reason", async () => {
    const { client, api, bare, tokenStore, events } = setup();
    bare.onPost(`${BASE}/auth/refresh-token`).networkError();
    api.onGet("/x").reply(401, { success: false, message: "Token expired" });

    const err = (await client.http.get("/x").catch((e: unknown) => e)) as ApiFailure;
    expect(err.isNetwork).toBe(true);
    expect(err.isSessionExpired).toBe(false);
    expect(tokenStore.getRefreshToken()).toBe("old-refresh");
    expect(events.find((e) => e.type === "session-expired")).toBeUndefined();
  });

  it("keeps the tokens when the server is restarting (503)", async () => {
    const { client, api, bare, tokenStore } = setup();
    bare.onPost(`${BASE}/auth/refresh-token`).reply(503, {});
    api.onGet("/x").reply(401, {});
    const err = (await client.http.get("/x").catch((e: unknown) => e)) as ApiFailure;
    expect(err.status).toBe(503);
    expect(tokenStore.getAccessToken()).toBe("old-access");
  });

  it("retries only once: a second 401 after refreshing is returned as is", async () => {
    const { client, api, bare } = setup();
    let refreshCalls = 0;
    bare.onPost(`${BASE}/auth/refresh-token`).reply(() => {
      refreshCalls += 1;
      return [200, { success: true, message: "", data: { accessToken: "a2", refreshToken: "r2" } }];
    });
    api.onGet("/always-401").reply(401, { success: false, message: "Nope" });
    const err = (await client.http.get("/always-401").catch((e: unknown) => e)) as ApiFailure;
    expect(err.status).toBe(401);
    expect(refreshCalls).toBe(1);
  });

  it("does not refresh for a failed sign-in", async () => {
    const { client, api, bare } = setup(null as never);
    const spy = jest.fn();
    bare.onPost(`${BASE}/auth/refresh-token`).reply(() => {
      spy();
      return [200, {}];
    });
    api.onPost("/auth/login").reply(401, { success: false, message: "Invalid username or password" });
    const err = (await client.http.post("/auth/login", {}).catch((e: unknown) => e)) as ApiFailure;
    expect(err.message).toBe("Invalid username or password");
    expect(spy).not.toHaveBeenCalled();
  });

  it("ends the session at once when there is no refresh token", async () => {
    const { client, api, events } = setup({ accessToken: "a", refreshToken: "" });
    api.onGet("/x").reply(401, {});
    const err = (await client.http.get("/x").catch((e: unknown) => e)) as ApiFailure;
    expect(err.isSessionExpired).toBe(true);
    expect(events).toContainEqual({ type: "session-expired" });
  });
});

describe("403 handling", () => {
  it("announces a forced password change", async () => {
    const { client, api, events } = setup();
    api.onGet("/students").reply(403, { success: false, message: "Choose a new password before continuing", code: "PASSWORD_CHANGE_REQUIRED" });
    const err = (await client.http.get("/students").catch((e: unknown) => e)) as ApiFailure;
    expect(err.isPasswordChangeRequired).toBe(true);
    expect(events).toEqual([{ type: "password-change-required" }]);
  });

  it("announces other 403s with the server's message", async () => {
    const { client, api, events } = setup();
    api.onGet("/fees/dashboard").reply(403, { success: false, message: "Access denied" });
    const err = (await client.http.get("/fees/dashboard").catch((e: unknown) => e)) as ApiFailure;
    expect(err.isForbidden).toBe(true);
    expect(err.message).toBe("Access denied");
    expect(events).toEqual([{ type: "forbidden", url: "/fees/dashboard", message: "Access denied" }]);
  });
});

describe("error mapping", () => {
  it("turns a network failure into a friendly offline message", async () => {
    const { client, api } = setup();
    api.onGet("/x").networkError();
    const err = (await client.http.get("/x").catch((e: unknown) => e)) as ApiFailure;
    expect(err.isNetwork).toBe(true);
    expect(err.status).toBe(0);
    expect(err.message).toBe(NETWORK_MESSAGE);
  });

  it("marks timeouts", async () => {
    const { client, api } = setup();
    api.onGet("/x").timeout();
    const err = (await client.http.get("/x").catch((e: unknown) => e)) as ApiFailure;
    expect(err.isTimeout).toBe(true);
  });

  it("shows the first field message instead of 'Validation failed'", async () => {
    const { client, api } = setup();
    api.onPost("/attendance").reply(400, {
      success: false,
      message: "Validation failed",
      errors: [
        { field: "date", message: "Valid date is required" },
        { field: "classId", message: "Class ID must be an integer" },
      ],
    });
    const err = (await client.http.post("/attendance", {}).catch((e: unknown) => e)) as ApiFailure;
    expect(err.message).toBe("Valid date is required");
    expect(err.fieldErrors).toEqual({ date: "Valid date is required", classId: "Class ID must be an integer" });
  });

  it("never shows a raw 500 message", async () => {
    const { client, api } = setup();
    api.onGet("/x").reply(500, { success: false, message: "PrismaClientKnownRequestError: something internal" });
    const err = (await client.http.get("/x").catch((e: unknown) => e)) as ApiFailure;
    expect(err.message).not.toMatch(/Prisma/);
  });

  it("marks cancelled requests", () => {
    expect(toApiFailure(new axios.CanceledError()).isCancelled).toBe(true);
  });
});

describe("unwrapPage", () => {
  it("returns rows and pagination", async () => {
    const { client, api } = setup();
    const pagination = { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false };
    api.onGet("/students").reply(200, { success: true, message: "", data: [{ id: 1 }], pagination });
    await expect(unwrapPage(client.http.get("/students"))).resolves.toEqual({ rows: [{ id: 1 }], pagination });
  });
});
