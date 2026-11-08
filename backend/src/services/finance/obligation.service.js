/**
 * Fee obligations: generation (with installment schedules), statements,
 * account lists, waivers and the reconciliation check.
 */
const prisma = require("../../config/database");
const { dialect } = require("../../database");
const { ApiError } = require("../../utils");
const m = require("../../utils/money");
const { installmentBalance, isOverdue } = require("../../utils/feeStatus");
const { kathmanduToday } = require("../../utils/fiscalYear");
const { lockInstallments, refreshBalances, withTransaction } = require("./balances");
const discountService = require("./discount.service");
const { RECEIPT_INCLUDE } = require("./ledger.service");

/** Installment rows for a new obligation: the structure's template, or one row for the whole amount. */
const scheduleFor = (structure) => {
  const plan = [...(structure.installmentPlan || [])].sort((a, b) => a.sequence - b.sequence);
  if (plan.length === 0) return [{ sequence: 1, label: "Full amount", dueDate: null, amount: structure.amount }];
  return plan.map((p) => ({ sequence: p.sequence, label: p.label, dueDate: p.dueDate, amount: p.amount }));
};

/**
 * Create the missing obligations (with installments) for enrolments, then
 * apply each student's approved discounts. Returns the number created.
 */
const generate = async ({ schoolId, userId, actorRole, studentClassIds, classId, academicYearId }) => {
  const structures = await prisma.feeStructure.findMany({
    orderBy: { id: "asc" },
    where: { schoolId, classId, academicYearId },
    include: { installmentPlan: true },
  });
  if (structures.length === 0) throw ApiError.badRequest("No fee structures are defined for this class and year");

  return withTransaction(prisma, async (tx) => {
    const existing = await tx.feeObligation.findMany({
      where: { studentClassId: { in: studentClassIds } },
      select: { studentClassId: true, feeStructureId: true },
    });
    const have = new Set(existing.map((e) => `${e.studentClassId}-${e.feeStructureId}`));
    const enrolments = await tx.studentClass.findMany({ where: { id: { in: studentClassIds } }, select: { id: true, studentId: true } });

    let count = 0;
    for (const sc of enrolments) {
      const created = [];
      for (const fs of structures) {
        if (have.has(`${sc.id}-${fs.id}`)) continue;
        const obligation = await tx.feeObligation.create({
          data: {
            schoolId,
            studentClassId: sc.id,
            feeStructureId: fs.id,
            amountDue: fs.amount,
            amountPaid: 0,
            status: "pending",
            createdByUserId: userId,
            updatedByUserId: userId,
            actorRole,
            installments: { create: scheduleFor(fs).map((i) => ({ ...i, schoolId })) },
          },
          select: { id: true },
        });
        created.push({ id: obligation.id, feeTypeId: fs.feeTypeId });
        count += 1;
      }
      if (created.length) {
        await discountService.applyApprovedToNewObligations(tx, { schoolId, studentId: sc.studentId, academicYearId, obligations: created });
      }
    }
    return count;
  });
};

/** Waive an obligation. Allowed only while nothing has been paid on it (reverse first). */
const cancel = async ({ schoolId, userId, obligationId, reason }) =>
  withTransaction(prisma, async (tx) => {
    const obligation = await tx.feeObligation.findFirst({
      where: { id: Number(obligationId), schoolId },
      select: { id: true, cancelledAt: true, installments: { select: { id: true } } },
    });
    if (!obligation) throw ApiError.notFound("Fee not found");
    if (obligation.cancelledAt) throw ApiError.conflict("This fee is already cancelled");
    const ids = obligation.installments.map((i) => i.id);
    await lockInstallments(tx, ids);
    const fresh = await tx.feeInstallment.findMany({ where: { id: { in: ids } }, select: { paidTotal: true } });
    if (m.isPositive(m.sum(fresh, (i) => i.paidTotal))) {
      throw ApiError.conflict("Money has been paid on this fee. Reverse those payments before cancelling it.");
    }
    await tx.feeObligation.update({ where: { id: obligation.id }, data: { cancelledAt: new Date(), cancelledById: userId, cancelReason: reason } });
    await tx.feeInstallment.updateMany({ where: { obligationId: obligation.id }, data: { status: "cancelled" } });
    await refreshBalances(tx, ids);
    return tx.feeObligation.findUnique({ where: { id: obligation.id } });
  });

