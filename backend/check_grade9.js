const prisma = require("./src/config/database");

async function main() {
  // Check ALL exam subjects with their class subjects
  const examSubjects = await prisma.examSubject.findMany({
    include: {
      classSubject: {
        include: {
          class: true,
          subject: true,
        },
      },
      exam: { select: { name: true, status: true } },
    },
  });

  console.log("=== ALL ExamSubjects vs ClassSubjects ===\n");

  for (const es of examSubjects) {
    const cs = es.classSubject;
    const outOfSync =
      es.hasPractical !== cs.hasPractical ||
      es.practicalFullMarks !== cs.practicalMarks;

    const syncStatus = outOfSync ? "❌ OUT OF SYNC" : "✅ OK";

    console.log(
      `${syncStatus} | ${es.exam.name} | ${cs.class.name} | ${cs.subject.name}`
    );
    if (outOfSync) {
      console.log(
        `   ExamSubject: hasPractical=${es.hasPractical}, practicalFullMarks=${es.practicalFullMarks}`
      );
      console.log(
        `   ClassSubject: hasPractical=${cs.hasPractical}, practicalMarks=${cs.practicalMarks}`
      );
    }
  }

  // Check specifically for Grade 9
  console.log("\n=== Grade 9 ClassSubjects ===");
  const grade9 = await prisma.classSubject.findMany({
    where: {
      class: { name: { contains: "9" } },
    },
    include: {
      class: true,
      subject: true,
    },
  });

  for (const cs of grade9) {
    console.log(
      `${cs.class.name} | ${cs.subject.name} | hasPractical=${cs.hasPractical} | practicalMarks=${cs.practicalMarks}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
