const { prisma, dialect, label } = require("../src/database");
const { seedDemoFinance } = require("./seeds/demoFinance");
const bcrypt = require("bcryptjs");
const {
  GRADE_SCALE_PRESETS,
  NEB_8_BAND,
  normalizeScale,
} = require("../src/utils/gradeScale");
const { calculateSubjectGrade } = require("../src/utils/gradeCalculator");

// --clean wipes every table first. It is destructive, so it runs only against a
// test database (scripts/with-test-db.js, or a database whose name ends in
// _test) unless --yes-really is also given.
const CLEAN_MODE = process.argv.includes("--clean");
const CONFIRMED = process.argv.includes("--yes-really");
const isTestTarget = () => process.env.SMS_TEST_DB === "1" || /_test$/.test(label);

// =====================================================
// CLEANUP FUNCTION
// =====================================================

/**
 * Cleans up all data from the database.
 * Tables are truncated in reverse dependency order to avoid FK constraint violations.
 * Run with: npm run seed -- --clean (plus --yes-really outside a test database)
 */
async function cleanupDatabase() {
  console.log("🗑️  CLEANUP MODE: Wiping all existing data...\n");
  
  // Tables in reverse dependency order (children first, then parents)
  const tablesToTruncate = [
    // Exam & Results (deepest dependencies)
    "exam_results",
    "exam_subjects",
    "exams",
    
    // Student related
    "submissions",
    "fee_discount_applications",
    "fee_allocations",
    "fee_reversal_requests",
    "fee_transactions",
    "fee_discounts",
    "fee_installments",
    "receipt_sequences",
    "fee_payments",
    "report_cards",
    "attendance",
    "student_classes",
    "student_parents",
    "students",
    
    // Teacher related
    "teacher_subjects",
    
    // Academic structure (middle tier)
    "class_subjects",
    "fee_structure_installments",
    "fee_structures",
    "fee_types",
    "notices",
    "assignments",
    "promotions",
    
    // Core structure
    "subjects",
    "sections",
    "classes",
    "academic_years",
    
    // Users & Auth
    "user_roles",
    "role_permissions",
    "users",
    "roles",
    "permissions",

    // Grading
    "grade_bands",
    "grade_scales",

    // School (root)
    "schools",
  ];
  
  const skipped = await dialect.resetTables(prisma, tablesToTruncate);
  for (const t of tablesToTruncate) console.log(`   ${skipped.includes(t) ? "⚠ Skipped" : "✓ Emptied"} ${t}`);
  console.log("\n   ✅ Database cleanup complete!\n");
}

// =====================================================
// NEPALI NAMES DATA
// =====================================================
const firstNames = {
  male: ["Aarav", "Bibek", "Chiran", "Dipesh", "Eshan", "Ganesh", "Hari", "Ishwar", "Jeevan", "Krishna", "Laxman", "Manish", "Nabin", "Om", "Prabesh", "Rajan", "Sagar", "Tej", "Ujjwal", "Vishal", "Yogesh", "Bikash", "Sunil", "Ramesh", "Santosh"],
  female: ["Aakriti", "Binita", "Chandani", "Deepa", "Esha", "Gita", "Isha", "Jyoti", "Kabita", "Laxmi", "Maya", "Nisha", "Puja", "Rekha", "Sabina", "Tara", "Uma", "Yamuna", "Sunita", "Anita", "Sita", "Radha", "Kamala", "Sarita", "Mina"]
};
const lastNames = ["Sharma", "Adhikari", "Poudel", "Gurung", "Tamang", "Thapa", "Shrestha", "Rai", "Limbu", "Magar", "Karki", "Bhandari", "KC", "Pandey", "Bhattarai", "Acharya", "Koirala", "Basnet", "Rijal", "Ghimire"];

// =====================================================
// SEED DATA
// =====================================================

// Permissions are kept only where a route actually checks them with
// `authorize(...)` (attendance, result and report-card routes). Everything
// else is decided by role (requireRole / isAdmin / ownership middleware); see
// CLAUDE.md §5. Don't add a permission here unless a route checks it.
const permissions = [
  // Attendance (attendance.routes.js)
  { name: "attendance.mark", module: "attendance", description: "Mark attendance" },
  { name: "attendance.view_all", module: "attendance", description: "View all attendance records" },
  { name: "attendance.view_own", module: "attendance", description: "View own (or own child's) attendance" },
  { name: "attendance.view_class", module: "attendance", description: "View class attendance" },

  // Results (result.routes.js)
  { name: "result.enter", module: "results", description: "Enter exam results" },
  { name: "result.view_all", module: "results", description: "View all results" },
  { name: "result.view_own", module: "results", description: "View own results" },
  { name: "result.view_child", module: "results", description: "View child results" },

  // Report cards (reportCard.routes.js)
  { name: "report_card.view_all", module: "report_cards", description: "View all report cards" },
  { name: "report_card.view_own", module: "report_cards", description: "View own report card" },
  { name: "report_card.view_child", module: "report_cards", description: "View child report card" },
];

