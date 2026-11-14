/**
 * Finance and admin screens against mocked services: recording a payment
 * (checks before sending, one idempotency key per form, no double send), the
 * finance dashboard figures, and the admin dashboard counts.
 */
import type { Alert } from "react-native";
import type { AuthUser } from "@/api/schemas/auth";
import type { FeeStatement } from "@/types/api";
import type { FinanceDashboard } from "@/types/admin";
import { makeUser } from "../fixtures/user";
import { fresh, type Fresh } from "../isolated";

jest.mock("@/api/services/auth", () => ({ authService: { me: jest.fn(), login: jest.fn(), logout: jest.fn(), changePassword: jest.fn() } }));
jest.mock("@/api/services/finance", () => ({ financeService: { dashboard: jest.fn(), accounts: jest.fn(), transactions: jest.fn(), recordPayment: jest.fn(), report: jest.fn() } }));
jest.mock("@/api/services/fees", () => ({ feeService: { statement: jest.fn(), transaction: jest.fn() } }));
jest.mock("@/api/services/students", () => ({ studentService: { list: jest.fn() } }));
jest.mock("@/api/services/users", () => ({ userService: { list: jest.fn() } }));
jest.mock("@/api/services/academic", () => ({ academicService: { currentYear: jest.fn(), classes: jest.fn(), sections: jest.fn() } }));
jest.mock("@/api/services/exams", () => ({ examService: { list: jest.fn(), sectionReportCards: jest.fn() } }));
jest.mock("@/api/services/notices", () => ({
  noticeService: { list: jest.fn(async () => ({ rows: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } })), get: jest.fn() },
}));
jest.mock("expo-crypto", () => {
  let n = 0;
  return { randomUUID: jest.fn(() => `00000000-0000-4000-8000-00000000000${(n += 1)}`) };
});
jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Stack: { Screen: () => null } }));

jest.setTimeout(20_000);

let m: Fresh;
const svc = (path: string, name: string) => m.req<Record<string, Record<string, jest.Mock>>>(path)[name]!;
const page = <T,>(rows: T[], total = rows.length) => ({ rows, pagination: { page: 1, limit: 20, total, totalPages: 1, hasNextPage: false, hasPrevPage: false } });

const signIn = async (user: AuthUser) => {
  await m.helpers.seedSignedInDevice();
  svc("@/api/services/auth", "authService").me!.mockResolvedValue(user);
};

const confirm = (text: string) =>
  jest.spyOn(m.req<{ Alert: typeof Alert }>("react-native").Alert, "alert").mockImplementation((_t, _m, buttons) => {
    buttons?.find((b) => b.text === text)?.onPress?.();
  });

beforeEach(async () => {
  m = await fresh();
});

