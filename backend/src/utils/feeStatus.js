/**
 * Balances and statuses for fee installments and obligations.
 *
 *   net payable  = amount - discountTotal
 *   balance      = net payable - paidTotal      (paidTotal is net of reversals)
 *
 * Status is stored (pending | partial | paid | cancelled) and recomputed in the
 * same transaction as every ledger write. "Overdue" is never stored: it depends
 * on today's date, so it is derived when read.
 */
const { dec, sub, sum, isPositive, cmp } = require("./money");

const installmentBalance = ({ amount, discountTotal, paidTotal }) => sub(sub(amount, discountTotal), paidTotal);

const deriveStatus = ({ amount, discountTotal, paidTotal, cancelled = false }) => {
  if (cancelled) return "cancelled";
  const net = sub(amount, discountTotal);
  if (cmp(paidTotal, net) >= 0) return "paid"; // includes a fully discounted item
  if (isPositive(paidTotal)) return "partial";
  return "pending";
};

/** dueDate (Date or ISO) is before today ("YYYY-MM-DD") and money is still owed. */
const isOverdue = (installment, today) => {
  if (!installment.dueDate || installment.status === "cancelled") return false;
  const due = new Date(installment.dueDate).toISOString().slice(0, 10);
  return due < today && isPositive(installmentBalance(installment));
};

/** Totals of an obligation from its installments (cancelled ones count as zero). */
const rollup = (installments) => {
  const live = installments.filter((i) => i.status !== "cancelled");
  const amount = sum(live, (i) => i.amount);
  const discountTotal = sum(live, (i) => i.discountTotal);
  const paidTotal = sum(live, (i) => i.paidTotal);
  return { amount, discountTotal, paidTotal, balance: sub(sub(amount, discountTotal), paidTotal) };
};

module.exports = { installmentBalance, deriveStatus, isOverdue, rollup, dec };
