/**
 * The payment ledger: record payments and reverse them.
 *
 * Rules (docs/plans/finance-and-portals.md §3):
 * - A payment never exceeds what the installments it pays still owe.
 * - Transactions are never updated or deleted; a mistake is undone by a
 *   REVERSAL that mirrors the original payment's allocations.
 * - The same idempotencyKey always returns the first receipt.
 * - Receipt numbers are sequential per school, series and Nepali fiscal year.
 */
const prisma = require("../../config/database");
const { ApiError } = require("../../utils");
const m = require("../../utils/money");
const { allocatePayment, checkAllocations } = require("../../utils/feeAllocation");
const { fiscalYearOf, formatReceiptNumber, kathmanduToday, dateOnly } = require("../../utils/fiscalYear");
const { lockInstallments, refreshBalances, withTransaction } = require("./balances");
const { convertADToBS } = require("../../utils/dateConverter");

const RECEIPT_INCLUDE = {
  student: { select: { id: true, admissionNumber: true, user: { select: { firstName: true, lastName: true } } } },
  studentClass: { select: { rollNumber: true, class: { select: { name: true } }, section: { select: { name: true } } } },
  academicYear: { select: { id: true, name: true } },
  recordedBy: { select: { id: true, firstName: true, lastName: true } },
  reverses: { select: { id: true, receiptNumber: true, paidOn: true, amount: true } },
  reversedBy: { select: { id: true, receiptNumber: true, paidOn: true, reversalReason: true, reversalCategory: true } },
  allocations: {
    select: {
      amount: true,
      installment: {
        select: {
          id: true,
          label: true,
          sequence: true,
          dueDate: true,
          obligation: { select: { id: true, feeStructure: { select: { feeType: { select: { id: true, name: true } } } } } },
        },
      },
    },
  },
};

/** Take the next number of a series in a fiscal year (locks the sequence row). */
const nextReceiptNumber = async (tx, schoolId, series, fiscalYear) => {
  await tx.$executeRaw`INSERT IGNORE INTO receipt_sequences (school_id, series, fiscal_year, next_number) VALUES (${schoolId}, ${series}, ${fiscalYear}, 1)`;
  const [row] = await tx.$queryRaw`SELECT next_number FROM receipt_sequences WHERE school_id = ${schoolId} AND series = ${series} AND fiscal_year = ${fiscalYear} FOR UPDATE`;
  await tx.$executeRaw`UPDATE receipt_sequences SET next_number = next_number + 1 WHERE school_id = ${schoolId} AND series = ${series} AND fiscal_year = ${fiscalYear}`;
  return formatReceiptNumber(series, fiscalYear, Number(row.next_number));
};

/** The enrolment a payment is for: the given academic year, else the current one. */
const findEnrolment = async (tx, schoolId, studentId, academicYearId) => {
  const where = { studentId: Number(studentId), schoolId };
  if (academicYearId) where.academicYearId = Number(academicYearId);
  else where.academicYear = { isCurrent: true, schoolId };
  const enrolment = await tx.studentClass.findFirst({ where, select: { id: true, studentId: true, academicYearId: true } });
  if (!enrolment) throw ApiError.notFound("This student has no enrolment for that academic year");
  return enrolment;
};

/** One transaction with everything a printed receipt needs, plus its BS date. */
const getReceipt = async (schoolId, id, client = prisma) => {
  const t = await client.feeTransaction.findFirst({ where: { id: Number(id), schoolId }, include: RECEIPT_INCLUDE });
  return t ? { ...t, paidOnBs: convertADToBS(t.paidOn)?.formatted || null } : null;
};

/**
 * Record a payment.
 * input: { schoolId, userId, studentId, academicYearId?, amount, allocations?, obligationId?,
 *          method, reference?, paidOn?, remarks?, idempotencyKey? }
 * obligationId limits automatic allocation to one fee (used by the old endpoint).
 * Returns { transaction, replayed }.
 */
