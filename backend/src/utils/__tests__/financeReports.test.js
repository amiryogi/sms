const fr = require("../financeReports");
const { toCsv } = require("../csv");
const { convertADToBS } = require("../dateConverter");

// Two classes, two fee types. Today is 2026-11-08.
const TODAY = "2026-11-08";
const inst = (over) => ({ obligationId: over.id, studentId: 1, classId: 9, className: "Grade 9", classOrder: 9, feeTypeId: 1, feeTypeName: "Tuition", dueDate: null, amount: "1000", discountTotal: "0", paidTotal: "0", ...over });
const installments = [
  inst({ id: 1, obligationId: 1, studentId: 1, dueDate: "2026-10-01", amount: "1000", paidTotal: "1000" }), // paid
  inst({ id: 2, obligationId: 1, studentId: 1, dueDate: "2026-12-01", amount: "1000", paidTotal: "400" }), // partial, not yet due
  inst({ id: 3, obligationId: 3, studentId: 2, dueDate: "2026-10-15", amount: "2000", discountTotal: "500", paidTotal: "0" }), // overdue 1500
  inst({ id: 4, obligationId: 4, studentId: 3, classId: 10, className: "Grade 10", classOrder: 10, feeTypeId: 2, feeTypeName: "Exam", amount: "500", paidTotal: "0" }), // no due date
];
const alloc = (over) => ({ transactionId: over.installmentId * 10, type: "PAYMENT", method: "cash", ...over });
const allocations = [
  alloc({ installmentId: 1, transactionId: 1, amount: "1000", paidOn: "2026-09-20" }),
  alloc({ installmentId: 2, transactionId: 2, amount: "600", paidOn: "2026-11-07", method: "wallet" }),
  alloc({ installmentId: 2, transactionId: 3, amount: "200", paidOn: "2026-11-08" }),
  alloc({ installmentId: 2, transactionId: 4, type: "REVERSAL", amount: "600", paidOn: "2026-11-08" }), // reverses the 600, recorded today
  alloc({ installmentId: 2, transactionId: 5, amount: "200", paidOn: "2026-11-08" }),
];

describe("finance KPIs", () => {
  const k = fr.kpis({ installments, allocations, today: TODAY, range: { from: "2026-11-01", to: TODAY } });

  test("obligations: gross, discounts, net, collected, outstanding", () => {
    expect(k.expectedGross).toBe(4500);
    expect(k.discounts).toBe(500);
    expect(k.expectedNet).toBe(4000);
    expect(k.collected).toBe(1400);
    expect(k.outstanding).toBe(2600); // 600 + 1500 + 500
    expect(k.collectionRate).toBe(35);
  });

  test("cash basis: today's reversal reduces today, yesterday is unchanged", () => {
    expect(k.today).toBe(-200); // +200 +200 -600
    expect(fr.collectedBetween(allocations, "2026-11-07", "2026-11-07").net.toFixed(2)).toBe("600.00");
  });

  test("pending vs overdue", () => {
    expect(k.overdue).toEqual({ installments: 1, amount: 1500, students: 1 });
    expect(k.pending).toEqual({ installments: 2, amount: 1100 }); // 600 not yet due + 500 undated
  });

  test("transaction counts in the range", () => {
    expect(k.transactions).toEqual({ payments: 3, reversals: 1 });
    expect(k.range).toMatchObject({ received: 1000, reversed: 600, net: 400 });
  });

  test("this month is the current BS month", () => {
    const bs = convertADToBS(TODAY);
    expect(k.thisMonth.label).toContain(String(bs.year));
    expect(k.thisMonth.from <= TODAY && k.thisMonth.to >= TODAY).toBe(true);
  });
});

describe("series", () => {
  test("daily series has every day, zeros included", () => {
    const d = fr.dailySeries(allocations, "2026-11-06", TODAY);
    expect(d).toEqual([
      { date: "2026-11-06", amount: 0 },
      { date: "2026-11-07", amount: 600 },
      { date: "2026-11-08", amount: -200 },
    ]);
  });

  test("BS months are contiguous and cover the range", () => {
    const months = fr.bsMonthsBetween("2026-04-14", TODAY);
    for (let i = 1; i < months.length; i++) expect(months[i].start).toBe(fr.addDays(months[i - 1].end, 1));
    expect(months[0].start <= "2026-04-14").toBe(true);
    expect(months.at(-1).end >= TODAY).toBe(true);
    const monthly = fr.monthlySeries(allocations, months);
    expect(monthly.reduce((s, m) => s + m.amount, 0)).toBe(1400);
  });

  test("breakdown by class and fee type", () => {
    expect(fr.byClass(installments)).toEqual([
      { key: 9, label: "Grade 9", expected: 3500, collected: 1400, outstanding: 2100, students: 2 },
      { key: 10, label: "Grade 10", expected: 500, collected: 0, outstanding: 500, students: 1 },
    ]);
    expect(fr.byFeeType(installments).map((r) => [r.label, r.outstanding])).toEqual([
      ["Exam", 500],
      ["Tuition", 2100],
    ]);
  });

  test("fees by state", () => {
    expect(fr.obligationStatus(installments, TODAY)).toEqual({
      paid: { count: 0, amount: 0 },
      overdue: { count: 1, amount: 1500 },
      partial: { count: 1, amount: 600 },
      pending: { count: 1, amount: 500 },
    });
  });

  test("overdue trend counts what was unpaid on each month end", () => {
    const months = [fr.bsMonthOf("2026-10-20"), fr.bsMonthOf(TODAY)];
    const trend = fr.overdueTrend(installments, allocations, months, TODAY);
    // At the end of the first month inst 1 (due Oct 1) was paid on Sep 20 and inst 3 (Oct 15, net 1500) unpaid.
    expect(trend[0].amount).toBe(1500);
    expect(trend[1].at).toBe(TODAY);
  });
});

