/**
 * Test-database fixture: old-style fee_payments rows (paid, partial, pending)
 * written with raw SQL, so the fee-ledger migration's backfill can be checked
 * against real paid data. Run only through scripts/with-test-db.js.
 */
const { PrismaClient } = require("@prisma/client");

if (process.env.SMS_TEST_DB !== "1") {
  console.error("Run through scripts/with-test-db.js only.");
  process.exit(1);
}

const prisma = new PrismaClient();

(async () => {
  const [sc] = await prisma.$queryRawUnsafe(
    "SELECT sc.id, sc.school_id, sc.class_id, sc.academic_year_id FROM student_classes sc JOIN academic_years y ON y.id = sc.academic_year_id WHERE y.is_current = 1 ORDER BY sc.id LIMIT 1",
  );
  const structures = await prisma.$queryRawUnsafe(
    "SELECT id, amount FROM fee_structures WHERE class_id = ? AND academic_year_id = ? ORDER BY id",
    sc.class_id,
    sc.academic_year_id,
  );
  // Add two more structures for this class so three rows can be made.
  const types = await prisma.$queryRawUnsafe("SELECT id FROM fee_types WHERE school_id = ? ORDER BY id", sc.school_id);
  const used = new Set((await prisma.$queryRawUnsafe("SELECT fee_type_id FROM fee_structures WHERE class_id = ? AND academic_year_id = ?", sc.class_id, sc.academic_year_id)).map((r) => r.fee_type_id));
  for (const t of types.filter((t) => !used.has(t.id)).slice(0, 3 - structures.length)) {
    await prisma.$executeRawUnsafe(
      "INSERT INTO fee_structures (school_id, fee_type_id, class_id, academic_year_id, amount, created_at, updated_at) VALUES (?, ?, ?, ?, 1000, NOW(3), NOW(3))",
      sc.school_id,
      t.id,
      sc.class_id,
      sc.academic_year_id,
    );
  }
  const all = await prisma.$queryRawUnsafe("SELECT id, amount FROM fee_structures WHERE class_id = ? AND academic_year_id = ? ORDER BY id LIMIT 3", sc.class_id, sc.academic_year_id);
  const rows = [
    { amountPaid: "amount", status: "paid", date: "2026-01-10", receipt: "RCP-1767000000000-1", method: "cash" },
    { amountPaid: "250.50", status: "partial", date: null, receipt: null, method: "upi" },
    { amountPaid: "0", status: "pending", date: null, receipt: null, method: null },
  ];
  for (let i = 0; i < 3; i++) {
    const r = rows[i];
    const paid = r.amountPaid === "amount" ? all[i].amount : r.amountPaid;
    await prisma.$executeRawUnsafe(
      "INSERT INTO fee_payments (school_id, student_class_id, fee_structure_id, amount_due, amount_paid, status, payment_date, receipt_number, payment_method, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))",
      sc.school_id,
      sc.id,
      all[i].id,
      all[i].amount,
      paid,
      r.status,
      r.date,
      r.receipt,
      r.method,
    );
  }
  console.log(`fixture: 3 fee rows for student_class ${sc.id}`);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
