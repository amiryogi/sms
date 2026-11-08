/**
 * Locking and cached-balance upkeep shared by every finance write.
 *
 * The ledger (FeeTransaction + FeeAllocation) and the discount applications
 * are the truth. FeeInstallment.paidTotal / discountTotal / status and
 * FeeObligation.amountPaid / discountTotal / status are caches, rewritten here
 * inside the same DB transaction as the write that changed them.
 *
 * Lock order, used by every writer to avoid deadlocks:
 *   1. fee_transactions rows (reversals only)
 *   2. fee_installments rows, ascending id
 *   3. receipt_sequences row
 */
const { Prisma } = require("@prisma/client");
const { ApiError } = require("../../utils");
const m = require("../../utils/money");
const { deriveStatus } = require("../../utils/feeStatus");

/** SELECT … FOR UPDATE on installments, ascending id. Returns nothing. */
const lockInstallments = async (tx, ids) => {
  const unique = [...new Set(ids.map(Number))].sort((a, b) => a - b);
  if (unique.length === 0) return;
  await tx.$queryRaw`SELECT id FROM fee_installments WHERE id IN (${Prisma.join(unique)}) ORDER BY id FOR UPDATE`;
};

/**
 * Recompute the caches of these installments and of every obligation they
 * belong to, from the ledger and the discount applications.
 */
const refreshBalances = async (tx, installmentIds) => {
  const ids = [...new Set(installmentIds.map(Number))];
  if (ids.length === 0) return;

  const [allocations, discounts, installments] = await Promise.all([
    tx.feeAllocation.findMany({ where: { installmentId: { in: ids } }, select: { installmentId: true, amount: true, transaction: { select: { type: true } } } }),
    tx.feeDiscountApplication.findMany({ where: { installmentId: { in: ids } }, select: { installmentId: true, amount: true } }),
    tx.feeInstallment.findMany({ where: { id: { in: ids } }, select: { id: true, obligationId: true, amount: true, status: true } }),
  ]);

  const paid = new Map();
  for (const a of allocations) {
    const signed = a.transaction.type === "REVERSAL" ? m.dec(a.amount).negated() : m.dec(a.amount);
    paid.set(a.installmentId, m.add(paid.get(a.installmentId), signed));
  }
  const disc = new Map();
  for (const d of discounts) disc.set(d.installmentId, m.add(disc.get(d.installmentId), d.amount));

  for (const inst of installments) {
    const paidTotal = paid.get(inst.id) || m.dec(0);
    const discountTotal = disc.get(inst.id) || m.dec(0);
    if (m.isNegative(paidTotal)) throw ApiError.internal(`Ledger for installment ${inst.id} is negative`);
    if (m.cmp(m.add(paidTotal, discountTotal), inst.amount) > 0) {
      // Never reachable when every writer checks balances under the lock.
      throw ApiError.conflict(`Installment ${inst.id} would be over-settled`);
    }
    await tx.feeInstallment.update({
      where: { id: inst.id },
      data: {
        paidTotal: m.money(paidTotal),
        discountTotal: m.money(discountTotal),
        status: deriveStatus({ amount: inst.amount, discountTotal, paidTotal, cancelled: inst.status === "cancelled" }),
      },
    });
  }

  const obligationIds = [...new Set(installments.map((i) => i.obligationId))];
  for (const obligationId of obligationIds) {
    const [obligation, rows] = await Promise.all([
      tx.feeObligation.findUnique({ where: { id: obligationId }, select: { amountDue: true, cancelledAt: true } }),
      tx.feeInstallment.findMany({ where: { obligationId }, select: { amount: true, paidTotal: true, discountTotal: true, status: true } }),
    ]);
    const live = rows.filter((r) => r.status !== "cancelled");
    const paidTotal = m.sum(live, (r) => r.paidTotal);
    const discountTotal = m.sum(live, (r) => r.discountTotal);
    await tx.feeObligation.update({
      where: { id: obligationId },
      data: {
        amountPaid: m.money(paidTotal),
        discountTotal: m.money(discountTotal),
        status: deriveStatus({ amount: obligation.amountDue, discountTotal, paidTotal, cancelled: Boolean(obligation.cancelledAt) }),
      },
    });
  }
};

/**
 * Run fn in an interactive transaction, retrying a deadlock or write conflict.
 *
 * READ COMMITTED matters: under MySQL's default REPEATABLE READ, a transaction
 * that waited for a row lock still reads the snapshot taken before the other
 * transaction committed, so two racing payments could both pass the balance
 * check (caught by the integration tests). With READ COMMITTED every read
 * after the lock sees the committed rows.
 */
const withTransaction = async (prisma, fn, { attempts = 3 } = {}) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        maxWait: 10000,
        timeout: 20000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    } catch (error) {
      const retryable = error?.code === "P2034" || /deadlock|lock wait timeout/i.test(error?.message || "");
      if (!retryable || attempt >= attempts) throw error;
    }
  }
};

module.exports = { lockInstallments, refreshBalances, withTransaction };