const numberify = (inst, today) => {
  const balance = installmentBalance(inst);
  return {
    id: inst.id,
    sequence: inst.sequence,
    label: inst.label,
    dueDate: inst.dueDate,
    amount: m.toNumber(inst.amount),
    discount: m.toNumber(inst.discountTotal),
    paid: m.toNumber(inst.paidTotal),
    balance: inst.status === "cancelled" ? 0 : m.toNumber(balance),
    status: inst.status,
    overdue: isOverdue(inst, today),
  };
};

/**
 * A student's fee statement for one academic year (or every year): fees with
 * installments, discounts, transactions and totals. Callers check access.
 */
const statement = async ({ schoolId, studentId, academicYearId }) => {
  const student = await prisma.student.findFirst({
    where: { id: Number(studentId), schoolId },
    select: { id: true, admissionNumber: true, user: { select: { firstName: true, lastName: true } } },
  });
  if (!student) throw ApiError.notFound("Student not found");

  const enrolmentWhere = { studentId: student.id, schoolId };
  if (academicYearId) enrolmentWhere.academicYearId = Number(academicYearId);
  const today = kathmanduToday();
  const enrolments = await prisma.studentClass.findMany({
    where: enrolmentWhere,
    orderBy: { academicYear: { startDate: "desc" } },
    select: {
      id: true,
      rollNumber: true,
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      feeObligations: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          amountDue: true,
          discountTotal: true,
          amountPaid: true,
          status: true,
          cancelledAt: true,
          cancelReason: true,
          feeStructure: { select: { id: true, feeType: { select: { id: true, name: true } } } },
          installments: { orderBy: { sequence: "asc" } },
        },
      },
    },
  });

  const yearIds = enrolments.map((e) => e.academicYear.id);
  const [discounts, transactions] = await Promise.all([
    discountService.list({ schoolId, studentId: student.id }).then((rows) => rows.filter((d) => yearIds.includes(d.academicYearId))),
    prisma.feeTransaction.findMany({
      where: { schoolId, studentId: student.id, academicYearId: { in: yearIds } },
      include: RECEIPT_INCLUDE,
      orderBy: [{ paidOn: "desc" }, { id: "desc" }],
    }),
  ]);

  const years = enrolments.map((e) => {
    const fees = e.feeObligations.map((o) => {
      const installments = o.installments.map((i) => numberify(i, today));
      return {
        id: o.id,
        feeType: o.feeStructure.feeType,
        amount: m.toNumber(o.amountDue),
        discount: m.toNumber(o.discountTotal),
        paid: m.toNumber(o.amountPaid),
        balance: o.cancelledAt ? 0 : m.toNumber(m.sub(m.sub(o.amountDue, o.discountTotal), o.amountPaid)),
        status: o.status,
        cancelled: Boolean(o.cancelledAt),
        cancelReason: o.cancelReason,
        overdue: installments.some((i) => i.overdue),
        installments,
      };
    });
    const live = fees.filter((f) => !f.cancelled);
    const totals = {
      amount: m.toNumber(m.sum(live, (f) => f.amount)),
      discount: m.toNumber(m.sum(live, (f) => f.discount)),
      paid: m.toNumber(m.sum(live, (f) => f.paid)),
      balance: m.toNumber(m.sum(live, (f) => f.balance)),
      overdue: m.toNumber(m.sum(live.flatMap((f) => f.installments.filter((i) => i.overdue)), (i) => i.balance)),
    };
    return {
      studentClassId: e.id,
      academicYear: e.academicYear,
      class: e.class,
      section: e.section,
      rollNumber: e.rollNumber,
      fees,
      totals,
      status: live.length === 0 ? "none" : totals.balance <= 0 ? "paid" : totals.overdue > 0 ? "overdue" : totals.paid > 0 ? "partial" : "pending",
    };
  });

  return {
    student: { id: student.id, admissionNumber: student.admissionNumber, name: `${student.user.firstName} ${student.user.lastName}` },
    years,
    discounts,
    transactions,
  };
};