const recordPayment = async (input) => {
  const { schoolId, userId, idempotencyKey } = input;
  const amount = m.money(input.amount);
  if (!m.isPositive(amount) || !m.hasAtMostTwoDecimals(input.amount)) {
    throw ApiError.badRequest("Amount must be more than 0 with at most 2 decimal places");
  }
  const paidOnIso = input.paidOn ? String(input.paidOn).slice(0, 10) : kathmanduToday();
  if (paidOnIso > kathmanduToday()) throw ApiError.badRequest("Payment date cannot be in the future");
  const fiscalYear = fiscalYearOf(paidOnIso);
  if (!fiscalYear) throw ApiError.badRequest("Invalid payment date");

  const replay = async () => {
    if (!idempotencyKey) return null;
    const existing = await prisma.feeTransaction.findUnique({ where: { schoolId_idempotencyKey: { schoolId, idempotencyKey } }, select: { id: true } });
    return existing ? { transaction: await getReceipt(schoolId, existing.id), replayed: true } : null;
  };
  const earlier = await replay();
  if (earlier) return earlier;

  try {
    const id = await withTransaction(prisma, async (tx) => {
      const enrolment = await findEnrolment(tx, schoolId, input.studentId, input.academicYearId);

      // Candidate installments: this enrolment's live fees (optionally one fee).
      const candidateWhere = {
        schoolId,
        status: { not: "cancelled" },
        obligation: { studentClassId: enrolment.id, cancelledAt: null, ...(input.obligationId ? { id: Number(input.obligationId) } : {}) },
      };
      const explicit = Array.isArray(input.allocations) && input.allocations.length > 0;
      if (explicit) candidateWhere.id = { in: input.allocations.map((a) => Number(a.installmentId)) };

      const candidateIds = (await tx.feeInstallment.findMany({ where: candidateWhere, select: { id: true } })).map((r) => r.id);
      await lockInstallments(tx, candidateIds);
      const installments = await tx.feeInstallment.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true, obligationId: true, sequence: true, dueDate: true, amount: true, discountTotal: true, paidTotal: true, status: true },
      });

      let allocations;
      if (explicit) {
        const byId = new Map(installments.map((i) => [i.id, i]));
        const problems = checkAllocations(byId, input.allocations);
        if (problems.length) throw ApiError.conflict(problems.join("; "));
        const total = m.sum(input.allocations, (a) => a.amount);
        if (m.cmp(total, amount) !== 0) throw ApiError.badRequest(`Allocations add up to ${m.toFixed2(total)}, not ${m.toFixed2(amount)}`);
        allocations = input.allocations.map((a) => ({ installmentId: Number(a.installmentId), amount: m.money(a.amount) }));
      } else {
        const result = allocatePayment(installments, amount);
        if (m.isPositive(result.unallocated)) {
          const owed = m.sub(amount, result.unallocated);
          throw ApiError.conflict(`Payment exceeds the balance. Owed: ${m.toFixed2(owed)}, paying: ${m.toFixed2(amount)}`);
        }
        allocations = result.allocations;
      }
      if (allocations.length === 0) throw ApiError.conflict("Nothing is owed on the selected fees");

      const receiptNumber = await nextReceiptNumber(tx, schoolId, "RCP", fiscalYear);
      const created = await tx.feeTransaction.create({
        data: {
          schoolId,
          studentId: enrolment.studentId,
          studentClassId: enrolment.id,
          academicYearId: enrolment.academicYearId,
          type: "PAYMENT",
          amount,
          paidOn: dateOnly(paidOnIso),
          method: input.method,
          reference: input.reference || null,
          remarks: input.remarks || null,
          receiptNumber,
          fiscalYear,
          idempotencyKey: idempotencyKey || null,
          recordedById: userId,
          allocations: { create: allocations.map((a) => ({ installmentId: a.installmentId, amount: a.amount })) },
        },
        select: { id: true },
      });
      await refreshBalances(tx, allocations.map((a) => a.installmentId));
      return created.id;
    });
    return { transaction: await getReceipt(schoolId, id), replayed: false };
  } catch (error) {
    // Two requests with the same key raced: the loser returns the winner's receipt.
    if (error?.code === "P2002" && idempotencyKey && String(error.meta?.target || "").includes("idempotency")) {
      const again = await replay();
      if (again) return again;
    }
    throw error;
  }
};

/**
 * Reverse a PAYMENT in full. Dated today (cash basis): it reduces today's
 * collection, never a past day's. Optional requestId marks that request approved.
 */
