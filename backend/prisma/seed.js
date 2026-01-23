const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Check for --clean flag
const CLEAN_MODE = process.argv.includes("--clean");

// =====================================================
// CLEANUP FUNCTION
// =====================================================

/**
 * Cleans up all data from the database.
 * Tables are truncated in reverse dependency order to avoid FK constraint violations.
 * Run with: npm run seed -- --clean
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
    "student_subjects",
    "student_programs",
    "fee_payments",
    "report_cards",
    "attendance",
    "student_classes",
    "student_parents",
    "students",
    
    // Teacher related
    "teacher_subjects",
    
    // Academic structure (middle tier)
    "subject_components",
    "class_subjects",
    "program_subjects",
    "programs",
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
    
    // School (root)
    "schools",
  ];
  
  try {
    // Disable foreign key checks
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;
    
    for (const table of tablesToTruncate) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
        console.log(`   ✓ Truncated ${table}`);
      } catch (err) {
        // Table might not exist yet, skip silently
        console.log(`   ⚠ Skipped ${table} (may not exist)`);
      }
    }
    
    // Re-enable foreign key checks
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
    
    console.log("\n   ✅ Database cleanup complete!\n");
  } catch (error) {
    // Re-enable foreign key checks even on error
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
    throw error;
  }
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

const permissions = [
  // User Management
  { name: "user.create", module: "users", description: "Create new users" },
  { name: "user.read", module: "users", description: "View user details" },
  { name: "user.update", module: "users", description: "Update user information" },
  { name: "user.delete", module: "users", description: "Delete users" },
  { name: "user.list", module: "users", description: "List all users" },

  // Student Management
  { name: "student.create", module: "students", description: "Create new students" },
  { name: "student.read", module: "students", description: "View student details" },
  { name: "student.update", module: "students", description: "Update student information" },
  { name: "student.delete", module: "students", description: "Delete students" },
  { name: "student.list", module: "students", description: "List students" },
  { name: "student.view_own", module: "students", description: "View own student profile" },

  // Teacher Management
  { name: "teacher.create", module: "teachers", description: "Create new teachers" },
  { name: "teacher.read", module: "teachers", description: "View teacher details" },
  { name: "teacher.update", module: "teachers", description: "Update teacher information" },
  { name: "teacher.delete", module: "teachers", description: "Delete teachers" },
  { name: "teacher.list", module: "teachers", description: "List teachers" },

  // Academic Structure
  { name: "academic_year.manage", module: "academic", description: "Manage academic years" },
  { name: "class.manage", module: "academic", description: "Manage classes" },
  { name: "section.manage", module: "academic", description: "Manage sections" },
  { name: "subject.manage", module: "academic", description: "Manage subjects" },
  { name: "class_subject.manage", module: "academic", description: "Manage class-subject assignments" },
  { name: "teacher_subject.manage", module: "academic", description: "Manage teacher assignments" },

  // Attendance
  { name: "attendance.mark", module: "attendance", description: "Mark attendance" },
  { name: "attendance.view_all", module: "attendance", description: "View all attendance records" },
  { name: "attendance.view_own", module: "attendance", description: "View own attendance" },
  { name: "attendance.view_class", module: "attendance", description: "View class attendance" },

  // Exams
  { name: "exam.create", module: "exams", description: "Create exams" },
  { name: "exam.read", module: "exams", description: "View exam details" },
  { name: "exam.update", module: "exams", description: "Update exam information" },
  { name: "exam.delete", module: "exams", description: "Delete exams" },
  { name: "exam.manage_subjects", module: "exams", description: "Manage exam subjects" },

  // Results
  { name: "result.enter", module: "results", description: "Enter exam results" },
  { name: "result.view_all", module: "results", description: "View all results" },
  { name: "result.view_own", module: "results", description: "View own results" },
  { name: "result.view_child", module: "results", description: "View child results" },
  { name: "result.publish", module: "results", description: "Publish results" },

  // Report Cards
  { name: "report_card.generate", module: "report_cards", description: "Generate report cards" },
  { name: "report_card.view_all", module: "report_cards", description: "View all report cards" },
  { name: "report_card.view_own", module: "report_cards", description: "View own report card" },
  { name: "report_card.view_child", module: "report_cards", description: "View child report card" },

  // Assignments
  { name: "assignment.create", module: "assignments", description: "Create assignments" },
  { name: "assignment.read", module: "assignments", description: "View assignments" },
  { name: "assignment.update", module: "assignments", description: "Update assignments" },
  { name: "assignment.delete", module: "assignments", description: "Delete assignments" },
  { name: "assignment.grade", module: "assignments", description: "Grade submissions" },
  { name: "assignment.submit", module: "assignments", description: "Submit assignments" },
  { name: "assignment.view_own", module: "assignments", description: "View own assignments" },

  // Notices
  { name: "notice.create", module: "notices", description: "Create notices" },
  { name: "notice.read", module: "notices", description: "View notices" },
  { name: "notice.update", module: "notices", description: "Update notices" },
  { name: "notice.delete", module: "notices", description: "Delete notices" },

  // Promotions
  { name: "promotion.process", module: "promotions", description: "Process student promotions" },
  { name: "promotion.view", module: "promotions", description: "View promotion history" },

  // Fee Management
  { name: "fee.manage_types", module: "fees", description: "Create/update/delete fee types" },
  { name: "fee.manage_structures", module: "fees", description: "Create/update/delete fee structures" },
  { name: "fee.record_payment", module: "fees", description: "Record fee payments" },
  { name: "fee.view_all", module: "fees", description: "View all fee records and reports" },
  { name: "fee.generate_invoice", module: "fees", description: "Generate fee invoices for students" },
  { name: "fee.apply_discount", module: "fees", description: "Apply discounts or fines to fees" },
];

const roles = [
  { name: "ADMIN", description: "School Administrator" },
  { name: "TEACHER", description: "Teacher" },
  { name: "EXAM_OFFICER", description: "Exam Officer - Can enter marks for any subject" },
  { name: "ACCOUNTANT", description: "Accountant - Manages fee collection and billing" },
  { name: "STUDENT", description: "Student" },
  { name: "PARENT", description: "Parent/Guardian" },
];

// Role-permission mappings
const rolePermissions = {
  ADMIN: [
    "user.create", "user.read", "user.update", "user.delete", "user.list",
    "student.create", "student.read", "student.update", "student.delete", "student.list",
    "teacher.create", "teacher.read", "teacher.update", "teacher.delete", "teacher.list",
    "academic_year.manage", "class.manage", "section.manage", "subject.manage",
    "class_subject.manage", "teacher_subject.manage",
    "attendance.mark", "attendance.view_all", "attendance.view_class",
    "exam.create", "exam.read", "exam.update", "exam.delete", "exam.manage_subjects",
    "result.enter", "result.view_all", "result.publish",
    "report_card.generate", "report_card.view_all",
    "assignment.create", "assignment.read", "assignment.update", "assignment.delete", "assignment.grade",
    "notice.create", "notice.read", "notice.update", "notice.delete",
    "promotion.process", "promotion.view",
    "fee.manage_types", "fee.manage_structures", "fee.record_payment", "fee.view_all", "fee.generate_invoice", "fee.apply_discount",
  ],
  TEACHER: [
    "student.read", "student.list",
    "attendance.mark", "attendance.view_class",
    "exam.read", "result.enter", "result.view_all",
    "assignment.create", "assignment.read", "assignment.update", "assignment.delete", "assignment.grade",
    "notice.read", "notice.create",
  ],
  STUDENT: [
    "student.view_own", "attendance.view_own", "result.view_own", "report_card.view_own",
    "assignment.submit", "assignment.view_own", "notice.read",
  ],
  PARENT: [
    "attendance.view_own", "result.view_child", "report_card.view_child",
    "assignment.view_own", "notice.read",
  ],
  EXAM_OFFICER: [
    "student.read", "student.list", "exam.read", "result.enter", "result.view_all", "notice.read",
  ],
  ACCOUNTANT: [
    "student.read", "student.list",
    "fee.manage_types", "fee.manage_structures", "fee.record_payment", "fee.view_all", "fee.generate_invoice", "fee.apply_discount",
    "notice.read",
  ],
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

// NEB subjects for Grade 11-12 (from subjects11_12.xlsx)
// Each subject has separate THEORY and PRACTICAL components with NEB codes
const nebSubjectsData = [
  // Grade 11 Compulsory
  { id: 1, name: "Compulsory English", theoryCode: "0031", practicalCode: "0032", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3, practicalCreditHours: 1, totalCreditHours: 4, classLevel: 11, faculty: "Compulsory", isCompulsory: true },
  { id: 2, name: "Compulsory Nepali", theoryCode: "0011", practicalCode: "0012", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3, practicalCreditHours: 1, totalCreditHours: 4, classLevel: 11, faculty: "Compulsory", isCompulsory: true },
  // Grade 11 Science
  { id: 3, name: "Physics", theoryCode: "1011", practicalCode: "1012", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 4, practicalCreditHours: 1, totalCreditHours: 5, classLevel: 11, faculty: "Science", isCompulsory: false },
  { id: 4, name: "Chemistry", theoryCode: "1021", practicalCode: "1022", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 4, practicalCreditHours: 1, totalCreditHours: 5, classLevel: 11, faculty: "Science", isCompulsory: false },
  { id: 5, name: "Biology", theoryCode: "1031", practicalCode: "1032", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 4, practicalCreditHours: 1, totalCreditHours: 5, classLevel: 11, faculty: "Science", isCompulsory: false },
  { id: 6, name: "Mathematics", theoryCode: "1041", practicalCode: null, theoryFullMarks: 100, practicalFullMarks: 0, theoryCreditHours: 5, practicalCreditHours: 0, totalCreditHours: 5, classLevel: 11, faculty: "Science", isCompulsory: false },
  { id: 7, name: "Computer Science", theoryCode: "4161", practicalCode: "4162", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 4, practicalCreditHours: 1, totalCreditHours: 5, classLevel: 11, faculty: "OptionalForScienceManagement", isCompulsory: false },
  // Grade 11 Management
  { id: 8, name: "Accountancy", theoryCode: "2011", practicalCode: null, theoryFullMarks: 100, practicalFullMarks: 0, theoryCreditHours: 5, practicalCreditHours: 0, totalCreditHours: 5, classLevel: 11, faculty: "Management", isCompulsory: false },
  { id: 9, name: "Economics", theoryCode: "2021", practicalCode: null, theoryFullMarks: 100, practicalFullMarks: 0, theoryCreditHours: 5, practicalCreditHours: 0, totalCreditHours: 5, classLevel: 11, faculty: "Management", isCompulsory: false },
  { id: 10, name: "Business Studies", theoryCode: "2031", practicalCode: null, theoryFullMarks: 100, practicalFullMarks: 0, theoryCreditHours: 5, practicalCreditHours: 0, totalCreditHours: 5, classLevel: 11, faculty: "Management", isCompulsory: false },
  { id: 11, name: "Hotel Management", theoryCode: "2171", practicalCode: "2172", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 4, practicalCreditHours: 1, totalCreditHours: 5, classLevel: 11, faculty: "Management", isCompulsory: false },
  { id: 12, name: "Social Studies", theoryCode: "4011", practicalCode: null, theoryFullMarks: 100, practicalFullMarks: 0, theoryCreditHours: 5, practicalCreditHours: 0, totalCreditHours: 5, classLevel: 11, faculty: "OptionalForScienceManagement", isCompulsory: false },
  // Grade 12 Compulsory
  { id: 13, name: "Compulsory English", theoryCode: "0033", practicalCode: "0034", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3, practicalCreditHours: 1, totalCreditHours: 4, classLevel: 12, faculty: "Compulsory", isCompulsory: true },
  { id: 14, name: "Compulsory Nepali", theoryCode: "0013", practicalCode: "0014", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3, practicalCreditHours: 1, totalCreditHours: 4, classLevel: 12, faculty: "Compulsory", isCompulsory: true },
  // Grade 12 Science
  { id: 15, name: "Physics", theoryCode: "1013", practicalCode: "1014", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 4, practicalCreditHours: 1, totalCreditHours: 5, classLevel: 12, faculty: "Science", isCompulsory: false },
  { id: 16, name: "Chemistry", theoryCode: "1023", practicalCode: "1024", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 4, practicalCreditHours: 1, totalCreditHours: 5, classLevel: 12, faculty: "Science", isCompulsory: false },
  { id: 17, name: "Biology", theoryCode: "1033", practicalCode: "1034", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 4, practicalCreditHours: 1, totalCreditHours: 5, classLevel: 12, faculty: "Science", isCompulsory: false },
  { id: 18, name: "Mathematics", theoryCode: "1043", practicalCode: null, theoryFullMarks: 100, practicalFullMarks: 0, theoryCreditHours: 5, practicalCreditHours: 0, totalCreditHours: 5, classLevel: 12, faculty: "Science", isCompulsory: false },
  { id: 19, name: "Computer Science", theoryCode: "4163", practicalCode: "4164", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 4, practicalCreditHours: 1, totalCreditHours: 5, classLevel: 12, faculty: "OptionalForScienceManagement", isCompulsory: false },
  // Grade 12 Management
  { id: 20, name: "Accountancy", theoryCode: "2013", practicalCode: null, theoryFullMarks: 100, practicalFullMarks: 0, theoryCreditHours: 5, practicalCreditHours: 0, totalCreditHours: 5, classLevel: 12, faculty: "Management", isCompulsory: false },
  { id: 21, name: "Economics", theoryCode: "2023", practicalCode: null, theoryFullMarks: 100, practicalFullMarks: 0, theoryCreditHours: 5, practicalCreditHours: 0, totalCreditHours: 5, classLevel: 12, faculty: "Management", isCompulsory: false },
  { id: 22, name: "Business Studies", theoryCode: "2033", practicalCode: null, theoryFullMarks: 100, practicalFullMarks: 0, theoryCreditHours: 5, practicalCreditHours: 0, totalCreditHours: 5, classLevel: 12, faculty: "Management", isCompulsory: false },
  { id: 23, name: "Hotel Management", theoryCode: "2173", practicalCode: "2174", theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 4, practicalCreditHours: 1, totalCreditHours: 5, classLevel: 12, faculty: "Management", isCompulsory: false },
  { id: 24, name: "Social Studies", theoryCode: "4013", practicalCode: null, theoryFullMarks: 100, practicalFullMarks: 0, theoryCreditHours: 5, practicalCreditHours: 0, totalCreditHours: 5, classLevel: 12, faculty: "OptionalForScienceManagement", isCompulsory: false },
];

// Generate unique subject codes for Grade 11-12
function getNEBSubjectCode(name, classLevel) {
  const codeMap = {
    "Compulsory English": "C.ENG",
    "Compulsory Nepali": "C.NEP",
    "Physics": "PHY",
    "Chemistry": "CHEM",
    "Biology": "BIO",
    "Mathematics": "MATH",
    "Computer Science": "CS",
    "Accountancy": "ACC",
    "Economics": "ECO",
    "Business Studies": "BUS",
    "Hotel Management": "HM",
    "Social Studies": "SOC11",
  };
  return `${codeMap[name] || name.substring(0, 4).toUpperCase()}-${classLevel}`;
}

// Backward-compatible nebSubjects array for existing code
const nebSubjects = nebSubjectsData.map((s) => ({
  name: s.name,
  code: getNEBSubjectCode(s.name, s.classLevel),
  creditHours: s.totalCreditHours,
  hasTheory: true,
  hasPractical: s.practicalCode !== null,
  classLevel: s.classLevel,
  faculty: s.faculty,
  theoryCode: s.theoryCode,
  practicalCode: s.practicalCode,
  theoryFullMarks: s.theoryFullMarks,
  practicalFullMarks: s.practicalFullMarks,
  theoryCreditHours: s.theoryCreditHours,
  practicalCreditHours: s.practicalCreditHours,
  isCompulsory: s.isCompulsory,
}));

// Demo classes (Grade 1-12)
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
  { name: "Grade 11", gradeLevel: 11, displayOrder: 11 },
  { name: "Grade 12", gradeLevel: 12, displayOrder: 12 },
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
  if (CLEAN_MODE) {
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
  console.log(`   ✓ Created ${permissions.length} permissions\n`);

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
  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;

    for (const permName of permissionNames) {
      const permission = await prisma.permission.findUnique({ where: { name: permName } });
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
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

  // 8. Create Subjects (Basic + NEB)
  console.log("📖 Creating subjects...");
  const createdSubjects = [];
  const nebSubjectMap = {}; // Map to track NEB subjects by code
  
  // Basic subjects for all grades
  for (const subject of basicSubjects) {
    const created = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code: subject.code } },
      update: {},
      create: { ...subject, schoolId: school.id },
    });
    createdSubjects.push(created);
  }
  
  // NEB subjects for Grade 11-12 (unique by code)
  const uniqueNebSubjects = [];
  const seenCodes = new Set();
  for (const subject of nebSubjects) {
    if (!seenCodes.has(subject.code)) {
      seenCodes.add(subject.code);
      uniqueNebSubjects.push(subject);
    }
  }
  
  for (const subject of uniqueNebSubjects) {
    const created = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code: subject.code } },
      update: {},
      create: { 
        name: subject.name,
        code: subject.code,
        creditHours: subject.creditHours,
        schoolId: school.id,
      },
    });
    createdSubjects.push(created);
    nebSubjectMap[subject.code] = { dbSubject: created, nebData: subject };
  }
  console.log(`   ✓ Created ${createdSubjects.length} subjects (${uniqueNebSubjects.length} NEB subjects)\n`);

  // 9. Assign Subjects to Classes + Create SubjectComponents for NEB
  console.log("🔗 Assigning subjects to classes...");
  const coreSubjectCodes = ["ENG", "MATH", "SCI", "SOC", "NEP", "CS", "HPE"];
  
  let classSubjectCount = 0;
  let subjectComponentCount = 0;
  const createdClassSubjects = {};
  
  for (const cls of createdClasses) {
    createdClassSubjects[cls.id] = [];
    
    if (cls.gradeLevel <= 10) {
      // Basic subjects for Grade 1-10
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
    } else {
      // NEB subjects for Grade 11-12
      // Get subjects for this specific grade level
      const gradeNebSubjects = nebSubjects.filter(n => n.classLevel === cls.gradeLevel);
      
      for (const nebData of gradeNebSubjects) {
        const dbSubject = createdSubjects.find(s => s.code === nebData.code);
        if (!dbSubject) continue;
        
        const cs = await prisma.classSubject.upsert({
          where: {
            classId_academicYearId_subjectId: {
              classId: cls.id,
              academicYearId: academicYear.id,
              subjectId: dbSubject.id,
            },
          },
          update: {},
          create: {
            classId: cls.id,
            academicYearId: academicYear.id,
            subjectId: dbSubject.id,
            fullMarks: nebData.theoryFullMarks + nebData.practicalFullMarks,
            passMarks: Math.ceil((nebData.theoryFullMarks + nebData.practicalFullMarks) * 0.35), // 35% pass mark
            creditHours: nebData.creditHours,
            hasTheory: true,
            hasPractical: nebData.hasPractical,
            theoryMarks: nebData.theoryFullMarks,
            practicalMarks: nebData.practicalFullMarks,
          },
        });
        createdClassSubjects[cls.id].push(cs);
        classSubjectCount++;
        
        // Create SubjectComponents for NEB subjects (THEORY and PRACTICAL)
        // Theory component - always exists for NEB
        await prisma.subjectComponent.upsert({
          where: {
            classId_subjectId_type: {
              classId: cls.id,
              subjectId: dbSubject.id,
              type: "THEORY",
            },
          },
          update: {},
          create: {
            classId: cls.id,
            subjectId: dbSubject.id,
            type: "THEORY",
            subjectCode: nebData.theoryCode,
            fullMarks: nebData.theoryFullMarks,
            passMarks: Math.ceil(nebData.theoryFullMarks * 0.35),
            creditHours: nebData.theoryCreditHours,
          },
        });
        subjectComponentCount++;
        
        // Practical component - only if subject has practical
        if (nebData.hasPractical && nebData.practicalCode) {
          await prisma.subjectComponent.upsert({
            where: {
              classId_subjectId_type: {
                classId: cls.id,
                subjectId: dbSubject.id,
                type: "PRACTICAL",
              },
            },
            update: {},
            create: {
              classId: cls.id,
              subjectId: dbSubject.id,
              type: "PRACTICAL",
              subjectCode: nebData.practicalCode,
              fullMarks: nebData.practicalFullMarks,
              passMarks: Math.ceil(nebData.practicalFullMarks * 0.35),
              creditHours: nebData.practicalCreditHours,
            },
          });
          subjectComponentCount++;
        }
      }
    }
  }
  console.log(`   ✓ Created ${classSubjectCount} class-subject assignments`);
  console.log(`   ✓ Created ${subjectComponentCount} NEB subject components (Theory/Practical)\n`);

  // 10. Create Programs for Grade 11-12 (Science, Management)
  console.log("🎓 Creating NEB Programs (Science, Management)...");
  const grade11 = createdClasses.find(c => c.gradeLevel === 11);
  const grade12 = createdClasses.find(c => c.gradeLevel === 12);
  
  const scienceProgram = await prisma.program.upsert({
    where: { 
      schoolId_academicYearId_name: { 
        schoolId: school.id, 
        academicYearId: academicYear.id,
        name: "Science" 
      } 
    },
    update: {},
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: "Science",
      description: "NEB Science Faculty - Physics, Chemistry, Biology, Mathematics",
    },
  });
  
  const managementProgram = await prisma.program.upsert({
    where: { 
      schoolId_academicYearId_name: { 
        schoolId: school.id, 
        academicYearId: academicYear.id,
        name: "Management" 
      } 
    },
    update: {},
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: "Management",
      description: "NEB Management Faculty - Accountancy, Economics, Business Studies",
    },
  });
  console.log(`   ✓ Created programs: Science, Management`);
  
  // Link ClassSubjects to programs (for Grade 11-12)
  const scienceSubjectNames = ["Physics", "Chemistry", "Biology", "Mathematics", "Computer Science"];
  const managementSubjectNames = ["Accountancy", "Economics", "Business Studies", "Hotel Management"];
  const compulsorySubjectNames = ["Compulsory English", "Compulsory Nepali"];
  
  let programSubjectCount = 0;
  
  // Get all Grade 11-12 class subjects
  const nebClassSubjects = [];
  for (const cls of [grade11, grade12]) {
    if (createdClassSubjects[cls.id]) {
      nebClassSubjects.push(...createdClassSubjects[cls.id]);
    }
  }
  
  for (const classSubject of nebClassSubjects) {
    // Find the subject name for this classSubject
    const subject = createdSubjects.find(s => s.id === classSubject.subjectId);
    if (!subject) continue;
    
    const isScience = scienceSubjectNames.includes(subject.name);
    const isManagement = managementSubjectNames.includes(subject.name);
    const isCompulsory = compulsorySubjectNames.includes(subject.name);
    
    // Science program subjects
    if (isScience || isCompulsory) {
      await prisma.programSubject.upsert({
        where: { programId_classSubjectId: { programId: scienceProgram.id, classSubjectId: classSubject.id } },
        update: {},
        create: { programId: scienceProgram.id, classSubjectId: classSubject.id, isCompulsory: isCompulsory },
      });
      programSubjectCount++;
    }
    
    // Management program subjects
    if (isManagement || isCompulsory) {
      await prisma.programSubject.upsert({
        where: { programId_classSubjectId: { programId: managementProgram.id, classSubjectId: classSubject.id } },
        update: {},
        create: { programId: managementProgram.id, classSubjectId: classSubject.id, isCompulsory: isCompulsory },
      });
      programSubjectCount++;
    }
  }
  console.log(`   ✓ Linked ${programSubjectCount} class-subjects to programs\n`);

  // 11. Create Demo Users
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
    where: { email_schoolId: { email: "admin@svi.edu.np", schoolId: school.id } },
    update: {},
    create: {
      schoolId: school.id,
      email: "admin@svi.edu.np",
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
  console.log(`   ✓ Admin: admin@svi.edu.np`);

  // Create 8 Teachers
  const teachers = [];
  const teacherData = [
    { firstName: "Bimala", lastName: "Sharma", subject: "MATH" },
    { firstName: "Ram", lastName: "Adhikari", subject: "ENG" },
    { firstName: "Sita", lastName: "Poudel", subject: "SCI" },
    { firstName: "Krishna", lastName: "Thapa", subject: "NEP" },
    { firstName: "Gita", lastName: "Gurung", subject: "SOC" },
    { firstName: "Hari", lastName: "KC", subject: "CS" },
    { firstName: "Laxmi", lastName: "Bhattarai", subject: "PHY" },
    { firstName: "Bishnu", lastName: "Koirala", subject: "CHEM" },
  ];

  for (let i = 0; i < teacherData.length; i++) {
    const t = teacherData[i];
    const teacherUser = await prisma.user.upsert({
      where: { email_schoolId: { email: `teacher${i + 1}@svi.edu.np`, schoolId: school.id } },
      update: {},
      create: {
        schoolId: school.id,
        email: `teacher${i + 1}@svi.edu.np`,
        passwordHash,
        firstName: t.firstName,
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
    where: { email_schoolId: { email: "examofficer@svi.edu.np", schoolId: school.id } },
    update: {},
    create: {
      schoolId: school.id,
      email: "examofficer@svi.edu.np",
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
  console.log(`   ✓ Exam Officer: examofficer@svi.edu.np`);

  // Accountant
  const accountantUser = await prisma.user.upsert({
    where: { email_schoolId: { email: "accountant@svi.edu.np", schoolId: school.id } },
    update: {},
    create: {
      schoolId: school.id,
      email: "accountant@svi.edu.np",
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
  console.log(`   ✓ Accountant: accountant@svi.edu.np`);

  // 11. Assign Teachers to Classes
  console.log("\n🔗 Assigning teachers to class subjects...");
  let teacherAssignmentCount = 0;
  
  // Assign each teacher to their subject across multiple grades
  for (const teacher of teachers) {
    const subject = createdSubjects.find(s => s.code === teacher.subjectCode);
    if (!subject) continue;
    
    // Assign to grades 8, 9, 10 for basic subjects
    const targetGrades = teacher.subjectCode.includes("11") || ["PHY", "CHEM", "BIO"].includes(teacher.subjectCode) 
      ? [11, 12] 
      : [8, 9, 10];
    
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

  // 12. Create Students (5 per section for grades 9, 10, 11)
  console.log("👨‍🎓 Creating students...");
  const createdStudents = [];
  let studentIndex = 1;
  
  for (const cls of createdClasses.filter(c => [9, 10, 11].includes(c.gradeLevel))) {
    for (const section of createdSections) {
      for (let i = 1; i <= 5; i++) {
        const gender = i % 2 === 0 ? "female" : "male";
        const firstName = getRandomElement(firstNames[gender]);
        const lastName = getRandomElement(lastNames);
        const email = `student${studentIndex}@svi.edu.np`;
        
        // For Grade 11: alternate between Science and Management programs
        const programId = cls.gradeLevel === 11 
          ? (i % 2 === 0 ? managementProgram.id : scienceProgram.id)
          : null;
        
        const studentUser = await prisma.user.upsert({
          where: { email_schoolId: { email, schoolId: school.id } },
          update: {},
          create: {
            schoolId: school.id,
            email,
            passwordHash,
            firstName,
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
        
        // For Grade 11 students, create StudentProgram record
        if (programId) {
          await prisma.studentProgram.upsert({
            where: { studentClassId: studentClass.id },
            update: {},
            create: {
              studentClassId: studentClass.id,
              programId: programId,
            },
          });
        }
        
        createdStudents.push({ student, studentClass, user: studentUser, cls, section, programId });
        studentIndex++;
      }
    }
  }
  console.log(`   ✓ Created ${createdStudents.length} students (Grade 11: Science & Management programs)\n`);

  // 13. Create Parents and Link to Students
  console.log("👨‍👩‍👧 Creating parents...");
  let parentCount = 0;
  
  for (const studentData of createdStudents) {
    const parentFirstName = getRandomElement(firstNames.male);
    const parentLastName = studentData.user.lastName;
    const parentEmail = `parent.${studentData.student.admissionNumber.toLowerCase()}@svi.edu.np`;
    
    const parentUser = await prisma.user.upsert({
      where: { email_schoolId: { email: parentEmail, schoolId: school.id } },
      update: {},
      create: {
        schoolId: school.id,
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
    for (const cls of createdClasses.filter(c => [9, 10, 11].includes(c.gradeLevel))) {
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
            theoryFullMarks: cs.theoryFullMarks || 100,
            practicalFullMarks: cs.practicalFullMarks || 0,
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

  // Final Summary
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("✅ Database seeded successfully!");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("\n📋 Demo Credentials (all use password: password123):");
  console.log("   ┌─────────────────────────────────────────────────────────────────┐");
  console.log("   │ Role           │ Email                                         │");
  console.log("   ├─────────────────────────────────────────────────────────────────┤");
  console.log("   │ Admin          │ admin@svi.edu.np                              │");
  console.log("   │ Teachers (8)   │ teacher1@svi.edu.np ... teacher8@svi.edu.np   │");
  console.log("   │ Exam Officer   │ examofficer@svi.edu.np                        │");
  console.log("   │ Accountant     │ accountant@svi.edu.np                         │");
  console.log("   │ Students (30)  │ student1@svi.edu.np ... student30@svi.edu.np  │");
  console.log("   │ Parents (30)   │ parent.stu2024xxxx@svi.edu.np                 │");
  console.log("   └─────────────────────────────────────────────────────────────────┘");
  console.log("\n📊 Data Summary:");
  console.log(`   • ${createdClasses.length} Classes (Grade 1-12)`);
  console.log(`   • ${createdSections.length} Sections (A, B)`);
  console.log(`   • ${createdSubjects.length} Subjects (Basic + NEB)`);
  console.log(`   • ${classSubjectCount} Class-Subject assignments`);
  console.log(`   • ${subjectComponentCount} NEB Subject Components (Theory/Practical)`);
  console.log(`   • 2 NEB Programs (Science, Management)`);
  console.log(`   • ${programSubjectCount} Program-Subject links`);
  console.log(`   • ${teacherAssignmentCount} Teacher assignments`);
  console.log(`   • ${createdStudents.length} Students (Grade 9, 10, 11)`);
  console.log(`   • 3 Exams (First Term, Mid-Term, Final)`);
  console.log(`   • ${resultCount} Exam results`);
  console.log(`   • ${createdFeeTypes.length} Fee types`);
  console.log(`   • ${notices.length} Notices`);
  console.log("\n💡 Usage:");
  console.log("   npm run seed           # Add/update data (keeps existing)");
  console.log("   npm run seed -- --clean  # WIPE ALL DATA then seed fresh");
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
