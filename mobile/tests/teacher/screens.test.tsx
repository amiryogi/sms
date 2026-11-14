/**
 * Teacher screens against mocked services: attendance (bulk, confirm, one
 * send, offline, drafts), marks entry (limits from the snapshot, absent,
 * locked exams), and grading limits.
 */
import type { Alert } from "react-native";
import type { AuthUser } from "@/api/schemas/auth";
import type { SectionAttendanceRow } from "@/api/services/attendance";
import type { MarksEntryStudents, TeacherSubject } from "@/types/teacher";
import { makeUser } from "../fixtures/user";
import { fresh, type Fresh } from "../isolated";

jest.mock("@/api/services/auth", () => ({ authService: { me: jest.fn(), login: jest.fn(), logout: jest.fn(), changePassword: jest.fn() } }));
jest.mock("@/api/services/teachers", () => ({ teacherService: { myAssignments: jest.fn(), myStudents: jest.fn() } }));
jest.mock("@/api/services/attendance", () => ({ attendanceService: { forSection: jest.fn(), mark: jest.fn(), studentSummary: jest.fn() } }));
jest.mock("@/api/services/marks", () => ({ marksService: { exams: jest.fn(), students: jest.fn(), save: jest.fn() } }));
jest.mock("@/api/services/assignments", () => ({ assignmentService: { list: jest.fn(), get: jest.fn(), submissions: jest.fn(), grade: jest.fn(), update: jest.fn(), remove: jest.fn() } }));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Stack: { Screen: () => null }, useFocusEffect: () => undefined }));

jest.setTimeout(20_000);

let m: Fresh;
const svc = (path: string, name: string) => m.req<Record<string, Record<string, jest.Mock>>>(path)[name]!;
const teacher = (): AuthUser => makeUser(["TEACHER"]);

const assignment: TeacherSubject = {
  id: 1,
  userId: 42,
  classSubjectId: 10,
  sectionId: 1,
  academicYearId: 1,
  classSubject: { id: 10, classId: 5, class: { id: 5, name: "Grade 5" }, subject: { id: 2, name: "Maths" }, academicYear: { id: 1, name: "2083", isCurrent: true } },
  section: { id: 1, name: "A" },
};

const roster = (status: SectionAttendanceRow["status"] = null): SectionAttendanceRow[] => [
  { studentClassId: 11, studentId: 1, rollNumber: 1, firstName: "Asha", middleName: null, lastName: "Gurung", status, remarks: "", attendanceId: null },
  { studentClassId: 12, studentId: 2, rollNumber: 2, firstName: "Bikash", middleName: null, lastName: "Rai", status, remarks: "", attendanceId: null },
];

const signIn = async () => {
  await m.helpers.seedSignedInDevice();
  svc("@/api/services/auth", "authService").me!.mockResolvedValue(teacher());
};

/** Confirm the next Alert by pressing its button labelled `text`. */
const confirm = (text: string) =>
  jest.spyOn(m.req<{ Alert: typeof Alert }>("react-native").Alert, "alert").mockImplementation((_t, _m, buttons) => {
    buttons?.find((b) => b.text === text)?.onPress?.();
  });

beforeEach(async () => {
  m = await fresh();
});

