/**
 * Student and parent portal screens against mocked services: what they show,
 * child switching, publication rules (only what the API returns), fees, and
 * handing in an assignment (offline, duplicate taps, server refusals).
 */
import { Alert } from "react-native";
import type { AuthUser } from "@/api/schemas/auth";
import type { Assignment, Child, FeeStatement, StudentAttendance, StudentOverview } from "@/types/api";
import { makeUser } from "../fixtures/user";
import { makeReportCard } from "../fixtures/reportCard";
import { fresh, type Fresh } from "../isolated";

jest.mock("@/api/services/auth", () => ({ authService: { me: jest.fn(), login: jest.fn(), logout: jest.fn(), changePassword: jest.fn() } }));
jest.mock("@/api/services/portal", () => ({ portalService: { overview: jest.fn(), myChildren: jest.fn() } }));
jest.mock("@/api/services/attendance", () => ({ attendanceService: { studentSummary: jest.fn() } }));
jest.mock("@/api/services/reportCards", () => ({ reportCardService: { publishedExams: jest.fn(), get: jest.fn() } }));
jest.mock("@/api/services/assignments", () => ({ assignmentService: { list: jest.fn(), get: jest.fn(), submit: jest.fn() } }));
jest.mock("@/api/services/fees", () => ({ feeService: { statement: jest.fn(), transaction: jest.fn() } }));
jest.mock("@/api/services/notices", () => ({
  noticeService: { list: jest.fn(async () => ({ rows: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })), get: jest.fn() },
}));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn() }, Stack: { Screen: () => null }, useFocusEffect: () => undefined }));

jest.setTimeout(20_000);

type Mocked = Record<string, jest.Mock>;
let m: Fresh;
const svc = (path: string, name: string) => m.req<Record<string, Mocked>>(path)[name]!;

const student = (): AuthUser => makeUser(["STUDENT"], { student: { id: 7, admissionNumber: "STU1", rollNumber: 3, enrollments: [] } } as Partial<AuthUser>);
const parent = (): AuthUser => makeUser(["PARENT"], { parent: { id: 3, children: [] } } as Partial<AuthUser>);

const signIn = async (user: AuthUser) => {
  await m.helpers.seedSignedInDevice();
  svc("@/api/services/auth", "authService").me!.mockResolvedValue(user);
};

const overview = (over: Partial<StudentOverview> = {}): StudentOverview => ({
  student: { id: 7, name: "Asha Gurung", firstName: "Asha", middleName: null, username: "stu1", email: null, phone: null, avatarUrl: null, admissionNumber: "STU1", admissionDate: null, dateOfBirth: null, dateOfBirthBs: null, gender: null, bloodGroup: null, address: null, emergencyContact: null },
  enrolment: { studentClassId: 1, class: { id: 5, name: "Grade 5" }, section: { id: 1, name: "A" }, rollNumber: 3, academicYear: { id: 1, name: "2083", startDate: "2026-04-14T00:00:00.000Z", endDate: "2027-04-13T00:00:00.000Z" }, classTeacher: "Ram Thapa" },
  subjects: [],
  attendance: { total: 40, present: 36, absent: 2, late: 2, excused: 0, attended: 38, percentage: 95, countLateAsPresent: true, lastMarked: null, lastStatus: null },
  latestResult: { examId: 2, examName: "First Terminal", percentage: 81.5, overallGrade: "A", classRank: 4 },
  upcomingExams: [],
  assignments: [{ id: 9, title: "Fractions worksheet", dueDate: "2026-11-20T00:00:00.000Z", totalMarks: 10, subject: "Maths", submitted: false }],
  fees: { amount: 30000, discount: 0, paid: 12500, balance: 17500, overdue: 2500, status: "overdue", nextDue: null },
  ...over,
});

const child = (studentId: number, firstName: string): Child => ({
  id: studentId,
  studentId,
  fullName: `${firstName} Gurung`,
  firstName,
  middleName: null,
  lastName: "Gurung",
  admissionNumber: `STU${studentId}`,
  rollNumber: 1,
  currentEnrollment: null,
  relationship: "mother",
  isPrimary: true,
});

beforeEach(async () => {
  m = await fresh();
});

