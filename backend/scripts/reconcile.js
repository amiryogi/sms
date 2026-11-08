#!/usr/bin/env node
/**
 * Check every school's cached fee balances against the ledger (read-only).
 *   node scripts/reconcile.js
 * Exits 1 if any difference is found. Same check as GET /api/v1/fees/reconcile.
 */
const prisma = require("../src/config/database");
const { reconcile } = require("../src/services/finance/obligation.service");

(async () => {
  let bad = 0;
  for (const school of await prisma.school.findMany({ select: { id: true, name: true } })) {
    const r = await reconcile({ schoolId: school.id });
    bad += r.problems.length;
    console.log(`${school.name}: ${r.checked.obligations} fees, ${r.checked.installments} installments, ${r.checked.allocations} allocations -> ${r.ok ? "OK" : `${r.problems.length} difference(s)`}`);
    for (const p of r.problems) console.log("  ", JSON.stringify(p));
  }
  await prisma.$disconnect();
  process.exit(bad ? 1 : 0);
})();