describe("record payment", () => {
  const statement: FeeStatement = {
    student: { id: 7, admissionNumber: "STU1", name: "Asha Gurung" },
    years: [
      {
        studentClassId: 1,
        academicYear: { id: 1, name: "2083", isCurrent: true },
        class: { id: 5, name: "Grade 5" },
        section: { id: 1, name: "A" },
        rollNumber: 3,
        fees: [],
        totals: { amount: 30000, discount: 0, paid: 12500, balance: 17500, overdue: 0 },
        status: "partial",
      },
    ],
    discounts: [],
    transactions: [],
  };

  const open = async () => {
    await signIn(makeUser(["ACCOUNTANT"]));
    svc("@/api/services/fees", "feeService").statement!.mockResolvedValue(statement);
    const { RecordPaymentScreen } = m.req<typeof import("@/features/finance/FinanceScreens")>("@/features/finance/FinanceScreens");
    await m.render(<RecordPaymentScreen studentId={7} />, { signedIn: true });
    await m.screen().findByText("Rs. 17,500");
  };

  const type = async (label: string, value: string) => {
    m.rtl.fireEvent.changeText(m.screen().getByLabelText(label), value);
    await m.rtl.waitFor(() => expect(m.screen().getByLabelText(label).props.value).toBe(value));
  };

  it.each([
    ["0", "Enter an amount more than 0, with at most 2 decimals."],
    ["12.345", "Enter an amount more than 0, with at most 2 decimals."],
    ["20000", "That is more than the balance of Rs. 17,500."],
  ])("refuses %s before sending", async (amount, message) => {
    await open();
    await type("Amount (Rs.)", amount);
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Record payment" }));
    expect(await m.screen().findByText(message)).toBeTruthy();
    expect(svc("@/api/services/finance", "financeService").recordPayment).not.toHaveBeenCalled();
  });

  it("asks for a reference for non-cash payments", async () => {
    await open();
    await type("Amount (Rs.)", "5000");
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Bank transfer" }));
    // The chip state must land before Record reads it (updates flush asynchronously here).
    await m.rtl.waitFor(() => expect(m.screen().getByLabelText("Reference")).toBeTruthy());
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Record payment" }));
    expect(await m.screen().findByText("Add the cheque, transfer or wallet reference.")).toBeTruthy();
  });

  it("records once after confirming, with one idempotency key reused on retry", async () => {
    await open();
    const record = svc("@/api/services/finance", "financeService").recordPayment!;
    const { ApiFailure } = m.req<typeof import("@/api/errors")>("@/api/errors");
    record.mockRejectedValueOnce(new ApiFailure({ message: "Can't reach the school server.", isNetwork: true }));
    record.mockResolvedValueOnce({ data: { id: 55, receiptNumber: "RCP-2083-84-00055", replayed: false }, message: "Payment recorded." });
    confirm("Record");

    await type("Amount (Rs.)", "5000.50");
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Record payment" }));
    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Record payment" }));
    expect(await m.screen().findByText("Can't reach the school server.")).toBeTruthy();
    expect(record).toHaveBeenCalledTimes(1);

    m.rtl.fireEvent.press(m.screen().getByRole("button", { name: "Record payment" }));
    await m.rtl.waitFor(() => expect(record).toHaveBeenCalledTimes(2));
    const [first, second] = record.mock.calls.map((c) => c[0]);
    expect(first).toMatchObject({ studentId: 7, amount: "5000.50", method: "cash", paidOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    expect(first.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    await m.rtl.waitFor(() => expect(m.req<{ router: { replace: jest.Mock } }>("expo-router").router.replace).toHaveBeenCalledWith("/shared/receipt/55"));
  });
});

describe("finance dashboard", () => {
  it("shows the API's figures", async () => {
    await signIn(makeUser(["ACCOUNTANT"]));
    const d: FinanceDashboard = {
      academicYear: { id: 1, name: "2083", startDate: "", endDate: "", isCurrent: true },
      kpis: {
        expectedGross: 1000000,
        discounts: 50000,
        expectedNet: 950000,
        collected: 600000,
        outstanding: 350000,
        collectionRate: 63.2,
        today: 12500,
        thisMonth: { label: "Kartik 2083", from: "", to: "", amount: 85000 },
        pending: { installments: 40, amount: 200000 },
        overdue: { installments: 12, amount: 150000, students: 9 },
      },
      series: { daily: [], monthly: [{ key: "2083-07", label: "Kartik 2083", amount: 85000 }], byClass: [{ key: 5, label: "Grade 5", expected: 100000, collected: 60000, outstanding: 40000, students: 30 }], byFeeType: [] },
      overdueStudents: [],
      recentTransactions: [],
    };
    svc("@/api/services/finance", "financeService").dashboard!.mockResolvedValue(d);
    const { FinanceDashboardView } = m.req<typeof import("@/features/finance/FinanceScreens")>("@/features/finance/FinanceScreens");
    await m.render(<FinanceDashboardView base="/finance" />, { signedIn: true });
    expect(await m.screen().findByText("Rs. 6,00,000")).toBeTruthy();
    expect(m.screen().getByText("63.2% of Rs. 9,50,000")).toBeTruthy();
    expect(m.screen().getByText("Rs. 1,50,000")).toBeTruthy();
    expect(m.screen().getByText("9 student(s)")).toBeTruthy();
    expect(m.screen().getByLabelText(/Collections by Nepali month\. Kartik: Rs\. 85,000/)).toBeTruthy();
  });
});

describe("admin dashboard", () => {
  it("counts students and teachers from the lists' totals and sums exams by state", async () => {
    await signIn(makeUser(["ADMIN"]));
    svc("@/api/services/students", "studentService").list!.mockResolvedValue(page([{}], 412));
    svc("@/api/services/users", "userService").list!.mockResolvedValue(page([{}], 23));
    svc("@/api/services/academic", "academicService").currentYear!.mockResolvedValue({ id: 1, name: "2083", startDate: "", endDate: "", isCurrent: true });
    svc("@/api/services/academic", "academicService").classes!.mockResolvedValue([{ id: 1, name: "Grade 1", gradeLevel: 1 }]);
    svc("@/api/services/exams", "examService").list!.mockResolvedValue([
      { id: 1, name: "First", status: "LOCKED", startDate: null, endDate: null, academicYear: null },
      { id: 2, name: "Second", status: "PUBLISHED", startDate: null, endDate: null, academicYear: null },
      { id: 3, name: "Third", status: "DRAFT", startDate: null, endDate: null, academicYear: null },
    ]);
    svc("@/api/services/finance", "financeService").dashboard!.mockRejectedValue(new Error("not needed"));
    const { AdminDashboard } = m.req<typeof import("@/features/admin/AdminScreens")>("@/features/admin/AdminScreens");
    await m.render(<AdminDashboard />, { signedIn: true });
    expect(await m.screen().findByText("412")).toBeTruthy();
    expect(m.screen().getByText("23")).toBeTruthy();
    expect(m.screen().getByText("Academic year 2083")).toBeTruthy();
    expect(svc("@/api/services/users", "userService").list).toHaveBeenCalledWith({ role: "TEACHER", limit: 1 }, expect.anything());
  });
});
