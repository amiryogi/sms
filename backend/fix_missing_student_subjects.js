/**
 * Migration Script: Create Missing StudentSubject Records for Grade 11-12
 *
 * This script automatically creates StudentSubject records for Grade 11-12 students
 * who don't have any subject enrollment records. It uses ProgramSubject defaults
 * to determine which subjects to enroll students in.
 *
 * Safety Features:
 * - Dry run mode (preview changes without applying)
 * - Transaction-based (all-or-nothing)
 * - Detailed logging
 * - Backup recommendations
 *
 * Usage:
 *   node fix_missing_student_subjects.js --dry-run    (preview only)
 *   node fix_missing_student_subjects.js --apply      (apply changes)
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ANSI color codes
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

// Parse command line arguments
const isDryRun = process.argv.includes("--dry-run");
const isApply = process.argv.includes("--apply");

if (!isDryRun && !isApply) {
  console.log(`
${colors.yellow}Usage:${colors.reset}
  node fix_missing_student_subjects.js --dry-run    # Preview changes only
  node fix_missing_student_subjects.js --apply      # Apply changes to database

${colors.red}⚠️  WARNING: This script will modify your database!${colors.reset}
${colors.yellow}It is recommended to:${colors.reset}
  1. Backup your database first
  2. Run with --dry-run to preview changes
  3. Review the output carefully
  4. Run with --apply to execute changes
  `);
  process.exit(0);
}

async function fixMissingStudentSubjects() {
  try {
    log.section(
      isDryRun
        ? "DRY RUN MODE - Preview Only"
        : "APPLY MODE - Changes Will Be Made",
    );

    if (!isDryRun) {
      log.warning("⚠️  DATABASE WILL BE MODIFIED ⚠️");
      log.warning("Press Ctrl+C within 5 seconds to cancel...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // ========================================
    // Step 1: Find Grade 11-12 students without StudentSubject records
    // ========================================
    log.section("Step 1: Identifying Students Without Subject Enrollment");

    const studentsWithoutSubjects = await prisma.studentClass.findMany({
      where: {
        status: "active",
        class: {
          gradeLevel: { gte: 11 },
        },
        studentSubjects: {
          none: {},
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
        studentProgram: {
          include: {
            program: {
              include: {
                programSubjects: {
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
            },
          },
        },
      },
    });

    log.info(
      `Found ${studentsWithoutSubjects.length} students without subject enrollment`,
    );

    if (studentsWithoutSubjects.length === 0) {
      log.success(
        "No students need fixing. All Grade 11-12 students have subject enrollments!",
      );
      return;
    }

    // ========================================
    // Step 2: Prepare subject enrollments
    // ========================================
    log.section("Step 2: Preparing Subject Enrollments");

    const enrollmentPlans = [];
    let studentsWithPrograms = 0;
    let studentsWithoutPrograms = 0;

    for (const sc of studentsWithoutSubjects) {
      const studentName = `${sc.student.user.firstName} ${sc.student.user.lastName}`;

      if (sc.studentProgram && sc.studentProgram.program) {
        studentsWithPrograms++;

        const programSubjects = sc.studentProgram.program.programSubjects;
        const subjects = programSubjects.map((ps) => ({
          classSubjectId: ps.classSubjectId,
          subjectName: ps.classSubject.subject.name,
          subjectCode: ps.classSubject.subject.code,
          isCompulsory: ps.isCompulsory,
        }));

        enrollmentPlans.push({
          studentClassId: sc.id,
          studentName,
          class: sc.class.name,
          section: sc.section.name,
          academicYear: sc.academicYear.year,
          program: sc.studentProgram.program.name,
          subjects,
        });

        console.log(
          `\n  ${colors.green}✓${colors.reset} ${studentName} (${sc.class.name} ${sc.section.name})`,
        );
        console.log(`    Program: ${sc.studentProgram.program.name}`);
        console.log(`    Will enroll in ${subjects.length} subjects:`);
        subjects.forEach((subj) => {
          console.log(
            `      • ${subj.subjectName} (${subj.subjectCode})${subj.isCompulsory ? " [Compulsory]" : " [Optional]"}`,
          );
        });
      } else {
        studentsWithoutPrograms++;

        console.log(
          `\n  ${colors.red}✗${colors.reset} ${studentName} (${sc.class.name} ${sc.section.name})`,
        );
        console.log(
          `    ${colors.red}NO PROGRAM ASSIGNED - Cannot auto-enroll${colors.reset}`,
        );
        console.log(
          `    Action Required: Manually assign program and subjects`,
        );
      }
    }

    log.info(`\nSummary:`);
    console.log(`  - Students with programs: ${studentsWithPrograms}`);
    console.log(`  - Students without programs: ${studentsWithoutPrograms}`);
    console.log(
      `  - Total subjects to create: ${enrollmentPlans.reduce((sum, plan) => sum + plan.subjects.length, 0)}`,
    );

    if (studentsWithoutPrograms > 0) {
      log.warning(
        `\n${studentsWithoutPrograms} students need manual program assignment before auto-enrollment`,
      );
    }

    if (enrollmentPlans.length === 0) {
      log.warning(
        "No students can be auto-enrolled (all missing program assignments)",
      );
      return;
    }

    // ========================================
    // Step 3: Apply changes (if not dry run)
    // ========================================
    if (isDryRun) {
      log.section("DRY RUN COMPLETE - No Changes Made");
      log.info(
        `Would have created subject enrollments for ${enrollmentPlans.length} students`,
      );
      return;
    }

    log.section("Step 3: Creating StudentSubject Records");
    log.warning("Writing to database...");

    const results = await prisma.$transaction(async (tx) => {
      const createdRecords = [];

      for (const plan of enrollmentPlans) {
        const subjectsToCreate = plan.subjects.map((subj) => ({
          studentClassId: plan.studentClassId,
          classSubjectId: subj.classSubjectId,
          status: "ACTIVE",
        }));

        const result = await tx.studentSubject.createMany({
          data: subjectsToCreate,
          skipDuplicates: true,
        });

        createdRecords.push({
          studentName: plan.studentName,
          count: result.count,
        });

        console.log(
          `  ${colors.green}✓${colors.reset} Created ${result.count} subject enrollments for ${plan.studentName}`,
        );
      }

      return createdRecords;
    });

    log.success(
      `\nSuccessfully created subject enrollments for ${results.length} students!`,
    );

    const totalCreated = results.reduce((sum, r) => sum + r.count, 0);
    log.success(`Total StudentSubject records created: ${totalCreated}`);

    // ========================================
    // Step 4: Verification
    // ========================================
    log.section("Step 4: Verification");

    const remainingStudentsWithoutSubjects = await prisma.studentClass.count({
      where: {
        status: "active",
        class: {
          gradeLevel: { gte: 11 },
        },
        studentSubjects: {
          none: {},
        },
      },
    });

    if (remainingStudentsWithoutSubjects === 0) {
      log.success("All Grade 11-12 students now have subject enrollments!");
    } else {
      log.warning(
        `${remainingStudentsWithoutSubjects} students still without subjects (likely missing program assignment)`,
      );
    }
  } catch (error) {
    log.error(`Migration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
fixMissingStudentSubjects()
  .then(() => {
    log.info("\nMigration complete!");
    process.exit(0);
  })
  .catch((error) => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
