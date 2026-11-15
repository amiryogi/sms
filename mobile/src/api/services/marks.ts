import { http } from "../http";
import { unwrapWithMessage, unwrap } from "../client";
import type { ApiEnvelope } from "../types";
import type { MarksEntryExam, MarksEntryStudents, SaveMarksInput } from "@/types/teacher";

/**
 * Marks entry (backend/src/routes/examResult.routes.js). Only PUBLISHED exams
 * are returned and accepted; teachers get only their assigned subjects and
 * sections, exam officers and admins every subject (server-checked).
 */
export const marksService = {
  exams: (signal?: AbortSignal) => unwrap(http.get<ApiEnvelope<MarksEntryExam[]>>("/exam-results/exams", { signal })),

  students: (examSubjectId: number, sectionId: number, signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<MarksEntryStudents>>("/exam-results/students", { params: { examSubjectId, sectionId }, signal })),

  save: (input: SaveMarksInput) => unwrapWithMessage(http.post<ApiEnvelope<unknown[]>>("/exam-results", input)),
};
