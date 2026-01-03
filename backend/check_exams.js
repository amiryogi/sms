const prisma = require("./src/config/database");

async function main() {
  const exams = await prisma.exam.findMany({
    include: {
      examSubjects: {
        include: {
          classSubject: {
            include: { class: true },
          },
        },
      },
    },
  });

  console.log("=== Exams and their linked Classes ===\n");

  for (const exam of exams) {
    const classes = [
      ...new Set(exam.examSubjects.map((es) => es.classSubject.class.name)),
    ];
    console.log(
      `Exam: ${exam.name} | Status: ${exam.status} | Classes: ${
        classes.join(", ") || "NONE"
      }`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
