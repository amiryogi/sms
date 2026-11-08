const { money, add, sum, toNumber, hasAtMostTwoDecimals, cmp } = require("../money");
const { fiscalYearOf, formatReceiptNumber, kathmanduToday } = require("../fiscalYear");
const { deriveStatus, installmentBalance, isOverdue, rollup } = require("../feeStatus");
const { allocatePayment, checkAllocations, discountFor, splitProportionally, spreadDiscount } = require("../feeAllocation");
const { tally, rateOf, byBsMonth } = require("../attendanceRate");
const { convertADToBS } = require("../dateConverter");

const inst = (over) => ({ id: 1, obligationId: 1, sequence: 1, dueDate: null, amount: "1000", discountTotal: "0", paidTotal: "0", status: "pending", ...over });

describe("money", () => {
  test("adds without float error", () => {
    expect(add("0.1", "0.2").toFixed(2)).toBe("0.30");
    expect(toNumber(add(0.1, 0.2))).toBe(0.3);
  });
  test("rounds half up to paisa", () => {
    expect(money("10.005").toFixed(2)).toBe("10.01");
    expect(money("10.004").toFixed(2)).toBe("10.00");
  });
  test("sums a list with a picker", () => {
    expect(sum([{ a: "1.10" }, { a: 2.2 }], (x) => x.a).toFixed(2)).toBe("3.30");
  });
  test("rejects fractions of a paisa", () => {
    expect(hasAtMostTwoDecimals("12.34")).toBe(true);
    expect(hasAtMostTwoDecimals("12.345")).toBe(false);
    expect(hasAtMostTwoDecimals("abc")).toBe(false);
  });
});

describe("fiscal year", () => {
  // Find the AD dates of Ashadh end and Shrawan 1 for BS 2082 by scanning.
  const findAd = (year, month, day) => {
    for (let t = Date.UTC(2025, 5, 1); t < Date.UTC(2025, 8, 1); t += 86400000) {
      const bs = convertADToBS(new Date(t));
      if (bs.year === year && bs.month === month && bs.day === day) return new Date(t);
    }
    throw new Error("not found");
  };
  test("Shrawan 1 starts the new fiscal year", () => {
    const shrawan1 = findAd(2082, 4, 1);
    const dayBefore = new Date(shrawan1.getTime() - 86400000);
    expect(fiscalYearOf(shrawan1)).toBe("2082-83");
    expect(fiscalYearOf(dayBefore)).toBe("2081-82");
  });
  test("handles a YYYY-MM-DD string and bad input", () => {
    expect(fiscalYearOf("2026-01-15")).toBe("2082-83");
    expect(fiscalYearOf("not a date")).toBeNull();
  });
  test("receipt number format", () => {
    expect(formatReceiptNumber("RCP", "2082-83", 42)).toBe("RCP-2082-83-00042");
  });
  test("today in Kathmandu crosses midnight before UTC does", () => {
    expect(kathmanduToday(new Date("2026-11-07T18:30:00Z"))).toBe("2026-11-08");
    expect(kathmanduToday(new Date("2026-11-07T18:00:00Z"))).toBe("2026-11-07");
  });
});

describe("fee status", () => {
  test("pending, partial, paid, cancelled", () => {
    expect(deriveStatus(inst())).toBe("pending");
    expect(deriveStatus(inst({ paidTotal: "200" }))).toBe("partial");
    expect(deriveStatus(inst({ paidTotal: "1000" }))).toBe("paid");
    expect(deriveStatus(inst({ discountTotal: "300", paidTotal: "700" }))).toBe("paid");
    expect(deriveStatus(inst({ discountTotal: "1000" }))).toBe("paid");
    expect(deriveStatus({ ...inst(), cancelled: true })).toBe("cancelled");
  });
  test("balance is amount minus discount minus paid", () => {
    expect(installmentBalance(inst({ discountTotal: "100", paidTotal: "250.50" })).toFixed(2)).toBe("649.50");
  });
  test("overdue only when past due with money owed", () => {
    expect(isOverdue(inst({ dueDate: "2026-11-01" }), "2026-11-08")).toBe(true);
    expect(isOverdue(inst({ dueDate: "2026-11-08" }), "2026-11-08")).toBe(false);
    expect(isOverdue(inst({ dueDate: "2026-11-01", paidTotal: "1000" }), "2026-11-08")).toBe(false);
    expect(isOverdue(inst({ dueDate: null }), "2026-11-08")).toBe(false);
  });
  test("rollup ignores cancelled installments", () => {
    const r = rollup([inst({ amount: "500", paidTotal: "100" }), inst({ id: 2, amount: "300", status: "cancelled" })]);
    expect(r.amount.toFixed(2)).toBe("500.00");
    expect(r.balance.toFixed(2)).toBe("400.00");
  });
});