describe("dashboard", () => {
  it("shows attendance, the latest published result, fees and work due", async () => {
    await signIn(student());
    svc("@/api/services/portal", "portalService").overview!.mockResolvedValue(overview());
    const { DashboardView } = m.req<typeof import("@/features/portal/DashboardView")>("@/features/portal/DashboardView");
    await m.render(<DashboardView studentId={7} base="/student" />, { signedIn: true });

    expect(await m.screen().findByText("95%")).toBeTruthy();
    expect(m.screen().getByText("38 of 40 days")).toBeTruthy();
    expect(m.screen().getByText("A")).toBeTruthy();
    expect(m.screen().getByText("Rs. 17,500")).toBeTruthy();
    expect(m.screen().getByText("Overdue")).toBeTruthy();
    expect(m.screen().getByText("Fractions worksheet")).toBeTruthy();
    expect(svc("@/api/services/portal", "portalService").overview).toHaveBeenCalledWith(7, expect.anything());
  });

  it("says so when the student is not enrolled this year", async () => {
    await signIn(student());
    svc("@/api/services/portal", "portalService").overview!.mockResolvedValue(overview({ enrolment: null }));
    const { DashboardView } = m.req<typeof import("@/features/portal/DashboardView")>("@/features/portal/DashboardView");
    await m.render(<DashboardView studentId={7} base="/student" />, { signedIn: true });
    expect(await m.screen().findByText("Not enrolled this year")).toBeTruthy();
  });
});

describe("parent: children", () => {
  const renderParentHome = async () => {
    const { ChildProvider } = m.req<typeof import("@/features/portal/ChildContext")>("@/features/portal/ChildContext");
    const { ParentGate } = m.req<typeof import("@/features/portal/ParentGate")>("@/features/portal/ParentGate");
    const { DashboardView } = m.req<typeof import("@/features/portal/DashboardView")>("@/features/portal/DashboardView");
    await m.render(
      <ChildProvider>
        <ParentGate>{(c) => <DashboardView studentId={c.studentId} base="/parent" childName={c.firstName} />}</ParentGate>
      </ChildProvider>,
      { signedIn: true },
    );
  };

  it("shows the first child, switches to another, and never mixes their data", async () => {
    await signIn(parent());
    const portal = svc("@/api/services/portal", "portalService");
    portal.myChildren!.mockResolvedValue([child(7, "Asha"), child(8, "Bikash")]);
    portal.overview!.mockImplementation(async (id: number) =>
      overview({ student: { ...overview().student, id, name: id === 7 ? "Asha Gurung" : "Bikash Gurung" }, fees: id === 7 ? overview().fees : null }),
    );
    await renderParentHome();

    expect(await m.screen().findByText(/Asha, Grade 5 A/)).toBeTruthy();
    expect(m.screen().getByText("Rs. 17,500")).toBeTruthy();

    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: /^Bikash/ }));

    expect(await m.screen().findByText(/Bikash, Grade 5 A/)).toBeTruthy();
    expect(m.screen().queryByText("Rs. 17,500")).toBeNull(); // Asha's balance is gone
    expect(portal.overview).toHaveBeenCalledWith(8, expect.anything());
    // The choice is remembered for this parent.
    const AsyncStorage = m.req<{ default: { getItem: (k: string) => Promise<string | null> } }>("@react-native-async-storage/async-storage");
    expect(await (AsyncStorage.default ?? (AsyncStorage as never)).getItem("sms.user.42.child")).toBe("8");
  });

  it("ignores a remembered child the server no longer lists", async () => {
    await signIn(parent());
    const storage = m.req<{ default: { setItem: (k: string, v: string) => Promise<void> } }>("@react-native-async-storage/async-storage");
    await (storage.default ?? (storage as never)).setItem("sms.user.42.child", "99");
    const portal = svc("@/api/services/portal", "portalService");
    portal.myChildren!.mockResolvedValue([child(7, "Asha")]);
    portal.overview!.mockResolvedValue(overview());
    await renderParentHome();
    expect(await m.screen().findByText(/Asha, Grade 5 A/)).toBeTruthy();
    expect(portal.overview).not.toHaveBeenCalledWith(99, expect.anything());
  });

  it("explains what to do when no child is linked", async () => {
    await signIn(parent());
    svc("@/api/services/portal", "portalService").myChildren!.mockResolvedValue([]);
    await renderParentHome();
    expect(await m.screen().findByText("No children linked yet")).toBeTruthy();
  });
});

describe("results", () => {
  it("shows nothing until a report card is published", async () => {
    await signIn(student());
    svc("@/api/services/reportCards", "reportCardService").publishedExams!.mockResolvedValue([]);
    const { ResultsView } = m.req<typeof import("@/features/portal/ResultsView")>("@/features/portal/ResultsView");
    await m.render(<ResultsView studentId={7} />, { signedIn: true });
    expect(await m.screen().findByText("No results yet")).toBeTruthy();
    expect(svc("@/api/services/reportCards", "reportCardService").get).not.toHaveBeenCalled();
  });

  it("shows the published card's figures as the server computed them", async () => {
    await signIn(student());
    const rc = svc("@/api/services/reportCards", "reportCardService");
    rc.publishedExams!.mockResolvedValue([{ examId: 2, examName: "First Terminal", examType: null, academicYear: "2083", className: "Grade 5", sectionName: "A", overallGrade: "A", percentage: "80.00", classRank: 2, generatedAt: null }]);
    rc.get!.mockResolvedValue(makeReportCard());
    const { ResultsView } = m.req<typeof import("@/features/portal/ResultsView")>("@/features/portal/ResultsView");
    await m.render(<ResultsView studentId={7} />, { signedIn: true });
    expect(await m.screen().findByText("3.60")).toBeTruthy();
    expect(m.screen().getByText("80%")).toBeTruthy();
    expect(m.screen().getByText("Science")).toBeTruthy();
    expect(m.screen().getByText(/Practical: 22 \/ 25/)).toBeTruthy();
    expect(rc.get).toHaveBeenCalledWith(7, 2, expect.anything());
  });
});

