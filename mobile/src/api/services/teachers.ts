import { http } from "../http";
import { unwrap } from "../client";
import type { ApiEnvelope } from "../types";
import type { MyStudents, TeacherSubject } from "@/types/teacher";

/** backend/src/routes/teacherSubject.routes.js + teacher.routes.js */
export const teacherService = {
  /**
   * The signed-in teacher's assignments (the server forces their own user id).
   * The endpoint returns every academic year; only the current one grants
   * anything, so the app keeps only that (API_GAPS #12).
   */
  myAssignments: async (signal?: AbortSignal) => {
    const rows = await unwrap(http.get<ApiEnvelope<TeacherSubject[]>>("/teacher-subjects", { signal }));
    return rows.filter((r) => r.classSubject.academicYear?.isCurrent);
  },

  /** Students of the teacher's current-year sections, grouped by class and section. */
  myStudents: (signal?: AbortSignal) => unwrap(http.get<ApiEnvelope<MyStudents | never[]>>("/teachers/my-students", { signal })),
};