describe("payment allocation", () => {
  const list = [
    inst({ id: 3, sequence: 3, dueDate: null, amount: "500" }),
    inst({ id: 1, sequence: 1, dueDate: "2026-04-15", amount: "500", paidTotal: "200" }),
    inst({ id: 2, sequence: 2, dueDate: "2026-07-15", amount: "500" }),
  ];
  test("oldest due first, undated last", () => {
    const { allocations, unallocated } = allocatePayment(list, "900");
    expect(allocations.map((a) => [a.installmentId, a.amount.toFixed(2)])).toEqual([
      [1, "300.00"],
      [2, "500.00"],
      [3, "100.00"],
    ]);
    expect(unallocated.toFixed(2)).toBe("0.00");
  });
  test("reports money beyond what is owed", () => {
    expect(allocatePayment(list, "1400").unallocated.toFixed(2)).toBe("100.00");
  });
  test("explicit allocations are checked against balances", () => {
    const byId = new Map(list.map((i) => [i.id, i]));
    expect(checkAllocations(byId, [{ installmentId: 1, amount: "300" }])).toEqual([]);
    expect(checkAllocations(byId, [{ installmentId: 1, amount: "301" }])[0]).toMatch(/only 300.00 is owed/);
    expect(checkAllocations(byId, [{ installmentId: 9, amount: "1" }])[0]).toMatch(/not one of/);
    expect(checkAllocations(byId, [{ installmentId: 2, amount: "1" }, { installmentId: 2, amount: "1" }])).toContain("Installment 2 appears twice");
  });
});

describe("discounts", () => {
  test("percent of the original amount, or a fixed value", () => {
    expect(discountFor("PERCENT", "12.5", "3500").toFixed(2)).toBe("437.50");
    expect(discountFor("FIXED", "250", "3500").toFixed(2)).toBe("250.00");
  });
  test("fixed totals split proportionally and add up exactly", () => {
    const parts = splitProportionally("100", [{ id: 1, amount: "1" }, { id: 2, amount: "1" }, { id: 3, amount: "1" }]);
    expect(parts.map((p) => p.amount.toFixed(2))).toEqual(["33.33", "33.33", "33.34"]);
    expect(sum(parts, (p) => p.amount).toFixed(2)).toBe("100.00");
  });
  test("spread newest first and capped at unpaid", () => {
    const list = [inst({ id: 1, sequence: 1, amount: "500", paidTotal: "500" }), inst({ id: 2, sequence: 2, amount: "500", paidTotal: "100" })];
    const { applications, capped } = spreadDiscount(list, "600");
    expect(applications.map((a) => [a.installmentId, a.amount.toFixed(2)])).toEqual([[2, "400.00"]]);
    expect(capped.toFixed(2)).toBe("200.00");
    expect(cmp(capped, 0)).toBe(1);
  });
});

describe("attendance rate", () => {
  const rec = (date, status) => ({ attendanceDate: new Date(`${date}T00:00:00Z`), status });
  const records = [rec("2026-05-01", "present"), rec("2026-05-02", "late"), rec("2026-05-03", "absent"), rec("2026-05-04", "excused")];
  test("late counts as present only when the school says so", () => {
    const counts = tally(records);
    expect(counts).toEqual({ total: 4, present: 1, absent: 1, late: 1, excused: 1 });
    expect(rateOf(counts, { countLateAsPresent: true })).toEqual({ attended: 2, percentage: 50 });
    expect(rateOf(counts, { countLateAsPresent: false })).toEqual({ attended: 1, percentage: 25 });
    expect(rateOf(tally([]))).toEqual({ attended: 0, percentage: 0 });
  });
  test("groups by BS month, newest first", () => {
    const months = byBsMonth([...records, rec("2026-06-20", "present")], { countLateAsPresent: true });
    expect(months).toHaveLength(2);
    expect(months[0].year * 100 + months[0].month).toBeGreaterThan(months[1].year * 100 + months[1].month);
    expect(months[1].label).toMatch(/^Baisakh 2083$/);
    expect(months[1].percentage).toBe(50);
  });
});