/**
 * Students of one academic year with their fee totals, for the accountant's
 * account list. Totals are computed for the whole year, then filtered and
 * paged (a school has hundreds of students, not millions).
 */
const accounts = async ({ schoolId, academicYearId, classId, sectionId, search, status, skip, take }) => {
  const year = academicYearId
    ? await prisma.academicYear.findFirst({ where: { id: Number(academicYearId), schoolId } })
    : await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
  if (!year) throw ApiError.notFound("Academic year not found");
  const today = kathmanduToday();
  const where = { schoolId, academicYearId: year.id };
  if (classId) where.classId = Number(classId);
  if (sectionId) where.sectionId = Number(sectionId);
  if (search) {
    where.student = {
      OR: [
        { admissionNumber: dialect.text.search(search) },
        { user: { firstName: dialect.text.search(search) } },
        { user: { lastName: dialect.text.search(search) } },
      ],
    };
  }
  const enrolments = await prisma.studentClass.findMany({
    where,
    orderBy: [{ class: { displayOrder: "asc" } }, { section: { name: "asc" } }, { rollNumber: { sort: "asc", nulls: "first" } }],
    select: {
      id: true,
      rollNumber: true,
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      student: { select: { id: true, admissionNumber: true, user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      feeObligations: {
        where: { cancelledAt: null },
        select: { amountDue: true, discountTotal: true, amountPaid: true, installments: { select: { dueDate: true, amount: true, discountTotal: true, paidTotal: true, status: true } } },
      },
    },
  });

  const rows = enrolments.map((e) => {
    const amount = m.sum(e.feeObligations, (o) => o.amountDue);
    const discount = m.sum(e.feeObligations, (o) => o.discountTotal);
    const paid = m.sum(e.feeObligations, (o) => o.amountPaid);
    const balance = m.sub(m.sub(amount, discount), paid);
    const overdueInst = e.feeObligations.flatMap((o) => o.installments).filter((i) => isOverdue(i, today));
    const overdue = m.sum(overdueInst, (i) => installmentBalance(i));
    const rowStatus = e.feeObligations.length === 0 ? "none" : !m.isPositive(balance) ? "paid" : m.isPositive(overdue) ? "overdue" : m.isPositive(paid) ? "partial" : "pending";
    return {
      studentId: e.student.id,
      studentClassId: e.id,
      name: `${e.student.user.firstName} ${e.student.user.lastName}`,
      avatarUrl: e.student.user.avatarUrl,
      admissionNumber: e.student.admissionNumber,
      rollNumber: e.rollNumber,
      class: e.class,
      section: e.section,
      amount: m.toNumber(amount),
      discount: m.toNumber(discount),
      paid: m.toNumber(paid),
      balance: m.toNumber(balance),
      overdue: m.toNumber(overdue),
      status: rowStatus,
    };
  });
  const filtered = status ? rows.filter((r) => r.status === status) : rows;
  return { academicYear: { id: year.id, name: year.name }, total: filtered.length, rows: filtered.slice(skip, skip + take) };
};

/**
 * Recompute every cache in a school from the ledger and report differences.
 * Read-only: it never repairs anything.
 */
const reconcile = async ({ schoolId }) => {
  const [installments, allocations, apps, obligations] = await Promise.all([
    prisma.feeInstallment.findMany({ where: { schoolId }, select: { id: true, obligationId: true, amount: true, paidTotal: true, discountTotal: true, status: true } }),
    prisma.feeAllocation.findMany({ where: { transaction: { schoolId } }, select: { installmentId: true, amount: true, transaction: { select: { type: true } } } }),
    prisma.feeDiscountApplication.findMany({ where: { installment: { schoolId } }, select: { installmentId: true, amount: true } }),
    prisma.feeObligation.findMany({ where: { schoolId }, select: { id: true, amountDue: true, amountPaid: true, discountTotal: true, cancelledAt: true } }),
  ]);
  const paid = new Map();
  for (const a of allocations) paid.set(a.installmentId, m.add(paid.get(a.installmentId), a.transaction.type === "REVERSAL" ? m.dec(a.amount).negated() : a.amount));
  const disc = new Map();
  for (const a of apps) disc.set(a.installmentId, m.add(disc.get(a.installmentId), a.amount));

  const problems = [];
  const byObligation = new Map();
  for (const i of installments) {
    const p = paid.get(i.id) || m.dec(0);
    const d = disc.get(i.id) || m.dec(0);
    if (m.cmp(p, i.paidTotal) !== 0) problems.push({ kind: "installment.paid", id: i.id, stored: m.toNumber(i.paidTotal), ledger: m.toNumber(p) });
    if (m.cmp(d, i.discountTotal) !== 0) problems.push({ kind: "installment.discount", id: i.id, stored: m.toNumber(i.discountTotal), ledger: m.toNumber(d) });
    if (m.isNegative(m.sub(m.sub(i.amount, d), p))) problems.push({ kind: "installment.overSettled", id: i.id });
    if (!byObligation.has(i.obligationId)) byObligation.set(i.obligationId, []);
    byObligation.get(i.obligationId).push({ ...i, p, d });
  }
  for (const o of obligations) {
    const rows = byObligation.get(o.id) || [];
    if (rows.length === 0) {
      problems.push({ kind: "obligation.noInstallments", id: o.id });
      continue;
    }
    if (m.cmp(m.sum(rows, (r) => r.amount), o.amountDue) !== 0) problems.push({ kind: "obligation.scheduleTotal", id: o.id });
    const live = rows.filter((r) => r.status !== "cancelled");
    const p = m.sum(live, (r) => r.p);
    const d = m.sum(live, (r) => r.d);
    if (m.cmp(p, o.amountPaid) !== 0) problems.push({ kind: "obligation.paid", id: o.id, stored: m.toNumber(o.amountPaid), ledger: m.toNumber(p) });
    if (m.cmp(d, o.discountTotal) !== 0) problems.push({ kind: "obligation.discount", id: o.id, stored: m.toNumber(o.discountTotal), ledger: m.toNumber(d) });
  }
  return { checked: { obligations: obligations.length, installments: installments.length, allocations: allocations.length }, problems, ok: problems.length === 0 };
};

/** Installment template of a fee structure. */
const getTemplate = async ({ schoolId, feeStructureId }) => {
  const fs = await prisma.feeStructure.findFirst({
    where: { id: Number(feeStructureId), schoolId },
    include: { installmentPlan: { orderBy: { sequence: "asc" } }, feeType: { select: { name: true } }, class: { select: { name: true } } },
  });
  if (!fs) throw ApiError.notFound("Fee structure not found");
  return fs;
};

/**
 * Replace the template. Rows must add up to the structure amount; an empty
 * list removes the template. Existing obligations keep their own schedule.
 */
const setTemplate = async ({ schoolId, feeStructureId, installments }) => {
  const fs = await getTemplate({ schoolId, feeStructureId });
  if (installments.length > 0) {
    const total = m.sum(installments, (i) => i.amount);
    if (m.cmp(total, fs.amount) !== 0) {
      throw ApiError.badRequest(`Installments add up to ${m.toFixed2(total)}, but the fee is ${m.toFixed2(fs.amount)}`);
    }
    if (installments.some((i) => !m.isPositive(i.amount) || !m.hasAtMostTwoDecimals(i.amount))) {
      throw ApiError.badRequest("Each installment amount must be more than 0 with at most 2 decimal places");
    }
  }
  await prisma.$transaction([
    prisma.feeStructureInstallment.deleteMany({ where: { feeStructureId: fs.id } }),
    prisma.feeStructureInstallment.createMany({
      data: installments.map((i, idx) => ({
        feeStructureId: fs.id,
        sequence: idx + 1,
        label: i.label,
        dueDate: i.dueDate ? new Date(`${String(i.dueDate).slice(0, 10)}T00:00:00.000Z`) : null,
        amount: m.money(i.amount),
      })),
    }),
  ]);
  return getTemplate({ schoolId, feeStructureId });
};

module.exports = { generate, cancel, statement, accounts, reconcile, getTemplate, setTemplate, scheduleFor };