const roles = [
  { name: "ADMIN", description: "School Administrator" },
  { name: "TEACHER", description: "Teacher" },
  { name: "EXAM_OFFICER", description: "Exam Officer - Can enter marks for any subject" },
  { name: "ACCOUNTANT", description: "Accountant - Manages fee collection and billing" },
  { name: "STUDENT", description: "Student" },
  { name: "PARENT", description: "Parent/Guardian" },
  // Last, so the ids of the roles above don't change on existing databases.
  // Everything ADMIN can do, plus managing admins and other super admins.
  { name: "SUPER_ADMIN", description: "Super Administrator - full access, manages admins" },
];

// Role-permission mappings. SUPER_ADMIN gets every permission (step 3).
const rolePermissions = {
  ADMIN: [
    "attendance.mark", "attendance.view_all", "attendance.view_class",
    "result.enter", "result.view_all",
    "report_card.view_all",
  ],
  TEACHER: [
    "attendance.mark", "attendance.view_class",
    "result.enter", "result.view_all",
  ],
  EXAM_OFFICER: ["result.enter", "result.view_all"],
  ACCOUNTANT: [],
  STUDENT: ["attendance.view_own", "result.view_own", "report_card.view_own"],
  PARENT: ["attendance.view_own", "result.view_child", "report_card.view_child"],
};

// Demo subjects for Grade 1-10
const basicSubjects = [
  { name: "English", code: "ENG", description: "English Language and Literature" },
  { name: "Mathematics", code: "MATH", description: "Mathematics" },
  { name: "Science", code: "SCI", description: "General Science" },
  { name: "Social Studies", code: "SOC", description: "Social Studies and History" },
  { name: "Nepali", code: "NEP", description: "Nepali Language" },
  { name: "Computer Science", code: "CS", description: "Computer Science and IT" },
  { name: "Health & Physical Education", code: "HPE", description: "Health and Physical Education" },
  { name: "Moral Education", code: "MORAL", description: "Moral Science and Values" },
];

// Demo classes (Grade 1-10)
const classes = [
  { name: "Grade 1", gradeLevel: 1, displayOrder: 1 },
  { name: "Grade 2", gradeLevel: 2, displayOrder: 2 },
  { name: "Grade 3", gradeLevel: 3, displayOrder: 3 },
  { name: "Grade 4", gradeLevel: 4, displayOrder: 4 },
  { name: "Grade 5", gradeLevel: 5, displayOrder: 5 },
  { name: "Grade 6", gradeLevel: 6, displayOrder: 6 },
  { name: "Grade 7", gradeLevel: 7, displayOrder: 7 },
  { name: "Grade 8", gradeLevel: 8, displayOrder: 8 },
  { name: "Grade 9", gradeLevel: 9, displayOrder: 9 },
  { name: "Grade 10", gradeLevel: 10, displayOrder: 10 },
];

// Demo sections
const sections = [
  { name: "A", capacity: 40 },
  { name: "B", capacity: 40 },
];

