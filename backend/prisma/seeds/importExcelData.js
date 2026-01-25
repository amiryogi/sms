/**
 * Excel Data Importer for NEB Students & Marks
 * 
 * Reads the NEB_Import_Template.xlsx and seeds:
 * - Students with parent data
 * - Program & Subject enrollments
 * - Exam results (marks)
 * 
 * Prerequisites:
 * - Run comprehensiveSeed.js first to create school, classes, subjects, programs
 * - Fill in the Excel template with your data
 * 
 * Usage:
 *   node prisma/seeds/importExcelData.js
 *   node prisma/seeds/importExcelData.js --file=path/to/your/file.xlsx
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// =====================================================
// CONFIGURATION
// =====================================================

const ACADEMIC_YEAR_START = new Date('2025-04-01');
const DEFAULT_PASSWORD = 'password123';
const SCHOOL_CODE = 'DEMO001';

// Subject name mapping for marks columns
const SUBJECT_COLUMN_MAP = {
  // Science subjects
  'CompNepali': 'Compulsory Nepali',
  'CompEnglish': 'Compulsory English',
  'Physics': 'Physics',
  'Chemistry': 'Chemistry',
  'Mathematics': 'Mathematics',
  'ComputerScience': 'Computer Science',
  'Biology': 'Biology',
  // Management subjects
  'Accounting': 'Accounting',
  'Economics': 'Economics',
  'BusinessStudies': 'Business Studies',
  'HotelManagement': 'Hotel Management',
  'SocialStudies': 'Social Studies & Life Skills',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function parseExcelDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // Excel serial date
    return new Date((value - 25569) * 86400 * 1000);
  }
  // Try parsing as string
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function generateEmail(firstName, lastName, domain = 'svi.edu.np') {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+977')) return cleaned;
  if (cleaned.startsWith('977')) return `+${cleaned}`;
  if (cleaned.startsWith('98') || cleaned.startsWith('97')) return `+977-${cleaned}`;
  return cleaned;
}

// =====================================================
// READ EXCEL FILE
// =====================================================

function readExcelFile(filePath) {
  console.log(`📖 Reading Excel file: ${filePath}\n`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheets = {};

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // Convert to JSON, skip row 2 (instruction row)
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length < 2) {
      sheets[sheetName] = [];
      continue;
    }

    const headers = rawData[0];
    // Skip row 1 (headers) and row 2 (instructions), start from row 3
    const dataRows = rawData.slice(2).filter(row => row.some(cell => cell !== undefined && cell !== ''));
    
    sheets[sheetName] = dataRows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    console.log(`   Sheet "${sheetName}": ${sheets[sheetName].length} data rows`);
  }

  return sheets;
}

// =====================================================
// IMPORT STUDENTS
// =====================================================

async function importStudents(sheets, school, academicYear, passwordHash, roles, programs, classes, sections, classSubjects) {
  console.log('\n👨‍🎓 Importing students...');

  const studentSheets = [
    { name: 'Students_11Science', grade: 11, program: 'Science' },
    { name: 'Students_11Management', grade: 11, program: 'Management' },
    { name: 'Students_12Science', grade: 12, program: 'Science' },
    { name: 'Students_12Management', grade: 12, program: 'Management' },
  ];

  let totalStudents = 0;
  let totalParents = 0;

  for (const sheetConfig of studentSheets) {
    const data = sheets[sheetConfig.name];
    if (!data || data.length === 0) {
      console.log(`   ⚠ No data in sheet: ${sheetConfig.name}`);
      continue;
    }

    const classRecord = classes.find(c => c.gradeLevel === sheetConfig.grade);
    const program = programs.find(p => p.name === sheetConfig.program);

    if (!classRecord || !program) {
      console.log(`   ❌ Class or Program not found for ${sheetConfig.name}`);
      continue;
    }

    console.log(`\n   Processing ${sheetConfig.name}...`);

    for (const row of data) {
      if (!row.firstName || !row.lastName || !row.admissionNumber) {
        console.log(`   ⚠ Skipping row with missing required fields`);
        continue;
      }

      const email = row.email || generateEmail(row.firstName, row.lastName);
      const sectionRecord = sections.find(s => s.name === (row.section || 'A'));

      try {
        // Create student user
        const studentUser = await prisma.user.upsert({
          where: { email_schoolId: { email, schoolId: school.id } },
          update: {},
          create: {
            schoolId: school.id,
            email,
            passwordHash,
            firstName: row.firstName,
            lastName: row.lastName,
            phone: normalizePhone(row.phone),
            status: 'active',
          },
        });

        // Assign STUDENT role
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: studentUser.id, roleId: roles.STUDENT.id } },
          update: {},
          create: { userId: studentUser.id, roleId: roles.STUDENT.id },
        });

        // Create student record
        const student = await prisma.student.upsert({
          where: { admissionNumber_schoolId: { admissionNumber: row.admissionNumber, schoolId: school.id } },
          update: {},
          create: {
            userId: studentUser.id,
            schoolId: school.id,
            admissionNumber: row.admissionNumber,
            dateOfBirth: parseExcelDate(row.dateOfBirth) || new Date('2008-01-01'),
            gender: row.gender || 'male',
            address: row.address || 'Kathmandu, Nepal',
            admissionDate: ACADEMIC_YEAR_START,
          },
        });

        // Create student class enrollment
        const studentClass = await prisma.studentClass.upsert({
          where: { studentId_academicYearId: { studentId: student.id, academicYearId: academicYear.id } },
          update: {},
          create: {
            studentId: student.id,
            classId: classRecord.id,
            sectionId: sectionRecord?.id || sections[0].id,
            academicYearId: academicYear.id,
            schoolId: school.id,
            rollNumber: parseInt(row.rollNumber) || 0,
            status: 'active',
          },
        });

        // Assign program
        await prisma.studentProgram.upsert({
          where: { studentClassId: studentClass.id },
          update: {},
          create: {
            studentClassId: studentClass.id,
            programId: program.id,
          },
        });

        // Enroll in subjects based on program
        await enrollStudentInSubjects(studentClass, program, classRecord, row, classSubjects);

        totalStudents++;

        // Create parent if data provided
        if (row.parentFirstName && row.parentLastName) {
          await createParent(row, student, school, passwordHash, roles);
          totalParents++;
        }

      } catch (error) {
        console.log(`   ❌ Error importing ${row.admissionNumber}: ${error.message}`);
      }
    }
  }

  console.log(`\n   ✓ Imported ${totalStudents} students`);
  console.log(`   ✓ Created ${totalParents} parents`);
}

// =====================================================
// ENROLL STUDENT IN SUBJECTS
// =====================================================

async function enrollStudentInSubjects(studentClass, program, classRecord, row, classSubjects) {
  // Get program subjects for this class
  const programSubjects = await prisma.programSubject.findMany({
    where: { programId: program.id },
    include: { 
      classSubject: { 
        include: { subject: true } 
      } 
    },
  });

  const gradeSubjects = programSubjects.filter(ps => ps.classSubject.classId === classRecord.id);

  for (const ps of gradeSubjects) {
    const subjectName = ps.classSubject.subject.name;
    let shouldEnroll = false;

    if (program.name === 'Science') {
      // Science compulsory: Comp Nepali, Comp English, Physics, Chemistry, Mathematics
      const scienceCompulsory = ['Compulsory Nepali', 'Compulsory English', 'Physics', 'Chemistry', 'Mathematics'];
      if (scienceCompulsory.includes(subjectName)) {
        shouldEnroll = true;
      }
      // Optional: Computer Science OR Biology
      if (subjectName === 'Computer Science' && row.optionalSubject === 'Computer Science') {
        shouldEnroll = true;
      }
      if (subjectName === 'Biology' && row.optionalSubject === 'Biology') {
        shouldEnroll = true;
      }
    } else if (program.name === 'Management') {
      // Management compulsory: Comp Nepali, Comp English, Accounting, Economics
      const managementCompulsory = ['Compulsory Nepali', 'Compulsory English', 'Accounting', 'Economics'];
      if (managementCompulsory.includes(subjectName)) {
        shouldEnroll = true;
      }
      // Optional Group 1: Computer Science OR Business Studies OR Hotel Management
      const optGroup1 = ['Computer Science', 'Business Studies', 'Hotel Management'];
      if (optGroup1.includes(subjectName) && row.optionalSubject1 === subjectName) {
        shouldEnroll = true;
      }
      // Optional Group 2: Social Studies OR Mathematics
      const optGroup2 = ['Social Studies & Life Skills', 'Mathematics'];
      if (subjectName === 'Social Studies & Life Skills' && row.optionalSubject2 === 'Social Studies') {
        shouldEnroll = true;
      }
      if (subjectName === 'Mathematics' && row.optionalSubject2 === 'Mathematics') {
        shouldEnroll = true;
      }
    }

    if (shouldEnroll) {
      await prisma.studentSubject.upsert({
        where: { studentClassId_classSubjectId: { studentClassId: studentClass.id, classSubjectId: ps.classSubjectId } },
        update: {},
        create: { studentClassId: studentClass.id, classSubjectId: ps.classSubjectId, status: 'ACTIVE' },
      });
    }
  }
}

// =====================================================
// CREATE PARENT
// =====================================================

async function createParent(row, student, school, passwordHash, roles) {
  const email = generateEmail(row.parentFirstName, row.parentLastName, 'parent.svi.edu.np');

  const parentUser = await prisma.user.upsert({
    where: { email_schoolId: { email, schoolId: school.id } },
    update: {},
    create: {
      schoolId: school.id,
      email,
      passwordHash,
      firstName: row.parentFirstName,
      lastName: row.parentLastName,
      phone: normalizePhone(row.parentPhone),
      status: 'active',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: parentUser.id, roleId: roles.PARENT.id } },
    update: {},
    create: { userId: parentUser.id, roleId: roles.PARENT.id },
  });

  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      schoolId: school.id,
      occupation: row.parentOccupation || 'Business',
      address: row.address || 'Kathmandu, Nepal',
    },
  });

  await prisma.studentParent.upsert({
    where: { studentId_parentId: { studentId: student.id, parentId: parent.id } },
    update: {},
    create: {
      studentId: student.id,
      parentId: parent.id,
      schoolId: school.id,
      relationship: 'father',
      isPrimary: true,
    },
  });
}

// =====================================================
// IMPORT MARKS
// =====================================================

async function importMarks(sheets, school, academicYear, classes) {
  console.log('\n📝 Importing marks...');

  const marksSheets = [
    { name: 'Marks_11Science_SecondTerminal', grade: 11, program: 'Science' },
    { name: 'Marks_11Mgmt_SecondTerminal', grade: 11, program: 'Management' },
    { name: 'Marks_12Science_SecondTerminal', grade: 12, program: 'Science' },
    { name: 'Marks_12Mgmt_SecondTerminal', grade: 12, program: 'Management' },
  ];

  const examName = 'Second Terminal Examination';

  // Create or get exam
  const classRecord11 = classes.find(c => c.gradeLevel === 11);
  const classRecord12 = classes.find(c => c.gradeLevel === 12);

  let totalMarks = 0;

  for (const sheetConfig of marksSheets) {
    const data = sheets[sheetConfig.name];
    if (!data || data.length === 0) {
      console.log(`   ⚠ No data in sheet: ${sheetConfig.name}`);
      continue;
    }

    const classRecord = sheetConfig.grade === 11 ? classRecord11 : classRecord12;
    console.log(`\n   Processing ${sheetConfig.name}...`);

    // Get or create exam for this class
    let exam = await prisma.exam.findFirst({
      where: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: classRecord.id,
        name: examName,
      },
    });

    if (!exam) {
      exam = await prisma.exam.create({
        data: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: classRecord.id,
          name: examName,
          examType: 'TERMINAL',
          startDate: new Date('2025-10-01'),
          endDate: new Date('2025-10-15'),
          status: 'PUBLISHED',
        },
      });
      console.log(`   ✓ Created exam: ${examName} for Grade ${sheetConfig.grade}`);
    }

    // Get class subjects for this class
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: classRecord.id, academicYearId: academicYear.id },
      include: { subject: true },
    });

    for (const row of data) {
      if (!row.admissionNumber) continue;

      // Find student
      const student = await prisma.student.findFirst({
        where: { admissionNumber: row.admissionNumber, schoolId: school.id },
      });

      if (!student) {
        console.log(`   ⚠ Student not found: ${row.admissionNumber}`);
        continue;
      }

      // Get student class
      const studentClass = await prisma.studentClass.findFirst({
        where: { studentId: student.id, academicYearId: academicYear.id },
      });

      if (!studentClass) continue;

      // Process each subject column
      for (const [colPrefix, subjectName] of Object.entries(SUBJECT_COLUMN_MAP)) {
        const theoryCol = `${colPrefix}_TH`;
        const practicalCol = `${colPrefix}_PR`;

        const theoryMarks = row[theoryCol];
        const practicalMarks = row[practicalCol];

        // Skip if no marks entered
        if ((theoryMarks === undefined || theoryMarks === '') && 
            (practicalMarks === undefined || practicalMarks === '')) {
          continue;
        }

        // Find class subject
        const classSubject = classSubjects.find(cs => cs.subject.name === subjectName);
        if (!classSubject) continue;

        // Check if student is enrolled in this subject
        const studentSubject = await prisma.studentSubject.findFirst({
          where: { studentClassId: studentClass.id, classSubjectId: classSubject.id },
        });

        if (!studentSubject) continue;

        // Create or get exam subject
        let examSubject = await prisma.examSubject.findFirst({
          where: { examId: exam.id, classSubjectId: classSubject.id },
        });

        if (!examSubject) {
          examSubject = await prisma.examSubject.create({
            data: {
              examId: exam.id,
              classSubjectId: classSubject.id,
              examDate: new Date('2025-10-01'),
            },
          });
        }

        // Create exam result
        await prisma.examResult.upsert({
          where: {
            examSubjectId_studentId: {
              examSubjectId: examSubject.id,
              studentId: student.id,
            },
          },
          update: {
            theoryMarks: theoryMarks !== '' ? parseFloat(theoryMarks) : null,
            practicalMarks: practicalMarks !== '' ? parseFloat(practicalMarks) : null,
          },
          create: {
            examSubjectId: examSubject.id,
            studentId: student.id,
            theoryMarks: theoryMarks !== '' ? parseFloat(theoryMarks) : null,
            practicalMarks: practicalMarks !== '' ? parseFloat(practicalMarks) : null,
          },
        });

        totalMarks++;
      }
    }
  }

  console.log(`\n   ✓ Imported ${totalMarks} marks entries`);
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log('🌱 Starting Excel Data Import...\n');

  // Get file path from args or use default
  let filePath = path.join(__dirname, 'data', 'NEB_Import_Template.xlsx');
  const fileArg = process.argv.find(arg => arg.startsWith('--file='));
  if (fileArg) {
    filePath = fileArg.split('=')[1];
  }

  // Read Excel file
  const sheets = readExcelFile(filePath);

  // Get school
  const school = await prisma.school.findUnique({ where: { code: SCHOOL_CODE } });
  if (!school) {
    throw new Error(`School not found: ${SCHOOL_CODE}. Run comprehensiveSeed.js first.`);
  }

  // Get academic year
  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
  });
  if (!academicYear) {
    throw new Error('No current academic year found. Run comprehensiveSeed.js first.');
  }

  // Get roles
  const roleRecords = await prisma.role.findMany();
  const roles = {};
  roleRecords.forEach(r => { roles[r.name] = r; });

  // Get programs
  const programs = await prisma.program.findMany({
    where: { schoolId: school.id, academicYearId: academicYear.id },
  });

  // Get classes
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
  });

  // Get sections
  const sections = await prisma.section.findMany({
    where: { schoolId: school.id },
  });

  // Get class subjects
  const classSubjects = await prisma.classSubject.findMany({
    where: { academicYearId: academicYear.id },
    include: { subject: true },
  });

  // Generate password hash
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Import students
  await importStudents(sheets, school, academicYear, passwordHash, roles, programs, classes, sections, classSubjects);

  // Import marks
  await importMarks(sheets, school, academicYear, classes);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Excel Data Import Completed!');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// =====================================================
// RUN
// =====================================================

main()
  .catch((e) => {
    console.error('❌ Import Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
