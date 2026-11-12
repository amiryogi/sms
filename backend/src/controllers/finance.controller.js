/**
 * Fee ledger endpoints. Business rules live in services/finance/*; this file
 * only checks access, shapes requests and responses.
 */
const prisma = require("../config/database");
const { dialect } = require("../database");
const { ApiError, ApiResponse, asyncHandler, parsePagination } = require("../utils");
const { getFeeManagementRole } = require("../middleware");
const ledger = require("../services/finance/ledger.service");
const discounts = require("../services/finance/discount.service");
const obligations = require("../services/finance/obligation.service");
const reports = require("../services/finance/reports.service");
const { toCsv } = require("../utils/csv");
const { daybookTotals } = require("../utils/financeReports");
const { convertADToBS } = require("../utils/dateConverter");
const { fullName } = require("../utils/names");

const FEE_STAFF = ["ADMIN", "SUPER_ADMIN", "ACCOUNTANT"];
const isFeeStaff = (user) => user.roles.some((r) => FEE_STAFF.includes(r));
const isAdminUser = (user) => user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN");

/**
 * Students may read their own fees; parents their linked children's; fee staff
 * anyone's in the school. Fails closed when a profile id is missing.
 */
const assertCanViewStudent = async (user, studentId) => {
  const id = Number(studentId);
  if (isFeeStaff(user)) return;
  if (user.roles.includes("STUDENT") && user.studentId && user.studentId === id) return;
  if (user.roles.includes("PARENT") && user.parentId) {
    const link = await prisma.studentParent.findFirst({ where: { parentId: user.parentId, studentId: id, schoolId: user.schoolId }, select: { id: true } });
    if (link) return;
  }
  throw ApiError.forbidden("You can only view your own fees");
};

// ---------- accounts and statements ----------

const listAccounts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  // Without academicYearId this is the current year; each row is for that year.
  const result = await obligations.accounts({ schoolId: req.user.schoolId, ...req.query, skip, take: limit });
  return ApiResponse.paginated(res, result.rows, { page, limit, total: result.total }, `Accounts for ${result.academicYear.name}`);
});

const getStatement = asyncHandler(async (req, res) => {
  await assertCanViewStudent(req.user, req.params.studentId);
  const data = await obligations.statement({ schoolId: req.user.schoolId, studentId: req.params.studentId, academicYearId: req.query.academicYearId });
  ApiResponse.success(res, data, "Statement retrieved");
});

// ---------- transactions ----------

const recordPayment = asyncHandler(async (req, res) => {
  const result = await ledger.recordPayment({ ...req.body, schoolId: req.user.schoolId, userId: req.user.id });
  const t = result.transaction;
  if (result.replayed) return ApiResponse.success(res, { ...t, replayed: true }, `Already recorded as ${t.receiptNumber}`);
  return ApiResponse.created(res, { ...t, replayed: false }, `Payment recorded. Receipt ${t.receiptNumber}`);
});

/** The ledger filter shared by the list and the printed day book. */
const transactionWhere = (schoolId, { from, to, type, method, classId, academicYearId, studentId, search }) => {
  const where = { schoolId };
  if (type) where.type = type;
  if (method) where.method = method;
  if (academicYearId) where.academicYearId = Number(academicYearId);
  if (studentId) where.studentId = Number(studentId);
  if (classId) where.studentClass = { classId: Number(classId) };
  if (from || to) where.paidOn = { ...(from ? { gte: new Date(`${from.slice(0, 10)}T00:00:00Z`) } : {}), ...(to ? { lte: new Date(`${to.slice(0, 10)}T00:00:00Z`) } : {}) };
  if (search) {
    where.OR = [
      { receiptNumber: dialect.text.search(search) },
      { reference: dialect.text.search(search) },
      { student: { admissionNumber: dialect.text.search(search) } },
      { student: { user: { firstName: dialect.text.search(search) } } },
      { student: { user: { middleName: dialect.text.search(search) } } },
      { student: { user: { lastName: dialect.text.search(search) } } },
    ];
  }
  return where;
};

const listTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const where = transactionWhere(req.user.schoolId, req.query);
  const [rows, total] = await Promise.all([
    prisma.feeTransaction.findMany({ where, include: ledger.RECEIPT_INCLUDE, orderBy: [{ paidOn: "desc" }, { id: "desc" }], skip, take: limit }),
    prisma.feeTransaction.count({ where }),
  ]);
  return ApiResponse.paginated(res, rows, { page, limit, total });
});

/**
 * Every ledger entry in a date range (at most 366 days, at most DAYBOOK_LIMIT
 * entries), oldest first, with per-method totals: the printed day book.
 */
