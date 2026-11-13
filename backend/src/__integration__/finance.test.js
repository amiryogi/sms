/**
 * Fee ledger against a real database (docs/plans/finance-and-portals.md §9).
 * Runs only through `npm run test:integration` (test database).
 *
 * Each run creates its own fee type and structure, so it can be repeated on
 * the same test database. Tests in this file build on each other in order.
 */
const crypto = require("node:crypto");
const prisma = require("../config/database");
const ledger = require("../services/finance/ledger.service");
const discounts = require("../services/finance/discount.service");
const obligations = require("../services/finance/obligation.service");
const { fiscalYearOf, kathmanduToday } = require("../utils/fiscalYear");

const RUN = Date.now().toString(36);
const ctx = {};

const balanceOf = async (installmentId) => {
  const i = await prisma.feeInstallment.findUnique({ where: { id: installmentId } });
  return { paid: Number(i.paidTotal), discount: Number(i.discountTotal), status: i.status, amount: Number(i.amount) };
};

const pay = (over = {}) =>
  ledger.recordPayment({
    schoolId: ctx.schoolId,
    userId: ctx.accountant.id,
    studentId: ctx.studentId,
    academicYearId: ctx.yearId,
    method: "cash",
    ...over,
  });

beforeAll(async () => {
  const school = await prisma.school.findFirst({ where: { code: { not: "" } }, orderBy: { id: "asc" } });
  ctx.schoolId = school.id;
  const byEmail = (email) => prisma.user.findFirst({ where: { email, schoolId: school.id } });
  [ctx.admin, ctx.superAdmin, ctx.accountant] = await Promise.all([byEmail("admin@demo.edu.np"), byEmail("superadmin@demo.edu.np"), byEmail("accountant@demo.edu.np")]);
  expect(ctx.admin && ctx.superAdmin && ctx.accountant).toBeTruthy();

  const year = await prisma.academicYear.findFirst({ where: { schoolId: school.id, isCurrent: true } });
  ctx.yearId = year.id;
  // Two students in the same class: one for most tests, one for a discount granted before fees exist.
  const enrolments = await prisma.studentClass.findMany({ where: { schoolId: school.id, academicYearId: year.id }, orderBy: { id: "desc" }, take: 2 });
  ctx.enrolment = enrolments[0];
  ctx.studentId = enrolments[0].studentId;
  ctx.enrolment2 = enrolments.find((e) => e.classId === enrolments[0].classId && e.id !== enrolments[0].id) || null;

  const feeType = await prisma.feeType.create({ data: { schoolId: school.id, name: `Integration ${RUN}` } });
  ctx.feeTypeId = feeType.id;
  const structure = await prisma.feeStructure.create({
    data: { schoolId: school.id, feeTypeId: feeType.id, classId: ctx.enrolment.classId, academicYearId: year.id, amount: 3000 },
  });
  ctx.structureId = structure.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("installment plans and generation", () => {
  test("a plan must add up to the fee", async () => {
    await expect(
      obligations.setTemplate({ schoolId: ctx.schoolId, feeStructureId: ctx.structureId, installments: [{ label: "A", amount: "1000" }] }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("generation snapshots the plan into installments", async () => {
    await obligations.setTemplate({
      schoolId: ctx.schoolId,
      feeStructureId: ctx.structureId,
      installments: [
        { label: "Term 1", dueDate: "2025-05-01", amount: "1000" },
        { label: "Term 2", dueDate: "2025-09-01", amount: "1000" },
        { label: "Term 3", dueDate: null, amount: "1000" },
      ],
    });
    const created = await obligations.generate({
      schoolId: ctx.schoolId,
      userId: ctx.accountant.id,
      actorRole: "ACCOUNTANT",
      studentClassIds: [ctx.enrolment.id],
      classId: ctx.enrolment.classId,
      academicYearId: ctx.yearId,
    });
    expect(created).toBeGreaterThanOrEqual(1);
    const ob = await prisma.feeObligation.findFirst({
      where: { studentClassId: ctx.enrolment.id, feeStructureId: ctx.structureId },
      include: { installments: { orderBy: { sequence: "asc" } } },
    });
    ctx.obligationId = ob.id;
    ctx.inst = ob.installments.map((i) => i.id);
    expect(ob.installments.map((i) => [i.label, Number(i.amount)])).toEqual([
      ["Term 1", 1000],
      ["Term 2", 1000],
      ["Term 3", 1000],
    ]);
  });
});

describe("payments", () => {
  test("first payment goes to the oldest due installment and gets a fiscal-year receipt", async () => {
    const { transaction } = await pay({ amount: "400", allocations: [{ installmentId: ctx.inst[0], amount: "400" }] });
    const fy = fiscalYearOf(kathmanduToday());
    expect(transaction.receiptNumber).toMatch(new RegExp(`^RCP-${fy}-\\d{5}$`));
    expect(transaction.fiscalYear).toBe(fy);
    expect(await balanceOf(ctx.inst[0])).toMatchObject({ paid: 400, status: "partial" });
  });

  test("partial payments accumulate and settle an installment", async () => {
    await pay({ amount: "600", allocations: [{ installmentId: ctx.inst[0], amount: "600" }] });
    expect(await balanceOf(ctx.inst[0])).toMatchObject({ paid: 1000, status: "paid" });
  });

  test("overpayment is rejected", async () => {
    await expect(pay({ amount: "1001.00", allocations: [{ installmentId: ctx.inst[1], amount: "1001" }] })).rejects.toMatchObject({ statusCode: 409 });
    await expect(pay({ amount: "5000", obligationId: ctx.obligationId })).rejects.toMatchObject({ statusCode: 409 });
  });

  test("allocations must add up to the amount", async () => {
    await expect(pay({ amount: "300", allocations: [{ installmentId: ctx.inst[1], amount: "200" }] })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("a payment cannot target another student's installment", async () => {
    const other = await prisma.feeInstallment.findFirst({ where: { schoolId: ctx.schoolId, obligation: { studentClassId: { not: ctx.enrolment.id } } } });
    if (!other) return;
    await expect(pay({ amount: "1", allocations: [{ installmentId: other.id, amount: "1" }] })).rejects.toMatchObject({ statusCode: 409 });
  });

  test("the same idempotency key records once", async () => {
    const key = crypto.randomUUID();
    const first = await pay({ amount: "100", allocations: [{ installmentId: ctx.inst[1], amount: "100" }], idempotencyKey: key });
    const second = await pay({ amount: "100", allocations: [{ installmentId: ctx.inst[1], amount: "100" }], idempotencyKey: key });
    expect(second.replayed).toBe(true);
    expect(second.transaction.id).toBe(first.transaction.id);
    expect(await prisma.feeTransaction.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(await balanceOf(ctx.inst[1])).toMatchObject({ paid: 100 });
  });

  test("the same key sent in parallel still records once", async () => {
    const key = crypto.randomUUID();
    const results = await Promise.allSettled([0, 1, 2].map(() => pay({ amount: "50", allocations: [{ installmentId: ctx.inst[1], amount: "50" }], idempotencyKey: key })));
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(new Set(results.map((r) => r.value.transaction.id)).size).toBe(1);
    expect(await balanceOf(ctx.inst[1])).toMatchObject({ paid: 150 });
  });

  test("two payments racing for the last balance: one wins, the other is rejected", async () => {
    const { paid, amount } = await balanceOf(ctx.inst[1]);
    const remaining = String(amount - paid);
    const results = await Promise.allSettled([0, 1].map(() => pay({ amount: remaining, allocations: [{ installmentId: ctx.inst[1], amount: remaining }] })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected").reason).toMatchObject({ statusCode: 409 });
    expect(await balanceOf(ctx.inst[1])).toMatchObject({ paid: 1000, status: "paid" });
  });

  test("receipt numbers stay unique and consecutive under parallel payments", async () => {
    const results = await Promise.all([0, 1, 2, 3, 4].map(() => pay({ amount: "10", allocations: [{ installmentId: ctx.inst[2], amount: "10" }] })));
    const numbers = results.map((r) => Number(r.transaction.receiptNumber.slice(-5))).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(5);
    expect(numbers[4] - numbers[0]).toBe(4);
    expect(await balanceOf(ctx.inst[2])).toMatchObject({ paid: 50 });
  });
});

describe("reversals", () => {
  test("accountant requests, the requester cannot approve, another admin approves", async () => {
    const target = await prisma.feeTransaction.findFirst({ where: { type: "PAYMENT", allocations: { some: { installmentId: ctx.inst[0] } } }, orderBy: { id: "desc" } });
    ctx.reversedTxnId = target.id;
    const req = await ledger.requestReversal({ schoolId: ctx.schoolId, userId: ctx.accountant.id, transactionId: target.id, reason: "Entered against the wrong term", category: "CORRECTION" });
    await expect(ledger.requestReversal({ schoolId: ctx.schoolId, userId: ctx.accountant.id, transactionId: target.id, reason: "Second request", category: "CORRECTION" })).rejects.toMatchObject({ statusCode: 409 });
    await expect(ledger.approveReversal({ schoolId: ctx.schoolId, userId: ctx.accountant.id, requestId: req.id })).rejects.toMatchObject({ statusCode: 403 });

    const reversal = await ledger.approveReversal({ schoolId: ctx.schoolId, userId: ctx.admin.id, requestId: req.id, note: "OK" });
    expect(reversal.type).toBe("REVERSAL");
    expect(reversal.receiptNumber).toMatch(/^REV-/);
    expect(reversal.reverses.id).toBe(target.id);
    expect(await balanceOf(ctx.inst[0])).toMatchObject({ paid: 1000 - Number(target.amount), status: "partial" });
    const decided = await prisma.feeReversalRequest.findUnique({ where: { id: req.id } });
    expect(decided).toMatchObject({ status: "APPROVED", decidedById: ctx.admin.id, reversalTxnId: reversal.id });
  });

  test("a payment is reversed only once, and a reversal is never reversed", async () => {
    await expect(ledger.reversePayment({ schoolId: ctx.schoolId, userId: ctx.admin.id, transactionId: ctx.reversedTxnId, reason: "Again please", category: "CORRECTION" })).rejects.toMatchObject({ statusCode: 409 });
    const rev = await prisma.feeTransaction.findFirst({ where: { reversesId: ctx.reversedTxnId } });
    await expect(ledger.reversePayment({ schoolId: ctx.schoolId, userId: ctx.admin.id, transactionId: rev.id, reason: "Undo the undo", category: "CORRECTION" })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("an admin cannot approve their own request", async () => {
    const target = await prisma.feeTransaction.findFirst({ where: { type: "PAYMENT", reversedBy: null, allocations: { some: { installmentId: ctx.inst[2] } } } });
    const req = await ledger.requestReversal({ schoolId: ctx.schoolId, userId: ctx.admin.id, transactionId: target.id, reason: "Duplicate entry", category: "CORRECTION" });
    await expect(ledger.approveReversal({ schoolId: ctx.schoolId, userId: ctx.admin.id, requestId: req.id })).rejects.toMatchObject({ statusCode: 403 });
    await ledger.rejectReversal({ schoolId: ctx.schoolId, userId: ctx.superAdmin.id, requestId: req.id, note: "Not a duplicate" });
  });
});

describe("discounts", () => {
  test("nobody approves their own request", async () => {
    const d = await discounts.request({ schoolId: ctx.schoolId, userId: ctx.admin.id, studentId: ctx.studentId, academicYearId: ctx.yearId, feeTypeId: ctx.feeTypeId, kind: "PERCENT", value: "10", category: "SCHOLARSHIP", name: "Merit", reason: "Top of the class" });
    await expect(discounts.approve({ schoolId: ctx.schoolId, userId: ctx.admin.id, id: d.id })).rejects.toMatchObject({ statusCode: 403 });
    ctx.discountId = d.id;
  });

  test("approved percent discount reduces the newest unpaid installments", async () => {
    const before = await Promise.all(ctx.inst.map(balanceOf));
    const r = await discounts.approve({ schoolId: ctx.schoolId, userId: ctx.superAdmin.id, id: ctx.discountId });
    expect(r.applied).toBe(300); // 10% of 3000
    expect(r.capped).toBe(0);
    const after = await Promise.all(ctx.inst.map(balanceOf));
    expect(after[2].discount).toBe(300); // newest first, it had room
    expect(after[1].discount).toBe(before[1].discount);
  });

  test("revoking puts the balance back", async () => {
    await discounts.revoke({ schoolId: ctx.schoolId, userId: ctx.admin.id, id: ctx.discountId, reason: "Granted by mistake" });
    expect((await balanceOf(ctx.inst[2])).discount).toBe(0);
    expect(await prisma.feeDiscountApplication.count({ where: { discountId: ctx.discountId } })).toBe(0);
  });

  test("a fixed discount bigger than what is unpaid is capped, never refunded", async () => {
    const d = await discounts.request({ schoolId: ctx.schoolId, userId: ctx.accountant.id, studentId: ctx.studentId, academicYearId: ctx.yearId, feeTypeId: ctx.feeTypeId, kind: "FIXED", value: "5000", category: "DISCOUNT", name: "Hardship", reason: "Family circumstances" });
    const unpaid = (await Promise.all(ctx.inst.map(balanceOf))).reduce((s, b) => s + b.amount - b.paid - b.discount, 0);
    const r = await discounts.approve({ schoolId: ctx.schoolId, userId: ctx.admin.id, id: d.id });
    expect(r.applied).toBeCloseTo(unpaid, 2);
    expect(r.capped).toBeCloseTo(5000 - unpaid, 2);
    const statuses = (await Promise.all(ctx.inst.map(balanceOf))).map((b) => b.status);
    expect(statuses.every((s) => s === "paid")).toBe(true);
    await discounts.revoke({ schoolId: ctx.schoolId, userId: ctx.superAdmin.id, id: d.id, reason: "Test cleanup" });
  });

  test("a discount approved before fees exist is applied when they are generated", async () => {
    if (!ctx.enrolment2) return;
    const d = await discounts.request({ schoolId: ctx.schoolId, userId: ctx.accountant.id, studentId: ctx.enrolment2.studentId, academicYearId: ctx.yearId, feeTypeId: ctx.feeTypeId, kind: "FIXED", value: "500", category: "DISCOUNT", name: "Sibling", reason: "Second child at the school" });
    const r = await discounts.approve({ schoolId: ctx.schoolId, userId: ctx.admin.id, id: d.id });
    expect(r.applied).toBe(0);
    await obligations.generate({ schoolId: ctx.schoolId, userId: ctx.accountant.id, actorRole: "ACCOUNTANT", studentClassIds: [ctx.enrolment2.id], classId: ctx.enrolment2.classId, academicYearId: ctx.yearId });
    const ob = await prisma.feeObligation.findFirst({ where: { studentClassId: ctx.enrolment2.id, feeStructureId: ctx.structureId } });
    expect(Number(ob.discountTotal)).toBe(500);
  });
});

describe("statements, overdue and cancellation", () => {
  test("the statement flags overdue installments", async () => {
    if (!ctx.enrolment2) return;
    const s = await obligations.statement({ schoolId: ctx.schoolId, studentId: ctx.enrolment2.studentId, academicYearId: ctx.yearId });
    const fee = s.years[0].fees.find((f) => f.feeType.id === ctx.feeTypeId);
    expect(fee.installments[0].overdue).toBe(true); // Term 1 was due 2025-05-01, nothing paid
    expect(fee.installments[2].overdue).toBe(false); // no due date
    expect(s.years[0].status).toBe("overdue");
  });

  test("a fee with money paid on it cannot be cancelled", async () => {
    await expect(obligations.cancel({ schoolId: ctx.schoolId, userId: ctx.admin.id, obligationId: ctx.obligationId, reason: "Not applicable" })).rejects.toMatchObject({ statusCode: 409 });
  });

  test("an unpaid fee can be cancelled and drops out of the totals", async () => {
    if (!ctx.enrolment2) return;
    const ob = await prisma.feeObligation.findFirst({ where: { studentClassId: ctx.enrolment2.id, feeStructureId: ctx.structureId } });
    await obligations.cancel({ schoolId: ctx.schoolId, userId: ctx.admin.id, obligationId: ob.id, reason: "Student exempt from this fee" });
    const s = await obligations.statement({ schoolId: ctx.schoolId, studentId: ctx.enrolment2.studentId, academicYearId: ctx.yearId });
    const fee = s.years[0].fees.find((f) => f.id === ob.id);
    expect(fee).toMatchObject({ cancelled: true, balance: 0, status: "cancelled" });
  });
});

describe("reconciliation", () => {
  test("every cached balance matches the ledger", async () => {
    const r = await obligations.reconcile({ schoolId: ctx.schoolId });
    expect(r.problems).toEqual([]);
    expect(r.ok).toBe(true);
  });
});
