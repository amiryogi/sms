/**
 * Diagnostic script to identify why marks entry form is empty
 * Run: node diagnose_marks_entry.js
 */
const prisma = require("./src/config/database");

async function diagnose() {
  console.log("🔍 DIAGNOSING MARKS ENTRY ISSUE\n");

  // 1. Get school and current academic year
  const school = await prisma.school.findFirst();
  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
  });

  console.log(`📚 School: ${school.name} (ID: ${school.id})`);
  console.log(
    `📅 Academic Year: ${academicYear.name} (ID: ${academicYear.id})\n`,
  );

  // 2. Get Grade 11 and 12 classes
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id, gradeLevel: { in: [11, 12] } },
  });
  console.log("🏫 Grade 11/12 Classes:");
  classes.forEach((c) =>
    console.log(`   - ${c.name} (ID: ${c.id}, Grade: ${c.gradeLevel})`),
  );

  // 3. Check for DUPLICATE SUBJECTS
  console.log("\n📖 SUBJECTS (checking for duplicates):");
  const subjects = await prisma.subject.findMany({
    where: { schoolId: school.id },
    orderBy: { name: "asc" },
  });

  const subjectsByName = {};
  subjects.forEach((s) => {
    if (!subjectsByName[s.name]) subjectsByName[s.name] = [];
    subjectsByName[s.name].push(s);
  });

  const duplicates = Object.entries(subjectsByName).filter(
    ([name, subs]) => subs.length > 1,
  );
  if (duplicates.length > 0) {
    console.log("   ⚠️  DUPLICATE SUBJECTS FOUND:");
    duplicates.forEach(([name, subs]) => {
      console.log(`   "${name}":`);
      subs.forEach((s) => console.log(`      - ID: ${s.id}, Code: ${s.code}`));
    });
  } else {
    console.log("   ✅ No duplicate subject names found");
  }

  // 4. Check TEACHER assignments for Grade 11/12
  console.log("\n👨‍🏫 TEACHER ASSIGNMENTS (Grade 11/12):");
  const teacherAssignments = await prisma.teacherSubject.findMany({
    where: {
      academicYearId: academicYear.id,
      classSubject: {
        classId: { in: classes.map((c) => c.id) },
      },
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      classSubject: {
        include: { class: true, subject: true },
      },
      section: true,
    },
  });

  if (teacherAssignments.length === 0) {
    console.log("   ❌ NO TEACHER ASSIGNMENTS for Grade 11/12!");
  } else {
    console.log(`   Found ${teacherAssignments.length} assignments:`);
    teacherAssignments.forEach((ta) => {
      console.log(
        `   - ${ta.user.firstName} ${ta.user.lastName} → ${ta.classSubject.subject.name} (${ta.classSubject.class.name}, Section ${ta.section.name})`,
      );
      console.log(`     ClassSubjectId: ${ta.classSubjectId}`);
    });
  }

  // 5. Check EXAMS and their subjects for Grade 11/12
  console.log("\n📝 EXAMS with Grade 11/12 subjects:");
  const exams = await prisma.exam.findMany({
    where: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      status: "PUBLISHED",
    },
    include: {
      examSubjects: {
        include: {
          classSubject: {
            include: { class: true, subject: true },
          },
        },
      },
    },
  });

  if (exams.length === 0) {
    console.log("   ❌ NO PUBLISHED EXAMS found!");
  } else {
    exams.forEach((exam) => {
      console.log(
        `\n   📋 ${exam.name} (ID: ${exam.id}, Status: ${exam.status}):`,
      );
      const grade11_12Subjects = exam.examSubjects.filter((es) =>
        [11, 12].includes(es.classSubject.class.gradeLevel),
      );

      if (grade11_12Subjects.length === 0) {
        console.log("      ❌ No Grade 11/12 subjects in this exam");
      } else {
        grade11_12Subjects.forEach((es) => {
          console.log(
            `      - ${es.classSubject.subject.name} (ClassSubjectId: ${es.classSubjectId})`,
          );
          console.log(
            `        Class: ${es.classSubject.class.name}, SubjectId: ${es.classSubject.subjectId}`,
          );
        });
      }
    });
  }

  // 6. KEY CHECK: Do teacher assignments match exam subjects?
  console.log("\n🔗 MATCHING CHECK (Teacher Assignments ↔ Exam Subjects):");
  const teacherClassSubjectIds = new Set(
    teacherAssignments.map((ta) => ta.classSubjectId),
  );
  const examClassSubjectIds = new Set();

  exams.forEach((exam) => {
    exam.examSubjects.forEach((es) => {
      if ([11, 12].includes(es.classSubject.class.gradeLevel)) {
        examClassSubjectIds.add(es.classSubjectId);
      }
    });
  });

  console.log(
    `   Teacher assignments reference ClassSubjectIds: [${[...teacherClassSubjectIds].join(", ")}]`,
  );
  console.log(
    `   Exam subjects reference ClassSubjectIds: [${[...examClassSubjectIds].join(", ")}]`,
  );

  const matchingIds = [...teacherClassSubjectIds].filter((id) =>
    examClassSubjectIds.has(id),
  );
  const unmatchedTeacher = [...teacherClassSubjectIds].filter(
    (id) => !examClassSubjectIds.has(id),
  );
  const unmatchedExam = [...examClassSubjectIds].filter(
    (id) => !teacherClassSubjectIds.has(id),
  );

  if (matchingIds.length > 0) {
    console.log(`   ✅ Matching: [${matchingIds.join(", ")}]`);
  }
  if (unmatchedTeacher.length > 0) {
    console.log(
      `   ⚠️  Teacher assigned to subjects NOT in exam: [${unmatchedTeacher.join(", ")}]`,
    );
  }
  if (unmatchedExam.length > 0) {
    console.log(
      `   ⚠️  Exam subjects with NO teacher assigned: [${unmatchedExam.join(", ")}]`,
    );
  }

  // 7. Check ClassSubjects for Grade 11/12
  console.log("\n📚 CLASS_SUBJECTS for Grade 11/12:");
  const classSubjects = await prisma.classSubject.findMany({
    where: {
      academicYearId: academicYear.id,
      classId: { in: classes.map((c) => c.id) },
    },
    include: {
      class: true,
      subject: true,
    },
    orderBy: [{ classId: "asc" }, { subjectId: "asc" }],
  });

  console.log(`   Total: ${classSubjects.length} class-subject assignments`);
  classSubjects.forEach((cs) => {
    const hasTeacher = teacherClassSubjectIds.has(cs.id) ? "✅" : "❌";
    const inExam = examClassSubjectIds.has(cs.id) ? "✅" : "❌";
    console.log(
      `   [${cs.id}] ${cs.class.name} - ${cs.subject.name} (Code: ${cs.subject.code}) | Teacher: ${hasTeacher} | InExam: ${inExam}`,
    );
  });

  // 8. Check students enrolled in Grade 11/12
  console.log("\n👨‍🎓 STUDENTS enrolled in Grade 11/12:");
  const studentClasses = await prisma.studentClass.findMany({
    where: {
      academicYearId: academicYear.id,
      classId: { in: classes.map((c) => c.id) },
      status: "active",
    },
    include: {
      student: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      class: true,
      section: true,
    },
  });

  if (studentClasses.length === 0) {
    console.log("   ❌ NO STUDENTS enrolled in Grade 11/12!");
  } else {
    console.log(`   Found ${studentClasses.length} enrolled students`);
    studentClasses.forEach((sc) => {
      console.log(
        `   - ${sc.student.user.firstName} ${sc.student.user.lastName} → ${sc.class.name}, Section ${sc.section.name}`,
      );
    });
  }

  console.log("\n✅ Diagnosis complete");
}

diagnose()
  .catch((e) => console.error("Error:", e))
  .finally(() => prisma.$disconnect());