const DAYBOOK_LIMIT = 5000;
const getDaybook = asyncHandler(async (req, res) => {
  const from = String(req.query.from).slice(0, 10);
  const to = String(req.query.to).slice(0, 10);
  if (to < from) throw ApiError.badRequest("The end date is before the start date");
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 366) throw ApiError.badRequest("Print at most one year at a time");
  const where = transactionWhere(req.user.schoolId, { ...req.query, from, to });
  const rows = await prisma.feeTransaction.findMany({
    where,
    orderBy: [{ paidOn: "asc" }, { id: "asc" }],
    take: DAYBOOK_LIMIT + 1,
    select: {
      id: true,
      receiptNumber: true,
      type: true,
      paidOn: true,
      method: true,
      reference: true,
      amount: true,
      student: { select: { id: true, admissionNumber: true, user: { select: { firstName: true, middleName: true, lastName: true } } } },
      studentClass: { select: { rollNumber: true, class: { select: { name: true } }, section: { select: { name: true } } } },
      recordedBy: { select: { id: true, firstName: true, middleName: true, lastName: true } },
      reverses: { select: { receiptNumber: true } },
      reversedBy: { select: { receiptNumber: true } },
    },
  });
  if (rows.length > DAYBOOK_LIMIT) throw ApiError.badRequest(`More than ${DAYBOOK_LIMIT} entries: print a shorter period`);
  ApiResponse.success(
    res,
    {
      from,
      to,
      fromBs: convertADToBS(new Date(`${from}T00:00:00Z`))?.formatted || null,
      toBs: convertADToBS(new Date(`${to}T00:00:00Z`))?.formatted || null,
      rows,
      totals: daybookTotals(rows),
    },
    "Day book retrieved",
  );
});

// ---------- fee bills (due notices) ----------

const listBills = asyncHandler(async (req, res) => {
  const { academicYearId, classId, sectionId, dueBy, includeZero } = req.query;
  const data = await obligations.bills({ schoolId: req.user.schoolId, academicYearId, classId, sectionId, dueBy, includeZero: includeZero === true || includeZero === "true" });
  ApiResponse.success(res, data, `${data.bills.length} bill(s)`);
});

const getStudentBill = asyncHandler(async (req, res) => {
  await assertCanViewStudent(req.user, req.params.studentId);
  const data = await obligations.bills({ schoolId: req.user.schoolId, studentId: req.params.studentId, academicYearId: req.query.academicYearId, dueBy: req.query.dueBy, includeZero: true });
  if (data.bills.length === 0) throw ApiError.notFound("The student is not enrolled in this academic year");
  ApiResponse.success(res, { ...data, bill: data.bills[0], bills: undefined }, "Bill retrieved");
});

const getTransaction = asyncHandler(async (req, res) => {
  const t = await ledger.getReceipt(req.user.schoolId, req.params.id);
  if (!t) throw ApiError.notFound("Receipt not found");
  await assertCanViewStudent(req.user, t.studentId);
  ApiResponse.success(res, t, "Receipt retrieved");
});

// ---------- reversals ----------

const requestReversal = asyncHandler(async (req, res) => {
  const r = await ledger.requestReversal({ schoolId: req.user.schoolId, userId: req.user.id, transactionId: req.params.id, reason: req.body.reason, category: req.body.category });
  ApiResponse.created(res, r, "Reversal requested. An administrator must approve it.");
});

const reverseDirectly = asyncHandler(async (req, res) => {
  const t = await ledger.reversePayment({ schoolId: req.user.schoolId, userId: req.user.id, transactionId: req.params.id, reason: req.body.reason, category: req.body.category });
  ApiResponse.created(res, t, `Payment reversed. Reversal ${t.receiptNumber}`);
});

const listReversalRequests = asyncHandler(async (req, res) => {
  const where = { schoolId: req.user.schoolId };
  if (req.query.status) where.status = req.query.status;
  const rows = await prisma.feeReversalRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      transaction: { include: ledger.RECEIPT_INCLUDE },
      reversalTxn: { select: { id: true, receiptNumber: true, paidOn: true } },
      requestedBy: { select: { id: true, firstName: true, middleName: true, lastName: true } },
      decidedBy: { select: { id: true, firstName: true, middleName: true, lastName: true } },
    },
  });
  ApiResponse.success(res, rows, "Reversal requests retrieved");
});

const approveReversal = asyncHandler(async (req, res) => {
  const t = await ledger.approveReversal({ schoolId: req.user.schoolId, userId: req.user.id, requestId: req.params.id, note: req.body.note });
  ApiResponse.success(res, t, `Reversal approved. Reversal ${t.receiptNumber}`);
});

const rejectReversal = asyncHandler(async (req, res) => {
  const r = await ledger.rejectReversal({ schoolId: req.user.schoolId, userId: req.user.id, requestId: req.params.id, note: req.body.note });
  ApiResponse.success(res, r, "Reversal request rejected");
});

// ---------- discounts ----------

const listDiscounts = asyncHandler(async (req, res) => {
  ApiResponse.success(res, await discounts.list({ schoolId: req.user.schoolId, ...req.query }), "Discounts retrieved");
});

const requestDiscount = asyncHandler(async (req, res) => {
  const d = await discounts.request({ ...req.body, schoolId: req.user.schoolId, userId: req.user.id });
  ApiResponse.created(res, d, "Discount requested. An administrator must approve it.");
});

