/**
 * Pure aggregation for the finance dashboard and reports
 * (docs/plans/finance-and-portals.md §4). No database: callers pass rows.
 *
 * Inputs
 *   installments: [{ id, obligationId, studentId, classId, className, classOrder,
 *                    feeTypeId, feeTypeName, dueDate, amount, discountTotal, paidTotal }]
 *                 (live ones only: cancelled obligations are excluded by the caller)
 *   allocations:  [{ installmentId, transactionId, type: "PAYMENT"|"REVERSAL",
 *                    amount, paidOn: "YYYY-MM-DD", method }]
 *
 * Rules
 *   - Obligations (what is owed) come from installments; collections (money
 *     received) come from the ledger. They are never mixed.
 *   - Cash basis: money counts on the ledger date. A reversal is negative on
 *     the day it was recorded, so past days never change.
 *   - Discounts reduce what is expected and outstanding, never collections.
 */
const { dec, money, add, sub, max, isPositive, toNumber } = require("./money");
const { convertADToBS, getDaysInBSMonth } = require("./dateConverter");
const { BS_MONTHS } = require("./attendanceRate");

const DAY = 86400000;
const isoDay = (d) => (typeof d === "string" ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10));
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** The BS month containing an AD day: { key, year, month, label, start, end } (AD ISO days). */
const bsMonthOf = (iso) => {
  const bs = convertADToBS(iso);
  const start = addDays(iso, -(bs.day - 1));
  const end = addDays(start, getDaysInBSMonth(bs.year, bs.month) - 1);
  return { key: `${bs.year}-${String(bs.month).padStart(2, "0")}`, year: bs.year, month: bs.month, label: `${BS_MONTHS[bs.month - 1]} ${bs.year}`, start, end };
};

/** Every BS month touching [from, to], oldest first. */
const bsMonthsBetween = (from, to) => {
  const months = [];
  for (let m = bsMonthOf(from); m.start <= to; m = bsMonthOf(addDays(m.end, 1))) months.push(m);
  return months;
};

const signed = (a) => (a.type === "REVERSAL" ? dec(a.amount).negated() : dec(a.amount));
const net = (i) => sub(i.amount, i.discountTotal);
const balance = (i) => max(sub(net(i), i.paidTotal), 0);
const isOverdue = (i, today) => Boolean(i.dueDate) && isoDay(i.dueDate) < today && isPositive(balance(i));

/** Group rows by key and fold each group. Keeps first-seen order. */
const groupBy = (rows, keyOf) => {
  const map = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
};

/** Money received in [from, to] (inclusive ISO days) from allocations. */
const collectedBetween = (allocations, from, to) => {
  let received = dec(0);
  let reversed = dec(0);
  for (const a of allocations) {
    if (a.paidOn < from || a.paidOn > to) continue;
    if (a.type === "REVERSAL") reversed = add(reversed, a.amount);
    else received = add(received, a.amount);
  }
  return { received, reversed, net: sub(received, reversed) };
};

/** Headline numbers. range = { from, to } for the transaction counts. */
const kpis = ({ installments, allocations, today, range }) => {
  const month = bsMonthOf(today);
  const gross = installments.reduce((s, i) => add(s, i.amount), dec(0));
  const discount = installments.reduce((s, i) => add(s, i.discountTotal), dec(0));
  const collected = installments.reduce((s, i) => add(s, i.paidTotal), dec(0));
  const outstanding = installments.reduce((s, i) => add(s, balance(i)), dec(0));

  const pending = installments.filter((i) => isPositive(balance(i)) && !isOverdue(i, today));
  const overdue = installments.filter((i) => isOverdue(i, today));
  const inRange = allocations.filter((a) => a.paidOn >= range.from && a.paidOn <= range.to);
  const txIds = (type) => new Set(inRange.filter((a) => a.type === type).map((a) => a.transactionId)).size;

  return {
    expectedGross: toNumber(gross),
    discounts: toNumber(discount),
    expectedNet: toNumber(sub(gross, discount)),
    collected: toNumber(collected),
    outstanding: toNumber(outstanding),
    collectionRate: isPositive(sub(gross, discount)) ? Math.round(Number(dec(collected).dividedBy(sub(gross, discount)).times(1000))) / 10 : 0,
    today: toNumber(collectedBetween(allocations, today, today).net),
    thisMonth: { label: month.label, from: month.start, to: month.end, amount: toNumber(collectedBetween(allocations, month.start, today).net) },
    range: { from: range.from, to: range.to, ...Object.fromEntries(Object.entries(collectedBetween(allocations, range.from, range.to)).map(([k, v]) => [k, toNumber(v)])) },
    pending: { installments: pending.length, amount: toNumber(pending.reduce((s, i) => add(s, balance(i)), dec(0))) },
    overdue: {
      installments: overdue.length,
      amount: toNumber(overdue.reduce((s, i) => add(s, balance(i)), dec(0))),
      students: new Set(overdue.map((i) => i.studentId)).size,
    },
    transactions: { payments: txIds("PAYMENT"), reversals: txIds("REVERSAL") },
  };
};

