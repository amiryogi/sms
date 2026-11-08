/**
 * The original fee endpoints, kept with their old response shapes while the
 * frontend moves to the ledger API (finance.controller.js). Since Phase 3 they
 * run on the ledger: payments go through ledger.recordPayment, and the
 * paymentDate / receiptNumber / paymentMethod fields are derived from the
 * latest payment instead of being stored. Removed in Phase 8.
 */
const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");
const { getFeeManagementRole } = require("../middleware");
const m = require("../utils/money");
const ledger = require("../services/finance/ledger.service");
const { PAYMENT_METHODS } = require("../validators/finance.validators");
const obligations = require("../services/finance/obligation.service");

const FEE_ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "ACCOUNTANT"];
const isFeeAdmin = (roles = []) => roles.some((role) => FEE_ADMIN_ROLES.includes(role));

// The old payment form offered "upi"; the ledger calls it a wallet payment.
const METHOD_ALIASES = { upi: "wallet" };

const OBLIGATION_INCLUDE = {
  studentClass: {
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      academicYear: { select: { id: true, name: true } },
    },
  },
  feeStructure: { include: { feeType: { select: { id: true, name: true } } } },
};

/** Latest live (not reversed) payment per obligation: { obligationId: txn }. */
const latestPayments = async (obligationIds) => {
  if (obligationIds.length === 0) return new Map();
  const allocations = await prisma.feeAllocation.findMany({
    where: {
      installment: { obligationId: { in: obligationIds } },
      transaction: { type: "PAYMENT", reversedBy: null },
    },
    select: {
      installment: { select: { obligationId: true } },
      transaction: { select: { id: true, paidOn: true, receiptNumber: true, method: true, createdAt: true } },
    },
  });
  const latest = new Map();
  for (const a of allocations) {
    const key = a.installment.obligationId;
    const t = a.transaction;
    const prev = latest.get(key);
    if (!prev || t.paidOn > prev.paidOn || (t.paidOn.getTime() === prev.paidOn.getTime() && t.id > prev.id)) latest.set(key, t);
  }
  return latest;
};

/** The old row shape plus discountTotal and balance. */
const withDerived = (rows, latest) =>
  rows.map((fp) => {
    const t = latest.get(fp.id);
    return {
      ...fp,
      paymentDate: t?.paidOn ?? null,
      receiptNumber: t?.receiptNumber ?? null,
      paymentMethod: t?.method ?? null,
      balance: fp.cancelledAt ? 0 : m.toNumber(m.sub(m.sub(fp.amountDue, fp.discountTotal), fp.amountPaid)),
    };
  });

/**
 * @route GET /api/v1/fees/payments
 * Admin/accountant: all; student: own; parent: children.
 */
const getFeePayments = asyncHandler(async (req, res) => {
  const { studentId, classId, academicYearId, status } = req.query;
  const schoolId = req.user.schoolId;
  const userRoles = req.user.roles || [];
  const where = { schoolId };

  if (isFeeAdmin(userRoles)) {
    if (studentId) where.studentClass = { studentId: parseInt(studentId) };
  } else if (userRoles.includes("STUDENT")) {
    if (!req.user.studentId) throw ApiError.forbidden("Student profile not found");
    where.studentClass = { studentId: req.user.studentId };
  } else if (userRoles.includes("PARENT")) {
    if (!req.user.parentId) throw ApiError.forbidden("Parent profile not found");
    const links = await prisma.studentParent.findMany({ where: { parentId: req.user.parentId, schoolId }, select: { studentId: true } });
    where.studentClass = { studentId: { in: links.map((l) => l.studentId) } };
  } else {
    throw ApiError.forbidden("You are not allowed to view fee records");
  }

  if (classId) where.studentClass = { ...where.studentClass, classId: parseInt(classId) };
  if (academicYearId) where.studentClass = { ...where.studentClass, academicYearId: parseInt(academicYearId) };
  if (status) where.status = status;

  const rows = await prisma.feeObligation.findMany({
    where,
    include: OBLIGATION_INCLUDE,
    orderBy: [{ studentClass: { academicYear: { name: "desc" } } }, { createdAt: "desc" }],
  });
  ApiResponse.success(res, withDerived(rows, await latestPayments(rows.map((r) => r.id))));
});

/**
 * @route GET /api/v1/fees/payments/student/:studentId
 * Old summary shape. New code should use GET /fees/accounts/:studentId.
 */
