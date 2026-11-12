/**
 * Dashboard and report figures against hand-computed values
 * (docs/plans/finance-and-portals.md §9, "Dashboard accuracy").
 * Uses its own fee type, so filtering by it isolates this test's data.
 */
const prisma = require("../config/database");
const ledger = require("../services/finance/ledger.service");
const discounts = require("../services/finance/discount.service");
const obligations = require("../services/finance/obligation.service");
const reports = require("../services/finance/reports.service");
const { kathmanduToday } = require("../utils/fiscalYear");
const { addDays } = require("../utils/financeReports");

const RUN = `dash-${Date.now().toString(36)}`;
const ctx = {};
const TODAY = kathmanduToday();
const D1 = addDays(TODAY, -2);
const D2 = addDays(TODAY, -1);

beforeAll(async () => {
  const school = await prisma.school.findFirst({ orderBy: { id: "asc" } });
  ctx.schoolId = school.id;
  const user = (email) => prisma.user.findFirst({ where: { email, schoolId: school.id } });
  [ctx.admin, ctx.accountant] = await Promise.all([user("admin@svi.edu.np"), user("accountant@svi.edu.np")]);
  const year = await prisma.academicYear.findFirst({ where: { schoolId: school.id, isCurrent: true } });
  ctx.yearId = year.id;

  // Two students in one class with no approved "all fees" discount this year:
  // that kind would rightly apply to this test's new fee type too. A discount
  // on another fee type cannot touch it, so those students are fine (excluding
  // them too made the test run out of students as earlier runs piled up).
  const discounted = (
    await prisma.feeDiscount.findMany({ where: { schoolId: school.id, academicYearId: year.id, status: "APPROVED", feeTypeId: null }, select: { studentId: true } })
  ).map((d) => d.studentId);
  const candidates = await prisma.studentClass.findMany({ where: { schoolId: school.id, academicYearId: year.id, studentId: { notIn: discounted } }, orderBy: { id: "asc" } });
  const first = candidates.find((c) => candidates.some((o) => o.classId === c.classId && o.id !== c.id));
  const second = candidates.find((c) => c.classId === first.classId && c.id !== first.id);
  ctx.s1 = first;
  ctx.s2 = second;
  ctx.classId = first.classId;

  const feeType = await prisma.feeType.create({ data: { schoolId: school.id, name: `Dashboard ${RUN}` } });
  ctx.feeTypeId = feeType.id;
  const structure = await prisma.feeStructure.create({ data: { schoolId: school.id, feeTypeId: feeType.id, classId: ctx.classId, academicYearId: year.id, amount: 2000 } });
  await obligations.setTemplate({
    schoolId: school.id,
    feeStructureId: structure.id,
    installments: [
      { label: "First half", dueDate: "2025-05-01", amount: "1000" }, // long overdue
      { label: "Second half", dueDate: "2099-01-01", amount: "1000" }, // not yet due
    ],
  });
  await obligations.generate({ schoolId: school.id, userId: ctx.accountant.id, actorRole: "ACCOUNTANT", studentClassIds: [first.id, second.id], classId: ctx.classId, academicYearId: year.id });

  const instOf = async (s) =>
    prisma.feeInstallment.findMany({ where: { obligation: { studentClassId: s.id, feeStructureId: structure.id } }, orderBy: { sequence: "asc" } });
  const [i1, i2] = [await instOf(first), await instOf(second)];
  ctx.i1 = i1;
  ctx.i2 = i2;
  const payTo = (s, inst, amount, paidOn, method) =>
    ledger.recordPayment({ schoolId: school.id, userId: ctx.accountant.id, studentId: s.studentId, academicYearId: year.id, amount, paidOn, method, allocations: [{ installmentId: inst.id, amount }] });

  await payTo(first, i1[0], "1000", D1, "cash"); // s1 first half paid in full
  const wrong = await payTo(second, i2[0], "300", D2, "wallet");
  await payTo(second, i2[0], "200", TODAY, "cash");
  await ledger.reversePayment({ schoolId: school.id, userId: ctx.admin.id, transactionId: wrong.transaction.id, reason: "Recorded twice", category: "CORRECTION" });

  const d = await discounts.request({ schoolId: school.id, userId: ctx.accountant.id, studentId: first.studentId, academicYearId: year.id, feeTypeId: feeType.id, kind: "PERCENT", value: "10", category: "SCHOLARSHIP", name: "Merit", reason: "Dashboard test" });
  await discounts.approve({ schoolId: school.id, userId: ctx.admin.id, id: d.id });

  ctx.dash = await reports.dashboard({ schoolId: school.id, academicYearId: year.id, feeTypeId: feeType.id });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("dashboard KPIs (filtered to this test's fee type)", () => {
  test("obligations: expected, discounts, collected, outstanding", () => {
    const k = ctx.dash.kpis;
    expect(k.expectedGross).toBe(4000);
    expect(k.discounts).toBe(200); // 10% of 2000, on s1's second half
    expect(k.expectedNet).toBe(3800);
    expect(k.collected).toBe(1200); // 1000 + 200 (the 300 was reversed)
    expect(k.outstanding).toBe(2600); // 800 + 800 + 1000
    expect(k.expectedNet - k.collected).toBe(k.outstanding);
  });

  test("overdue and pending", () => {
    expect(ctx.dash.kpis.overdue).toEqual({ installments: 1, amount: 800, students: 1 });
    expect(ctx.dash.kpis.pending).toEqual({ installments: 2, amount: 1800 });
  });

  test("cash basis: today's reversal is negative today, yesterday keeps its 300", () => {
    expect(ctx.dash.kpis.today).toBe(-100); // +200 -300
    const daily = Object.fromEntries(ctx.dash.series.daily.map((d) => [d.date, d.amount]));
    expect(daily[D1]).toBe(1000);
    expect(daily[D2]).toBe(300);
    expect(daily[TODAY]).toBe(-100);
    expect(ctx.dash.kpis.transactions).toEqual({ payments: 3, reversals: 1 });
  });

  test("class and fee-type breakdowns agree with the totals", () => {
    const cls = ctx.dash.series.byClass.find((c) => c.key === ctx.classId);
    expect(cls).toMatchObject({ expected: 3800, collected: 1200, outstanding: 2600, students: 2 });
    expect(ctx.dash.series.byFeeType).toHaveLength(1);
  });

  test("fees by state", () => {
    const s = ctx.dash.series.obligationStatus;
    expect(s.partial).toEqual({ count: 1, amount: 800 }); // s1: paid some, nothing overdue
    expect(s.overdue).toEqual({ count: 1, amount: 1800 }); // s2: first half overdue
    expect(s.paid.count + s.pending.count).toBe(0);
  });

  test("monthly series adds up to net collected", () => {
    const total = ctx.dash.series.monthly.reduce((sum, m) => sum + m.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(1200);
  });
});

describe("reports", () => {
  test("collections by method: received, reversed, net", async () => {
    const r = await reports.report("collections", { schoolId: ctx.schoolId, from: D1, to: TODAY, groupBy: "method", feeTypeId: ctx.feeTypeId });
    const by = Object.fromEntries(r.rows.map((x) => [x.key, x]));
    expect(by.cash).toMatchObject({ payments: 2, received: 1200, reversed: 0, net: 1200 });
    expect(by.wallet).toMatchObject({ payments: 1, received: 300, reversed: 300, net: 0 });
    expect(r.totals.net).toBe(1200);
  });

  test("outstanding report rows reconcile with the balance", async () => {
    const r = await reports.report("outstanding", { schoolId: ctx.schoolId, academicYearId: ctx.yearId, classId: ctx.classId });
    for (const row of r.rows) expect(Math.round((row.amount - row.discount - row.paid) * 100) / 100).toBe(row.balance);
  });

  test("reversals report lists the reversal with its original", async () => {
    const r = await reports.report("reversals", { schoolId: ctx.schoolId, from: TODAY, to: TODAY });
    const row = r.rows.find((x) => x.reason === "Recorded twice");
    expect(row).toMatchObject({ amount: 300, category: "Correction", originalDate: D2 });
  });

  test("an unknown report is a 404", async () => {
    await expect(reports.report("payroll", { schoolId: ctx.schoolId })).rejects.toMatchObject({ statusCode: 404 });
  });
});
