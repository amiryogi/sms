import { http } from "../http";
import { unwrap, unwrapPage } from "../client";
import type { ApiEnvelope, PaginatedEnvelope } from "../types";
import type { Notice } from "@/types/api";

export type NoticeQuery = { page?: number; limit?: number; search?: string; status?: "PUBLISHED" | "DRAFT" | "ARCHIVED" };

/** backend/src/routes/notice.routes.js. Visibility (role, class, window) is decided by the server. */
export const noticeService = {
  /** Published notices by default: admins would otherwise also get drafts. */
  list: (query: NoticeQuery = {}, signal?: AbortSignal) =>
    unwrapPage(http.get<PaginatedEnvelope<Notice>>("/notices", { params: { status: "PUBLISHED", limit: 20, ...query }, signal })),

  get: (id: number, signal?: AbortSignal) => unwrap(http.get<ApiEnvelope<Notice>>(`/notices/${id}`, { signal })),
};
