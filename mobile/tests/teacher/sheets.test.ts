import { changedCount, linesFromServer as attLines, markAll, setRemarks, setStatus, tally, toPayload as attPayload } from "@/features/teacher/attendanceSheet";
import { lineErrors, limitsOf, linesFromServer as marksLines, rangeError, stats, toPayload as marksPayload, type MarksLine } from "@/features/teacher/marksSheet";
import { sectionsFrom } from "@/features/teacher/sections";
import type { MarksEntryStudents, TeacherSubject } from "@/types/teacher";

const ts = (id: number, classId: number, className: string, sectionId: number, section: string, subject: string, order = classId): TeacherSubject => ({
  id,
  userId: 1,
  classSubjectId: id * 10,
  sectionId,
  academicYearId: 1,
  classSubject: {
    id: id * 10,
    classId,
    class: { id: classId, name: className, displayOrder: order },
    subject: { id: id * 100, name: subject },
    academicYear: { id: 1, name: "2083", isCurrent: true },
  },
  section: { id: sectionId, name: section },
});

describe("sections", () => {
  it("groups a teacher's subjects by class-section in school order", () => {
    const s = sectionsFrom([ts(1, 7, "Grade 7", 2, "B", "Science"), ts(2, 5, "Grade 5", 1, "A", "Maths"), ts(3, 5, "Grade 5", 1, "A", "English")]);
    expect(s.map((x) => `${x.className} ${x.sectionName}`)).toEqual(["Grade 5 A", "Grade 7 B"]);
    expect(s[0]!.subjects.map((x) => x.subjectName)).toEqual(["English", "Maths"]);
    expect(s[0]!.subjects.map((x) => x.teacherSubjectId)).toEqual([3, 2]);
  });
});

describe("attendance sheet", () => {
  const rows = [
    { studentClassId: 11, studentId: 1, rollNumber: 1, firstName: "Asha", middleName: null, lastName: "Gurung", status: "present" as const, remarks: "", attendanceId: 5 },
    { studentClassId: 12, studentId: 2, rollNumber: 2, firstName: "Bikash", middleName: "Kumar", lastName: "Rai", status: null, remarks: "", attendanceId: null },
  ];

  it("takes names through fullName and keeps unmarked as null", () => {
    const lines = attLines(rows);
    expect(lines[1]).toMatchObject({ name: "Bikash Kumar Rai", status: null });
  });

  it("marks only the unmarked when asked, and counts changes against the server", () => {
    const saved = attLines(rows);
    const lines = markAll(saved, "present", true);
    expect(lines.map((l) => l.status)).toEqual(["present", "present"]);
    expect(changedCount(lines, saved)).toBe(1);
    const late = setStatus(lines, 1, "late");
    expect(tally(late)).toEqual({ present: 1, absent: 0, late: 1, excused: 0, unmarked: 0 });
    expect(changedCount(setRemarks(late, 2, "Bus late"), saved)).toBe(2);
  });

  it("refuses to build a half-marked register", () => {
    expect(() => attPayload(5, 1, "2026-11-13", attLines(rows))).toThrow("1 student(s) have no status yet.");
  });

  it("builds the POST /attendance body", () => {
    const lines = setRemarks(markAll(attLines(rows), "absent", true), 2, "  Sick  ");
    expect(attPayload(5, 1, "2026-11-13", lines)).toEqual({
      classId: 5,
      sectionId: 1,
      date: "2026-11-13",
      attendanceRecords: [
        { studentId: 1, studentClassId: 11, status: "present" },
        { studentId: 2, studentClassId: 12, status: "absent", remarks: "Sick" },
      ],
    });
  });
});