describe("attendance marking", () => {
  const open = async (rows = roster()) => {
    await signIn();
    svc("@/api/services/teachers", "teacherService").myAssignments!.mockResolvedValue([assignment]);
    svc("@/api/services/attendance", "attendanceService").forSection!.mockResolvedValue(rows);
    const { AttendanceMarkScreen } = m.req<typeof import("@/features/teacher/AttendanceMarkScreen")>("@/features/teacher/AttendanceMarkScreen");
    await m.render(<AttendanceMarkScreen />, { signedIn: true });
    await m.screen().findByText("Asha Gurung");
  };

  it("loads only the teacher's own section and refuses to save a half-marked register", async () => {
    await open();
    expect(svc("@/api/services/attendance", "attendanceService").forSection).toHaveBeenCalledWith(
      { classId: 5, sectionId: 1, date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
      expect.anything(),
    );
    expect(m.screen().getByText("2 not marked")).toBeTruthy();
    expect(m.screen().getByRole("button", { name: "Save attendance" }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("marks the rest present, then sends the register once after confirming", async () => {
    await open();
    const mark = svc("@/api/services/attendance", "attendanceService").mark!;
    let resolve: (v: unknown) => void = () => undefined;
    mark.mockImplementation(() => new Promise((r) => (resolve = r)));
    confirm("Save");

    m.rtl.fireEvent.press(m.screen().getByRole("radio", { name: "Absent, Bikash Rai" }));
    await m.rtl.waitFor(() => expect(m.screen().getByText("1 not marked")).toBeTruthy());
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Mark everyone else present" }));
    await m.rtl.waitFor(() => expect(m.screen().getByRole("button", { name: "Save attendance" }).props.accessibilityState.disabled).toBe(false));

    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Save attendance" }));
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Save attendance" }));

    await m.rtl.waitFor(() => expect(mark).toHaveBeenCalledTimes(1));
    expect(mark.mock.calls[0]![0]).toEqual({
      classId: 5,
      sectionId: 1,
      date: expect.any(String),
      attendanceRecords: [
        { studentId: 1, studentClassId: 11, status: "present" },
        { studentId: 2, studentClassId: 12, status: "absent" },
      ],
    });
    await m.rtl.act(async () => resolve([]));
  });

  it("cannot save while offline, but keeps the marks", async () => {
    m.req<{ __setState: (s: object) => void }>("expo-network").__setState({ isConnected: false });
    await open();
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Mark everyone else present" }));
    expect(await m.screen().findByText(/offline. This register stays on this phone/)).toBeTruthy();
    expect(m.screen().getByRole("button", { name: "Save attendance" }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(svc("@/api/services/attendance", "attendanceService").mark).not.toHaveBeenCalled();
  });

  it("brings back unsent marks for the same register, and can discard them", async () => {
    const storage = m.req<{ default?: { setItem: (k: string, v: string) => Promise<void> } } & { setItem: (k: string, v: string) => Promise<void> }>(
      "@react-native-async-storage/async-storage",
    );
    const { kathmanduToday } = m.req<typeof import("@/utils/nepaliDate")>("@/utils/nepaliDate");
    const draft = roster().map((r) => ({ studentId: r.studentId, studentClassId: r.studentClassId, rollNumber: r.rollNumber, name: `${r.firstName} ${r.lastName}`, status: "late", remarks: "" }));
    await (storage.default ?? storage).setItem(`sms.draft.42.attendance.5.1.${kathmanduToday()}`, JSON.stringify(draft));
    await open();
    expect(await m.screen().findByText(/Unsent changes from earlier/)).toBeTruthy();
    expect(m.screen().getByText("Late 2")).toBeTruthy();
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Discard" }));
    expect(await m.screen().findByText("2 not marked")).toBeTruthy();
  });
});

describe("marks entry", () => {
  const data = (status: "PUBLISHED" | "LOCKED" = "PUBLISHED"): MarksEntryStudents =>
    ({
      examSubject: {
        id: 9,
        examId: 1,
        classSubjectId: 10,
        examDate: null,
        hasTheory: true,
        hasPractical: true,
        fullMarks: 100,
        passMarks: 35,
        theoryFullMarks: 75,
        practicalFullMarks: 25,
        classSubject: { id: 10, classId: 5, class: { id: 5, name: "Grade 5" }, subject: { id: 2, name: "Science" } },
        exam: { id: 1, name: "First Terminal", status },
      },
      students: [
        { studentId: 1, studentClassId: 11, rollNumber: 1, firstName: "Asha", middleName: null, lastName: "Gurung", existingResult: null },
        { studentId: 2, studentClassId: 12, rollNumber: 2, firstName: "Bikash", middleName: null, lastName: "Rai", existingResult: null },
      ],
    }) as MarksEntryStudents;

  const open = async (d = data()) => {
    await signIn();
    svc("@/api/services/marks", "marksService").students!.mockResolvedValue(d);
    const { MarksEntryScreen } = m.req<typeof import("@/features/teacher/MarksEntryScreen")>("@/features/teacher/MarksEntryScreen");
    await m.render(<MarksEntryScreen examSubjectId={9} sectionId={1} title="Science · Grade 5 A" />, { signedIn: true });
    await m.screen().findByText("Asha Gurung");
  };

  const type = async (label: string, value: string) => {
    m.rtl.fireEvent.changeText(m.screen().getByLabelText(label), value);
    await m.rtl.waitFor(() => expect(m.screen().getByLabelText(label).props.value).toBe(value));
  };

  it("shows the snapshot's limits and flags marks above them before sending", async () => {
    await open();
    expect(m.screen().getByText("Theory out of 75")).toBeTruthy();
    expect(m.screen().getByText("Practical out of 25")).toBeTruthy();
    await type("Theory, Asha Gurung, out of 75", "80");
    expect(await m.screen().findByText("Above 75")).toBeTruthy();
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Save marks" }));
    expect(await m.screen().findByText("Fix the 1 highlighted row(s) first.")).toBeTruthy();
    expect(svc("@/api/services/marks", "marksService").save).not.toHaveBeenCalled();
  });

  it("sends marks and absences once confirmed", async () => {
    await open();
    const save = svc("@/api/services/marks", "marksService").save!;
    save.mockResolvedValue({ data: [], message: "Successfully saved marks for 2 students." });
    confirm("Save");
    await type("Theory, Asha Gurung, out of 75", "60.5");
    await type("Practical, Asha Gurung, out of 25", "20");
    m.rtl.fireEvent.press(m.screen().getByRole("checkbox", { name: "Absent, Bikash Rai" }));
    await m.rtl.waitFor(() => expect(m.screen().getByText("1 entered")).toBeTruthy());
    expect(m.screen().getByText("1 absent")).toBeTruthy();
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Save marks" }));
    await m.rtl.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![0]).toEqual({
      examSubjectId: 9,
      sectionId: 1,
      results: [
        { studentId: 1, marksObtained: 60.5, practicalMarks: 20, isAbsent: false, remarks: "" },
        { studentId: 2, marksObtained: 0, practicalMarks: 0, isAbsent: true, remarks: "" },
      ],
    });
  });

  it("is read-only when the exam is locked", async () => {
    await open(data("LOCKED"));
    expect(m.screen().getByText(/This exam is locked/)).toBeTruthy();
    expect(m.screen().queryByRole("button", { name: "Save marks" })).toBeNull();
    expect(m.screen().getByLabelText("Theory, Asha Gurung, out of 75").props.editable).toBe(false);
  });
});

describe("grading", () => {
  it("refuses marks above the assignment's total before sending", async () => {
    await signIn();
    const a = svc("@/api/services/assignments", "assignmentService");
    a.get!.mockResolvedValue({
      id: 9,
      title: "Fractions",
      description: null,
      dueDate: null,
      totalMarks: 10,
      isPublished: true,
      createdAt: "2026-11-10T00:00:00.000Z",
      teacherSubject: { id: 1, classSubject: { class: { id: 5, name: "Grade 5" }, subject: { id: 2, name: "Maths" } }, section: { id: 1, name: "A" } },
      assignmentFiles: [],
    });
    a.submissions!.mockResolvedValue([
      {
        id: 3,
        assignmentId: 9,
        studentId: 1,
        content: "My answers",
        status: "submitted",
        submittedAt: "2026-11-12T04:00:00.000Z",
        marksObtained: null,
        feedback: null,
        student: { id: 1, admissionNumber: "S1", user: { firstName: "Asha", middleName: null, lastName: "Gurung", avatarUrl: null } },
        submissionFiles: [],
      },
    ]);
    const { TeacherAssignmentDetail } = m.req<typeof import("@/features/teacher/TeacherAssignments")>("@/features/teacher/TeacherAssignments");
    await m.render(<TeacherAssignmentDetail id={9} />, { signedIn: true });
    m.rtl.fireEvent.press(await m.screen().findByRole("button", { name: "Grade" }));
    m.rtl.fireEvent.changeText(await m.screen().findByLabelText("Marks (out of 10)"), "12");
    await m.rtl.waitFor(() => expect(m.screen().getByLabelText("Marks (out of 10)").props.value).toBe("12"));
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Save grade" }));
    expect(await m.screen().findByText("Marks can't be more than 10.")).toBeTruthy();
    expect(a.grade).not.toHaveBeenCalled();
  });
});