describe("attendance", () => {
  it("draws the Nepali-month register from the server's BS dates", async () => {
    await signIn(student());
    const data: StudentAttendance = {
      summary: { total: 3, present: 1, absent: 1, late: 1, excused: 0, attended: 2, percentage: "66.67", countLateAsPresent: true },
      byMonth: [{ year: 2083, month: 7, label: "Kartik 2083", total: 3, present: 1, absent: 1, late: 1, excused: 0 }],
      attendances: [
        { id: 1, attendanceDate: "2026-11-10T00:00:00.000Z", status: "present", remarks: null, bsDate: "2083/07/24" },
        { id: 2, attendanceDate: "2026-11-11T00:00:00.000Z", status: "absent", remarks: "Sick", bsDate: "2083/07/25" },
        { id: 3, attendanceDate: "2026-11-12T00:00:00.000Z", status: "late", remarks: null, bsDate: "2083/07/26" },
      ],
    };
    svc("@/api/services/attendance", "attendanceService").studentSummary!.mockResolvedValue(data);
    const { AttendanceView } = m.req<typeof import("@/features/portal/AttendanceView")>("@/features/portal/AttendanceView");
    await m.render(<AttendanceView studentId={7} />, { signedIn: true });
    expect(await m.screen().findByText("66.7%")).toBeTruthy();
    expect(m.screen().getByLabelText(/2083\/07\/25 BS.*Absent, Sick/)).toBeTruthy();
    expect(m.screen().getByText("Sick")).toBeTruthy();
  });
});

describe("fees", () => {
  const statement = (): FeeStatement => ({
    student: { id: 7, admissionNumber: "STU1", name: "Asha Gurung" },
    years: [
      {
        studentClassId: 1,
        academicYear: { id: 1, name: "2083", isCurrent: true },
        class: { id: 5, name: "Grade 5" },
        section: { id: 1, name: "A" },
        rollNumber: 3,
        fees: [
          {
            id: 1,
            feeType: { id: 1, name: "Tuition" },
            amount: 30000,
            discount: 0,
            paid: 12500,
            balance: 17500,
            status: "partial",
            cancelled: false,
            cancelReason: null,
            overdue: true,
            installments: [
              { id: 1, sequence: 1, label: "First half", dueDate: "2026-09-01T00:00:00.000Z", amount: 15000, discount: 0, paid: 12500, balance: 2500, status: "partial", overdue: true },
              { id: 2, sequence: 2, label: "Second half", dueDate: "2027-01-15T00:00:00.000Z", amount: 15000, discount: 0, paid: 0, balance: 15000, status: "pending", overdue: false },
            ],
          },
        ],
        totals: { amount: 30000, discount: 0, paid: 12500, balance: 17500, overdue: 2500 },
        status: "overdue",
      },
    ],
    discounts: [],
    transactions: [
      { id: 5, type: "PAYMENT", receiptNumber: "RCP-2083-84-00042", amount: "12500.00", method: "cash", reference: null, remarks: null, paidOn: "2026-08-20T00:00:00.000Z", createdAt: "2026-08-20T05:00:00.000Z", academicYear: { id: 1, name: "2083" } },
    ],
  });

  it("shows the ledger's balance, overdue amount, installments and receipts", async () => {
    await signIn(parent());
    svc("@/api/services/fees", "feeService").statement!.mockResolvedValue(statement());
    const { FeesView } = m.req<typeof import("@/features/portal/FeesView")>("@/features/portal/FeesView");
    await m.render(<FeesView studentId={7} />, { signedIn: true });
    expect(await m.screen().findByText("Rs. 17,500")).toBeTruthy();
    expect(m.screen().getByText("Rs. 2,500 is overdue")).toBeTruthy();
    expect(m.screen().getByText("Rs. 2,500 left")).toBeTruthy();
    expect(m.screen().getByText("RCP-2083-84-00042")).toBeTruthy();
    expect(m.screen().getByText("Rs. 12,500")).toBeTruthy(); // Decimal string from the API
  });

  it("says when the school has not set up fees", async () => {
    await signIn(parent());
    svc("@/api/services/fees", "feeService").statement!.mockResolvedValue({ ...statement(), years: [] });
    const { FeesView } = m.req<typeof import("@/features/portal/FeesView")>("@/features/portal/FeesView");
    await m.render(<FeesView studentId={7} />, { signedIn: true });
    expect(await m.screen().findByText("No fees yet")).toBeTruthy();
  });
});