/** Net collection per day in [from, to], every day present (zeros included). */
const dailySeries = (allocations, from, to) => {
  const totals = new Map();
  for (const a of allocations) if (a.paidOn >= from && a.paidOn <= to) totals.set(a.paidOn, add(totals.get(a.paidOn), signed(a)));
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push({ date: d, amount: toNumber(totals.get(d) || 0) });
  return out;
};

/** Net collection per BS month for the given months. */
const monthlySeries = (allocations, months) =>
  months.map((m) => ({ key: m.key, label: m.label, from: m.start, to: m.end, amount: toNumber(collectedBetween(allocations, m.start, m.end).net) }));

/** Expected (net of discounts), collected and outstanding per dimension. */
const breakdown = (installments, keyOf, labelOf, orderOf = () => 0) =>
  [...groupBy(installments, keyOf).entries()]
    .map(([key, rows]) => ({
      key,
      label: labelOf(rows[0]),
      order: orderOf(rows[0]),
      expected: toNumber(rows.reduce((s, i) => add(s, net(i)), dec(0))),
      collected: toNumber(rows.reduce((s, i) => add(s, i.paidTotal), dec(0))),
      outstanding: toNumber(rows.reduce((s, i) => add(s, balance(i)), dec(0))),
      students: new Set(rows.map((i) => i.studentId)).size,
    }))
    .sort((a, b) => a.order - b.order || String(a.label).localeCompare(String(b.label)))
    .map(({ order, ...rest }) => rest); // eslint-disable-line no-unused-vars

const byClass = (installments) => breakdown(installments, (i) => i.classId, (i) => i.className, (i) => i.classOrder ?? 0);
const byFeeType = (installments) => breakdown(installments, (i) => i.feeTypeId, (i) => i.feeTypeName);

/**
 * Each fee (obligation) by state: paid, overdue (any overdue installment),
 * partial, unpaid. { status: { count, amount } } where amount is the balance.
 */
const obligationStatus = (installments, today) => {
  const out = { paid: { count: 0, amount: 0 }, overdue: { count: 0, amount: 0 }, partial: { count: 0, amount: 0 }, pending: { count: 0, amount: 0 } };
  for (const rows of groupBy(installments, (i) => i.obligationId).values()) {
    const bal = rows.reduce((s, i) => add(s, balance(i)), dec(0));
    const paid = rows.reduce((s, i) => add(s, i.paidTotal), dec(0));
    const state = !isPositive(bal) ? "paid" : rows.some((i) => isOverdue(i, today)) ? "overdue" : isPositive(paid) ? "partial" : "pending";
    out[state].count += 1;
    out[state].amount = toNumber(add(out[state].amount, bal));
  }
  return out;
};

/**
 * Overdue balance at the end of each month: for installments due by then,
 * what was still unpaid on that day (payments up to that day count).
 */
const overdueTrend = (installments, allocations, months, today) => {
  const byInst = groupBy(allocations, (a) => a.installmentId);
  return months
    .filter((m) => m.start <= today)
    .map((m) => {
      const at = m.end < today ? m.end : today;
      let total = dec(0);
      for (const i of installments) {
        if (!i.dueDate || isoDay(i.dueDate) >= at) continue;
        const paidBy = (byInst.get(i.id) || []).filter((a) => a.paidOn <= at).reduce((s, a) => add(s, signed(a)), dec(0));
        total = add(total, max(sub(net(i), paidBy), 0));
      }
      return { key: m.key, label: m.label, at, amount: toNumber(total) };
    });
};

/**
 * Collections report rows grouped by day | month | class | feeType | method.
 * allocations must carry classId/className/classOrder/feeTypeId/feeTypeName
 * for the class and fee-type groupings.
 */
