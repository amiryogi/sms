/**
 * Admin, accountant and exam-officer endpoints against the real backend,
 * through the app's services. The ledger is append-only and payments can't be
 * deleted, so the only write here is an overpayment the server must refuse
 * (409, rolled back): the balance is checked unchanged afterwards.
 */
import * as Crypto from "expo-crypto";
import type { ApiFailure } from "@/api/errors";
import { http } from "@/api/http";
import { academicService } from "@/api/services/academic";
import { examService } from "@/api/services/exams";
import { feeService } from "@/api/services/fees";
import { financeService } from "@/api/services/finance";
import { studentService } from "@/api/services/students";
import { userService } from "@/api/services/users";
import { ACCOUNTS, signInAs } from "./session";

jest.mock("expo-crypto", () => ({ randomUUID: () => require("node:crypto").randomUUID() }));

const failure = async (p: Promise<unknown>) =>
  (await p.then(
    () => null,
    (e: unknown) => e,
  )) as ApiFailure | null;

describe("accountant", () => {
  beforeAll(async () => {
    await signInAs(ACCOUNTS.accountant);
  });

  it("reads the dashboard, accounts, transactions and reports", async () => {
    const d = await financeService.dashboard();
    expect(d.kpis).toEqual(expect.objectContaining({ collected: expect.any(Number), outstanding: expect.any(Number), collectionRate: expect.any(Number) }));
    expect(Array.isArray(d.series.monthly)).toBe(true);

    const accounts = await financeService.accounts({ limit: 5 });
    expect(accounts.pagination.limit).toBe(5);
    for (const a of accounts.rows) expect(["paid", "partial", "pending", "overdue", "none"]).toContain(a.status);

    const tx = await financeService.transactions({ limit: 5 });
    for (const t of tx.rows) {
      expect(["PAYMENT", "REVERSAL"]).toContain(t.type);
      expect(t.receiptNumber).toMatch(/^(RCP|REV)-/);
    }

    for (const name of ["collections", "outstanding", "discounts", "reversals"] as const) {
      const r = await financeService.report(name);
      expect(Array.isArray(r.columns)).toBe(true);
      expect(Array.isArray(r.rows)).toBe(true);
    }
  });

  it("can read the student directory but not staff accounts", async () => {
    const students = await studentService.list({ limit: 1 });
    expect(students.pagination.total).toBeGreaterThan(0);
    expect((await failure(userService.list({ role: "TEACHER", limit: 1 })))?.status).toBe(403);
  });

  it("is refused a payment larger than what is owed, and nothing is recorded", async () => {
    const accounts = await financeService.accounts({ limit: 50 });
    const row = accounts.rows.find((a) => a.amount > 0) ?? accounts.rows[0];
    expect(row).toBeDefined();
    const before = await feeService.statement(row!.studentId);
    const countBefore = before.transactions.length;
    const balance = before.years.find((y) => y.academicYear.isCurrent)?.totals.balance ?? 0;

    const err = await failure(
      financeService.recordPayment({ studentId: row!.studentId, amount: (balance + 1000).toFixed(2), method: "cash", idempotencyKey: Crypto.randomUUID() }),
    );
    expect(err?.status).toBe(409);
    expect(err?.message).toMatch(/exceeds the balance|Nothing is owed/);

    const after = await feeService.statement(row!.studentId);
    expect(after.transactions.length).toBe(countBefore);
    expect(after.years.find((y) => y.academicYear.isCurrent)?.totals.balance ?? 0).toBe(balance);
  });

  it("refuses an amount with more than two decimals before touching the ledger", async () => {
    const accounts = await financeService.accounts({ limit: 1 });
    const err = await failure(financeService.recordPayment({ studentId: accounts.rows[0]!.studentId, amount: "10.555", method: "cash", idempotencyKey: Crypto.randomUUID() }));
    expect(err?.status).toBe(400);
  });
});

describe("admin", () => {
  beforeAll(async () => {
    await signInAs(ACCOUNTS.admin);
  });

  it("reads directories, the year, classes, sections and every exam including drafts", async () => {
    const [students, teachers, year, classes, sections, exams] = await Promise.all([
      studentService.list({ limit: 1 }),
      userService.list({ role: "TEACHER", limit: 1 }),
      academicService.currentYear(),
      academicService.classes(),
      academicService.sections(),
      examService.list(),
    ]);
    expect(students.pagination.total).toBeGreaterThan(0);
    expect(teachers.pagination.total).toBeGreaterThan(0);
    for (const t of teachers.rows) expect(t.roles).toContain("TEACHER");
    expect(year?.isCurrent).toBe(true);
    expect(classes.length).toBeGreaterThan(0);
    expect(sections.length).toBeGreaterThan(0);
    expect(exams.some((e) => e.status === "DRAFT")).toBe(true);

    const exam = exams.find((e) => e.status !== "DRAFT") ?? exams[0]!;
    const cards = await examService.sectionReportCards({ examId: exam.id, classId: classes[0]!.id, sectionId: sections[0]!.id });
    expect(cards.summary.totalStudents).toBe(cards.students.length);
    expect(cards.summary.published).toBeLessThanOrEqual(cards.summary.reportCardsGenerated);
  });
});

describe("exam officer and teacher", () => {
  it("never get DRAFT exams", async () => {
    for (const who of [ACCOUNTS.examOfficer, ACCOUNTS.teacher]) {
      await signInAs(who);
      const exams = await examService.list();
      for (const e of exams) expect(e.status).not.toBe("DRAFT");
    }
  });

  it("are refused the admin report-card list and finance", async () => {
    await signInAs(ACCOUNTS.examOfficer);
    expect((await failure(examService.sectionReportCards({ examId: 1, classId: 1, sectionId: 1 })))?.status).toBe(403);
    await signInAs(ACCOUNTS.teacher);
    expect((await failure(financeService.dashboard()))?.status).toBe(403);
    expect((await failure(http.get("/fees/accounts")))?.status).toBe(403);
  });
});
