/**
 * Finance dashboard and reports (Phase 5). Loads ledger and obligation rows
 * for one school and hands them to the pure helpers in utils/financeReports.
 * Every figure is computed here from the database; the frontend only draws it.
 */
const prisma = require("../../config/database");
const { ApiError } = require("../../utils");
const fr = require("../../utils/financeReports");
const { kathmanduToday } = require("../../utils/fiscalYear");
const discountService = require("./discount.service");
const obligationService = require("./obligation.service");
const { RECEIPT_INCLUDE } = require("./ledger.service");

const resolveYear = async (schoolId, academicYearId) => {
  const year = academicYearId
    ? await prisma.academicYear.findFirst({ where: { id: Number(academicYearId), schoolId } })
    : await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
  if (!year) throw ApiError.notFound("Academic year not found");
  return year;
};

/** Live installments (cancelled fees excluded) for a year, flattened for the helpers. */
const loadInstallments = async ({ schoolId, academicYearId, classId, feeTypeId }) => {
  const rows = await prisma.feeInstallment.findMany({
    where: {
      schoolId,
      status: { not: "cancelled" },
      obligation: {
        cancelledAt: null,
        studentClass: { academicYearId, ...(classId ? { classId: Number(classId) } : {}) },
        ...(feeTypeId ? { feeStructure: { feeTypeId: Number(feeTypeId) } } : {}),
      },
    },
    select: {
      id: true,
      obligationId: true,
      dueDate: true,
      amount: true,
      discountTotal: true,
      paidTotal: true,
      obligation: {
        select: {
          studentClass: { select: { studentId: true, classId: true, class: { select: { name: true, displayOrder: true } } } },
          feeStructure: { select: { feeType: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    obligationId: r.obligationId,
    studentId: r.obligation.studentClass.studentId,
    classId: r.obligation.studentClass.classId,
    className: r.obligation.studentClass.class.name,
    classOrder: r.obligation.studentClass.class.displayOrder ?? 0,
    feeTypeId: r.obligation.feeStructure.feeType.id,
    feeTypeName: r.obligation.feeStructure.feeType.name,
    dueDate: r.dueDate,
    amount: r.amount,
    discountTotal: r.discountTotal,
    paidTotal: r.paidTotal,
  }));
};

/**
 * Ledger allocations, flattened. Filters: academicYearId (fees of that year),
 * class, fee type, method, and a paidOn range.
 */
const loadAllocations = async ({ schoolId, academicYearId, classId, feeTypeId, method, from, to }) => {
  const rows = await prisma.feeAllocation.findMany({
    where: {
      transaction: {
        schoolId,
        ...(academicYearId ? { academicYearId } : {}),
        ...(method ? { method } : {}),
        ...(from || to
          ? { paidOn: { ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}), ...(to ? { lte: new Date(`${to}T00:00:00Z`) } : {}) } }
          : {}),
      },
      installment: {
        obligation: {
          ...(classId ? { studentClass: { classId: Number(classId) } } : {}),
          ...(feeTypeId ? { feeStructure: { feeTypeId: Number(feeTypeId) } } : {}),
        },
      },
    },
    select: {
      installmentId: true,
      amount: true,
      transaction: { select: { id: true, type: true, paidOn: true, method: true } },
      installment: {
        select: {
          obligation: {
            select: {
              studentClass: { select: { classId: true, class: { select: { name: true, displayOrder: true } } } },
              feeStructure: { select: { feeType: { select: { id: true, name: true } } } },
            },
          },
        },
      },
    },
  });
  return rows.map((r) => ({
    installmentId: r.installmentId,
    transactionId: r.transaction.id,
    type: r.transaction.type,
    amount: r.amount,
    paidOn: fr.isoDay(r.transaction.paidOn),
    method: r.transaction.method,
    classId: r.installment.obligation.studentClass.classId,
    className: r.installment.obligation.studentClass.class.name,
    classOrder: r.installment.obligation.studentClass.class.displayOrder ?? 0,
    feeTypeId: r.installment.obligation.feeStructure.feeType.id,
    feeTypeName: r.installment.obligation.feeStructure.feeType.name,
  }));
};

/**
 * Everything the finance dashboard shows, for one academic year.
 * Filters: classId, feeTypeId (obligations and collections), method
 * (collections only), from/to (the collection range; default last 30 days).
 */
const dashboard = async ({ schoolId, academicYearId, classId, feeTypeId, method, from, to }) => {
  const year = await resolveYear(schoolId, academicYearId);
  const today = kathmanduToday();
  const rangeTo = to && to < today ? to : today;
  const rangeFrom = from || fr.addDays(rangeTo, -29);
  if (rangeFrom > rangeTo) throw ApiError.badRequest("The start date is after the end date");

  const [installments, allocations] = await Promise.all([
    loadInstallments({ schoolId, academicYearId: year.id, classId, feeTypeId }),
    loadAllocations({ schoolId, academicYearId: year.id, classId, feeTypeId, method }),
  ]);

  // Months from the year's start to its end, or to the latest payment if money
  // for this year was still coming in after it ended; never past today.
  const yearStart = fr.isoDay(year.startDate);
  const lastPaid = allocations.reduce((m, a) => (a.paidOn > m ? a.paidOn : m), fr.isoDay(year.endDate));
  const monthsTo = lastPaid < today ? lastPaid : today;
  const months = yearStart <= monthsTo ? fr.bsMonthsBetween(yearStart, monthsTo) : [];

  const [recent, overdueStudents] = await Promise.all([
    prisma.feeTransaction.findMany({
      where: { schoolId, academicYearId: year.id },
      include: RECEIPT_INCLUDE,
      orderBy: [{ createdAt: "desc" }],
      take: 8,
    }),
    obligationService.accounts({ schoolId, academicYearId: year.id, classId, status: "overdue", skip: 0, take: 1000 }),
  ]);

  return {
    academicYear: { id: year.id, name: year.name, startDate: year.startDate, endDate: year.endDate, isCurrent: year.isCurrent },
    today,
    filters: { classId: classId || null, feeTypeId: feeTypeId || null, method: method || null, from: rangeFrom, to: rangeTo },
    kpis: fr.kpis({ installments, allocations, today, range: { from: rangeFrom, to: rangeTo } }),
    series: {
      daily: fr.dailySeries(allocations, rangeFrom, rangeTo),
      monthly: fr.monthlySeries(allocations, months),
      byClass: fr.byClass(installments),
      byFeeType: fr.byFeeType(installments),
      obligationStatus: fr.obligationStatus(installments, today),
      overdueTrend: fr.overdueTrend(installments, allocations, months, today),
    },
    overdueStudents: overdueStudents.rows.sort((a, b) => b.overdue - a.overdue).slice(0, 8),
    recentTransactions: recent,
  };
};

// ---------- reports ----------

const COLLECTION_GROUPS = { day: "Date", month: "Month (BS)", class: "Class", feeType: "Fee type", method: "Method" };
const COLLECTION_TITLES = { day: "Collections by day", month: "Collections by Nepali month", class: "Collections by class", feeType: "Collections by fee type", method: "Collections by payment method" };
const METHOD_LABELS = { cash: "Cash", cheque: "Cheque", bank_transfer: "Bank transfer", wallet: "Mobile wallet", card: "Card" };

/** Each report returns { title, subtitle, columns: [{ key, label, type }], rows, totals }. */
const REPORTS = {
  /** Money received, cash basis by ledger date, grouped. */
  collections: async ({ schoolId, from, to, groupBy = "day", academicYearId, classId, feeTypeId, method }) => {
    if (!COLLECTION_GROUPS[groupBy]) throw ApiError.badRequest("groupBy must be day, month, class, feeType or method");
    const today = kathmanduToday();
    const end = to || today;
    const start = from || fr.bsMonthOf(end).start;
    const allocations = await loadAllocations({ schoolId, academicYearId: academicYearId ? Number(academicYearId) : undefined, classId, feeTypeId, method, from: start, to: end });
    const rows = fr.collectionRows(allocations, groupBy).map((r) => (groupBy === "method" ? { ...r, label: METHOD_LABELS[r.label] || r.label } : r));
    const sum = (k) => Math.round(rows.reduce((s, r) => s + r[k] * 100, 0)) / 100;
    return {
      title: COLLECTION_TITLES[groupBy],
      subtitle: `${start} to ${end}. Money counts on the date it was recorded; reversals are subtracted on their own date.`,
      columns: [
        { key: "label", label: COLLECTION_GROUPS[groupBy], type: "text" },
        { key: "payments", label: "Payments", type: "number" },
        { key: "received", label: "Received", type: "money" },
        { key: "reversed", label: "Reversed", type: "money" },
        { key: "net", label: "Net collected", type: "money" },
      ],
      rows,
      totals: { label: "Total", payments: rows.reduce((s, r) => s + r.payments, 0), received: sum("received"), reversed: sum("reversed"), net: sum("net") },
    };
  },

  /** What each student still owes for a year (optionally only overdue). */
  outstanding: async ({ schoolId, academicYearId, classId, sectionId, overdueOnly }) => {
    const result = await obligationService.accounts({ schoolId, academicYearId, classId, sectionId, status: overdueOnly === "true" ? "overdue" : undefined, skip: 0, take: 100000 });
    const rows = result.rows
      .filter((r) => r.balance > 0)
      .map((r) => ({ ...r, className: `${r.class?.name || ""} ${r.section?.name || ""}`.trim() }));
    const sum = (k) => Math.round(rows.reduce((s, r) => s + r[k] * 100, 0)) / 100;
    return {
      title: overdueOnly === "true" ? "Overdue fees" : "Outstanding fees",
      subtitle: `${result.academicYear.name}. Balance = fees − approved discounts − net payments.`,
      columns: [
        { key: "name", label: "Student", type: "text" },
        { key: "admissionNumber", label: "Admission no.", type: "text" },
        { key: "className", label: "Class", type: "text" },
        { key: "rollNumber", label: "Roll", type: "number" },
        { key: "amount", label: "Fees", type: "money" },
        { key: "discount", label: "Discount", type: "money" },
        { key: "paid", label: "Paid", type: "money" },
        { key: "balance", label: "Balance", type: "money" },
        { key: "overdue", label: "Overdue", type: "money" },
      ],
      rows,
      totals: { name: `${rows.length} students`, amount: sum("amount"), discount: sum("discount"), paid: sum("paid"), balance: sum("balance"), overdue: sum("overdue") },
    };
  },

  /** Discounts and scholarships with what was actually applied. */
  discounts: async ({ schoolId, academicYearId, status }) => {
    const list = await discountService.list({ schoolId, academicYearId, status });
    const rows = list.map((d) => ({
      student: `${d.student.user.firstName} ${d.student.user.lastName}`,
      admissionNumber: d.student.admissionNumber,
      year: d.academicYear.name,
      name: d.name,
      category: d.category === "SCHOLARSHIP" ? "Scholarship" : "Discount",
      appliesTo: d.feeType?.name || "All fees",
      value: d.kind === "PERCENT" ? `${Number(d.value)}%` : Number(d.value),
      applied: d.appliedAmount,
      status: d.status.charAt(0) + d.status.slice(1).toLowerCase(),
      requestedBy: `${d.requestedBy.firstName} ${d.requestedBy.lastName}`,
      decidedBy: d.approvedBy ? `${d.approvedBy.firstName} ${d.approvedBy.lastName}` : "",
      reason: d.reason,
    }));
    return {
      title: "Discounts and scholarships",
      subtitle: "Applied = what was actually taken off fees (capped at what was unpaid).",
      columns: [
        { key: "student", label: "Student", type: "text" },
        { key: "admissionNumber", label: "Admission no.", type: "text" },
        { key: "year", label: "Year", type: "text" },
        { key: "name", label: "Name", type: "text" },
        { key: "category", label: "Type", type: "text" },
        { key: "appliesTo", label: "Applies to", type: "text" },
        { key: "value", label: "Value", type: "text" },
        { key: "applied", label: "Applied", type: "money" },
        { key: "status", label: "Status", type: "text" },
        { key: "requestedBy", label: "Requested by", type: "text" },
        { key: "decidedBy", label: "Decided by", type: "text" },
        { key: "reason", label: "Reason", type: "text" },
      ],
      rows,
      totals: { student: `${rows.length} records`, applied: Math.round(rows.reduce((s, r) => s + r.applied * 100, 0)) / 100 },
    };
  },

  /** Reversals recorded in a period, with the payment each one undid. */
  reversals: async ({ schoolId, from, to }) => {
    const end = to || kathmanduToday();
    const start = from || fr.addDays(end, -364);
    const txns = await prisma.feeTransaction.findMany({
      where: { schoolId, type: "REVERSAL", paidOn: { gte: new Date(`${start}T00:00:00Z`), lte: new Date(`${end}T00:00:00Z`) } },
      include: { ...RECEIPT_INCLUDE, reversalFor: { select: { requestedBy: { select: { firstName: true, lastName: true } } } } },
      orderBy: [{ paidOn: "desc" }, { id: "desc" }],
    });
    const rows = txns.map((t) => ({
      date: fr.isoDay(t.paidOn),
      receiptNumber: t.receiptNumber,
      reverses: t.reverses?.receiptNumber,
      originalDate: t.reverses ? fr.isoDay(t.reverses.paidOn) : "",
      student: `${t.student.user.firstName} ${t.student.user.lastName}`,
      amount: Number(t.amount),
      category: t.reversalCategory === "REFUND" ? "Refund" : "Correction",
      reason: t.reversalReason,
      requestedBy: t.reversalFor[0] ? `${t.reversalFor[0].requestedBy.firstName} ${t.reversalFor[0].requestedBy.lastName}` : "(direct)",
      approvedBy: `${t.recordedBy.firstName} ${t.recordedBy.lastName}`,
    }));
    return {
      title: "Reversals",
      subtitle: `${start} to ${end}.`,
      columns: [
        { key: "date", label: "Date", type: "date" },
        { key: "receiptNumber", label: "Reversal no.", type: "text" },
        { key: "reverses", label: "Reverses", type: "text" },
        { key: "originalDate", label: "Paid on", type: "date" },
        { key: "student", label: "Student", type: "text" },
        { key: "amount", label: "Amount", type: "money" },
        { key: "category", label: "Type", type: "text" },
        { key: "reason", label: "Reason", type: "text" },
        { key: "requestedBy", label: "Requested by", type: "text" },
        { key: "approvedBy", label: "Approved by", type: "text" },
      ],
      rows,
      totals: { date: `${rows.length} reversals`, amount: Math.round(rows.reduce((s, r) => s + r.amount * 100, 0)) / 100 },
    };
  },
};

const report = async (name, params) => {
  const build = REPORTS[name];
  if (!build) throw ApiError.notFound("Unknown report");
  return { report: name, ...(await build(params)) };
};

module.exports = { dashboard, report, REPORT_NAMES: Object.keys(REPORTS) };