const collectionRows = (allocations, groupByKey) => {
  const keyOf = {
    day: (a) => a.paidOn,
    month: (a) => bsMonthOf(a.paidOn).key,
    class: (a) => a.classId,
    feeType: (a) => a.feeTypeId,
    method: (a) => a.method,
  }[groupByKey];
  const labelOf = {
    day: (a) => a.paidOn,
    month: (a) => bsMonthOf(a.paidOn).label,
    class: (a) => a.className,
    feeType: (a) => a.feeTypeName,
    method: (a) => a.method,
  }[groupByKey];
  const orderOf = { class: (a) => a.classOrder ?? 0 }[groupByKey] || (() => 0);
  return [...groupBy(allocations, keyOf).entries()]
    .map(([key, rows]) => {
      const received = rows.filter((r) => r.type === "PAYMENT").reduce((s, r) => add(s, r.amount), dec(0));
      const reversed = rows.filter((r) => r.type === "REVERSAL").reduce((s, r) => add(s, r.amount), dec(0));
      return {
        key: String(key),
        label: labelOf(rows[0]),
        order: orderOf(rows[0]),
        payments: new Set(rows.filter((r) => r.type === "PAYMENT").map((r) => r.transactionId)).size,
        received: toNumber(received),
        reversed: toNumber(reversed),
        net: toNumber(sub(received, reversed)),
      };
    })
    .sort((a, b) => (groupByKey === "day" || groupByKey === "month" ? String(a.key).localeCompare(String(b.key)) : a.order - b.order || String(a.label).localeCompare(String(b.label))))
    .map(({ order, ...rest }) => rest); // eslint-disable-line no-unused-vars
};

// ---------- printouts: fee bills and the day book ----------

/**
 * One student's fee bill: what is still owed, line by line.
 *
 *   installments: [{ feeTypeName, label, sequence, dueDate, amount, discountTotal, paidTotal, status }]
 *                 (live obligations only; cancelled installments are skipped here)
 *   dueBy:        "YYYY-MM-DD" or null. With a date, only installments due on or
 *                 before it are billed; an installment with no due date is due now,
 *                 so it is always billed.
 *
 * Returns { lines, totals: { due, overdue }, earliestDue } with numbers in rupees.
 * Lines keep the given order (callers pass fee then sequence).
 */
const billLines = (installments, { today, dueBy = null }) => {
  const lines = [];
  for (const i of installments) {
    if (i.status === "cancelled") continue;
    const owed = balance(i);
    if (!isPositive(owed)) continue;
    if (dueBy && i.dueDate && isoDay(i.dueDate) > dueBy) continue;
    lines.push({
      feeType: i.feeTypeName,
      label: i.label,
      dueDate: i.dueDate ? isoDay(i.dueDate) : null,
      balance: owed,
      overdue: isOverdue(i, today),
    });
  }
  const due = lines.reduce((acc, l) => add(acc, l.balance), dec(0));
  const overdue = lines.filter((l) => l.overdue).reduce((acc, l) => add(acc, l.balance), dec(0));
  const dated = lines.map((l) => l.dueDate).filter(Boolean).sort();
  return {
    lines: lines.map((l) => ({ ...l, balance: toNumber(l.balance) })),
    totals: { due: toNumber(due), overdue: toNumber(overdue) },
    earliestDue: dated[0] || null,
  };
};

/**
 * Totals for a printed day book: rows are ledger entries { type, method, amount }.
 * Payments add, reversals subtract. Per method in a fixed order (methods with no
 * entries are left out), then overall.
 */
const DAYBOOK_METHODS = ["cash", "cheque", "bank_transfer", "wallet", "card"];
const daybookTotals = (rows) => {
  const blank = () => ({ count: 0, payments: dec(0), reversals: dec(0) });
  const by = new Map();
  const all = blank();
  for (const r of rows) {
    if (!by.has(r.method)) by.set(r.method, blank());
    for (const t of [by.get(r.method), all]) {
      t.count += 1;
      if (r.type === "REVERSAL") t.reversals = add(t.reversals, r.amount);
      else t.payments = add(t.payments, r.amount);
    }
  }
  const out = (t) => ({ count: t.count, payments: toNumber(t.payments), reversals: toNumber(t.reversals), net: toNumber(sub(t.payments, t.reversals)) });
  const order = (m) => (DAYBOOK_METHODS.indexOf(m) === -1 ? DAYBOOK_METHODS.length : DAYBOOK_METHODS.indexOf(m));
  return {
    byMethod: [...by.entries()].sort((a, b) => order(a[0]) - order(b[0])).map(([method, t]) => ({ method, ...out(t) })),
    overall: out(all),
  };
};

module.exports = {
  billLines,
  daybookTotals,
  isoDay,
  addDays,
  bsMonthOf,
  bsMonthsBetween,
  collectedBetween,
  kpis,
  dailySeries,
  monthlySeries,
  byClass,
  byFeeType,
  obligationStatus,
  overdueTrend,
  collectionRows,
  money,
};