const reversePayment = async ({ schoolId, userId, transactionId, reason, category, requestId = null, decisionNote = null }) => {
  const id = await withTransaction(prisma, async (tx) => {
    await tx.$queryRaw`SELECT id FROM fee_transactions WHERE id = ${Number(transactionId)} AND school_id = ${schoolId} FOR UPDATE`;
    const original = await tx.feeTransaction.findFirst({
      where: { id: Number(transactionId), schoolId },
      include: { allocations: true, reversedBy: { select: { id: true } } },
    });
    if (!original) throw ApiError.notFound("Payment not found");
    if (original.type !== "PAYMENT") throw ApiError.badRequest("Only payments can be reversed");
    if (original.reversedBy) throw ApiError.conflict("This payment has already been reversed");

    await lockInstallments(tx, original.allocations.map((a) => a.installmentId));
    const today = kathmanduToday();
    const fiscalYear = fiscalYearOf(today);
    const receiptNumber = await nextReceiptNumber(tx, schoolId, "REV", fiscalYear);
    const reversal = await tx.feeTransaction.create({
      data: {
        schoolId,
        studentId: original.studentId,
        studentClassId: original.studentClassId,
        academicYearId: original.academicYearId,
        type: "REVERSAL",
        amount: original.amount,
        paidOn: dateOnly(today),
        method: original.method,
        reference: original.reference,
        remarks: `Reverses ${original.receiptNumber}`,
        receiptNumber,
        fiscalYear,
        reversesId: original.id,
        reversalReason: reason,
        reversalCategory: category,
        recordedById: userId,
        allocations: { create: original.allocations.map((a) => ({ installmentId: a.installmentId, amount: a.amount })) },
      },
      select: { id: true },
    });
    await refreshBalances(tx, original.allocations.map((a) => a.installmentId));

    if (requestId) {
      const updated = await tx.feeReversalRequest.updateMany({
        where: { id: Number(requestId), schoolId, status: "PENDING" },
        data: { status: "APPROVED", decidedById: userId, decidedAt: new Date(), decisionNote, reversalTxnId: reversal.id },
      });
      if (updated.count !== 1) throw ApiError.conflict("This request has already been decided");
    }
    return reversal.id;
  });
  return getReceipt(schoolId, id);
};

/** An accountant or admin asks for a payment to be reversed. */
const requestReversal = async ({ schoolId, userId, transactionId, reason, category }) => {
  const txn = await prisma.feeTransaction.findFirst({
    where: { id: Number(transactionId), schoolId },
    select: { id: true, type: true, reversedBy: { select: { id: true } } },
  });
  if (!txn) throw ApiError.notFound("Payment not found");
  if (txn.type !== "PAYMENT") throw ApiError.badRequest("Only payments can be reversed");
  if (txn.reversedBy) throw ApiError.conflict("This payment has already been reversed");
  const pending = await prisma.feeReversalRequest.findFirst({ where: { transactionId: txn.id, status: "PENDING" }, select: { id: true } });
  if (pending) throw ApiError.conflict("A reversal request for this payment is already waiting for approval");
  return prisma.feeReversalRequest.create({
    data: { schoolId, transactionId: txn.id, reason, category, requestedById: userId },
  });
};

/** An admin (not the requester) approves: the reversal is created in the same transaction. */
const approveReversal = async ({ schoolId, userId, requestId, note }) => {
  const request = await prisma.feeReversalRequest.findFirst({ where: { id: Number(requestId), schoolId } });
  if (!request) throw ApiError.notFound("Reversal request not found");
  if (request.status !== "PENDING") throw ApiError.conflict("This request has already been decided");
  if (request.requestedById === userId) throw ApiError.forbidden("You cannot approve your own reversal request");
  return reversePayment({
    schoolId,
    userId,
    transactionId: request.transactionId,
    reason: request.reason,
    category: request.category,
    requestId: request.id,
    decisionNote: note || null,
  });
};

const rejectReversal = async ({ schoolId, userId, requestId, note }) => {
  const request = await prisma.feeReversalRequest.findFirst({ where: { id: Number(requestId), schoolId } });
  if (!request) throw ApiError.notFound("Reversal request not found");
  if (request.requestedById === userId) throw ApiError.forbidden("You cannot decide your own reversal request");
  const updated = await prisma.feeReversalRequest.updateMany({
    where: { id: request.id, status: "PENDING" },
    data: { status: "REJECTED", decidedById: userId, decidedAt: new Date(), decisionNote: note || null },
  });
  if (updated.count !== 1) throw ApiError.conflict("This request has already been decided");
  return prisma.feeReversalRequest.findUnique({ where: { id: request.id } });
};

module.exports = {
  RECEIPT_INCLUDE,
  getReceipt,
  recordPayment,
  reversePayment,
  requestReversal,
  approveReversal,
  rejectReversal,
  nextReceiptNumber,
};
