import { http } from "../http";
import { unwrapPage } from "../client";
import type { PaginatedEnvelope } from "../types";
import type { StaffRow } from "@/types/admin";

export type StaffRole = "ADMIN" | "TEACHER" | "EXAM_OFFICER" | "ACCOUNTANT" | "SUPER_ADMIN";

/** backend/src/routes/user.routes.js: admin only. Read-only in the app. */
export const userService = {
  list: (query: { role: StaffRole; search?: string; page?: number; limit?: number }, signal?: AbortSignal) =>
    unwrapPage(http.get<PaginatedEnvelope<StaffRow>>("/users", { params: { limit: 20, ...query }, signal })),
};