const getStudentFeeSummary = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { academicYearId } = req.query;
  const schoolId = req.user.schoolId;
  const userRoles = req.user.roles || [];

  if (!isFeeAdmin(userRoles)) {
    if (userRoles.includes("STUDENT")) {
      if (!req.user.studentId || req.user.studentId !== parseInt(studentId)) throw ApiError.forbidden("You can only view your own fees");
    } else if (userRoles.includes("PARENT")) {
      const link = req.user.parentId
        ? await prisma.studentParent.findFirst({ where: { parentId: req.user.parentId, studentId: parseInt(studentId), schoolId }, select: { id: true } })
        : null;
      if (!link) throw ApiError.forbidden("You can only view your children's fees");
    } else {
      throw ApiError.forbidden("You are not allowed to view fee records");
    }
  }

  const studentClassWhere = { studentId: parseInt(studentId), schoolId };
  if (academicYearId) studentClassWhere.academicYearId = parseInt(academicYearId);

  const studentClasses = await prisma.studentClass.findMany({
    where: studentClassWhere,
    include: {
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      feeObligations: { where: { cancelledAt: null }, include: { feeStructure: { include: { feeType: { select: { id: true, name: true } } } } } },
    },
    orderBy: { academicYear: { name: "desc" } },
  });
  const latest = await latestPayments(studentClasses.flatMap((sc) => sc.feeObligations.map((o) => o.id)));

  const summary = studentClasses.map((sc) => {
    const totalDue = m.sum(sc.feeObligations, (fp) => m.sub(fp.amountDue, fp.discountTotal));
    const totalPaid = m.sum(sc.feeObligations, (fp) => fp.amountPaid);
    const balance = m.sub(totalDue, totalPaid);
    return {
      studentClass: { id: sc.id, class: sc.class, section: sc.section, academicYear: sc.academicYear, rollNumber: sc.rollNumber },
      student: { id: sc.student.id, name: `${sc.student.user.firstName} ${sc.student.user.lastName}` },
      fees: sc.feeObligations.map((fp) => {
        const t = latest.get(fp.id);
        return {
          id: fp.id,
          feeType: fp.feeStructure.feeType,
          amountDue: m.toNumber(fp.amountDue),
          discount: m.toNumber(fp.discountTotal),
          amountPaid: m.toNumber(fp.amountPaid),
          balance: m.toNumber(m.sub(m.sub(fp.amountDue, fp.discountTotal), fp.amountPaid)),
          status: fp.status,
          paymentDate: t?.paidOn ?? null,
          receiptNumber: t?.receiptNumber ?? null,
        };
      }),
      totalDue: m.toNumber(totalDue),
      totalPaid: m.toNumber(totalPaid),
      balance: m.toNumber(balance),
      status: !m.isPositive(balance) ? "paid" : m.isPositive(totalPaid) ? "partial" : "pending",
    };
  });

  ApiResponse.success(res, summary);
});

/**
 * @route POST /api/v1/fees/payments/:feePaymentId/pay
 * Old endpoint: pays one fee, oldest installment first, through the ledger.
 */
const recordPayment = asyncHandler(async (req, res) => {
  const { feePaymentId } = req.params;
  const { amountPaid, paymentDate, paymentMethod, remarks, idempotencyKey } = req.body;
  const schoolId = req.user.schoolId;

  const obligation = await prisma.feeObligation.findFirst({
    where: { id: parseInt(feePaymentId), schoolId },
    select: { id: true, cancelledAt: true, studentClass: { select: { studentId: true, academicYearId: true } } },
  });
  if (!obligation) throw ApiError.notFound("Fee payment record not found");
  if (obligation.cancelledAt) throw ApiError.conflict("This fee has been cancelled");
  const method = METHOD_ALIASES[paymentMethod] || paymentMethod || "cash";
  if (!PAYMENT_METHODS.includes(method)) throw ApiError.badRequest(`Payment method must be one of: ${PAYMENT_METHODS.join(", ")}`);

  const { transaction } = await ledger.recordPayment({
    schoolId,
    userId: req.user.id,
    studentId: obligation.studentClass.studentId,
    academicYearId: obligation.studentClass.academicYearId,
    obligationId: obligation.id,
    amount: amountPaid,
    method,
    paidOn: paymentDate ? String(paymentDate).slice(0, 10) : undefined,
    remarks,
    idempotencyKey,
  });

  const updated = await prisma.feeObligation.findUnique({ where: { id: obligation.id }, include: OBLIGATION_INCLUDE });
  const [row] = withDerived([updated], new Map([[obligation.id, transaction]]));
  ApiResponse.success(res, row, `Payment of ${m.toFixed2(transaction.amount)} recorded successfully. Receipt: ${transaction.receiptNumber}`);
});

/**
 * @route POST /api/v1/fees/payments/generate/:studentClassId
 */
const generateStudentFees = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const studentClass = await prisma.studentClass.findFirst({
    where: { id: parseInt(req.params.studentClassId), schoolId },
    include: { student: { include: { user: { select: { firstName: true, lastName: true } } } }, class: true, academicYear: true },
  });
  if (!studentClass) throw ApiError.notFound("Student enrollment not found");

  const count = await obligations.generate({
    schoolId,
    userId: req.user.id,
    actorRole: getFeeManagementRole(req.user),
    studentClassIds: [studentClass.id],
    classId: studentClass.classId,
    academicYearId: studentClass.academicYearId,
  });
  if (count === 0) throw ApiError.conflict("Fee records already exist for this enrollment");
  const name = `${studentClass.student.user.firstName} ${studentClass.student.user.lastName}`;
  ApiResponse.created(res, { count }, `${count} fee records generated for ${name}`);
});

/**
 * @route POST /api/v1/fees/payments/generate-bulk
 */
const bulkGenerateFees = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const classId = parseInt(req.body.classId);
  const academicYearId = parseInt(req.body.academicYearId);
  const enrolments = await prisma.studentClass.findMany({ where: { schoolId, classId, academicYearId, status: "active" }, select: { id: true } });
  if (enrolments.length === 0) throw ApiError.badRequest("No active students found in this class for the selected year");

  const count = await obligations.generate({
    schoolId,
    userId: req.user.id,
    actorRole: getFeeManagementRole(req.user),
    studentClassIds: enrolments.map((e) => e.id),
    classId,
    academicYearId,
  });
  if (count === 0) throw ApiError.conflict("Fee records already exist for all students");
  ApiResponse.created(res, { count }, `${count} fee records generated for ${enrolments.length} students`);
});

module.exports = { getFeePayments, getStudentFeeSummary, recordPayment, generateStudentFees, bulkGenerateFees };
