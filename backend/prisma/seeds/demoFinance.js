/**
 * Demo fee data for a development or demo database: quarterly installment
 * plans, generated fees, a spread of payments, one reversal, discounts and a
 * pending reversal request, all made through the real finance services so
 * every rule and cache applies.
 *
 * It runs only when the school has NO fee transactions, so it never adds to a
 * school's real money records. Called from prisma/seed.js.
 */
const ledger = require("../../src/services/finance/ledger.service");
const discounts = require("../../src/services/finance/discount.service");
const obligations = require("../../src/services/finance/obligation.service");
const { kathmanduToday } = require("../../src/utils/fiscalYear");
const { addDays, isoDay } = require("../../src/utils/financeReports");

const METHODS = ["cash", "cash", "wallet", "bank_transfer", "cash", "cheque"];

async function seedDemoFinance(prisma, { school, academicYear, adminUser, superAdminUser, accountantUser }) {
  const existing = await prisma.feeTransaction.count({ where: { schoolId: school.id } });
  if (existing > 0) {
    console.log("   ⏭  Fee transactions already exist: demo finance data skipped\n");
    return;
  }

  const today = kathmanduToday();
  const start = isoDay(academicYear.startDate);
  const dueDates = [30, 120, 210, 300].map((d) => addDays(start, d));
  const labels = ["Term 1", "Term 2", "Term 3", "Term 4"];

  // 1. Quarterly plans on this year's fee structures that have no fees generated yet.
  const structures = await prisma.feeStructure.findMany({
    where: { schoolId: school.id, academicYearId: academicYear.id },
    include: { _count: { select: { feeObligations: true } } },
  });
  for (const fs of structures) {
    if (fs._count.feeObligations > 0) continue;
    const total = Math.round(Number(fs.amount) * 100);
    const part = Math.floor(total / 4);
    await obligations.setTemplate({
      schoolId: school.id,
      feeStructureId: fs.id,
      installments: labels.map((label, i) => ({
        label,
        dueDate: dueDates[i],
        amount: ((i === 3 ? total - part * 3 : part) / 100).toFixed(2),
      })),
    });
  }

  // 2. Generate fees for every class that has structures.
  const classIds = [...new Set(structures.map((s) => s.classId))];
  let generated = 0;
  for (const classId of classIds) {
    const enrolments = await prisma.studentClass.findMany({ where: { schoolId: school.id, classId, academicYearId: academicYear.id, status: "active" }, select: { id: true } });
    if (enrolments.length === 0) continue;
    generated += await obligations.generate({ schoolId: school.id, userId: accountantUser.id, actorRole: "ACCOUNTANT", studentClassIds: enrolments.map((e) => e.id), classId, academicYearId: academicYear.id });
  }

  // 3. Payments: a repeatable mix of fully paid, partly paid and unpaid students.
  const enrolments = await prisma.studentClass.findMany({
    where: { schoolId: school.id, academicYearId: academicYear.id, feeObligations: { some: {} } },
    orderBy: { id: "asc" },
    select: { id: true, studentId: true, feeObligations: { select: { installments: { orderBy: { sequence: "asc" } } } } },
  });
  const payments = [];
  for (const [n, e] of enrolments.entries()) {
    const terms = n % 5 === 0 ? 0 : n % 5 === 4 ? 4 : n % 5; // 0..4 terms paid
    const installments = e.feeObligations.flatMap((o) => o.installments);
    for (let t = 0; t < terms; t++) {
      const due = installments.filter((i) => i.sequence === t + 1);
      const amount = due.reduce((s, i) => s + Number(i.amount), 0);
      if (!amount) continue;
      const paidOn = [addDays(dueDates[t], -((n * 3 + t) % 12)), today].sort()[0];
      const result = await ledger.recordPayment({
        schoolId: school.id,
        userId: accountantUser.id,
        studentId: e.studentId,
        academicYearId: academicYear.id,
        amount: amount.toFixed(2),
        allocations: due.map((i) => ({ installmentId: i.id, amount: Number(i.amount).toFixed(2) })),
        method: METHODS[(n + t) % METHODS.length],
        reference: METHODS[(n + t) % METHODS.length] === "cash" ? undefined : `REF-${1000 + n * 10 + t}`,
        paidOn,
      });
      payments.push(result.transaction);
    }
    // Every third unpaid-term student paid part of the next term.
    if (n % 3 === 1 && terms < 4) {
      const next = installments.find((i) => i.sequence === terms + 1);
      if (next) {
        const part = (Math.floor(Number(next.amount) / 2 / 100) * 100).toFixed(2);
        if (Number(part) > 0) {
          payments.push(
            (
              await ledger.recordPayment({
                schoolId: school.id,
                userId: accountantUser.id,
                studentId: e.studentId,
                academicYearId: academicYear.id,
                amount: part,
                allocations: [{ installmentId: next.id, amount: part }],
                method: "cash",
                paidOn: [addDays(dueDates[terms] || today, -5), today].sort()[0],
              })
            ).transaction,
          );
        }
      }
    }
  }

  // 4. One reversal (approved request), one request still waiting.
  if (payments.length >= 2) {
    const req = await ledger.requestReversal({ schoolId: school.id, userId: accountantUser.id, transactionId: payments[1].id, reason: "Recorded against the wrong student", category: "CORRECTION" });
    await ledger.approveReversal({ schoolId: school.id, userId: adminUser.id, requestId: req.id, note: "Checked the counter slip" });
    await ledger.requestReversal({ schoolId: school.id, userId: accountantUser.id, transactionId: payments[payments.length - 1].id, reason: "Parent says this was paid twice", category: "REFUND" });
  }

  // 5. Discounts: one approved scholarship, one sibling discount waiting.
  const [a, b] = enrolments;
  if (a) {
    const d = await discounts.request({ schoolId: school.id, userId: accountantUser.id, studentId: a.studentId, academicYearId: academicYear.id, kind: "PERCENT", value: "25", category: "SCHOLARSHIP", name: "Merit scholarship", reason: "First in class, previous year" });
    await discounts.approve({ schoolId: school.id, userId: (superAdminUser || adminUser).id, id: d.id, note: "As per scholarship committee" });
  }
  if (b) {
    await discounts.request({ schoolId: school.id, userId: accountantUser.id, studentId: b.studentId, academicYearId: academicYear.id, kind: "FIXED", value: "2000", category: "DISCOUNT", name: "Sibling discount", reason: "Younger brother also enrolled" });
  }

  console.log(`   ✓ Demo finance: ${generated} fees, ${payments.length} payments, 1 reversal, 2 discounts\n`);
}

module.exports = { seedDemoFinance };
