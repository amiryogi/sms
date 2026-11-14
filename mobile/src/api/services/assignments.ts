import { http } from "../http";
import { unwrap, UPLOAD_TIMEOUT_MS } from "../client";
import type { ApiEnvelope } from "../types";
import { appendFile, type PickedFile } from "../upload";
import type { Assignment, Money } from "@/types/api";
import type { SubmissionDetail } from "@/types/teacher";

export type AssignmentInput = {
  title: string;
  description?: string;
  /** "YYYY-MM-DD" (AD) */
  dueDate?: string;
  totalMarks?: number;
  isPublished: boolean;
};

export type AssignmentQuery = { studentId?: number; classId?: number; sectionId?: number; teacherSubjectId?: number };

/** backend/src/routes/assignment.routes.js + submission.routes.js */
export const assignmentService = {
  /**
   * Scoped by the server: admin all, teacher own, student published for their
   * class, parent published for their children (narrow with ?studentId=).
   */
  list: (query: AssignmentQuery = {}, signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<Assignment[]>>("/assignments", { params: query, signal })),

  get: (id: number, signal?: AbortSignal) => unwrap(http.get<ApiEnvelope<Assignment>>(`/assignments/${id}`, { signal })),

  /** Student only, once per assignment (409 if already submitted). Up to 3 files. */
  submit: (input: { assignmentId: number; content?: string; files: PickedFile[] }) => {
    const form = new FormData();
    form.append("assignmentId", String(input.assignmentId));
    if (input.content?.trim()) form.append("content", input.content.trim());
    input.files.forEach((f) => appendFile(form, "files", f));
    return unwrap(
      http.post<ApiEnvelope<{ id: number; status: string }>>("/submissions", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: UPLOAD_TIMEOUT_MS,
      }),
    );
  },

  /** Teacher (own subjects, current year) or admin. Up to 5 files. */
  create: (input: AssignmentInput & { teacherSubjectId: number; files: PickedFile[] }) => {
    const form = new FormData();
    form.append("title", input.title.trim());
    form.append("teacherSubjectId", String(input.teacherSubjectId));
    form.append("isPublished", String(input.isPublished));
    if (input.description?.trim()) form.append("description", input.description.trim());
    if (input.dueDate) form.append("dueDate", input.dueDate);
    if (input.totalMarks) form.append("totalMarks", String(input.totalMarks));
    input.files.forEach((f) => appendFile(form, "files", f));
    return unwrap(
      http.post<ApiEnvelope<Assignment>>("/assignments", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: UPLOAD_TIMEOUT_MS,
      }),
    );
  },

  /** Edit or publish (JSON; attachments stay as they are). */
  update: (id: number, input: Partial<AssignmentInput>) => unwrap(http.put<ApiEnvelope<Assignment>>(`/assignments/${id}`, input)),

  /** Refused by the server once any student has submitted. */
  remove: (id: number) => unwrap(http.delete<ApiEnvelope<null>>(`/assignments/${id}`)),

  /** Teacher (own) or admin. */
  submissions: (assignmentId: number, signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<SubmissionDetail[]>>(`/submissions/assignment/${assignmentId}`, { signal })),

  grade: (submissionId: number, input: { marksObtained: Money; feedback?: string }) =>
    unwrap(http.put<ApiEnvelope<SubmissionDetail>>(`/submissions/${submissionId}/grade`, input)),
};
