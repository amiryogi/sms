import { http } from "../http";
import { unwrapPage } from "../client";
import type { PaginatedEnvelope } from "../types";
import type { StudentRow } from "@/types/admin";

export type StudentQuery = { search?: string; classId?: number; sectionId?: number; page?: number; limit?: number };

/** backend/src/routes/student.routes.js. Read-only in the app (ADMIN, TEACHER, EXAM_OFFICER, ACCOUNTANT). */
export const studentService = {
  list: (query: StudentQuery = {}, signal?: AbortSignal) =>
    unwrapPage(http.get<PaginatedEnvelope<StudentRow>>("/students", { params: { limit: 20, ...query }, signal })),
};
