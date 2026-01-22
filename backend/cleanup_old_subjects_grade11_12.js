/**
 * Cleanup script to remove old (non-NEB) ClassSubjects for Grade 11 and 12 ONLY
 * This keeps the NEB subjects (with codes like 0031_11, 0071_11, etc.)
 *
 * Run: node cleanup_old_subjects_grade11_12.js
 */
const prisma = require("./src/config/database");

// Old subject codes from seed.js (non-NEB subjects)
const OLD_SUBJECT_CODES = [
  "ENG",
  "MATH",
  "SCI",
  "SOC",
  "NEP",
  "CS",
  "PE",
  "ART",
];

async function cleanup() {
  console.log(
    "🧹 CLEANUP: Removing old (non-NEB) ClassSubjects for Grade 11/12\n",
  );

  // Get school and current academic year
  const school = await prisma.school.findFirst();
  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
  });

  console.log(`📚 School: ${school.name}`);
  console.log(`📅 Academic Year: ${academicYear.name}\n`);

  // Get Grade 11 and 12 classes
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id, gradeLevel: { in: [11, 12] } },
  });
  const classIds = classes.map((c) => c.id);
  console.log(`🏫 Target Classes: ${classes.map((c) => c.name).join(", ")}\n`);

  // Find old subjects (non-NEB) by their codes
  const oldSubjects = await prisma.subject.findMany({
    where: {
      schoolId: school.id,
      code: { in: OLD_SUBJECT_CODES },
    },
  });
  const oldSubjectIds = oldSubjects.map((s) => s.id);

  console.log("📖 Old subjects to remove from Grade 11/12:");
  oldSubjects.forEach((s) =>
    console.log(`   - ${s.name} (Code: ${s.code}, ID: ${s.id})`),
  );

  // Find ClassSubjects to delete (Grade 11/12 only, old subjects only)
  const classSubjectsToDelete = await prisma.classSubject.findMany({
    where: {
      classId: { in: classIds },
      subjectId: { in: oldSubjectIds },
    },
    include: {
      class: true,
      subject: true,
      teacherSubjects: true,
      examSubjects: true,
    },
  });

  if (classSubjectsToDelete.length === 0) {
    console.log(
      "\n✅ No old ClassSubjects found for Grade 11/12. Nothing to clean up.",
    );
    return;
  }

  console.log(
    `\n⚠️  Found ${classSubjectsToDelete.length} ClassSubjects to remove:`,
  );
  classSubjectsToDelete.forEach((cs) => {
    console.log(
      `   [${cs.id}] ${cs.class.name} - ${cs.subject.name} (${cs.subject.code})`,
    );
    if (cs.teacherSubjects.length > 0) {
      console.log(
        `      └─ Has ${cs.teacherSubjects.length} teacher assignment(s) - will be removed`,
      );
    }
    if (cs.examSubjects.length > 0) {
      console.log(
        `      └─ Has ${cs.examSubjects.length} exam subject(s) - will be removed`,
      );
    }
  });

  const classSubjectIds = classSubjectsToDelete.map((cs) => cs.id);

  // Confirm before proceeding
  console.log(
    "\n🔴 This will DELETE the above ClassSubjects and related assignments.",
  );
  console.log("   Grade 1-10 will NOT be affected.\n");

  // Perform deletion in correct order (due to foreign keys)
  console.log("🗑️  Deleting...");

  // 1. Delete TeacherSubjects referencing these ClassSubjects
  const deletedTeacherSubjects = await prisma.teacherSubject.deleteMany({
    where: { classSubjectId: { in: classSubjectIds } },
  });
  console.log(
    `   ✓ Removed ${deletedTeacherSubjects.count} teacher assignments`,
  );

  // 2. Delete ExamSubjects referencing these ClassSubjects
  const deletedExamSubjects = await prisma.examSubject.deleteMany({
    where: { classSubjectId: { in: classSubjectIds } },
  });
  console.log(`   ✓ Removed ${deletedExamSubjects.count} exam subjects`);

  // 3. Delete ProgramSubjects referencing these ClassSubjects
  const deletedProgramSubjects = await prisma.programSubject.deleteMany({
    where: { classSubjectId: { in: classSubjectIds } },
  });
  console.log(`   ✓ Removed ${deletedProgramSubjects.count} program subjects`);

  // 4. Delete StudentSubjects referencing these ClassSubjects (if any)
  const deletedStudentSubjects = await prisma.studentSubject.deleteMany({
    where: { classSubjectId: { in: classSubjectIds } },
  });
  console.log(`   ✓ Removed ${deletedStudentSubjects.count} student subjects`);

  // 5. Delete the ClassSubjects themselves
  const deletedClassSubjects = await prisma.classSubject.deleteMany({
    where: { id: { in: classSubjectIds } },
  });
  console.log(`   ✓ Removed ${deletedClassSubjects.count} class subjects`);

  console.log("\n✅ Cleanup complete! Old subjects removed from Grade 11/12.");
  console.log("   NEB subjects remain intact for Grade 11/12.");
  console.log("   Grade 1-10 was not affected.");
}

cleanup()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
