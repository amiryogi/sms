const prisma = require("./src/config/database");

async function main() {
  // Check exam subjects
  const examSubjects = await prisma.examSubject.findMany({
    take: 5,
    select: {
      id: true,
      hasTheory: true,
      hasPractical: true,
      theoryFullMarks: true,
      practicalFullMarks: true,
      classSubject: {
        select: {
          id: true,
          theoryMarks: true,
          practicalMarks: true,
          hasTheory: true,
          hasPractical: true,
        },
      },
    },
  });

  console.log("=== ExamSubjects ===");
  console.log(JSON.stringify(examSubjects, null, 2));

  // Check class subjects with practical marks > 0
  const classSubjectsWithPractical = await prisma.classSubject.findMany({
    where: {
      practicalMarks: { gt: 0 },
    },
    take: 5,
    select: {
      id: true,
      theoryMarks: true,
      practicalMarks: true,
      hasTheory: true,
      hasPractical: true,
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
  });

  console.log("\n=== ClassSubjects with practicalMarks > 0 ===");
  console.log(JSON.stringify(classSubjectsWithPractical, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
