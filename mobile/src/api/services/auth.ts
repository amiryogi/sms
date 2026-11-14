import { ApiFailure } from "../errors";
import { http } from "../http";
import { unwrap, unwrapWithMessage } from "../client";
import type { ApiEnvelope } from "../types";
import { authUserSchema, loginResponseSchema, sessionSchema, type AuthUser, type LoginResponse } from "../schemas/auth";

/** A response that does not match what the app relies on is a server/version problem, not the user's. */
const invalid = (what: string) =>
  new ApiFailure({ message: `The server sent an unexpected ${what}. Make sure the app and the school server are up to date.` });

export type LoginInput = { identifier: string; password: string; schoolCode?: string };

/**
 * Authentication (backend/src/routes/auth.routes.js). There is deliberately no
 * register or forgot-password here: accounts are created and reset by the school.
 */
export const authService = {
  async login(input: LoginInput): Promise<LoginResponse> {
    const body: LoginInput = { identifier: input.identifier.trim(), password: input.password };
    const code = input.schoolCode?.trim();
    if (code) body.schoolCode = code;
    const data = await unwrap(http.post<ApiEnvelope<unknown>>("/auth/login", body));
    const parsed = loginResponseSchema.safeParse(data);
    if (!parsed.success) throw invalid("sign-in answer");
    return parsed.data;
  },

  async me(signal?: AbortSignal): Promise<AuthUser> {
    const data = await unwrap(http.get<ApiEnvelope<unknown>>("/auth/me", { signal }));
    const parsed = authUserSchema.safeParse(data);
    if (!parsed.success) throw invalid("profile");
    return parsed.data;
  },

  /** Ends the session on the server. NOTE: the backend ends every session of the user (API_GAPS.md #2). */
  async logout(): Promise<void> {
    await http.post("/auth/logout");
  },

  /**
   * After an admin-set password the answer carries a new session (this device
   * stays signed in); after a voluntary change it is null and every session ends.
   */
  async changePassword(currentPassword: string, newPassword: string) {
    const { data, message } = await unwrapWithMessage(
      http.put<ApiEnvelope<unknown>>("/auth/change-password", { currentPassword, newPassword }),
    );
    if (data === null || data === undefined) return { session: null, message };
    const parsed = sessionSchema.safeParse(data);
    if (!parsed.success) throw invalid("password answer");
    return { session: parsed.data, message };
  },
};
