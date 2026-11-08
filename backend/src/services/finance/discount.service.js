/**
 * Discounts and scholarships.
 *
 * Accountants and admins request them (PENDING); only an admin who did not
 * make the request approves or rejects (owner's decision, 2026-11-08). Only
 * APPROVED discounts have applications, so only they change balances.
 *
 * A discount covers one student's fees in one academic year, on one fee type
 * or all of them. PERCENT is taken from each fee's original amount; FIXED is
 * split across the matching fees in proportion to their amounts. Within a fee,
 * the newest installment is reduced first, and never below what is already
 * paid: any part that does not fit is reported as `capped`, never refunded.
 */
const prisma = require("../../config/database");
const { ApiError } = require("../../utils");
const m = require("../../utils/money");
const { discountFor, splitProportionally, spreadDiscount } = require("../../utils/feeAllocation");
const { lockInstallments, refreshBalances, withTransaction } = require("./balances");

const DISCOUNT_INCLUDE = {
  student: { select: { id: true, admissionNumber: true, user: { select: { firstName: true, lastName: true } } } },
  academicYear: { select: { id: true, name: true } },
  feeType: { select: { id: true, name: true } },
  requestedBy: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
  revokedBy: { select: { id: true, firstName: true, lastName: true } },
  applications: { select: { amount: true } },
};

const withApplied = (d) => (d ? { ...d, appliedAmount: m.toNumber(m.sum(d.applications || [], (a) => a.amount)) } : d);

const assertValue = (kind, value) => {
  if (!m.isPositive(value) || !m.hasAtMostTwoDecimals(value)) throw ApiError.badRequest("Value must be more than 0 with at most 2 decimal places");
  if (kind === "PERCENT" && m.cmp(value, 100) > 0) throw ApiError.badRequest("A percentage discount cannot exceed 100");
};

const request = async ({ schoolId, userId, studentId, academicYearId, feeTypeId, kind, value, category, name, reason }) => {
  assertValue(kind, value);
  const [student, year, feeType] = await Promise.all([
    prisma.student.findFirst({ where: { id: Number(studentId), schoolId }, select: { id: true } }),
    prisma.academicYear.findFirst({ where: { id: Number(academicYearId), schoolId }, select: { id: true } }),
    feeTypeId ? prisma.feeType.findFirst({ where: { id: Number(feeTypeId), schoolId }, select: { id: true } }) : Promise.resolve(true),
  ]);
  if (!student) throw ApiError.notFound("Student not found");
  if (!year) throw ApiError.notFound("Academic year not found");
  if (!feeType) throw ApiError.notFound("Fee type not found");
  const created = await prisma.feeDiscount.create({
    data: {
      schoolId,
      studentId: student.id,
      academicYearId: year.id,
      feeTypeId: feeTypeId ? Number(feeTypeId) : null,
      kind,
      value: m.money(value),
      category,
      name,
      reason,
      requestedById: userId,
    },
    include: DISCOUNT_INCLUDE,
  });
  return withApplied(created);
};

const findInSchool = async (schoolId, id) => {
  const d = await prisma.feeDiscount.findFirst({ where: { id: Number(id), schoolId } });
  if (!d) throw ApiError.notFound("Discount not found");
  return d;
};

/** Edit while PENDING: the requester or an admin. */
const update = async ({ schoolId, userId, isAdmin, id, changes }) => {
  const d = await findInSchool(schoolId, id);
  if (d.status !== "PENDING") throw ApiError.conflict("Only a pending discount can be edited");
  if (d.requestedById !== userId && !isAdmin) throw ApiError.forbidden("Only the requester or an admin can edit this discount");
  const data = {};
  for (const key of ["kind", "category", "name", "reason"]) if (changes[key] !== undefined) data[key] = changes[key];
  if (changes.value !== undefined) data.value = m.money(changes.value);
  if (changes.feeTypeId !== undefined) {
    if (changes.feeTypeId) {
      const ft = await prisma.feeType.findFirst({ where: { id: Number(changes.feeTypeId), schoolId }, select: { id: true } });
      if (!ft) throw ApiError.notFound("Fee type not found");
    }
    data.feeTypeId = changes.feeTypeId ? Number(changes.feeTypeId) : null;
  }
  assertValue(data.kind || d.kind, data.value ?? d.value);
  return withApplied(await prisma.feeDiscount.update({ where: { id: d.id }, data, include: DISCOUNT_INCLUDE }));
};

/**
 * Apply an approved discount to the given obligations (all must belong to the
 * discount's student and year). For FIXED, only the part not already applied
 * elsewhere is spread, so fees generated later get the remainder.
 * Returns { applied, capped }. Runs inside the caller's transaction.
 */