const updateDiscount = asyncHandler(async (req, res) => {
  const d = await discounts.update({ schoolId: req.user.schoolId, userId: req.user.id, isAdmin: isAdminUser(req.user), id: req.params.id, changes: req.body });
  ApiResponse.success(res, d, "Discount updated");
});

const approveDiscount = asyncHandler(async (req, res) => {
  const r = await discounts.approve({ schoolId: req.user.schoolId, userId: req.user.id, id: req.params.id, note: req.body.note });
  const message = r.capped > 0 ? `Discount approved. ${r.capped} could not be applied because those fees are already paid.` : "Discount approved";
  ApiResponse.success(res, r, message);
});

const rejectDiscount = asyncHandler(async (req, res) => {
  ApiResponse.success(res, await discounts.reject({ schoolId: req.user.schoolId, userId: req.user.id, id: req.params.id, note: req.body.note }), "Discount rejected");
});

const revokeDiscount = asyncHandler(async (req, res) => {
  ApiResponse.success(res, await discounts.revoke({ schoolId: req.user.schoolId, userId: req.user.id, id: req.params.id, reason: req.body.reason }), "Discount revoked");
});

// ---------- obligations and templates ----------

/** POST /fees/obligations/generate/:studentClassId — one student's fees for their enrolment. */
const generateForEnrolment = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const enrolment = await prisma.studentClass.findFirst({
    where: { id: Number(req.params.studentClassId), schoolId },
    include: { student: { include: { user: { select: { firstName: true, middleName: true, lastName: true } } } } },
  });
  if (!enrolment) throw ApiError.notFound("Student enrollment not found");

  const count = await obligations.generate({
    schoolId,
    userId: req.user.id,
    actorRole: getFeeManagementRole(req.user),
    studentClassIds: [enrolment.id],
    classId: enrolment.classId,
    academicYearId: enrolment.academicYearId,
  });
  if (count === 0) throw ApiError.conflict("Fee records already exist for this enrollment");
  const name = fullName(enrolment.student.user);
  ApiResponse.created(res, { count }, `${count} fee records generated for ${name}`);
});

/** POST /fees/obligations/generate-bulk { classId, academicYearId } — every active student in a class. */
const generateForClass = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const { classId, academicYearId } = req.body;
  const enrolments = await prisma.studentClass.findMany({ orderBy: { id: "asc" }, where: { schoolId, classId, academicYearId, status: "active" }, select: { id: true } });
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

const cancelObligation = asyncHandler(async (req, res) => {
  const o = await obligations.cancel({ schoolId: req.user.schoolId, userId: req.user.id, obligationId: req.params.id, reason: req.body.reason });
  ApiResponse.success(res, o, "Fee cancelled");
});

const getInstallmentTemplate = asyncHandler(async (req, res) => {
  ApiResponse.success(res, await obligations.getTemplate({ schoolId: req.user.schoolId, feeStructureId: req.params.id }), "Installment plan retrieved");
});

const setInstallmentTemplate = asyncHandler(async (req, res) => {
  const fs = await obligations.setTemplate({ schoolId: req.user.schoolId, feeStructureId: req.params.id, installments: req.body.installments });
  ApiResponse.success(res, fs, "Installment plan saved. It applies to fees generated from now on.");
});

const reconcile = asyncHandler(async (req, res) => {
  const r = await obligations.reconcile({ schoolId: req.user.schoolId });
  ApiResponse.success(res, r, r.ok ? "Every balance matches the ledger" : `${r.problems.length} difference(s) found`);
});

// ---------- dashboard and reports ----------

const getDashboard = asyncHandler(async (req, res) => {
  ApiResponse.success(res, await reports.dashboard({ schoolId: req.user.schoolId, ...req.query }), "Finance dashboard");
});

/**
 * GET /fees/reports/:report — JSON by default; ?format=csv downloads the same
 * rows as a spreadsheet (the one documented exception to the JSON envelope).
 */
const getReport = asyncHandler(async (req, res) => {
  const data = await reports.report(req.params.report, { schoolId: req.user.schoolId, ...req.query });
  if (req.query.format === "csv") {
    const filename = `${data.report}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(toCsv(data.columns, data.totals ? [...data.rows, data.totals] : data.rows));
  }
  return ApiResponse.success(res, data, data.title);
});

module.exports = {
  assertCanViewStudent,
  getFeeManagementRole,
  listAccounts,
  getStatement,
  recordPayment,
  listTransactions,
  getDaybook,
  listBills,
  getStudentBill,
  getTransaction,
  requestReversal,
  reverseDirectly,
  listReversalRequests,
  approveReversal,
  rejectReversal,
  listDiscounts,
  requestDiscount,
  updateDiscount,
  approveDiscount,
  rejectDiscount,
  revokeDiscount,
  generateForEnrolment,
  generateForClass,
  cancelObligation,
  getInstallmentTemplate,
  setInstallmentTemplate,
  reconcile,
  getDashboard,
  getReport,
};
