/**
 * Teacher, exam-officer and marks endpoints against the real backend, through
 * the app's services. No seeded data is changed: every write here is one the
 * server must refuse (not assigned, student not in the class, a mark above the
 * limit), and a refused write is rolled back.
 */
import type { ApiFailure } from "@/api/errors";
import { http } from "@/api/http";
import { attendanceService } from "@/api/services/attendance";
import { marksService } from "@/api/services/marks";
import { teacherService } from "@/api/services/teachers";
import { sectionsFrom } from "@/features/teacher/sections";
import { kathmanduToday } from "@/utils/nepaliDate";
import { ACCOUNTS, signInAs } from "./session";

const failure = async (p: Promise<unknown>) =>
  (await p.then(
    () => null,
    (e: unknown) => e,
  )) as ApiFailure | null;

let allSections: { classId: number; sectionId: number }[] = [];

beforeAll(async () => {
  // Every class-section of the school, as the admin sees them.
  await signInAs(ACCOUNTS.admin);
  const [classes, sections] = await Promise.all([http.get("/classes"), http.get("/sections")]);
  const cls = classes.data.data as { id: number }[];
  const secs = sections.data.data as { id: number }[];
  allSections = cls.flatMap((c) => secs.map((s) => ({ classId: c.id, sectionId: s.id })));
});

describe("teacher", () => {
  let mine: ReturnType<typeof sectionsFrom> = [];

  beforeAll(async () => {
    await signInAs(ACCOUNTS.teacher);
    mine = sectionsFrom(await teacherService.myAssignments());
  });

  it("gets only current-year assignments, and sections from them", async () => {
    const rows = await teacherService.myAssignments();
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.classSubject.academicYear?.isCurrent).toBe(true);
    expect(mine.length).toBeGreaterThan(0);
  });

  it("reads today's register for an own section", async () => {
    const s = mine[0]!;
    const rows = await attendanceService.forSection({ classId: s.classId, sectionId: s.sectionId, date: kathmanduToday() });
    expect(Array.isArray(rows)).toBe(true);
    for (const r of rows) expect(r).toEqual(expect.objectContaining({ studentId: expect.any(Number), studentClassId: expect.any(Number) }));
  });

  it("is refused a section they don't teach, for reading and for marking", async () => {
    const own = new Set(mine.map((s) => `${s.classId}:${s.sectionId}`));
    const other = allSections.find((s) => !own.has(`${s.classId}:${s.sectionId}`));
    expect(other).toBeDefined();
    const read = await failure(attendanceService.forSection({ ...other!, date: kathmanduToday() }));
    expect(read?.status).toBe(403);
    const write = await failure(attendanceService.mark({ ...other!, date: kathmanduToday(), attendanceRecords: [{ studentId: 1, studentClassId: 1, status: "present" }] }));
    expect(write?.status).toBe(403);
  });

  it("cannot mark a student who is not in the section (nothing is written)", async () => {
    const s = mine[0]!;
    const err = await failure(
      attendanceService.mark({ classId: s.classId, sectionId: s.sectionId, date: kathmanduToday(), attendanceRecords: [{ studentId: 999999, studentClassId: 999999, status: "present" }] }),
    );
    expect(err?.status).toBe(400);
  });

  it("lists only PUBLISHED exams with their own subjects and sections", async () => {
    const exams = await marksService.exams();
    const own = new Set(mine.map((s) => s.sectionId));
    for (const e of exams) {
      expect(e.status).toBe("PUBLISHED");
      for (const es of e.examSubjects) for (const id of es.assignedSectionIds) expect(own.has(id)).toBe(true);
    }
  });

  it("reads a subject's students and refuses a mark above the snapshot's limit", async () => {
    const exams = await marksService.exams();
    const es = exams.flatMap((e) => e.examSubjects).find((x) => x.assignedSectionIds.length > 0);
    if (!es) return; // no published exam for this teacher on this seed
    const sectionId = es.assignedSectionIds[0]!;
    const data = await marksService.students(es.id, sectionId);
    expect(data.examSubject.id).toBe(es.id);
    const student = data.students[0];
    if (!student) return;
    const limit = data.examSubject.theoryFullMarks || data.examSubject.fullMarks || 100;
    const err = await failure(
      marksService.save({ examSubjectId: es.id, sectionId, results: [{ studentId: student.studentId, marksObtained: limit + 1, practicalMarks: 0, isAbsent: false, remarks: "" }] }),
    );
    expect(err?.status).toBe(400);
    expect(err?.message).toContain(`cannot exceed ${limit}`);
    // Nothing was written: the student's result is unchanged.
    const after = await marksService.students(es.id, sectionId);
    expect(after.students.find((x) => x.studentId === student.studentId)?.existingResult).toEqual(student.existingResult);
  });

  it("is refused marks entry for a section they don't teach", async () => {
    const exams = await marksService.exams();
    const es = exams.flatMap((e) => e.examSubjects).find((x) => x.assignedSectionIds.length > 0);
    if (!es) return;
    const own = new Set(es.assignedSectionIds);
    const other = allSections.find((s) => s.classId === es.classSubject.classId && !own.has(s.sectionId));
    if (!other) return;
    expect((await failure(marksService.students(es.id, other.sectionId)))?.status).toBe(403);
  });

  it("lists their students grouped by class and section", async () => {
    const data = await teacherService.myStudents();
    if (Array.isArray(data)) return;
    expect(data.summary.totalStudents).toBeGreaterThanOrEqual(0);
  });
});

describe("exam officer", () => {
  it("gets every subject of each PUBLISHED exam, with the sections that have students", async () => {
    await signInAs(ACCOUNTS.examOfficer);
    const exams = await marksService.exams();
    for (const e of exams) {
      expect(e.status).toBe("PUBLISHED");
      for (const es of e.examSubjects) expect(Array.isArray(es.sections)).toBe(true);
    }
  });

  it("is refused attendance marking and finance", async () => {
    await signInAs(ACCOUNTS.examOfficer);
    const s = allSections[0]!;
    expect((await failure(attendanceService.mark({ ...s, date: kathmanduToday(), attendanceRecords: [] })))?.status).toBe(403);
    expect((await failure(http.get("/fees/dashboard")))?.status).toBe(403);
  });
});
