/**
 * Data Validation Script: Subject Enrollment for Grades 11-12
 *
 * This script checks for data integrity issues related to StudentSubject enrollment
 * for NEB Grade 11-12 students. It identifies:
 *
 * 1. Grade 11-12 students without any StudentSubject records
 * 2. ExamResult records for subjects students are not enrolled in
 * 3. Program/Subject mismatches (e.g., Science student with Management subjects)
 * 4. Orphaned StudentSubject records (references deleted students/subjects)
 *
 * Usage: node validate_subject_enrollment.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ANSI color codes for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const log = {
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) =>
    console.log(
      `\n${colors.cyan}${"=".repeat(60)}\n${msg}\n${"=".repeat(60)}${colors.reset}`,
    ),
};

async function validateSubjectEnrollment() {
  try {
    log.section("STARTING SUBJECT ENROLLMENT VALIDATION");

    const issues = {
      missingStudentSubjects: [],
      orphanedExamResults: [],
      programMismatches: [],
      orphanedStudentSubjects: [],
    };

    // ========================================
    // Check 1: Grade 11-12 students without StudentSubject records
    // ========================================
    log.section("CHECK 1: Grade 11-12 Students Without Subject Enrollment");

    const nebStudents = await prisma.studentClass.findMany({
      where: {
        status: "active",
        class: {
          gradeLevel: { gte: 11 },
        },
      },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        class: true,
        section: true,
        academicYear: true,
        studentSubjects: true,
        studentProgram: {
          include: { program: true },
        },
      },
    });

    log.info(`Found ${nebStudents.length} active Grade 11-12 students`);

    nebStudents.forEach((sc) => {
      if (!sc.studentSubjects || sc.studentSubjects.length === 0) {
        issues.missingStudentSubjects.push({
          studentClassId: sc.id,
          studentId: sc.studentId,
          name: `${sc.student.user.firstName} ${sc.student.user.lastName}`,
          email: sc.student.user.email,
          class: sc.class.name,
          section: sc.section.name,
          academicYear: sc.academicYear.year,
          program: sc.studentProgram?.program?.name || "No Program Assigned",
          rollNumber: sc.rollNumber,
        });
      }
    });

    if (issues.missingStudentSubjects.length > 0) {
      log.error(
        `Found ${issues.missingStudentSubjects.length} Grade 11-12 students without subject enrollment:`,
      );
      issues.missingStudentSubjects.forEach((issue) => {
        console.log(`  - ${issue.name} (${issue.email})`);
        console.log(
          `    Class: ${issue.class} ${issue.section}, Roll: ${issue.rollNumber}`,
        );
        console.log(
          `    Program: ${issue.program}, Year: ${issue.academicYear}`,
        );
        console.log(`    StudentClassId: ${issue.studentClassId}\n`);
      });
    } else {
      log.success("All Grade 11-12 students have subject enrollments");
    }

    // ========================================
    // Check 2: ExamResults for unenrolled subjects (Grade 11-12 only)
    // ========================================
    log.section("CHECK 2: Exam Results for Unenrolled Subjects");

    const examResults = await prisma.examResult.findMany({
      where: {
        studentClass: {
          class: {
            gradeLevel: { gte: 11 },
          },
        },
      },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        studentClass: {
          include: {
            class: true,
            section: true,
            studentSubjects: {
              select: { classSubjectId: true },
            },
          },
        },
        examSubject: {
          include: {
            exam: {
              select: { name: true, examType: true },
            },
            classSubject: {
              include: {
                subject: {
                  select: { name: true, code: true },
                },
              },
            },
          },
        },
      },
    });

    log.info(
      `Checking ${examResults.length} exam results for Grade 11-12 students`,
    );

    examResults.forEach((result) => {
      const enrolledSubjectIds = result.studentClass.studentSubjects.map(
        (ss) => ss.classSubjectId,
      );

      const isEnrolled = enrolledSubjectIds.includes(
        result.examSubject.classSubjectId,
      );

      if (!isEnrolled) {
        issues.orphanedExamResults.push({
          examResultId: result.id,
          studentName: `${result.student.user.firstName} ${result.student.user.lastName}`,
          class: result.studentClass.class.name,
          section: result.studentClass.section.name,
          exam: result.examSubject.exam.name,
          subject: result.examSubject.classSubject.subject.name,
          subjectCode: result.examSubject.classSubject.subject.code,
          marksObtained: result.marksObtained,
          isAbsent: result.isAbsent,
        });
      }
    });

    if (issues.orphanedExamResults.length > 0) {
      log.error(
        `Found ${issues.orphanedExamResults.length} exam results for unenrolled subjects:`,
      );
      issues.orphanedExamResults.forEach((issue) => {
        console.log(
          `  - ${issue.studentName} (${issue.class} ${issue.section})`,
        );
        console.log(`    Exam: ${issue.exam}`);
        console.log(`    Subject: ${issue.subject} (${issue.subjectCode})`);
        console.log(
          `    Marks: ${issue.marksObtained}, Absent: ${issue.isAbsent}`,
        );
        console.log(`    ExamResultId: ${issue.examResultId}\n`);
      });
      log.warning("These results may appear on report cards incorrectly!");
    } else {
      log.success("All exam results match enrolled subjects");
    }

    // ========================================
    // Check 3: Program/Subject Mismatches
    // ========================================
    log.section("CHECK 3: Program/Subject Mismatches");

    const studentProgramData = await prisma.studentClass.findMany({
      where: {
        status: "active",
        class: {
          gradeLevel: { gte: 11 },
        },
        studentProgram: {
          isNot: null,
        },
      },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        class: true,
        section: true,
        studentProgram: {
          include: {
            program: {
              include: {
                programSubjects: {
                  include: {
                    classSubject: {
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
        studentSubjects: {
          include: {
            classSubject: {
              include: {
                subject: {
                  select: { name: true, code: true },
                },
              },
            },
          },
        },
      },
    });

    log.info(
      `Checking ${studentProgramData.length} students with program assignments`,
    );

    studentProgramData.forEach((sc) => {
      if (!sc.studentProgram || !sc.studentProgram.program) return;

      const programSubjectIds = new Set(
        sc.studentProgram.program.programSubjects.map(
          (ps) => ps.classSubject.id,
        ),
      );

      const studentSubjectIds = sc.studentSubjects.map(
        (ss) => ss.classSubjectId,
      );

      // Check for subjects not in program
      const mismatchedSubjects = sc.studentSubjects.filter(
        (ss) => !programSubjectIds.has(ss.classSubjectId),
      );

      if (mismatchedSubjects.length > 0) {
        issues.programMismatches.push({
          studentName: `${sc.student.user.firstName} ${sc.student.user.lastName}`,
          class: sc.class.name,
          section: sc.section.name,
          program: sc.studentProgram.program.name,
          mismatchedSubjects: mismatchedSubjects.map((ss) => ({
            name: ss.classSubject.subject.name,
            code: ss.classSubject.subject.code,
          })),
        });
      }
    });

    if (issues.programMismatches.length > 0) {
      log.error(
        `Found ${issues.programMismatches.length} students with program/subject mismatches:`,
      );
      issues.programMismatches.forEach((issue) => {
        console.log(
          `  - ${issue.studentName} (${issue.class} ${issue.section})`,
        );
        console.log(`    Program: ${issue.program}`);
        console.log(`    Mismatched Subjects:`);
        issue.mismatchedSubjects.forEach((subj) => {
          console.log(`      • ${subj.name} (${subj.code})`);
        });
        console.log();
      });
      log.warning("These subjects are not part of the student's program!");
    } else {
      log.success("All student subjects match their program assignments");
    }

    // ========================================
    // Check 4: Orphaned StudentSubject Records
    // ========================================
    log.section("CHECK 4: Orphaned StudentSubject Records");

    const allStudentSubjects = await prisma.studentSubject.findMany({
      include: {
        studentClass: {
          select: {
            id: true,
            student: {
              select: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
        classSubject: {
          select: {
            id: true,
            subject: {
              select: { name: true },
            },
          },
        },
      },
    });

    log.info(`Checking ${allStudentSubjects.length} StudentSubject records`);

    allStudentSubjects.forEach((ss) => {
      if (!ss.studentClass || !ss.classSubject) {
        issues.orphanedStudentSubjects.push({
          studentSubjectId: ss.id,
          studentClassId: ss.studentClassId,
          classSubjectId: ss.classSubjectId,
          hasStudentClass: !!ss.studentClass,
          hasClassSubject: !!ss.classSubject,
        });
      }
    });

    if (issues.orphanedStudentSubjects.length > 0) {
      log.error(
        `Found ${issues.orphanedStudentSubjects.length} orphaned StudentSubject records:`,
      );
      issues.orphanedStudentSubjects.forEach((issue) => {
        console.log(`  - StudentSubjectId: ${issue.studentSubjectId}`);
        console.log(
          `    StudentClassId: ${issue.studentClassId} (exists: ${issue.hasStudentClass})`,
        );
        console.log(
          `    ClassSubjectId: ${issue.classSubjectId} (exists: ${issue.hasClassSubject})\n`,
        );
      });
      log.warning(
        "These should be deleted as they reference non-existent records",
      );
    } else {
      log.success("No orphaned StudentSubject records found");
    }

    // ========================================
    // Summary
    // ========================================
    log.section("VALIDATION SUMMARY");

    const totalIssues =
      issues.missingStudentSubjects.length +
      issues.orphanedExamResults.length +
      issues.programMismatches.length +
      issues.orphanedStudentSubjects.length;

    if (totalIssues === 0) {
      log.success("✨ No issues found! Subject enrollment data is clean.");
    } else {
      log.error(`Found ${totalIssues} total issues:`);
      console.log(
        `  - ${issues.missingStudentSubjects.length} students without subject enrollment`,
      );
      console.log(
        `  - ${issues.orphanedExamResults.length} exam results for unenrolled subjects`,
      );
      console.log(
        `  - ${issues.programMismatches.length} program/subject mismatches`,
      );
      console.log(
        `  - ${issues.orphanedStudentSubjects.length} orphaned StudentSubject records`,
      );

      log.warning("\nRecommended Actions:");
      if (issues.missingStudentSubjects.length > 0) {
        console.log(
          "  1. Run migration script to create StudentSubject records from ProgramSubject defaults",
        );
      }
      if (issues.orphanedExamResults.length > 0) {
        console.log(
          "  2. Review and delete orphaned ExamResult records (or enroll students in those subjects)",
        );
      }
      if (issues.programMismatches.length > 0) {
        console.log(
          "  3. Correct program assignments or adjust StudentSubject records",
        );
      }
      if (issues.orphanedStudentSubjects.length > 0) {
        console.log("  4. Delete orphaned StudentSubject records");
      }
    }

    // Export detailed JSON report
    const reportPath = "./subject_enrollment_validation_report.json";
    const fs = require("fs");
    fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));
    log.info(`\nDetailed report saved to: ${reportPath}`);
  } catch (error) {
    log.error(`Validation failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation
validateSubjectEnrollment()
  .then(() => {
    log.info("\nValidation complete!");
    process.exit(0);
  })
  .catch((error) => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
