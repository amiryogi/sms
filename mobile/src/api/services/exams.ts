import { http } from "../http";
import { unwrap } from "../client";
import type { ApiEnvelope } from "../types";
import type { ExamRow, SectionReportCards } from "@/types/admin";

/**
 * backend/src/routes/exam.routes.js + reportCard.routes.js. Read-only in the
 * app: the lifecycle (publish / lock / unlock), generating and publishing
 * report cards stay on the web.
 */
export const examService = {
  /** Current year. Non-admins never see DRAFT. */
  list: (signal?: AbortSignal) => unwrap(http.get<ApiEnvelope<ExamRow[]>>("/exams", { signal })),

  /** Admin: report cards of a class-section for an exam, with publish state. */
  sectionReportCards: (params: { examId: number; classId: number; sectionId: number }, signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<SectionReportCards>>("/report-cards", { params, signal })),
};
