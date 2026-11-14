/**
 * Marks entry rules, as the web's MarksEntry.jsx applies them and the server
 * enforces them (examResult.controller.js saveResults):
 *  - limits come from the ExamSubject snapshot (never the current ClassSubject);
 *  - theory is out of theoryFullMarks (or fullMarks, or 100), practical out of
 *    practicalFullMarks, and only when the subject has a practical;
 *  - an absent student's marks are not sent;
 *  - only rows with something entered (or absent) are saved.
 * The server re-checks all of it; this only shows problems before sending.
 */
import type { ExamSubjectSnapshot, MarksEntryStudents, SaveMarksInput } from "@/types/teacher";
import { fullName } from "@/utils/format";

export type MarksLine = {
  studentId: number;
  rollNumber: number | null;
  name: string;
  /** Text as typed, "" when empty. */
  marksObtained: string;
  practicalMarks: string;
  isAbsent: boolean;
  remarks: string;
};

export type Limits = { hasTheory: boolean; hasPractical: boolean; theoryMax: number; practicalMax: number };

export const limitsOf = (es: Pick<ExamSubjectSnapshot, "hasTheory" | "hasPractical" | "theoryFullMarks" | "fullMarks" | "practicalFullMarks">): Limits => ({
  hasTheory: es.hasTheory !== false,
  hasPractical: es.hasPractical === true,
  theoryMax: Number(es.theoryFullMarks) || Number(es.fullMarks) || 100,
  practicalMax: Number(es.practicalFullMarks) || 0,
});

const text = (v: unknown) => (v === null || v === undefined ? "" : String(Number(v)));

/** Rows from the server, roll-number order (no roll number last). */
export const linesFromServer = (data: MarksEntryStudents): MarksLine[] =>
  data.students
    .map((s) => ({
      studentId: s.studentId,
      rollNumber: s.rollNumber,
      name: fullName(s),
      marksObtained: s.existingResult && !s.existingResult.isAbsent ? text(s.existingResult.marksObtained) : "",
      practicalMarks: s.existingResult && !s.existingResult.isAbsent ? text(s.existingResult.practicalMarks) : "",
      isAbsent: Boolean(s.existingResult?.isAbsent),
      remarks: s.existingResult?.remarks ?? "",
    }))
    .sort((a, b) => (a.rollNumber ?? 9999) - (b.rollNumber ?? 9999));

/** Why a typed value can't be saved, or "" when it can. */
export const rangeError = (value: string, max: number): string => {
  if (value.trim() === "") return "";
  const n = Number(value);
  if (Number.isNaN(n)) return "Not a number";
  if (n < 0) return "Below 0";
  if (max && n > max) return `Above ${max}`;
  return "";
};

export const lineErrors = (l: MarksLine, limits: Limits) => ({
  theory: l.isAbsent || !limits.hasTheory ? "" : rangeError(l.marksObtained, limits.theoryMax),
  practical: l.isAbsent || !limits.hasPractical ? "" : rangeError(l.practicalMarks, limits.practicalMax),
});

const sig = (l: MarksLine) => JSON.stringify([l.marksObtained.trim(), l.practicalMarks.trim(), l.isAbsent, l.remarks.trim()]);

export const stats = (lines: MarksLine[], saved: MarksLine[], limits: Limits) => {
  const before = new Map(saved.map((l) => [l.studentId, sig(l)]));
  let entered = 0;
  let absent = 0;
  let invalid = 0;
  let changed = 0;
  for (const l of lines) {
    if (l.isAbsent) absent += 1;
    else if (l.marksObtained.trim() !== "" || (limits.hasPractical && l.practicalMarks.trim() !== "")) entered += 1;
    const e = lineErrors(l, limits);
    if (e.theory || e.practical) invalid += 1;
    if (before.get(l.studentId) !== sig(l)) changed += 1;
  }
  return { entered, absent, invalid, changed, pending: lines.length - entered - absent };
};

/** The POST /exam-results body: rows with something entered, or marked absent. */
export const toPayload = (examSubjectId: number, sectionId: number, lines: MarksLine[], limits: Limits): SaveMarksInput => ({
  examSubjectId,
  sectionId,
  results: lines
    .filter((l) => l.isAbsent || l.marksObtained.trim() !== "" || (limits.hasPractical && l.practicalMarks.trim() !== ""))
    .map((l) => ({
      studentId: l.studentId,
      marksObtained: l.isAbsent || !limits.hasTheory ? 0 : Number(l.marksObtained) || 0,
      practicalMarks: l.isAbsent || !limits.hasPractical ? 0 : Number(l.practicalMarks) || 0,
      isAbsent: l.isAbsent,
      remarks: l.remarks.trim(),
    })),
});
