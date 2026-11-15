import { http } from "../http";
import { unwrap } from "../client";
import type { ApiEnvelope } from "../types";
import type { Child, StudentOverview } from "@/types/api";

/** Student and parent portal (backend/src/routes/portal.routes.js, parent.routes.js). */
export const portalService = {
  /** One read for the dashboard and profile. isOwnStudent: self, or a parent's linked child. */
  overview: (studentId: number, signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<StudentOverview>>(`/portal/students/${studentId}/overview`, { signal })),

  /** The signed-in parent's linked children (StudentParent). */
  myChildren: (signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<{ children: Child[]; count: number }>>("/parents/me/children", { signal })).then((d) => d.children),
};
