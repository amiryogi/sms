import { http } from "../http";
import { unwrap } from "../client";
import type { ApiEnvelope } from "../types";
import type { PublishedExam, ReportCard } from "@/types/api";

/** backend/src/routes/reportCard.routes.js. Students and parents only ever get published cards. */
export const reportCardService = {
  publishedExams: (studentId: number, signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<PublishedExam[]>>(`/report-cards/student/${studentId}/exams`, { signal })),

  get: (studentId: number, examId: number, signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<ReportCard>>(`/report-cards/student/${studentId}/exam/${examId}`, { signal })),
};