const applyToObligations = async (tx, discount, obligationIds) => {
  if (obligationIds.length === 0) return { applied: m.dec(0), capped: m.dec(0) };
  const obligations = await tx.feeObligation.findMany({
    where: { id: { in: obligationIds }, cancelledAt: null },
    select: { id: true, amountDue: true, installments: { select: { id: true } } },
    orderBy: { id: "asc" },
  });
  await lockInstallments(tx, obligations.flatMap((o) => o.installments.map((i) => i.id)));

  let targets;
  if (discount.kind === "PERCENT") {
    targets = obligations.map((o) => ({ obligationId: o.id, amount: discountFor("PERCENT", discount.value, o.amountDue) }));
  } else {
    const already = await tx.feeDiscountApplication.aggregate({ where: { discountId: discount.id }, _sum: { amount: true } });
    const remaining = m.sub(discount.value, already._sum.amount || 0);
    if (!m.isPositive(remaining)) return { applied: m.dec(0), capped: m.dec(0) };
    targets = splitProportionally(remaining, obligations.map((o) => ({ id: o.id, amount: o.amountDue })));
  }

  let applied = m.dec(0);
  let capped = m.dec(0);
  const touched = [];
  for (const t of targets) {
    if (!m.isPositive(t.amount)) continue;
    const installments = await tx.feeInstallment.findMany({
      where: { obligationId: t.obligationId },
      select: { id: true, sequence: true, amount: true, discountTotal: true, paidTotal: true, status: true },
    });
    const result = spreadDiscount(installments, t.amount);
    for (const a of result.applications) {
      await tx.feeDiscountApplication.upsert({
        where: { discountId_installmentId: { discountId: discount.id, installmentId: a.installmentId } },
        update: { amount: { increment: a.amount } },
        create: { discountId: discount.id, installmentId: a.installmentId, amount: a.amount },
      });
      touched.push(a.installmentId);
      applied = m.add(applied, a.amount);
    }
    capped = m.add(capped, result.capped);
  }
  await refreshBalances(tx, touched);
  return { applied, capped };
};

/** Obligations a discount covers: the student's live fees in that year, optionally one fee type. */
const matchingObligationIds = async (tx, discount) =>
  (
    await tx.feeObligation.findMany({
      where: {
        schoolId: discount.schoolId,
        cancelledAt: null,
        studentClass: { studentId: discount.studentId, academicYearId: discount.academicYearId },
        ...(discount.feeTypeId ? { feeStructure: { feeTypeId: discount.feeTypeId } } : {}),
      },
      select: { id: true },
    })
  ).map((o) => o.id);

const approve = async ({ schoolId, userId, id, note }) => {
  const d = await findInSchool(schoolId, id);
  if (d.requestedById === userId) throw ApiError.forbidden("You cannot approve your own discount request");
  const result = await withTransaction(prisma, async (tx) => {
    const claimed = await tx.feeDiscount.updateMany({
      where: { id: d.id, status: "PENDING" },
      data: { status: "APPROVED", approvedById: userId, approvedAt: new Date(), decisionNote: note || null },
    });
    if (claimed.count !== 1) throw ApiError.conflict("This discount has already been decided");
    return applyToObligations(tx, d, await matchingObligationIds(tx, d));
  });
  const discount = withApplied(await prisma.feeDiscount.findUnique({ where: { id: d.id }, include: DISCOUNT_INCLUDE }));
  return { discount, applied: m.toNumber(result.applied), capped: m.toNumber(result.capped) };
};

const reject = async ({ schoolId, userId, id, note }) => {
  const d = await findInSchool(schoolId, id);
  if (d.requestedById === userId) throw ApiError.forbidden("You cannot decide your own discount request");
  const claimed = await prisma.feeDiscount.updateMany({
    where: { id: d.id, status: "PENDING" },
    data: { status: "REJECTED", approvedById: userId, approvedAt: new Date(), decisionNote: note || null },
  });
  if (claimed.count !== 1) throw ApiError.conflict("This discount has already been decided");
  return withApplied(await prisma.feeDiscount.findUnique({ where: { id: d.id }, include: DISCOUNT_INCLUDE }));
};

/** Withdraw an approved discount: its applications go, balances go back up. */
const revoke = async ({ schoolId, userId, id, reason }) => {
  const d = await findInSchool(schoolId, id);
  await withTransaction(prisma, async (tx) => {
    const apps = await tx.feeDiscountApplication.findMany({ where: { discountId: d.id }, select: { id: true, installmentId: true } });
    await lockInstallments(tx, apps.map((a) => a.installmentId));
    const claimed = await tx.feeDiscount.updateMany({
      where: { id: d.id, status: "APPROVED" },
      data: { status: "REVOKED", revokedById: userId, revokedAt: new Date(), revokeReason: reason },
    });
    if (claimed.count !== 1) throw ApiError.conflict("Only an approved discount can be revoked");
    await tx.feeDiscountApplication.deleteMany({ where: { discountId: d.id } });
    await refreshBalances(tx, apps.map((a) => a.installmentId));
  });
  return withApplied(await prisma.feeDiscount.findUnique({ where: { id: d.id }, include: DISCOUNT_INCLUDE }));
};

const list = async ({ schoolId, status, studentId, academicYearId }) => {
  const where = { schoolId };
  if (status) where.status = status;
  if (studentId) where.studentId = Number(studentId);
  if (academicYearId) where.academicYearId = Number(academicYearId);
  const rows = await prisma.feeDiscount.findMany({ where, include: DISCOUNT_INCLUDE, orderBy: { createdAt: "desc" } });
  return rows.map(withApplied);
};

/**
 * After new fees are generated for an enrolment, apply the student's approved
 * discounts for that year to them. Runs inside the caller's transaction.
 */
const applyApprovedToNewObligations = async (tx, { schoolId, studentId, academicYearId, obligations }) => {
  const discounts = await tx.feeDiscount.findMany({ where: { schoolId, studentId, academicYearId, status: "APPROVED" } });
  for (const d of discounts) {
    const ids = obligations.filter((o) => !d.feeTypeId || o.feeTypeId === d.feeTypeId).map((o) => o.id);
    await applyToObligations(tx, d, ids);
  }
};

module.exports = { DISCOUNT_INCLUDE, request, update, approve, reject, revoke, list, applyApprovedToNewObligations };