describe("handing in an assignment", () => {
  const assignment = (over: Partial<Assignment> = {}): Assignment => ({
    id: 9,
    title: "Fractions worksheet",
    description: "Do questions 1 to 10.",
    dueDate: "2026-11-20T00:00:00.000Z",
    totalMarks: 10,
    isPublished: true,
    createdAt: "2026-11-10T00:00:00.000Z",
    teacherSubject: { id: 1, classSubject: { class: { id: 5, name: "Grade 5" }, subject: { id: 2, name: "Maths" } }, section: { id: 1, name: "A" } },
    assignmentFiles: [],
    submissions: [],
    ...over,
  });

  const open = async (user: AuthUser, a: Assignment) => {
    await signIn(user);
    svc("@/api/services/assignments", "assignmentService").get!.mockResolvedValue(a);
    const { AssignmentDetail } = m.req<typeof import("@/features/portal/AssignmentDetail")>("@/features/portal/AssignmentDetail");
    await m.render(<AssignmentDetail id={9} studentId={7} />, { signedIn: true });
    await m.screen().findByText("Fractions worksheet");
  };

  // The Alert of the fresh registry: the one the screen calls.
  /** Type into the answer box and wait until the screen has the text (updates flush asynchronously here). */
  const typeAnswer = async (text: string) => {
    m.rtl.fireEvent.changeText(m.screen().getByLabelText("Answer or note (optional)"), text);
    await m.rtl.waitFor(() => expect(m.screen().getByLabelText("Answer or note (optional)").props.value).toBe(text));
  };

  const confirmHandIn = () =>
    jest.spyOn(m.req<{ Alert: typeof Alert }>("react-native").Alert, "alert").mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === "Hand in")?.onPress?.();
    });

  it("sends the text once, even when the button is tapped twice", async () => {
    await open(student(), assignment());
    const submit = svc("@/api/services/assignments", "assignmentService").submit!;
    let resolve: (v: unknown) => void = () => undefined;
    submit.mockImplementation(() => new Promise((r) => (resolve = r)));
    confirmHandIn();

    await typeAnswer("Done, see page 2");
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Hand in" }));
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Hand in" }));

    await m.rtl.waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledWith({ assignmentId: 9, content: "Done, see page 2", files: [] });
    await m.rtl.act(async () => resolve({ id: 1, status: "submitted" }));
  });

  it("refuses to send nothing", async () => {
    await open(student(), assignment());
    confirmHandIn();
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Hand in" }));
    expect(await m.screen().findByText("Write something or attach a file before handing in.")).toBeTruthy();
    expect(svc("@/api/services/assignments", "assignmentService").submit).not.toHaveBeenCalled();
  });

  it("shows the server's refusal (already handed in)", async () => {
    await open(student(), assignment());
    const { ApiFailure } = m.req<typeof import("@/api/errors")>("@/api/errors");
    svc("@/api/services/assignments", "assignmentService").submit!.mockRejectedValue(
      new ApiFailure({ message: "You have already submitted this assignment", status: 409 }),
    );
    confirmHandIn();
    await typeAnswer("Again");
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Hand in" }));
    expect(await m.screen().findByText("You have already submitted this assignment")).toBeTruthy();
  });

  it("cannot be handed in while offline", async () => {
    m.req<{ __setState: (s: object) => void }>("expo-network").__setState({ isConnected: false });
    await open(student(), assignment());
    expect(m.screen().getByText(/offline. Connect to the internet to hand in/)).toBeTruthy();
    expect(m.screen().getByRole("button", { name: "Hand in" }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("shows the hand-in and marks instead of the form once submitted", async () => {
    await open(
      student(),
      assignment({ submissions: [{ id: 1, status: "graded", submittedAt: "2026-11-12T04:00:00.000Z", marksObtained: "8.00", feedback: "Well done" }] }),
    );
    expect(m.screen().getByText("Graded")).toBeTruthy();
    expect(m.screen().getByText("Marks: 8 / 10")).toBeTruthy();
    expect(m.screen().getByText("Well done")).toBeTruthy();
    expect(m.screen().queryByRole("button", { name: "Hand in" })).toBeNull();
  });

  it("is read-only for a parent", async () => {
    await open(parent(), assignment({ submissions: undefined }));
    expect(m.screen().getByText("Not handed in yet.")).toBeTruthy();
    expect(m.screen().queryByRole("button", { name: "Hand in" })).toBeNull();
  });
});