describe("collections report", () => {
  test("groups by method with received, reversed and net", () => {
    const rows = fr.collectionRows(allocations, "method");
    expect(rows.find((r) => r.key === "wallet")).toMatchObject({ payments: 1, received: 600, reversed: 0, net: 600 });
    expect(rows.find((r) => r.key === "cash")).toMatchObject({ payments: 3, received: 1400, reversed: 600, net: 800 });
  });

  test("groups by day in date order", () => {
    expect(fr.collectionRows(allocations, "day").map((r) => r.key)).toEqual(["2026-09-20", "2026-11-07", "2026-11-08"]);
  });
});

describe("csv", () => {
  test("quotes cells, keeps numbers, neutralises formulas", () => {
    const csv = toCsv(
      [
        { key: "name", label: "Name" },
        { key: "amt", label: "Amount" },
      ],
      [
        { name: 'Ram "Hari"', amt: 12.5 },
        { name: "=HYPERLINK(1)", amt: -3 },
      ],
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Ram ""Hari"""');
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
    expect(csv).toContain('"-3"');
  });
});

describe("billLines: what a fee bill asks for", () => {
  const i = (over) => ({ feeTypeName: "Tuition", label: "Full amount", sequence: 1, dueDate: null, amount: "1000", discountTotal: "0", paidTotal: "0", status: "pending", ...over });

  test("bills only what is still owed, after discounts and payments", () => {
    const bill = fr.billLines(
      [
        i({ label: "Baisakh", dueDate: "2026-10-01", paidTotal: "1000", status: "paid" }), // paid: left out
        i({ label: "Jestha", dueDate: "2026-10-20", amount: "1000", discountTotal: "100", paidTotal: "300" }), // 600 overdue
        i({ feeTypeName: "Exam", amount: "500" }), // no due date: due now
        i({ feeTypeName: "Bus", amount: "800", status: "cancelled" }), // waived: left out
      ],
      { today: TODAY },
    );
    expect(bill.lines).toEqual([
      { feeType: "Tuition", label: "Jestha", dueDate: "2026-10-20", balance: 600, overdue: true },
      { feeType: "Exam", label: "Full amount", dueDate: null, balance: 500, overdue: false },
    ]);
    expect(bill.totals).toEqual({ due: 1100, overdue: 600 });
    expect(bill.earliestDue).toBe("2026-10-20");
  });

  test("dueBy bills installments due on or before the date, and undated ones", () => {
    const rows = [
      i({ label: "Mangsir", dueDate: "2026-11-30" }),
      i({ label: "Poush", dueDate: "2026-12-31" }),
      i({ feeTypeName: "Exam", amount: "500" }),
    ];
    const bill = fr.billLines(rows, { today: TODAY, dueBy: "2026-11-30" });
    expect(bill.lines.map((l) => l.label)).toEqual(["Mangsir", "Full amount"]);
    expect(bill.totals.due).toBe(1500);
    expect(bill.totals.overdue).toBe(0);
  });

  test("keeps paisa exact", () => {
    const bill = fr.billLines([i({ amount: "0.30", paidTotal: "0.10" }), i({ amount: "0.10" })], { today: TODAY });
    expect(bill.totals.due).toBe(0.3);
  });

  test("nothing owed gives an empty bill", () => {
    expect(fr.billLines([i({ paidTotal: "1000", status: "paid" })], { today: TODAY })).toEqual({ lines: [], totals: { due: 0, overdue: 0 }, earliestDue: null });
  });
});

describe("daybookTotals: the cash counter's totals", () => {
  test("payments add, reversals subtract, per method in a fixed order", () => {
    const t = fr.daybookTotals([
      { type: "PAYMENT", method: "bank_transfer", amount: "2500" },
      { type: "PAYMENT", method: "cash", amount: "1000.50" },
      { type: "PAYMENT", method: "cash", amount: "499.50" },
      { type: "REVERSAL", method: "cash", amount: "300" },
    ]);
    expect(t.byMethod).toEqual([
      { method: "cash", count: 3, payments: 1500, reversals: 300, net: 1200 },
      { method: "bank_transfer", count: 1, payments: 2500, reversals: 0, net: 2500 },
    ]);
    expect(t.overall).toEqual({ count: 4, payments: 4000, reversals: 300, net: 3700 });
  });

  test("an empty day is all zeros", () => {
    expect(fr.daybookTotals([])).toEqual({ byMethod: [], overall: { count: 0, payments: 0, reversals: 0, net: 0 } });
  });
});
