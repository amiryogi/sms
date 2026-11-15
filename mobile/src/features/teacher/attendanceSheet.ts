import type { MarkAttendanceInput, SectionAttendanceRow } from "@/api/services/attendance";
import type { AttendanceStatus } from "@/types/api";
import { fullName } from "@/utils/format";

/** One student's line on the attendance sheet, as the teacher is editing it. */
export type AttendanceLine = {
  studentId: number;
  studentClassId: number;
  rollNumber: number | null;
  name: string;
  status: AttendanceStatus | null;
  remarks: string;
};

/** The day as the server has it (status null = not marked yet). */
export const linesFromServer = (rows: SectionAttendanceRow[]): AttendanceLine[] =>
  rows.map((r) => ({
    studentId: r.studentId,
    studentClassId: r.studentClassId,
    rollNumber: r.rollNumber,
    name: fullName(r),
    status: r.status,
    remarks: r.remarks ?? "",
  }));

/** Mark everyone, or only those not marked yet. */
export const markAll = (lines: AttendanceLine[], status: AttendanceStatus, onlyUnmarked = false): AttendanceLine[] =>
  lines.map((l) => (onlyUnmarked && l.status ? l : { ...l, status }));

export const setStatus = (lines: AttendanceLine[], studentId: number, status: AttendanceStatus): AttendanceLine[] =>
  lines.map((l) => (l.studentId === studentId ? { ...l, status } : l));

export const setRemarks = (lines: AttendanceLine[], studentId: number, remarks: string): AttendanceLine[] =>
  lines.map((l) => (l.studentId === studentId ? { ...l, remarks } : l));

const sig = (l: AttendanceLine) => `${l.status ?? ""}|${l.remarks.trim()}`;

/** Lines that differ from what the server has. */
export const changedCount = (lines: AttendanceLine[], saved: AttendanceLine[]): number => {
  const before = new Map(saved.map((l) => [l.studentId, sig(l)]));
  return lines.filter((l) => before.get(l.studentId) !== sig(l)).length;
};

export const tally = (lines: AttendanceLine[]) => {
  const t = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
  for (const l of lines) {
    if (l.status) t[l.status] += 1;
    else t.unmarked += 1;
  }
  return t;
};

/**
 * The POST /attendance body. Every student must have a status: a half-marked
 * register is refused here rather than sent.
 */
export const toPayload = (classId: number, sectionId: number, date: string, lines: AttendanceLine[]): MarkAttendanceInput => {
  const missing = lines.filter((l) => !l.status);
  if (missing.length) throw new Error(`${missing.length} student(s) have no status yet.`);
  return {
    classId,
    sectionId,
    date,
    attendanceRecords: lines.map((l) => ({
      studentId: l.studentId,
      studentClassId: l.studentClassId,
      status: l.status as AttendanceStatus,
      ...(l.remarks.trim() ? { remarks: l.remarks.trim() } : {}),
    })),
  };
};
