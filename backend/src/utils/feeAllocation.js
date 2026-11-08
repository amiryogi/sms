/**
 * How money is spread over installments.
 *
 * - Payments settle the oldest due installment first (no due date = last).
 * - Discounts reduce the newest installment first, so the earliest dues stay
 *   as scheduled.
 * Neither may push an installment's balance below zero: a payment larger than
 * what is owed is rejected (no overpayment, owner's decision 2026-11-08), and a
 * discount larger than what is unpaid is capped and the capped part reported.
 */
const { dec, money, sub, min, sum, isPositive, cmp, Decimal } = require("./money");
const { installmentBalance } = require("./feeStatus");

const dueKey = (i) => (i.dueDate ? new Date(i.dueDate).toISOString().slice(0, 10) : "9999-12-31");

/** Oldest due first, then by obligation and installment order. */
const paymentOrder = (a, b) =>
  dueKey(a).localeCompare(dueKey(b)) || (a.obligationId ?? 0) - (b.obligationId ?? 0) || a.sequence - b.sequence;

/**
 * Split `amount` over installments, oldest due first.
 * Returns { allocations: [{ installmentId, amount }], unallocated }.
 * A positive `unallocated` means the payment exceeds what is owed.
 */
const allocatePayment = (installments, amount) => {
  let remaining = money(amount);
  const allocations = [];
  for (const inst of [...installments].sort(paymentOrder)) {
    if (!isPositive(remaining)) break;
    const balance = installmentBalance(inst);
    if (!isPositive(balance)) continue;
    const take = min(balance, remaining);
    allocations.push({ installmentId: inst.id, amount: take });
    remaining = sub(remaining, take);
  }
  return { allocations, unallocated: remaining };
};

/**
 * Check explicit allocations against the installments they name.
 * Returns a list of problems ("" items never appear); empty means valid.
 */
const checkAllocations = (installmentsById, allocations) => {
  const problems = [];
  const seen = new Set();
  for (const a of allocations) {
    const inst = installmentsById.get(Number(a.installmentId));
    if (!inst) {
      problems.push(`Installment ${a.installmentId} is not one of this student's fees`);
      continue;
    }
    if (seen.has(inst.id)) problems.push(`Installment ${inst.id} appears twice`);
    seen.add(inst.id);
    if (!isPositive(a.amount)) problems.push(`Amount for installment ${inst.id} must be more than 0`);
    if (inst.status === "cancelled") problems.push(`Installment ${inst.id} is cancelled`);
    const balance = installmentBalance(inst);
    if (cmp(a.amount, balance) > 0) {
      problems.push(`Installment ${inst.id}: paying ${money(a.amount).toFixed(2)} but only ${money(balance).toFixed(2)} is owed`);
    }
  }
  return problems;
};

/** Discount value for one obligation: PERCENT of its original amount, or the FIXED value. */
const discountFor = (kind, value, baseAmount) =>
  kind === "PERCENT" ? money(dec(baseAmount).times(value).dividedBy(100)) : money(value);

/**
 * Split a FIXED total over obligations in proportion to their amounts. The last
 * obligation takes the rounding remainder, so the parts always add up exactly.
 */
const splitProportionally = (total, obligations) => {
  const whole = sum(obligations, (o) => o.amount);
  if (!isPositive(whole)) return obligations.map((o) => ({ obligationId: o.id, amount: new Decimal(0) }));
  let given = new Decimal(0);
  return obligations.map((o, idx) => {
    const amount = idx === obligations.length - 1 ? sub(total, given) : money(dec(total).times(o.amount).dividedBy(whole));
    given = given.plus(amount);
    return { obligationId: o.id, amount };
  });
};

/**
 * Spread a discount over one obligation's installments, newest first, capped at
 * each installment's unpaid balance. Returns { applications, capped }.
 */
const spreadDiscount = (installments, amount) => {
  let remaining = money(amount);
  const applications = [];
  const newestFirst = [...installments].filter((i) => i.status !== "cancelled").sort((a, b) => b.sequence - a.sequence);
  for (const inst of newestFirst) {
    if (!isPositive(remaining)) break;
    const unpaid = installmentBalance(inst);
    if (!isPositive(unpaid)) continue;
    const take = min(unpaid, remaining);
    applications.push({ installmentId: inst.id, amount: take });
    remaining = sub(remaining, take);
  }
  return { applications, capped: remaining };
};

module.exports = { allocatePayment, checkAllocations, discountFor, splitProportionally, spreadDiscount, paymentOrder };