// Fee types for Nepal schools
const feeTypes = [
  { name: "Monthly Fee", description: "Regular monthly tuition fee" },
  { name: "Admission Fee", description: "One-time admission fee" },
  { name: "Annual Fee", description: "Yearly academic fee" },
  { name: "Exam Fee", description: "Fee for examinations" },
  { name: "Computer Lab Fee", description: "Computer lab usage fee" },
  { name: "Library Fee", description: "Library access fee" },
  { name: "Transportation Fee", description: "School bus fee" },
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone() {
  return `+977-98${getRandomInt(10000000, 99999999)}`;
}

function generateDOB(gradeLevel) {
  // Calculate appropriate age based on grade (Grade 1 = ~6 years old)
  const currentYear = 2025;
  const age = gradeLevel + 5 + getRandomInt(0, 1);
  const birthYear = currentYear - age;
  const month = getRandomInt(1, 12);
  const day = getRandomInt(1, 28);
  return new Date(birthYear, month - 1, day);
}

function generateAdmissionNumber(index, year = 2024) {
  return `STU${year}${String(index).padStart(4, "0")}`;
}

// =====================================================
// SEED FUNCTIONS
// =====================================================

async function main() {
  console.log("🌱 Starting comprehensive database seed...\n");

  // Run cleanup if --clean flag is passed
  console.log(`   Database: ${label}`);
  if (CLEAN_MODE) {
    if (!isTestTarget() && !CONFIRMED) {
      throw new Error(
        "--clean wipes ALL data and this is not a test database. Re-run with --clean --yes-really if you mean it."
      );
    }
    await cleanupDatabase();
  }

  // 1. Create Permissions
  console.log("📝 Creating permissions...");
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }
  // Remove permissions no longer listed (their grants cascade), so an existing
  // database matches this file.
  const removed = await prisma.permission.deleteMany({
    where: { name: { notIn: permissions.map((perm) => perm.name) } },
  });
  console.log(`   ✓ ${permissions.length} permissions (${removed.count} unused removed)\n`);

  // 2. Create Roles
  console.log("👥 Creating roles...");
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log(`   ✓ Created ${roles.length} roles\n`);

  // 3. Assign Permissions to Roles
  console.log("🔗 Assigning permissions to roles...");
  rolePermissions.SUPER_ADMIN = permissions.map((perm) => perm.name);
  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new Error(`seed: unknown role "${roleName}" in rolePermissions`);

    const grantIds = [];
    for (const permName of permissionNames) {
      // A typo here would silently deny everyone; fail loudly instead.
      const permission = await prisma.permission.findUnique({ where: { name: permName } });
      if (!permission) throw new Error(`seed: unknown permission "${permName}" for ${roleName}`);
      grantIds.push(permission.id);

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }

    // Revoke grants this file no longer lists for the role.
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: grantIds } },
    });
  }
  console.log("   ✓ Assigned permissions to roles\n");

  // 4. Create Demo School
  console.log("🏫 Creating demo school...");
  const school = await prisma.school.upsert({
    where: { code: "DEMO001" },
    update: {},
    create: {
      name: "Shree Vidhya International School",
      code: "DEMO001",
      address: "Balaju, Kathmandu, Nepal",
      phone: "+977-1-1234567",
      email: "info@svi.edu.np",
      isActive: true,
    },
  });
  console.log(`   ✓ Created school: ${school.name}\n`);

  // 4b. Grade scales: both presets, NEB 8-band as the default. An admin can
  // switch to the legacy 9-band scale in School Settings -> Grade Scales.
  console.log("📊 Creating grade scales...");
  const hasDefaultScale = await prisma.gradeScale.findFirst({
    where: { schoolId: school.id, isDefault: true },
  });
  for (const preset of Object.values(GRADE_SCALE_PRESETS)) {
    const existing = await prisma.gradeScale.findUnique({
      where: { schoolId_name: { schoolId: school.id, name: preset.name } },
    });
    if (existing) continue; // never touch a scale that may already be in use
    await prisma.gradeScale.create({
      data: {
        schoolId: school.id,
        name: preset.name,
        passPercent: preset.passPercent,
        isDefault: !hasDefaultScale && preset.key === NEB_8_BAND.key,
        bands: {
          create: preset.bands.map((b) => ({
            minPercent: b.min,
            maxPercent: b.max,
            grade: b.grade,
            gradePoint: b.gpa,
            description: b.description,
            isPassing: b.isPassing,
          })),
        },
      },
    });
  }
  console.log(
    `   ✓ Grade scales: ${Object.values(GRADE_SCALE_PRESETS).map((p) => p.name).join(", ")}\n`,
  );

  // 5. Create Academic Years
  console.log("📅 Creating academic years...");
  const academicYear2024 = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "2024-2025" } },
    update: {},
    create: {
      schoolId: school.id,
      name: "2024-2025",
      startDate: new Date("2024-04-01"),
      endDate: new Date("2025-03-31"),
      isCurrent: false,
    },
  });
  
  const academicYear = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "2025-2026" } },
    update: { isCurrent: true },
    create: {
      schoolId: school.id,
      name: "2025-2026",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
      isCurrent: true,
    },
  });
  console.log(`   ✓ Created academic years: 2024-2025, 2025-2026 (current)\n`);

  // 6. Create Sections
  console.log("📚 Creating sections...");
  const createdSections = [];
  for (const section of sections) {
    const created = await prisma.section.upsert({
      where: { schoolId_name: { schoolId: school.id, name: section.name } },
      update: {},
      create: { ...section, schoolId: school.id },
    });
    createdSections.push(created);
  }
  console.log(`   ✓ Created ${createdSections.length} sections\n`);

  // 7. Create Classes
  console.log("🎓 Creating classes...");
  const createdClasses = [];
  for (const classData of classes) {
    const created = await prisma.class.upsert({
      where: { schoolId_name: { schoolId: school.id, name: classData.name } },
      update: {},
      create: { ...classData, schoolId: school.id },
    });
    createdClasses.push(created);
  }
  console.log(`   ✓ Created ${createdClasses.length} classes\n`);

  // 8. Create Subjects
  console.log("📖 Creating subjects...");
  const createdSubjects = [];
  
  // Basic subjects for all grades
  for (const subject of basicSubjects) {
    const created = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code: subject.code } },
      update: {},
      create: { ...subject, schoolId: school.id },
    });
    createdSubjects.push(created);
  }
  
  console.log(`   ✓ Created ${createdSubjects.length} subjects\n`);

  // 9. Assign Subjects to Classes
  console.log("🔗 Assigning subjects to classes...");
  const coreSubjectCodes = ["ENG", "MATH", "SCI", "SOC", "NEP", "CS", "HPE"];
  
  let classSubjectCount = 0;
  const createdClassSubjects = {};
  
  for (const cls of createdClasses) {
    createdClassSubjects[cls.id] = [];
    
    for (const subject of createdSubjects.filter(s => coreSubjectCodes.includes(s.code))) {
      const cs = await prisma.classSubject.upsert({
        where: {
          classId_academicYearId_subjectId: {
            classId: cls.id,
            academicYearId: academicYear.id,
            subjectId: subject.id,
          },
        },
        update: {},
        create: {
          classId: cls.id,
          academicYearId: academicYear.id,
          subjectId: subject.id,
          fullMarks: 100,
          passMarks: 40,
          hasTheory: true,
          hasPractical: subject.code === "CS" || subject.code === "SCI",
          theoryMarks: subject.code === "CS" || subject.code === "SCI" ? 75 : 100,
          practicalMarks: subject.code === "CS" || subject.code === "SCI" ? 25 : 0,
        },
      });
      createdClassSubjects[cls.id].push(cs);
      classSubjectCount++;
    }
  }
  console.log(`   ✓ Created ${classSubjectCount} class-subject assignments\n`);

  // 10. Create Demo Users
  console.log("👤 Creating demo users...");
  const passwordHash = await bcrypt.hash("password123", 10);
  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  const teacherRole = await prisma.role.findUnique({ where: { name: "TEACHER" } });
  const studentRole = await prisma.role.findUnique({ where: { name: "STUDENT" } });
  const parentRole = await prisma.role.findUnique({ where: { name: "PARENT" } });
  const examOfficerRole = await prisma.role.findUnique({ where: { name: "EXAM_OFFICER" } });
  const accountantRole = await prisma.role.findUnique({ where: { name: "ACCOUNTANT" } });

  // Admin User
  const adminUser = await prisma.user.upsert({
    where: { email_schoolId: { email: "admin@demo.edu.np", schoolId: school.id } },
    update: {},
    create: {
      schoolId: school.id,
      username: "admin",
      email: "admin@demo.edu.np",
      passwordHash,
      firstName: "Amir",
      lastName: "Shrestha",
      phone: "+977-9861158271",
      status: "active",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  console.log(`   ✓ Admin: admin@demo.edu.np`);

  // Super Admin: everything an admin can do, plus managing admins and super
  // admins. School admins cannot edit, deactivate or delete this account.
  const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  const superAdminUser = await prisma.user.upsert({
    where: { email_schoolId: { email: "superadmin@demo.edu.np", schoolId: school.id } },
    update: {},
    create: {
      schoolId: school.id,
      username: "superadmin",
      email: "superadmin@demo.edu.np",
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      status: "active",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: superAdminUser.id, roleId: superAdminRole.id },
  });
  console.log(`   ✓ Super admin: superadmin@demo.edu.np`);

  // Create 8 Teachers
  const teachers = [];
  const teacherData = [
    { firstName: "Bimala", lastName: "Sharma", subject: "MATH" },
    { firstName: "Ram", middleName: "Prasad", lastName: "Adhikari", subject: "ENG" },
    { firstName: "Sita", lastName: "Poudel", subject: "SCI" },
    { firstName: "Krishna", middleName: "Bahadur", lastName: "Thapa", subject: "NEP" },
    { firstName: "Gita", lastName: "Gurung", subject: "SOC" },
    { firstName: "Hari", lastName: "KC", subject: "CS" },
    { firstName: "Laxmi", lastName: "Bhattarai", subject: "PHY" },
    { firstName: "Bishnu", lastName: "Koirala", subject: "CHEM" },
  ];

  for (let i = 0; i < teacherData.length; i++) {
    const t = teacherData[i];
    const teacherUser = await prisma.user.upsert({
      where: { email_schoolId: { email: `teacher${i + 1}@demo.edu.np`, schoolId: school.id } },
      update: {},
      create: {
        schoolId: school.id,
        username: `teacher${i + 1}`,
        email: `teacher${i + 1}@demo.edu.np`,
        passwordHash,
        firstName: t.firstName,
        middleName: t.middleName || null,
        lastName: t.lastName,
        phone: generatePhone(),
        status: "active",
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: teacherUser.id, roleId: teacherRole.id } },
      update: {},
      create: { userId: teacherUser.id, roleId: teacherRole.id },
    });
    teachers.push({ user: teacherUser, subjectCode: t.subject });
  }
  console.log(`   ✓ Created ${teachers.length} teachers`);

  // Exam Officer
  const examOfficerUser = await prisma.user.upsert({
    where: { email_schoolId: { email: "examofficer@demo.edu.np", schoolId: school.id } },
    update: {},
    create: {
      schoolId: school.id,
      username: "examofficer",
      email: "examofficer@demo.edu.np",
      passwordHash,
      firstName: "Exam",
      lastName: "Officer",
      phone: generatePhone(),
      status: "active",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: examOfficerUser.id, roleId: examOfficerRole.id } },
    update: {},
    create: { userId: examOfficerUser.id, roleId: examOfficerRole.id },
  });
  console.log(`   ✓ Exam Officer: examofficer@demo.edu.np`);

  // Accountant
  const accountantUser = await prisma.user.upsert({
    where: { email_schoolId: { email: "accountant@demo.edu.np", schoolId: school.id } },
    update: {},
    create: {
      schoolId: school.id,
      username: "accountant",
      email: "accountant@demo.edu.np",
      passwordHash,
      firstName: "Accounts",
      lastName: "Officer",
      phone: generatePhone(),
      status: "active",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: accountantUser.id, roleId: accountantRole.id } },
    update: {},
    create: { userId: accountantUser.id, roleId: accountantRole.id },
  });
  console.log(`   ✓ Accountant: accountant@demo.edu.np`);

  // 11. Assign Teachers to Classes
  console.log("\n🔗 Assigning teachers to class subjects...");
  let teacherAssignmentCount = 0;
  
  // Assign each teacher to their subject across multiple grades
  for (const teacher of teachers) {
    const subject = createdSubjects.find(s => s.code === teacher.subjectCode);
    if (!subject) continue;
    
    // Assign to grades 8, 9, 10
    const targetGrades = [8, 9, 10];
    
    for (const gradeLevel of targetGrades) {
      const cls = createdClasses.find(c => c.gradeLevel === gradeLevel);
      if (!cls) continue;
      
      const classSubject = await prisma.classSubject.findFirst({
        where: {
          classId: cls.id,
          subjectId: subject.id,
          academicYearId: academicYear.id,
        },
      });
      
      if (classSubject) {
        for (const section of createdSections) {
          await prisma.teacherSubject.upsert({
            where: {
              userId_classSubjectId_sectionId_academicYearId: {
                userId: teacher.user.id,
                classSubjectId: classSubject.id,
                sectionId: section.id,
                academicYearId: academicYear.id,
              },
            },
            update: {},
            create: {
              userId: teacher.user.id,
              classSubjectId: classSubject.id,
              sectionId: section.id,
              academicYearId: academicYear.id,
              isClassTeacher: gradeLevel === 10 && section.name === "A",
            },
          });
          teacherAssignmentCount++;
        }
      }
    }
  }
  console.log(`   ✓ Created ${teacherAssignmentCount} teacher-subject assignments\n`);

  // 12. Create Students (5 per section for grades 9, 10)
  console.log("👨‍🎓 Creating students...");
  const createdStudents = [];
  let studentIndex = 1;
  
  for (const cls of createdClasses.filter(c => [9, 10].includes(c.gradeLevel))) {
    for (const section of createdSections) {
      for (let i = 1; i <= 5; i++) {
        const gender = i % 2 === 0 ? "female" : "male";
        const firstName = getRandomElement(firstNames[gender]);
        const lastName = getRandomElement(lastNames);
        const email = `student${studentIndex}@demo.edu.np`;
        
        const studentUser = await prisma.user.upsert({
          where: { email_schoolId: { email, schoolId: school.id } },
          update: {},
          create: {
            schoolId: school.id,
            // students sign in with their admission number
            username: generateAdmissionNumber(studentIndex).toLowerCase(),
            email,
            passwordHash,
            firstName,
            // two demo students show the optional middle name
            middleName: studentIndex === 2 ? "Kumari" : studentIndex === 3 ? "Bahadur" : null,
            lastName,
            phone: generatePhone(),
            status: "active",
          },
        });
        
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: studentUser.id, roleId: studentRole.id } },
          update: {},
          create: { userId: studentUser.id, roleId: studentRole.id },
        });
        
        const student = await prisma.student.upsert({
          where: { userId: studentUser.id },
          update: {},
          create: {
            userId: studentUser.id,
            schoolId: school.id,
            admissionNumber: generateAdmissionNumber(studentIndex),
            dateOfBirth: generateDOB(cls.gradeLevel),
            gender,
            bloodGroup: getRandomElement(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]),
            address: `${getRandomElement(["Kathmandu", "Lalitpur", "Bhaktapur", "Kirtipur"])}, Nepal`,
            emergencyContact: generatePhone(),
            admissionDate: new Date("2024-04-01"),
          },
        });
        
        // Enroll student
        const studentClass = await prisma.studentClass.upsert({
          where: {
            studentId_academicYearId: {
              studentId: student.id,
              academicYearId: academicYear.id,
            },
          },
          update: {},
          create: {
            studentId: student.id,
            classId: cls.id,
            sectionId: section.id,
            academicYearId: academicYear.id,
            schoolId: school.id,
            rollNumber: i,
            status: "active",
          },
        });
        
        createdStudents.push({ student, studentClass, user: studentUser, cls, section });
        studentIndex++;
      }
    }
  }
  console.log(`   ✓ Created ${createdStudents.length} students\n`);

  // 13. Create Parents and Link to Students
  console.log("👨‍👩‍👧 Creating parents...");
  let parentCount = 0;
  
  for (const studentData of createdStudents) {
    const parentFirstName = getRandomElement(firstNames.male);
    const parentLastName = studentData.user.lastName;
    const parentEmail = `parent.${studentData.student.admissionNumber.toLowerCase()}@demo.edu.np`;
    
    const parentUser = await prisma.user.upsert({
      where: { email_schoolId: { email: parentEmail, schoolId: school.id } },
      update: {},
      create: {
        schoolId: school.id,
        username: `p.${studentData.student.admissionNumber.toLowerCase()}`,
        email: parentEmail,
        passwordHash,
        firstName: parentFirstName,
        lastName: parentLastName,
        phone: generatePhone(),
        status: "active",
      },
    });
    
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: parentUser.id, roleId: parentRole.id } },
      update: {},
      create: { userId: parentUser.id, roleId: parentRole.id },
    });
    
    const parent = await prisma.parent.upsert({
      where: { userId: parentUser.id },
      update: {},
      create: {
        userId: parentUser.id,
        schoolId: school.id,
        occupation: getRandomElement(["Business", "Teacher", "Engineer", "Doctor", "Farmer", "Government Service"]),
        workplace: "Kathmandu",
        address: studentData.student.address,
      },
    });
    
    await prisma.studentParent.upsert({
      where: {
        studentId_parentId: { studentId: studentData.student.id, parentId: parent.id },
      },
      update: {},
      create: {
        studentId: studentData.student.id,
        parentId: parent.id,
        relationship: "father",
        isPrimary: true,
        schoolId: school.id,
      },
    });
    parentCount++;
  }
  console.log(`   ✓ Created ${parentCount} parents\n`);

  // 14. Create Exams
  console.log("📝 Creating exams...");
  
  const firstTermExam = await prisma.exam.upsert({
    where: { id: 1 },
    update: {},
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: "First Terminal Examination 2025",
      examType: "unit_test",
      status: "PUBLISHED",
      createdBy: adminUser.id,
      startDate: new Date("2025-06-01"),
      endDate: new Date("2025-06-15"),
    },
  });
  
  const midTermExam = await prisma.exam.upsert({
    where: { id: 2 },
    update: {},
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: "Mid-Term Examination 2025",
      examType: "midterm",
      status: "PUBLISHED",
      createdBy: adminUser.id,
      startDate: new Date("2025-09-15"),
      endDate: new Date("2025-09-30"),
    },
  });
  
  const finalExam = await prisma.exam.upsert({
    where: { id: 3 },
    update: {},
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: "Final Examination 2025-26",
      examType: "final",
      status: "DRAFT",
      createdBy: adminUser.id,
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-02-15"),
    },
  });
  console.log(`   ✓ Created 3 exams\n`);

  // 15. Create Exam Subjects
  console.log("📋 Creating exam subjects...");
  let examSubjectCount = 0;
  
  for (const exam of [firstTermExam, midTermExam]) {
    for (const cls of createdClasses.filter(c => [9, 10].includes(c.gradeLevel))) {
      const classSubjects = createdClassSubjects[cls.id] || [];
      
      for (const cs of classSubjects) {
        await prisma.examSubject.upsert({
          where: {
            examId_classSubjectId: {
              examId: exam.id,
              classSubjectId: cs.id,
            },
          },
          update: {},
          create: {
            examId: exam.id,
            classSubjectId: cs.id,
            fullMarks: cs.fullMarks,
            passMarks: cs.passMarks,
            hasTheory: cs.hasTheory,
            hasPractical: cs.hasPractical,
            theoryFullMarks: cs.theoryMarks || 100,
            practicalFullMarks: cs.practicalMarks || 0,
          },
        });
        examSubjectCount++;
      }
    }
  }
  console.log(`   ✓ Created ${examSubjectCount} exam subjects\n`);

  // 16. Create Exam Results for First Term
  console.log("📊 Creating exam results...");
  let resultCount = 0;

  // Store a grade with each result, as marks entry does, on the school's
  // default scale. Without it the student Results page shows "—".
  const defaultScaleRow = await prisma.gradeScale.findFirst({
    where: { schoolId: school.id, isDefault: true },
    include: { bands: true },
  });
  const seedScale = defaultScaleRow?.bands.length
    ? normalizeScale(defaultScaleRow)
    : undefined; // undefined -> calculator's built-in NEB 8-band

  for (const studentData of createdStudents) {
    const classSubjects = createdClassSubjects[studentData.cls.id] || [];
    
    for (const cs of classSubjects) {
      const examSubject = await prisma.examSubject.findFirst({
        where: {
          examId: firstTermExam.id,
          classSubjectId: cs.id,
        },
      });
      
      if (examSubject) {
        // Generate realistic marks (60-95 range mostly)
        const theoryMarks = cs.hasPractical 
          ? getRandomInt(45, 70) 
          : getRandomInt(55, 92);
        const practicalMarks = cs.hasPractical ? getRandomInt(18, 24) : null;
        const { finalGrade } = calculateSubjectGrade(
          {
            theoryMarks,
            theoryFullMarks: examSubject.theoryFullMarks || examSubject.fullMarks,
            practicalMarks: practicalMarks || 0,
            practicalFullMarks: examSubject.practicalFullMarks || 0,
            hasPractical: Boolean(examSubject.hasPractical),
          },
          seedScale,
        );

        await prisma.examResult.upsert({
          where: {
            examSubjectId_studentId: {
              examSubjectId: examSubject.id,
              studentId: studentData.student.id,
            },
          },
          update: {},
          create: {
            studentId: studentData.student.id,
            examSubjectId: examSubject.id,
            studentClassId: studentData.studentClass.id,
            schoolId: school.id,
            marksObtained: theoryMarks,
            practicalMarks,
            isAbsent: false,
            grade: finalGrade,
            enteredBy: adminUser.id,
            remarks: theoryMarks >= 80 ? "Excellent" : theoryMarks >= 60 ? "Good" : "Needs Improvement",
          },
        });
        resultCount++;
      }
    }
  }
  console.log(`   ✓ Created ${resultCount} exam results\n`);

  // 17. Create Fee Types
  console.log("💰 Creating fee types...");
  const createdFeeTypes = [];
  for (const ft of feeTypes) {
    const created = await prisma.feeType.upsert({
      where: { schoolId_name: { schoolId: school.id, name: ft.name } },
      update: {},
      create: { ...ft, schoolId: school.id },
    });
    createdFeeTypes.push(created);
  }
  console.log(`   ✓ Created ${createdFeeTypes.length} fee types\n`);

  // 18. Create Fee Structures
  console.log("📋 Creating fee structures...");
  let feeStructureCount = 0;
  const monthlyFeeType = createdFeeTypes.find(f => f.name === "Monthly Fee");
  
  for (const cls of createdClasses) {
    if (monthlyFeeType) {
      // Monthly fee varies by grade level
      const amount = cls.gradeLevel <= 5 ? 2500 : cls.gradeLevel <= 10 ? 3500 : 5000;
      
      await prisma.feeStructure.upsert({
        where: {
          feeTypeId_classId_academicYearId: {
            feeTypeId: monthlyFeeType.id,
            classId: cls.id,
            academicYearId: academicYear.id,
          },
        },
        update: {},
        create: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: cls.id,
          feeTypeId: monthlyFeeType.id,
          amount,
        },
      });
      feeStructureCount++;
    }
  }
  console.log(`   ✓ Created ${feeStructureCount} fee structures\n`);

  // 18b. Demo fee data (skipped when the school already has fee transactions)
  console.log("💳 Creating demo fee data...");
  await seedDemoFinance(prisma, { school, academicYear, adminUser, superAdminUser, accountantUser });

  // 19. Create Notices
  console.log("📢 Creating notices...");
  const notices = [
    {
      title: "Welcome to Academic Year 2025-26",
      content: "We are pleased to welcome all students, parents, and staff to the new academic year. Classes will begin on April 14, 2025.",
      targetType: "GLOBAL",
      priority: "high",
      status: "PUBLISHED",
    },
    {
      title: "First Terminal Examination Schedule",
      content: "The First Terminal Examination will be held from June 1-15, 2025. Detailed schedule will be shared soon.",
      targetType: "GLOBAL",
      priority: "high",
      status: "PUBLISHED",
    },
    {
      title: "Parent-Teacher Meeting",
      content: "Parent-Teacher meeting for Grade 9 and 10 students will be held on May 25, 2025 at 10:00 AM.",
      targetType: "ROLE_SPECIFIC",
      priority: "normal",
      status: "PUBLISHED",
    },
    {
      title: "Sports Day Announcement",
      content: "Annual Sports Day will be celebrated on July 15, 2025. All students are encouraged to participate.",
      targetType: "GLOBAL",
      priority: "normal",
      status: "PUBLISHED",
    },
  ];
  
  for (const notice of notices) {
    // Use create since there's no unique constraint for upsert
    const existingNotice = await prisma.notice.findFirst({
      where: { schoolId: school.id, title: notice.title },
    });
    
    if (!existingNotice) {
      await prisma.notice.create({
        data: {
          schoolId: school.id,
          createdById: adminUser.id,
          title: notice.title,
          content: notice.content,
          targetType: notice.targetType,
          priority: notice.priority,
          status: notice.status,
          publishedAt: new Date(),
        },
      });
    }
  }
  console.log(`   ✓ Created ${notices.length} notices\n`);

  // 20. Create Attendance Records (last 5 days)
  console.log("📅 Creating attendance records...");
  let attendanceCount = 0;
  const today = new Date();
  
  for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
    const tempDate = new Date(today);
    tempDate.setDate(tempDate.getDate() - dayOffset);
    
    // Skip weekends
    if (tempDate.getDay() === 0 || tempDate.getDay() === 6) continue;
    
    // Create a clean date string for MySQL DATE field (YYYY-MM-DD)
    const dateStr = tempDate.toISOString().split('T')[0];
    const attendanceDate = new Date(dateStr + 'T00:00:00.000Z');
    
    for (const studentData of createdStudents.slice(0, 15)) { // Just first 15 students
      const status = Math.random() > 0.1 ? "present" : (Math.random() > 0.5 ? "absent" : "late");
      
      await prisma.attendance.upsert({
        where: {
          studentId_studentClassId_attendanceDate: {
            studentId: studentData.student.id,
            studentClassId: studentData.studentClass.id,
            attendanceDate: attendanceDate,
          },
        },
        update: { status }, // Update status if record exists
        create: {
          studentId: studentData.student.id,
          studentClassId: studentData.studentClass.id,
          schoolId: school.id,
          attendanceDate: attendanceDate,
          status,
          remarks: status === "absent" ? "Medical leave" : null,
          markedBy: teachers[0]?.user.id || adminUser.id,
        },
      });
      attendanceCount++;
    }
  }
  console.log(`   ✓ Created ${attendanceCount} attendance records\n`);

  // 20b. First-term attendance, so report cards print "Attendance 61/70"-style
  // numbers: every school day (Saturday off) from the academic year start to
  // the first exam's last day, for every seeded student, plus that exam's
  // working days. Deterministic, so reseeding gives the same totals.
  console.log("📅 Creating first-term attendance...");
  const termDays = [];
  for (
    let d = new Date(academicYear.startDate);
    d <= firstTermExam.endDate;
    d = new Date(d.getTime() + 86400000)
  ) {
    if (d.getUTCDay() !== 6) termDays.push(new Date(d));
  }
  const termRows = [];
  createdStudents.forEach((studentData, si) => {
    termDays.forEach((day, di) => {
      const k = (si * 7 + di * 3) % 29;
      const status = k === 0 || k === 13 ? "absent" : k === 5 ? "late" : "present";
      termRows.push({
        studentId: studentData.student.id,
        studentClassId: studentData.studentClass.id,
        schoolId: school.id,
        attendanceDate: day,
        status,
        markedBy: teachers[0]?.user.id || adminUser.id,
      });
    });
  });
  const { count: termCount } = await prisma.attendance.createMany({
    data: termRows,
    skipDuplicates: true,
  });
  await prisma.exam.update({
    where: { id: firstTermExam.id },
    data: { workingDays: termDays.length },
  });
  console.log(
    `   ✓ Created ${termCount} records over ${termDays.length} school days; ` +
      `"${firstTermExam.name}" has ${termDays.length} working days\n`,
  );

  // Final Summary
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("✅ Database seeded successfully!");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("\n📋 Demo Credentials (all use password: password123):");
  console.log("   ┌─────────────────────────────────────────────────────────────────┐");
  console.log("   │ Role           │ Email                                         │");
  console.log("   ├─────────────────────────────────────────────────────────────────┤");
  console.log("   │ Super Admin    │ superadmin@demo.edu.np                        │");
  console.log("   │ Admin          │ admin@demo.edu.np                             │");
  console.log("   │ Teachers (8)   │ teacher1@demo.edu.np ... teacher8@demo.edu.np │");
  console.log("   │ Exam Officer   │ examofficer@demo.edu.np                       │");
  console.log("   │ Accountant     │ accountant@demo.edu.np                        │");
  console.log("   │ Students (20)  │ student1@demo.edu.np ... student20@demo.edu.np│");
  console.log("   │ Parents (20)   │ parent.stu2024xxxx@demo.edu.np                │");
  console.log("   └─────────────────────────────────────────────────────────────────┘");
  console.log("\n📊 Data Summary:");
  console.log(`   • ${createdClasses.length} Classes (Grade 1-10)`);
  console.log(`   • ${createdSections.length} Sections (A, B)`);
  console.log(`   • ${createdSubjects.length} Subjects`);
  console.log(`   • ${classSubjectCount} Class-Subject assignments`);
  console.log(`   • ${teacherAssignmentCount} Teacher assignments`);
  console.log(`   • ${createdStudents.length} Students (Grade 9, 10)`);
  console.log(`   • 3 Exams (First Term, Mid-Term, Final)`);
  console.log(`   • ${resultCount} Exam results`);
  console.log(`   • ${createdFeeTypes.length} Fee types`);
  console.log(`   • ${notices.length} Notices`);
  console.log("\n💡 Usage:");
  console.log("   npm run seed           # Add/update data (keeps existing)");
  console.log("   npm run seed -- --clean --yes-really  # WIPE ALL DATA then seed fresh");
  console.log("\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
