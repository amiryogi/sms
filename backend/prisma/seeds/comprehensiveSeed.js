/**
 * Comprehensive Seeder for K-12 School Management System
 * 
 * Features:
 * - Creates all required RBAC (Roles, Permissions)
 * - Creates School, Academic Years, Classes, Sections
 * - Creates Subjects (Basic for 1-10, NEB for 11-12)
 * - Creates Programs (Science, Management) and links subjects
 * - Creates Admin, Teachers, Exam Officer, Accountant users
 * - Creates Students: 2 per class for grades 1-10
 * - Creates Students: 2 Science + 2 Management for grades 11 & 12
 * - Creates Parents linked to students
 * - Assigns teachers to subjects
 * 
 * Usage:
 *   node prisma/seeds/comprehensiveSeed.js           # Seed only (upsert)
 *   node prisma/seeds/comprehensiveSeed.js --clean   # Wipe DB first, then seed
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Check for --clean flag
const CLEAN_MODE = process.argv.includes('--clean');

// =====================================================
// CLEANUP FUNCTION
// =====================================================

async function cleanupDatabase() {
  console.log('🗑️  CLEANUP MODE: Wiping all existing data...\n');

  const tablesToTruncate = [
    // Deep dependencies first
    'exam_results', 'exam_subjects', 'report_cards',
    'submission_files', 'submissions', 'assignment_files', 'assignments',
    'student_subjects', 'student_programs', 'program_subjects', 'programs',
    'fee_payments', 'fee_structures', 'fee_types',
    'attendance', 'promotions',
    'notice_attachments', 'notice_class_targets', 'notice_role_targets', 'notices',
    'student_classes', 'student_parents', 'students', 'parents',
    'teacher_subjects', 'subject_components', 'class_subjects',
    'exams', 'subjects', 'sections', 'classes', 'academic_years',
    'refresh_tokens', 'user_roles', 'role_permissions',
    'users', 'roles', 'permissions', 'schools',
    'subject_audits',
  ];

  try {
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;

    for (const table of tablesToTruncate) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
        console.log(`   ✓ Truncated ${table}`);
      } catch (err) {
        console.log(`   ⚠ Skipped ${table}`);
      }
    }

    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
    console.log('\n   ✅ Database cleanup complete!\n');
  } catch (error) {
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
    throw error;
  }
}

// =====================================================
// NEPALI NAMES DATA
// =====================================================

const firstNames = {
  male: ['Aarav', 'Bibek', 'Chiran', 'Dipesh', 'Eshan', 'Ganesh', 'Hari', 'Ishwar', 'Jeevan', 'Krishna', 'Laxman', 'Manish', 'Nabin', 'Om', 'Prabesh', 'Rajan', 'Sagar', 'Tej', 'Ujjwal', 'Vishal', 'Yogesh', 'Bikash', 'Sunil', 'Ramesh', 'Santosh'],
  female: ['Aakriti', 'Binita', 'Chandani', 'Deepa', 'Esha', 'Gita', 'Isha', 'Jyoti', 'Kabita', 'Laxmi', 'Maya', 'Nisha', 'Puja', 'Rekha', 'Sabina', 'Tara', 'Uma', 'Yamuna', 'Sunita', 'Anita', 'Sita', 'Radha', 'Kamala', 'Sarita', 'Mina']
};
const lastNames = ['Sharma', 'Adhikari', 'Poudel', 'Gurung', 'Tamang', 'Thapa', 'Shrestha', 'Rai', 'Limbu', 'Magar', 'Karki', 'Bhandari', 'KC', 'Pandey', 'Bhattarai', 'Acharya', 'Koirala', 'Basnet', 'Rijal', 'Ghimire'];

// =====================================================
// PERMISSIONS
// =====================================================

const permissions = [
  // User Management
  { name: 'user.create', module: 'users', description: 'Create new users' },
  { name: 'user.read', module: 'users', description: 'View user details' },
  { name: 'user.update', module: 'users', description: 'Update user information' },
  { name: 'user.delete', module: 'users', description: 'Delete users' },
  { name: 'user.list', module: 'users', description: 'List all users' },

  // Student Management
  { name: 'student.create', module: 'students', description: 'Create new students' },
  { name: 'student.read', module: 'students', description: 'View student details' },
  { name: 'student.update', module: 'students', description: 'Update student information' },
  { name: 'student.delete', module: 'students', description: 'Delete students' },
  { name: 'student.list', module: 'students', description: 'List students' },
  { name: 'student.view_own', module: 'students', description: 'View own student profile' },

  // Teacher Management
  { name: 'teacher.create', module: 'teachers', description: 'Create new teachers' },
  { name: 'teacher.read', module: 'teachers', description: 'View teacher details' },
  { name: 'teacher.update', module: 'teachers', description: 'Update teacher information' },
  { name: 'teacher.delete', module: 'teachers', description: 'Delete teachers' },
  { name: 'teacher.list', module: 'teachers', description: 'List teachers' },

  // Academic Structure
  { name: 'academic_year.manage', module: 'academic', description: 'Manage academic years' },
  { name: 'class.manage', module: 'academic', description: 'Manage classes' },
  { name: 'section.manage', module: 'academic', description: 'Manage sections' },
  { name: 'subject.manage', module: 'academic', description: 'Manage subjects' },
  { name: 'class_subject.manage', module: 'academic', description: 'Manage class-subject assignments' },
  { name: 'teacher_subject.manage', module: 'academic', description: 'Manage teacher assignments' },

  // Attendance
  { name: 'attendance.mark', module: 'attendance', description: 'Mark attendance' },
  { name: 'attendance.view_all', module: 'attendance', description: 'View all attendance records' },
  { name: 'attendance.view_own', module: 'attendance', description: 'View own attendance' },
  { name: 'attendance.view_class', module: 'attendance', description: 'View class attendance' },

  // Exams
  { name: 'exam.create', module: 'exams', description: 'Create exams' },
  { name: 'exam.read', module: 'exams', description: 'View exam details' },
  { name: 'exam.update', module: 'exams', description: 'Update exam information' },
  { name: 'exam.delete', module: 'exams', description: 'Delete exams' },
  { name: 'exam.manage_subjects', module: 'exams', description: 'Manage exam subjects' },

  // Results
  { name: 'result.enter', module: 'results', description: 'Enter exam results' },
  { name: 'result.view_all', module: 'results', description: 'View all results' },
  { name: 'result.view_own', module: 'results', description: 'View own results' },
  { name: 'result.view_child', module: 'results', description: 'View child results' },
  { name: 'result.publish', module: 'results', description: 'Publish results' },

  // Report Cards
  { name: 'report_card.generate', module: 'report_cards', description: 'Generate report cards' },
  { name: 'report_card.view_all', module: 'report_cards', description: 'View all report cards' },
  { name: 'report_card.view_own', module: 'report_cards', description: 'View own report card' },
  { name: 'report_card.view_child', module: 'report_cards', description: 'View child report card' },

  // Assignments
  { name: 'assignment.create', module: 'assignments', description: 'Create assignments' },
  { name: 'assignment.read', module: 'assignments', description: 'View assignments' },
  { name: 'assignment.update', module: 'assignments', description: 'Update assignments' },
  { name: 'assignment.delete', module: 'assignments', description: 'Delete assignments' },
  { name: 'assignment.grade', module: 'assignments', description: 'Grade submissions' },
  { name: 'assignment.submit', module: 'assignments', description: 'Submit assignments' },
  { name: 'assignment.view_own', module: 'assignments', description: 'View own assignments' },

  // Notices
  { name: 'notice.create', module: 'notices', description: 'Create notices' },
  { name: 'notice.read', module: 'notices', description: 'View notices' },
  { name: 'notice.update', module: 'notices', description: 'Update notices' },
  { name: 'notice.delete', module: 'notices', description: 'Delete notices' },

  // Promotions
  { name: 'promotion.process', module: 'promotions', description: 'Process student promotions' },
  { name: 'promotion.view', module: 'promotions', description: 'View promotion history' },

  // Fee Management
  { name: 'fee.manage_types', module: 'fees', description: 'Create/update/delete fee types' },
  { name: 'fee.manage_structures', module: 'fees', description: 'Create/update/delete fee structures' },
  { name: 'fee.record_payment', module: 'fees', description: 'Record fee payments' },
  { name: 'fee.view_all', module: 'fees', description: 'View all fee records and reports' },
  { name: 'fee.generate_invoice', module: 'fees', description: 'Generate fee invoices for students' },
  { name: 'fee.apply_discount', module: 'fees', description: 'Apply discounts or fines to fees' },
];

// =====================================================
// ROLES
// =====================================================

const roles = [
  { name: 'ADMIN', description: 'School Administrator' },
  { name: 'TEACHER', description: 'Teacher' },
  { name: 'EXAM_OFFICER', description: 'Exam Officer - Can enter marks for any subject' },
  { name: 'ACCOUNTANT', description: 'Accountant - Manages fee collection and billing' },
  { name: 'STUDENT', description: 'Student' },
  { name: 'PARENT', description: 'Parent/Guardian' },
];

// Role-permission mappings
const rolePermissions = {
  ADMIN: [
    'user.create', 'user.read', 'user.update', 'user.delete', 'user.list',
    'student.create', 'student.read', 'student.update', 'student.delete', 'student.list',
    'teacher.create', 'teacher.read', 'teacher.update', 'teacher.delete', 'teacher.list',
    'academic_year.manage', 'class.manage', 'section.manage', 'subject.manage',
    'class_subject.manage', 'teacher_subject.manage',
    'attendance.mark', 'attendance.view_all', 'attendance.view_class',
    'exam.create', 'exam.read', 'exam.update', 'exam.delete', 'exam.manage_subjects',
    'result.enter', 'result.view_all', 'result.publish',
    'report_card.generate', 'report_card.view_all',
    'assignment.create', 'assignment.read', 'assignment.update', 'assignment.delete', 'assignment.grade',
    'notice.create', 'notice.read', 'notice.update', 'notice.delete',
    'promotion.process', 'promotion.view',
    'fee.manage_types', 'fee.manage_structures', 'fee.record_payment', 'fee.view_all', 'fee.generate_invoice', 'fee.apply_discount',
  ],
  TEACHER: [
    'student.read', 'student.list',
    'attendance.mark', 'attendance.view_class',
    'exam.read', 'result.enter', 'result.view_all',
    'assignment.create', 'assignment.read', 'assignment.update', 'assignment.delete', 'assignment.grade',
    'notice.read', 'notice.create',
  ],
  STUDENT: [
    'student.view_own', 'attendance.view_own', 'result.view_own', 'report_card.view_own',
    'assignment.submit', 'assignment.view_own', 'notice.read',
  ],
  PARENT: [
    'attendance.view_own', 'result.view_child', 'report_card.view_child',
    'assignment.view_own', 'notice.read',
  ],
  EXAM_OFFICER: [
    'student.read', 'student.list', 'exam.read', 'result.enter', 'result.view_all', 'notice.read',
  ],
  ACCOUNTANT: [
    'student.read', 'student.list',
    'fee.manage_types', 'fee.manage_structures', 'fee.record_payment', 'fee.view_all', 'fee.generate_invoice', 'fee.apply_discount',
    'notice.read',
  ],
};

// =====================================================
// BASIC SUBJECTS (Grade 1-10)
// =====================================================

const basicSubjects = [
  { name: 'English', code: 'ENG', description: 'English Language and Literature', creditHours: 4 },
  { name: 'Mathematics', code: 'MATH', description: 'Mathematics', creditHours: 5 },
  { name: 'Science', code: 'SCI', description: 'General Science', creditHours: 4 },
  { name: 'Social Studies', code: 'SOC', description: 'Social Studies and History', creditHours: 3 },
  { name: 'Nepali', code: 'NEP', description: 'Nepali Language', creditHours: 4 },
  { name: 'Computer Science', code: 'CS', description: 'Computer Science and IT', creditHours: 2, hasPractical: true },
  { name: 'Health & Physical Education', code: 'HPE', description: 'Health and Physical Education', creditHours: 2 },
  { name: 'Moral Education', code: 'MORAL', description: 'Moral Science and Values', creditHours: 2 },
];

// =====================================================
// NEB SUBJECTS (Grade 11-12) - From Excel Data
// =====================================================

const nebSubjectsData = [
  // Grade 11 Compulsory
  { name: 'Compulsory English', theoryCode: '0031', practicalCode: '0032', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3, practicalCreditHours: 1, totalCreditHours: 4, classLevel: 11, faculty: 'Compulsory', isCompulsory: true },
  { name: 'Compulsory Nepali', theoryCode: '0011', practicalCode: '0012', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 2.25, practicalCreditHours: 0.75, totalCreditHours: 3, classLevel: 11, faculty: 'Compulsory', isCompulsory: true },
  // Grade 11 Optional (Both Science & Management)
  { name: 'Social Studies & Life Skills', theoryCode: '0051', practicalCode: '0052', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 11, faculty: 'OptionalForScienceManagement', isCompulsory: false },
  { name: 'Computer Science', theoryCode: '4271', practicalCode: '4272', theoryFullMarks: 50, practicalFullMarks: 50, theoryCreditHours: 2.5, practicalCreditHours: 2.5, totalCreditHours: 5, classLevel: 11, faculty: 'OptionalForScienceManagement', isCompulsory: false },
  // Grade 11 Science
  { name: 'Physics', theoryCode: '1011', practicalCode: '1012', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 11, faculty: 'Science', isCompulsory: false },
  { name: 'Chemistry', theoryCode: '3011', practicalCode: '3012', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 11, faculty: 'Science', isCompulsory: false },
  { name: 'Biology', theoryCode: '1031', practicalCode: '1032', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 11, faculty: 'Science', isCompulsory: false },
  { name: 'Mathematics', theoryCode: '0071', practicalCode: '0072', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 11, faculty: 'Science', isCompulsory: false },
  // Grade 11 Management
  { name: 'Accounting', theoryCode: '1031M', practicalCode: '1032M', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 11, faculty: 'Management', isCompulsory: false },
  { name: 'Economics', theoryCode: '3031', practicalCode: '3032', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 11, faculty: 'Management', isCompulsory: false },
  { name: 'Business Studies', theoryCode: '2151', practicalCode: '2152', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 11, faculty: 'Management', isCompulsory: false },
  { name: 'Hotel Management', theoryCode: '4391', practicalCode: '4392', theoryFullMarks: 50, practicalFullMarks: 50, theoryCreditHours: 2.5, practicalCreditHours: 2.5, totalCreditHours: 5, classLevel: 11, faculty: 'Management', isCompulsory: false },
  
  // Grade 12 Compulsory
  { name: 'Compulsory English', theoryCode: '0041', practicalCode: '0042', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3, practicalCreditHours: 1, totalCreditHours: 4, classLevel: 12, faculty: 'Compulsory', isCompulsory: true },
  { name: 'Compulsory Nepali', theoryCode: '0021', practicalCode: '0022', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 2.25, practicalCreditHours: 0.75, totalCreditHours: 3, classLevel: 12, faculty: 'Compulsory', isCompulsory: true },
  // Grade 12 Optional (Both Science & Management)
  { name: 'Social Studies & Life Skills', theoryCode: '0061', practicalCode: '0062', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3, practicalCreditHours: 1, totalCreditHours: 4, classLevel: 12, faculty: 'OptionalForScienceManagement', isCompulsory: false },
  { name: 'Computer Science', theoryCode: '4281', practicalCode: '4282', theoryFullMarks: 50, practicalFullMarks: 50, theoryCreditHours: 2.5, practicalCreditHours: 2.5, totalCreditHours: 5, classLevel: 12, faculty: 'OptionalForScienceManagement', isCompulsory: false },
  // Grade 12 Science
  { name: 'Physics', theoryCode: '1021', practicalCode: '1022', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 12, faculty: 'Science', isCompulsory: false },
  { name: 'Chemistry', theoryCode: '3012', practicalCode: '3013', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 12, faculty: 'Science', isCompulsory: false },
  { name: 'Biology', theoryCode: '1041', practicalCode: '1042', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 12, faculty: 'Science', isCompulsory: false },
  { name: 'Mathematics', theoryCode: '0081', practicalCode: '0082', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 12, faculty: 'Science', isCompulsory: false },
  // Grade 12 Management
  { name: 'Accounting', theoryCode: '1041M', practicalCode: '1042M', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 12, faculty: 'Management', isCompulsory: false },
  { name: 'Economics', theoryCode: '3041', practicalCode: '3042', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 12, faculty: 'Management', isCompulsory: false },
  { name: 'Business Studies', theoryCode: '2261', practicalCode: '2262', theoryFullMarks: 75, practicalFullMarks: 25, theoryCreditHours: 3.75, practicalCreditHours: 1.25, totalCreditHours: 5, classLevel: 12, faculty: 'Management', isCompulsory: false },
  { name: 'Hotel Management', theoryCode: '4401', practicalCode: '4402', theoryFullMarks: 50, practicalFullMarks: 50, theoryCreditHours: 2.5, practicalCreditHours: 2.5, totalCreditHours: 5, classLevel: 12, faculty: 'Management', isCompulsory: false },
];

// =====================================================
// CLASSES AND SECTIONS
// =====================================================

const classesData = [
  { name: 'Grade 1', gradeLevel: 1, displayOrder: 1 },
  { name: 'Grade 2', gradeLevel: 2, displayOrder: 2 },
  { name: 'Grade 3', gradeLevel: 3, displayOrder: 3 },
  { name: 'Grade 4', gradeLevel: 4, displayOrder: 4 },
  { name: 'Grade 5', gradeLevel: 5, displayOrder: 5 },
  { name: 'Grade 6', gradeLevel: 6, displayOrder: 6 },
  { name: 'Grade 7', gradeLevel: 7, displayOrder: 7 },
  { name: 'Grade 8', gradeLevel: 8, displayOrder: 8 },
  { name: 'Grade 9', gradeLevel: 9, displayOrder: 9 },
  { name: 'Grade 10', gradeLevel: 10, displayOrder: 10 },
  { name: 'Grade 11', gradeLevel: 11, displayOrder: 11 },
  { name: 'Grade 12', gradeLevel: 12, displayOrder: 12 },
];

const sectionsData = [
  { name: 'A', capacity: 40 },
  { name: 'B', capacity: 40 },
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
  const currentYear = 2025;
  const age = gradeLevel + 5 + getRandomInt(0, 1);
  const birthYear = currentYear - age;
  const month = getRandomInt(1, 12);
  const day = getRandomInt(1, 28);
  return new Date(birthYear, month - 1, day);
}

function generateAdmissionNumber(index, year = 2025) {
  return `STU${year}${String(index).padStart(4, '0')}`;
}

function getNEBSubjectCode(name, classLevel) {
  const codeMap = {
    'Compulsory English': 'CENG',
    'Compulsory Nepali': 'CNEP',
    'Physics': 'PHY',
    'Chemistry': 'CHEM',
    'Biology': 'BIO',
    'Mathematics': 'MATH',
    'Computer Science': 'COMP',
    'Accounting': 'ACC',
    'Economics': 'ECO',
    'Business Studies': 'BUS',
    'Hotel Management': 'HM',
    'Social Studies & Life Skills': 'SSLS',
  };
  return `${codeMap[name] || name.substring(0, 4).toUpperCase()}-${classLevel}`;
}

// Track used name combinations to avoid duplicates
const usedNames = new Set();

function generateUniqueName(gender) {
  let firstName, lastName, fullName;
  let attempts = 0;
  do {
    firstName = getRandomElement(firstNames[gender]);
    lastName = getRandomElement(lastNames);
    fullName = `${firstName} ${lastName}`;
    attempts++;
    if (attempts > 100) {
      // Add a number suffix if we can't find unique
      firstName = `${firstName}${getRandomInt(1, 99)}`;
      fullName = `${firstName} ${lastName}`;
    }
  } while (usedNames.has(fullName));
  usedNames.add(fullName);
  return { firstName, lastName };
}

// =====================================================
// MAIN SEED FUNCTION
// =====================================================

async function main() {
  console.log('🌱 Starting Comprehensive Database Seed...\n');

  if (CLEAN_MODE) {
    await cleanupDatabase();
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  // ============ 1. PERMISSIONS ============
  console.log('📝 Creating permissions...');
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log(`   ✓ Created ${permissions.length} permissions\n`);

  // ============ 2. ROLES ============
  console.log('👥 Creating roles...');
  const createdRoles = {};
  for (const role of roles) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    createdRoles[role.name] = created;
  }
  console.log(`   ✓ Created ${roles.length} roles\n`);

  // ============ 3. ROLE-PERMISSIONS ============
  console.log('🔗 Assigning permissions to roles...');
  for (const [roleName, permNames] of Object.entries(rolePermissions)) {
    const role = createdRoles[roleName];
    if (!role) continue;
    for (const permName of permNames) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
  console.log('   ✓ Assigned permissions to roles\n');

  // ============ 4. SCHOOL ============
  console.log('🏫 Creating demo school...');
  const school = await prisma.school.upsert({
    where: { code: 'DEMO001' },
    update: {},
    create: {
      name: 'Shree Vidhya International School',
      code: 'DEMO001',
      address: 'Balaju, Kathmandu, Nepal',
      phone: '+977-1-1234567',
      email: 'info@svi.edu.np',
      isActive: true,
      tagline: 'Excellence in Education',
      principalName: 'Dr. Ramesh Sharma',
      establishedYear: 1995,
    },
  });
  console.log(`   ✓ Created school: ${school.name}\n`);

  // ============ 5. ACADEMIC YEARS ============
  console.log('📅 Creating academic years...');
  const academicYear = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: '2025-2026' } },
    update: { isCurrent: true },
    create: {
      schoolId: school.id,
      name: '2025-2026',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
      isCurrent: true,
    },
  });
  console.log(`   ✓ Created academic year: ${academicYear.name} (current)\n`);

  // ============ 6. SECTIONS ============
  console.log('📚 Creating sections...');
  const createdSections = [];
  for (const sec of sectionsData) {
    const created = await prisma.section.upsert({
      where: { schoolId_name: { schoolId: school.id, name: sec.name } },
      update: {},
      create: { ...sec, schoolId: school.id },
    });
    createdSections.push(created);
  }
  console.log(`   ✓ Created ${createdSections.length} sections\n`);

  // ============ 7. CLASSES ============
  console.log('🎓 Creating classes...');
  const createdClasses = [];
  for (const cls of classesData) {
    const created = await prisma.class.upsert({
      where: { schoolId_name: { schoolId: school.id, name: cls.name } },
      update: {},
      create: { ...cls, schoolId: school.id },
    });
    createdClasses.push(created);
  }
  console.log(`   ✓ Created ${createdClasses.length} classes\n`);

  // ============ 8. SUBJECTS ============
  console.log('📖 Creating subjects...');
  const createdSubjects = [];

  // Basic subjects for Grade 1-10
  for (const sub of basicSubjects) {
    const created = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code: sub.code } },
      update: {},
      create: {
        schoolId: school.id,
        name: sub.name,
        code: sub.code,
        description: sub.description,
        creditHours: sub.creditHours || 3,
        hasPractical: sub.hasPractical || false,
      },
    });
    createdSubjects.push({ ...created, forGrades: '1-10' });
  }

  // NEB subjects for Grade 11-12 (unique codes per grade level)
  for (const neb of nebSubjectsData) {
    const code = getNEBSubjectCode(neb.name, neb.classLevel);
    const created = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code } },
      update: {},
      create: {
        schoolId: school.id,
        name: neb.name,
        code,
        description: `${neb.faculty} subject for Grade ${neb.classLevel}`,
        creditHours: neb.totalCreditHours,
        hasPractical: neb.practicalFullMarks > 0,
        isOptional: !neb.isCompulsory,
      },
    });
    createdSubjects.push({ ...created, nebData: neb, forGrades: `${neb.classLevel}` });
  }
  console.log(`   ✓ Created ${createdSubjects.length} subjects\n`);

  // ============ 9. CLASS-SUBJECTS ============
  console.log('🔗 Assigning subjects to classes...');
  const createdClassSubjects = {};
  let classSubjectCount = 0;
  let subjectComponentCount = 0;

  const basicSubjectCodes = basicSubjects.map(s => s.code);

  for (const cls of createdClasses) {
    createdClassSubjects[cls.id] = [];

    if (cls.gradeLevel <= 10) {
      // Basic subjects for Grade 1-10
      for (const sub of createdSubjects.filter(s => basicSubjectCodes.includes(s.code))) {
        const hasPractical = sub.code === 'CS' || sub.code === 'SCI';
        const cs = await prisma.classSubject.upsert({
          where: {
            classId_academicYearId_subjectId: {
              classId: cls.id,
              academicYearId: academicYear.id,
              subjectId: sub.id,
            },
          },
          update: {},
          create: {
            classId: cls.id,
            academicYearId: academicYear.id,
            subjectId: sub.id,
            fullMarks: 100,
            passMarks: 40,
            hasTheory: true,
            hasPractical,
            theoryMarks: hasPractical ? 75 : 100,
            practicalMarks: hasPractical ? 25 : 0,
            creditHours: sub.creditHours || 3,
          },
        });
        createdClassSubjects[cls.id].push(cs);
        classSubjectCount++;
      }
    } else {
      // NEB subjects for Grade 11-12
      const gradeSubjects = createdSubjects.filter(s => s.nebData && s.nebData.classLevel === cls.gradeLevel);

      for (const sub of gradeSubjects) {
        const neb = sub.nebData;
        const fullMarks = neb.theoryFullMarks + neb.practicalFullMarks;
        const passMarks = Math.ceil(fullMarks * 0.35);

        const cs = await prisma.classSubject.upsert({
          where: {
            classId_academicYearId_subjectId: {
              classId: cls.id,
              academicYearId: academicYear.id,
              subjectId: sub.id,
            },
          },
          update: {},
          create: {
            classId: cls.id,
            academicYearId: academicYear.id,
            subjectId: sub.id,
            fullMarks,
            passMarks,
            hasTheory: true,
            hasPractical: neb.practicalFullMarks > 0,
            theoryMarks: neb.theoryFullMarks,
            practicalMarks: neb.practicalFullMarks,
            creditHours: neb.totalCreditHours,
            theoryCreditHours: neb.theoryCreditHours,
            practicalCreditHours: neb.practicalCreditHours,
          },
        });
        createdClassSubjects[cls.id].push({ ...cs, nebData: neb, subjectName: sub.name });
        classSubjectCount++;

        // Create SubjectComponent for THEORY
        await prisma.subjectComponent.upsert({
          where: {
            classId_subjectId_type: {
              classId: cls.id,
              subjectId: sub.id,
              type: 'THEORY',
            },
          },
          update: {},
          create: {
            classId: cls.id,
            subjectId: sub.id,
            type: 'THEORY',
            subjectCode: neb.theoryCode,
            fullMarks: neb.theoryFullMarks,
            passMarks: Math.ceil(neb.theoryFullMarks * 0.35),
            creditHours: neb.theoryCreditHours,
          },
        });
        subjectComponentCount++;

        // Create SubjectComponent for PRACTICAL
        if (neb.practicalFullMarks > 0 && neb.practicalCode) {
          await prisma.subjectComponent.upsert({
            where: {
              classId_subjectId_type: {
                classId: cls.id,
                subjectId: sub.id,
                type: 'PRACTICAL',
              },
            },
            update: {},
            create: {
              classId: cls.id,
              subjectId: sub.id,
              type: 'PRACTICAL',
              subjectCode: neb.practicalCode,
              fullMarks: neb.practicalFullMarks,
              passMarks: Math.ceil(neb.practicalFullMarks * 0.35),
              creditHours: neb.practicalCreditHours,
            },
          });
          subjectComponentCount++;
        }
      }
    }
  }
  console.log(`   ✓ Created ${classSubjectCount} class-subject assignments`);
  console.log(`   ✓ Created ${subjectComponentCount} NEB subject components\n`);

  // ============ 10. PROGRAMS (Science, Management) ============
  console.log('🎓 Creating NEB Programs...');
  const grade11 = createdClasses.find(c => c.gradeLevel === 11);
  const grade12 = createdClasses.find(c => c.gradeLevel === 12);

  const scienceProgram = await prisma.program.upsert({
    where: { schoolId_academicYearId_name: { schoolId: school.id, academicYearId: academicYear.id, name: 'Science' } },
    update: {},
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: 'Science',
      description: 'NEB Science Faculty - Physics, Chemistry, Biology, Mathematics',
      isActive: true,
    },
  });

  const managementProgram = await prisma.program.upsert({
    where: { schoolId_academicYearId_name: { schoolId: school.id, academicYearId: academicYear.id, name: 'Management' } },
    update: {},
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: 'Management',
      description: 'NEB Management Faculty - Accounting, Economics, Business Studies',
      isActive: true,
    },
  });
  console.log('   ✓ Created programs: Science, Management');

  // Link ClassSubjects to Programs
  let programSubjectCount = 0;
  const scienceFaculties = ['Science', 'Compulsory', 'OptionalForScienceManagement'];
  const managementFaculties = ['Management', 'Compulsory', 'OptionalForScienceManagement'];

  for (const gradeClass of [grade11, grade12]) {
    const classSubjects = createdClassSubjects[gradeClass.id] || [];
    for (const cs of classSubjects) {
      if (!cs.nebData) continue;
      const faculty = cs.nebData.faculty;

      if (scienceFaculties.includes(faculty)) {
        await prisma.programSubject.upsert({
          where: { programId_classSubjectId: { programId: scienceProgram.id, classSubjectId: cs.id } },
          update: {},
          create: { programId: scienceProgram.id, classSubjectId: cs.id, isCompulsory: cs.nebData.isCompulsory },
        });
        programSubjectCount++;
      }

      if (managementFaculties.includes(faculty)) {
        await prisma.programSubject.upsert({
          where: { programId_classSubjectId: { programId: managementProgram.id, classSubjectId: cs.id } },
          update: {},
          create: { programId: managementProgram.id, classSubjectId: cs.id, isCompulsory: cs.nebData.isCompulsory },
        });
        programSubjectCount++;
      }
    }
  }
  console.log(`   ✓ Linked ${programSubjectCount} subjects to programs\n`);

  // ============ 11. ADMIN USER ============
  console.log('👤 Creating admin user...');
  const adminUser = await prisma.user.upsert({
    where: { email_schoolId: { email: 'admin@svi.edu.np', schoolId: school.id } },
    update: {},
    create: {
      schoolId: school.id,
      email: 'admin@svi.edu.np',
      passwordHash,
      firstName: 'Amir',
      lastName: 'Shrestha',
      phone: '+977-9861158271',
      status: 'active',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: createdRoles.ADMIN.id } },
    update: {},
    create: { userId: adminUser.id, roleId: createdRoles.ADMIN.id },
  });
  console.log('   ✓ Admin: admin@svi.edu.np / password123\n');

  // ============ 12. TEACHERS ============
  console.log('👨‍🏫 Creating teachers...');
  const teacherData = [
    { firstName: 'Bimala', lastName: 'Sharma', subject: 'MATH' },
    { firstName: 'Ram', lastName: 'Adhikari', subject: 'ENG' },
    { firstName: 'Sita', lastName: 'Poudel', subject: 'SCI' },
    { firstName: 'Krishna', lastName: 'Thapa', subject: 'NEP' },
    { firstName: 'Gita', lastName: 'Gurung', subject: 'SOC' },
    { firstName: 'Hari', lastName: 'KC', subject: 'CS' },
    { firstName: 'Bishnu', lastName: 'Koirala', subject: 'PHY' },
    { firstName: 'Sarita', lastName: 'Bhattarai', subject: 'CHEM' },
  ];

  const createdTeachers = [];
  for (let i = 0; i < teacherData.length; i++) {
    const t = teacherData[i];
    const email = `teacher${i + 1}@svi.edu.np`;
    const teacherUser = await prisma.user.upsert({
      where: { email_schoolId: { email, schoolId: school.id } },
      update: {},
      create: {
        schoolId: school.id,
        email,
        passwordHash,
        firstName: t.firstName,
        lastName: t.lastName,
        phone: generatePhone(),
        status: 'active',
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: teacherUser.id, roleId: createdRoles.TEACHER.id } },
      update: {},
      create: { userId: teacherUser.id, roleId: createdRoles.TEACHER.id },
    });
    createdTeachers.push({ user: teacherUser, subjectCode: t.subject });
  }
  console.log(`   ✓ Created ${createdTeachers.length} teachers\n`);

  // ============ 13. EXAM OFFICER & ACCOUNTANT ============
  console.log('👤 Creating exam officer & accountant...');
  
  const examOfficerUser = await prisma.user.upsert({
    where: { email_schoolId: { email: 'examofficer@svi.edu.np', schoolId: school.id } },
    update: {},
    create: {
      schoolId: school.id,
      email: 'examofficer@svi.edu.np',
      passwordHash,
      firstName: 'Exam',
      lastName: 'Officer',
      phone: generatePhone(),
      status: 'active',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: examOfficerUser.id, roleId: createdRoles.EXAM_OFFICER.id } },
    update: {},
    create: { userId: examOfficerUser.id, roleId: createdRoles.EXAM_OFFICER.id },
  });
  console.log('   ✓ Exam Officer: examofficer@svi.edu.np');

  const accountantUser = await prisma.user.upsert({
    where: { email_schoolId: { email: 'accountant@svi.edu.np', schoolId: school.id } },
    update: {},
    create: {
      schoolId: school.id,
      email: 'accountant@svi.edu.np',
      passwordHash,
      firstName: 'Prakash',
      lastName: 'Shrestha',
      phone: generatePhone(),
      status: 'active',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: accountantUser.id, roleId: createdRoles.ACCOUNTANT.id } },
    update: {},
    create: { userId: accountantUser.id, roleId: createdRoles.ACCOUNTANT.id },
  });
  console.log('   ✓ Accountant: accountant@svi.edu.np\n');

  // ============ 14. STUDENTS ============
  console.log('👨‍🎓 Creating students...');

  let studentIndex = 1;
  const createdStudents = [];
  const sectionA = createdSections.find(s => s.name === 'A');

  // Grade 1-10: 2 students per class
  for (const cls of createdClasses.filter(c => c.gradeLevel <= 10)) {
    for (let i = 0; i < 2; i++) {
      const gender = i % 2 === 0 ? 'male' : 'female';
      const { firstName, lastName } = generateUniqueName(gender);
      const email = `student${studentIndex}@svi.edu.np`;
      const admissionNumber = generateAdmissionNumber(studentIndex);

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
          status: 'active',
        },
      });

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: studentUser.id, roleId: createdRoles.STUDENT.id } },
        update: {},
        create: { userId: studentUser.id, roleId: createdRoles.STUDENT.id },
      });

      const student = await prisma.student.upsert({
        where: { userId: studentUser.id },
        update: {},
        create: {
          userId: studentUser.id,
          schoolId: school.id,
          admissionNumber,
          dateOfBirth: generateDOB(cls.gradeLevel),
          gender,
          address: 'Kathmandu, Nepal',
          admissionDate: new Date('2025-04-01'),
        },
      });

      const studentClass = await prisma.studentClass.upsert({
        where: { studentId_academicYearId: { studentId: student.id, academicYearId: academicYear.id } },
        update: {},
        create: {
          studentId: student.id,
          classId: cls.id,
          sectionId: sectionA.id,
          academicYearId: academicYear.id,
          schoolId: school.id,
          rollNumber: i + 1,
          status: 'active',
        },
      });

      createdStudents.push({ user: studentUser, student, studentClass, classId: cls.id, gradeLevel: cls.gradeLevel });
      studentIndex++;
    }
  }
  console.log(`   ✓ Created 20 students for grades 1-10 (2 per class)`);

  // Grade 11: 2 Science + 2 Management
  for (const programData of [
    { program: scienceProgram, name: 'Science' },
    { program: managementProgram, name: 'Management' },
  ]) {
    for (let i = 0; i < 2; i++) {
      const gender = i % 2 === 0 ? 'male' : 'female';
      const { firstName, lastName } = generateUniqueName(gender);
      const email = `student${studentIndex}@svi.edu.np`;
      const admissionNumber = generateAdmissionNumber(studentIndex);

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
          status: 'active',
        },
      });

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: studentUser.id, roleId: createdRoles.STUDENT.id } },
        update: {},
        create: { userId: studentUser.id, roleId: createdRoles.STUDENT.id },
      });

      const student = await prisma.student.upsert({
        where: { userId: studentUser.id },
        update: {},
        create: {
          userId: studentUser.id,
          schoolId: school.id,
          admissionNumber,
          dateOfBirth: generateDOB(11),
          gender,
          address: 'Kathmandu, Nepal',
          admissionDate: new Date('2025-04-01'),
        },
      });

      const studentClass = await prisma.studentClass.upsert({
        where: { studentId_academicYearId: { studentId: student.id, academicYearId: academicYear.id } },
        update: {},
        create: {
          studentId: student.id,
          classId: grade11.id,
          sectionId: sectionA.id,
          academicYearId: academicYear.id,
          schoolId: school.id,
          rollNumber: studentIndex - 20,
          status: 'active',
        },
      });

      // Assign program
      await prisma.studentProgram.upsert({
        where: { studentClassId: studentClass.id },
        update: {},
        create: {
          studentClassId: studentClass.id,
          programId: programData.program.id,
        },
      });

      // Assign subjects based on program
      const programSubjects = await prisma.programSubject.findMany({
        where: { programId: programData.program.id },
        include: { classSubject: true },
      });

      for (const ps of programSubjects.filter(p => p.classSubject.classId === grade11.id)) {
        await prisma.studentSubject.upsert({
          where: { studentClassId_classSubjectId: { studentClassId: studentClass.id, classSubjectId: ps.classSubjectId } },
          update: {},
          create: { studentClassId: studentClass.id, classSubjectId: ps.classSubjectId, status: 'ACTIVE' },
        });
      }

      createdStudents.push({ user: studentUser, student, studentClass, classId: grade11.id, gradeLevel: 11, program: programData.name });
      studentIndex++;
    }
  }
  console.log(`   ✓ Created 4 students for grade 11 (2 Science, 2 Management)`);

  // Grade 12: 2 Science + 2 Management
  for (const programData of [
    { program: scienceProgram, name: 'Science' },
    { program: managementProgram, name: 'Management' },
  ]) {
    for (let i = 0; i < 2; i++) {
      const gender = i % 2 === 0 ? 'male' : 'female';
      const { firstName, lastName } = generateUniqueName(gender);
      const email = `student${studentIndex}@svi.edu.np`;
      const admissionNumber = generateAdmissionNumber(studentIndex);

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
          status: 'active',
        },
      });

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: studentUser.id, roleId: createdRoles.STUDENT.id } },
        update: {},
        create: { userId: studentUser.id, roleId: createdRoles.STUDENT.id },
      });

      const student = await prisma.student.upsert({
        where: { userId: studentUser.id },
        update: {},
        create: {
          userId: studentUser.id,
          schoolId: school.id,
          admissionNumber,
          dateOfBirth: generateDOB(12),
          gender,
          address: 'Kathmandu, Nepal',
          admissionDate: new Date('2024-04-01'),
        },
      });

      const studentClass = await prisma.studentClass.upsert({
        where: { studentId_academicYearId: { studentId: student.id, academicYearId: academicYear.id } },
        update: {},
        create: {
          studentId: student.id,
          classId: grade12.id,
          sectionId: sectionA.id,
          academicYearId: academicYear.id,
          schoolId: school.id,
          rollNumber: studentIndex - 24,
          status: 'active',
        },
      });

      // Assign program
      await prisma.studentProgram.upsert({
        where: { studentClassId: studentClass.id },
        update: {},
        create: {
          studentClassId: studentClass.id,
          programId: programData.program.id,
        },
      });

      // Assign subjects based on program
      const programSubjects = await prisma.programSubject.findMany({
        where: { programId: programData.program.id },
        include: { classSubject: true },
      });

      for (const ps of programSubjects.filter(p => p.classSubject.classId === grade12.id)) {
        await prisma.studentSubject.upsert({
          where: { studentClassId_classSubjectId: { studentClassId: studentClass.id, classSubjectId: ps.classSubjectId } },
          update: {},
          create: { studentClassId: studentClass.id, classSubjectId: ps.classSubjectId, status: 'ACTIVE' },
        });
      }

      createdStudents.push({ user: studentUser, student, studentClass, classId: grade12.id, gradeLevel: 12, program: programData.name });
      studentIndex++;
    }
  }
  console.log(`   ✓ Created 4 students for grade 12 (2 Science, 2 Management)`);
  console.log(`   ✓ Total students created: ${createdStudents.length}\n`);

  // ============ 15. PARENTS ============
  console.log('👨‍👩‍👧 Creating parents...');
  let parentIndex = 1;
  for (const studentData of createdStudents) {
    const { firstName, lastName } = generateUniqueName('male');
    const email = `parent${parentIndex}@svi.edu.np`;

    const parentUser = await prisma.user.upsert({
      where: { email_schoolId: { email, schoolId: school.id } },
      update: {},
      create: {
        schoolId: school.id,
        email,
        passwordHash,
        firstName,
        lastName,
        phone: generatePhone(),
        status: 'active',
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: parentUser.id, roleId: createdRoles.PARENT.id } },
      update: {},
      create: { userId: parentUser.id, roleId: createdRoles.PARENT.id },
    });

    const parent = await prisma.parent.upsert({
      where: { userId: parentUser.id },
      update: {},
      create: {
        userId: parentUser.id,
        schoolId: school.id,
        occupation: getRandomElement(['Teacher', 'Engineer', 'Doctor', 'Business', 'Farmer', 'Government Employee']),
        address: 'Kathmandu, Nepal',
      },
    });

    await prisma.studentParent.upsert({
      where: { studentId_parentId: { studentId: studentData.student.id, parentId: parent.id } },
      update: {},
      create: {
        studentId: studentData.student.id,
        parentId: parent.id,
        schoolId: school.id,
        relationship: 'father',
        isPrimary: true,
      },
    });

    parentIndex++;
  }
  console.log(`   ✓ Created ${parentIndex - 1} parents\n`);

  // ============ 16. TEACHER ASSIGNMENTS ============
  console.log('📋 Assigning teachers to classes...');
  let teacherAssignmentCount = 0;

  for (const cls of createdClasses.filter(c => c.gradeLevel <= 10)) {
    const classSubjects = createdClassSubjects[cls.id] || [];
    for (const cs of classSubjects) {
      const sub = createdSubjects.find(s => s.id === cs.subjectId);
      if (!sub) continue;
      const teacher = createdTeachers.find(t => t.subjectCode === sub.code);
      if (!teacher) continue;

      await prisma.teacherSubject.upsert({
        where: {
          userId_classSubjectId_sectionId_academicYearId: {
            userId: teacher.user.id,
            classSubjectId: cs.id,
            sectionId: sectionA.id,
            academicYearId: academicYear.id,
          },
        },
        update: {},
        create: {
          userId: teacher.user.id,
          classSubjectId: cs.id,
          sectionId: sectionA.id,
          academicYearId: academicYear.id,
          isClassTeacher: sub.code === 'ENG',
        },
      });
      teacherAssignmentCount++;
    }
  }
  console.log(`   ✓ Created ${teacherAssignmentCount} teacher assignments\n`);

  // ============ SUMMARY ============
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ COMPREHENSIVE SEED COMPLETED!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n📊 Summary:');
  console.log(`   • School: ${school.name}`);
  console.log(`   • Academic Year: ${academicYear.name}`);
  console.log(`   • Classes: ${createdClasses.length}`);
  console.log(`   • Sections: ${createdSections.length}`);
  console.log(`   • Subjects: ${createdSubjects.length}`);
  console.log(`   • Class-Subjects: ${classSubjectCount}`);
  console.log(`   • Programs: Science, Management`);
  console.log(`   • Teachers: ${createdTeachers.length}`);
  console.log(`   • Students: ${createdStudents.length}`);
  console.log(`   • Parents: ${parentIndex - 1}`);
  console.log('\n🔑 Login Credentials (password: password123):');
  console.log('   • Admin: admin@svi.edu.np');
  console.log('   • Teachers: teacher1@svi.edu.np to teacher8@svi.edu.np');
  console.log('   • Exam Officer: examofficer@svi.edu.np');
  console.log('   • Accountant: accountant@svi.edu.np');
  console.log('   • Students: student1@svi.edu.np to student28@svi.edu.np');
  console.log('   • Parents: parent1@svi.edu.np to parent28@svi.edu.np');
  console.log('\n');
}

// =====================================================
// RUN
// =====================================================

main()
  .catch((e) => {
    console.error('❌ Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