describe("marks sheet", () => {
  const snapshot = { hasTheory: true, hasPractical: true, fullMarks: 100, passMarks: 35, theoryFullMarks: 75, practicalFullMarks: 25 };
  const limits = limitsOf(snapshot);

  const data = (): MarksEntryStudents =>
    ({
      examSubject: { id: 9, examId: 1, classSubjectId: 1, examDate: null, ...snapshot, classSubject: {} as never, exam: { id: 1, name: "First", status: "PUBLISHED" } },
      students: [
        { studentId: 2, studentClassId: 12, rollNumber: 2, firstName: "B", middleName: null, lastName: "Rai", existingResult: { id: 1, marksObtained: "60.00", practicalMarks: "20.00", isAbsent: false, remarks: null } },
        { studentId: 1, studentClassId: 11, rollNumber: 1, firstName: "A", middleName: null, lastName: "Gurung", existingResult: null },
        { studentId: 3, studentClassId: 13, rollNumber: null, firstName: "C", middleName: null, lastName: "KC", existingResult: { id: 2, marksObtained: null, practicalMarks: null, isAbsent: true, remarks: null } },
      ],
    }) as MarksEntryStudents;

  it("takes limits from the exam's snapshot", () => {
    expect(limits).toEqual({ hasTheory: true, hasPractical: true, theoryMax: 75, practicalMax: 25 });
    expect(limitsOf({ hasTheory: true, hasPractical: false, fullMarks: 50, theoryFullMarks: null, practicalFullMarks: null }).theoryMax).toBe(50);
    expect(limitsOf({ hasTheory: true, hasPractical: false, fullMarks: 0, theoryFullMarks: null, practicalFullMarks: null }).theoryMax).toBe(100);
  });

  it("reads existing marks (Decimal strings) in roll order, absent last when no roll", () => {
    const lines = marksLines(data());
    expect(lines.map((l) => l.studentId)).toEqual([1, 2, 3]);
    expect(lines[1]).toMatchObject({ marksObtained: "60", practicalMarks: "20", isAbsent: false });
    expect(lines[2]).toMatchObject({ marksObtained: "", isAbsent: true });
  });

  it("checks ranges like the web and the server", () => {
    expect(rangeError("", 75)).toBe("");
    expect(rangeError("abc", 75)).toBe("Not a number");
    expect(rangeError("-1", 75)).toBe("Below 0");
    expect(rangeError("76", 75)).toBe("Above 75");
    expect(rangeError("75", 75)).toBe("");
    const absent: MarksLine = { studentId: 1, rollNumber: 1, name: "A", marksObtained: "999", practicalMarks: "999", isAbsent: true, remarks: "" };
    expect(lineErrors(absent, limits)).toEqual({ theory: "", practical: "" });
  });

  it("counts entered, absent, invalid and changed rows", () => {
    const saved = marksLines(data());
    const lines = saved.map((l) => (l.studentId === 1 ? { ...l, marksObtained: "80" } : l));
    expect(stats(lines, saved, limits)).toEqual({ entered: 2, absent: 1, invalid: 1, changed: 1, pending: 0 });
  });

  it("sends only rows with marks or absent, with absent marks as 0", () => {
    const lines = marksLines(data()).map((l) => (l.studentId === 1 ? { ...l, marksObtained: "", practicalMarks: "" } : l));
    expect(marksPayload(9, 1, lines, limits)).toEqual({
      examSubjectId: 9,
      sectionId: 1,
      results: [
        { studentId: 2, marksObtained: 60, practicalMarks: 20, isAbsent: false, remarks: "" },
        { studentId: 3, marksObtained: 0, practicalMarks: 0, isAbsent: true, remarks: "" },
      ],
    });
  });

  it("never sends practical marks for a subject without a practical", () => {
    const noPractical = limitsOf({ ...snapshot, hasPractical: false, practicalFullMarks: null });
    const lines: MarksLine[] = [{ studentId: 1, rollNumber: 1, name: "A", marksObtained: "50", practicalMarks: "10", isAbsent: false, remarks: "" }];
    expect(marksPayload(9, 1, lines, noPractical).results[0]).toMatchObject({ marksObtained: 50, practicalMarks: 0 });
  });
});
