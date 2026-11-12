// Removes the exams the browser tests created ("E2E ..." / "RA Pilot ..."),
// with their subjects and marks. The API refuses to delete an exam that has
// marks, so this goes straight to the TEST database.
// Run from backend/:  node scripts/with-test-db.js --provider mysql node ../e2e/helpers/cleanup-exams.js
if (process.env.SMS_TEST_DB !== "1") {
  console.error("cleanup-exams: test database only (run through scripts/with-test-db.js)");
  process.exit(1);
}
const { prisma } = require(require("node:path").join(process.cwd(), "src/database"));

(async () => {
  const exams = await prisma.exam.findMany({
    where: { OR: [{ name: { startsWith: "E2E " } }, { name: { startsWith: "RA Pilot " } }] },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
  for (const exam of exams) {
    await prisma.examResult.deleteMany({ where: { examSubject: { examId: exam.id } } });
    await prisma.examSubject.deleteMany({ where: { examId: exam.id } });
    await prisma.exam.delete({ where: { id: exam.id } });
    console.log(`removed exam ${exam.id} ${exam.name}`);
  }
  await prisma.$disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
