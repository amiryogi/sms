#!/usr/bin/env node
/**
 * Move the demo school's user emails from @svi.edu.np to @demo.edu.np, in place.
 *
 *   node scripts/rename-demo-domain.js --dry-run   # show what would change
 *   node scripts/rename-demo-domain.js             # change it
 *
 * Needed once on databases seeded before the seed switched domains (2026-11-13). The seed finds
 * users by email, so re-seeding such a database would add a second set of users instead.
 * Only the addresses the seed creates are touched (admin, superadmin, examofficer, accountant,
 * teacherN, studentN, parent.stuNNNN), and only in the demo school (code DEMO001). Any other
 * @svi.edu.np account may be a real person's and is listed, not changed. Usernames, passwords
 * and sign-in sessions stay as they are. Safe to run again: nothing is left to rename.
 */
const prisma = require("../src/config/database");
const { label } = require("../src/database");

const FROM = "@svi.edu.np";
const TO = "@demo.edu.np";
const DRY_RUN = process.argv.includes("--dry-run");
// The local parts prisma/seed.js uses for its demo accounts.
const SEEDED = /^(admin|superadmin|examofficer|accountant|teacher\d+|student\d+|parent\.stu\d+)$/;

(async () => {
  console.log(`db: ${label}${DRY_RUN ? "  (dry run: nothing is changed)" : ""}`);
  const school = await prisma.school.findFirst({ where: { code: "DEMO001" }, select: { id: true, name: true } });
  if (!school) {
    console.log("No demo school (DEMO001) in this database: nothing to do.");
    return;
  }

  const users = await prisma.user.findMany({
    where: { schoolId: school.id, email: { endsWith: FROM } },
    select: { id: true, email: true },
    orderBy: { id: "asc" },
  });

  let renamed = 0;
  let skipped = 0;
  for (const user of users) {
    const local = user.email.slice(0, -FROM.length);
    if (!SEEDED.test(local)) {
      console.log(`  keep ${user.email}: not a seeded demo account`);
      skipped += 1;
      continue;
    }
    const email = local + TO;
    const taken = await prisma.user.findFirst({ where: { schoolId: school.id, email }, select: { id: true } });
    if (taken) {
      console.log(`  skip ${user.email}: ${email} already belongs to user ${taken.id}`);
      skipped += 1;
      continue;
    }
    if (!DRY_RUN) await prisma.user.update({ where: { id: user.id }, data: { email } });
    renamed += 1;
  }

  console.log(`${school.name}: ${renamed} email(s) ${DRY_RUN ? "would be renamed" : "renamed"} ${FROM} -> ${TO}, ${skipped} left as they are.`);
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
