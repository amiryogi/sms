/**
 * Data Repair Script: Sync ExamSubjects with ClassSubjects
 *
 * This script updates existing ExamSubjects to copy hasTheory, hasPractical,
 * theoryFullMarks, and practicalFullMarks from their linked ClassSubjects.
 *
 * This is needed because exams created before the schema update have
 * incorrect evaluation structure data.
 */

const prisma = require("./src/config/database");

async function main() {
  console.log("=== Starting ExamSubject Sync ===\n");

  // Get all exam subjects with their class subjects
  const examSubjects = await prisma.examSubject.findMany({
    include: {
      classSubject: true,
      exam: { select: { name: true, status: true } },
    },
  });

  console.log(`Found ${examSubjects.length} exam subjects to check.\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const es of examSubjects) {
    const cs = es.classSubject;

    // Check if sync is needed
    const needsSync =
      es.hasTheory !== cs.hasTheory ||
      es.hasPractical !== cs.hasPractical ||
      es.theoryFullMarks !== cs.theoryMarks ||
      es.practicalFullMarks !== cs.practicalMarks;

    if (needsSync) {
      console.log(`Updating ExamSubject ID ${es.id} (Exam: ${es.exam.name}):`);
      console.log(
        `  Before: hasTheory=${es.hasTheory}, hasPractical=${es.hasPractical}, theoryFullMarks=${es.theoryFullMarks}, practicalFullMarks=${es.practicalFullMarks}`
      );
      console.log(
        `  After:  hasTheory=${cs.hasTheory}, hasPractical=${cs.hasPractical}, theoryFullMarks=${cs.theoryMarks}, practicalFullMarks=${cs.practicalMarks}`
      );

      await prisma.examSubject.update({
        where: { id: es.id },
        data: {
          hasTheory: cs.hasTheory,
          hasPractical: cs.hasPractical,
          theoryFullMarks: cs.theoryMarks,
          practicalFullMarks: cs.practicalMarks,
          // Also update fullMarks to be the sum
          fullMarks: cs.theoryMarks + cs.practicalMarks,
        },
      });

      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`\n=== Sync Complete ===`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Already in sync: ${skippedCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
