import { http } from "../http";
import { unwrap } from "../client";
import type { ApiEnvelope } from "../types";
import type { AttendanceStatus, StudentAttendance } from "@/types/api";

export type SectionAttendanceRow = {
  studentClassId: number;
  studentId: number;
  rollNumber: number | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  status: AttendanceStatus | null;
  remarks: string;
  attendanceId: number | null;
};

export type MarkAttendanceInput = {
  classId: number;
  sectionId: number;
  /** "YYYY-MM-DD" (AD) */
  date: string;
  attendanceRecords: { studentId: number; studentClassId: number; status: AttendanceStatus; remarks?: string }[];
};

/** backend/src/routes/attendance.routes.js */
export const attendanceService = {
  /** A student's register for the current year, with BS dates and month totals. */
  studentSummary: (studentId: number, signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<StudentAttendance>>(`/attendance/student/${studentId}`, { signal })),

  /** The enrolled students of a section with that day's status (null = not marked). */
  forSection: (params: { classId: number; sectionId: number; date: string }, signal?: AbortSignal) =>
    unwrap(http.get<ApiEnvelope<SectionAttendanceRow[]>>("/attendance", { params, signal })),

  /** Upsert a day for a section in one transaction. Teachers: own sections only (server-checked). */
  mark: (input: MarkAttendanceInput) => unwrap(http.post<ApiEnvelope<unknown[]>>("/attendance", input)),
};
