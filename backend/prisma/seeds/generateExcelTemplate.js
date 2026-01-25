/**
 * Excel Template Generator for NEB Student & Marks Data
 * 
 * Generates an Excel file with 8 sheets:
 * - 4 Student data sheets (11Science, 11Management, 12Science, 12Management)
 * - 4 Marks entry sheets for Second Terminal Examination
 * 
 * Usage:
 *   npm install xlsx  (if not installed)
 *   node prisma/seeds/generateExcelTemplate.js
 * 
 * Output: backend/prisma/seeds/data/NEB_Import_Template.xlsx
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// =====================================================
// COLUMN DEFINITIONS
// =====================================================

// Student columns for Science program (11 & 12)
const scienceStudentColumns = [
  'firstName',
  'lastName', 
  'email',
  'phone',
  'admissionNumber',
  'dateOfBirth',
  'gender',
  'address',
  'section',
  'rollNumber',
  'optionalSubject',  // Computer Science OR Biology
  'parentFirstName',
  'parentLastName',
  'parentPhone',
  'parentOccupation',
];

// Student columns for Management program (11 & 12)
const managementStudentColumns = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'admissionNumber',
  'dateOfBirth',
  'gender',
  'address',
  'section',
  'rollNumber',
  'optionalSubject1',  // Computer Science OR Business Studies OR Hotel Management
  'optionalSubject2',  // Social Studies OR Mathematics
  'parentFirstName',
  'parentLastName',
  'parentPhone',
  'parentOccupation',
];

// Marks columns for Science (11 & 12)
const scienceMarksColumns = [
  'admissionNumber',
  'rollNumber',
  'studentName',
  // Compulsory subjects
  'CompNepali_TH',      // 75
  'CompNepali_PR',      // 25
  'CompEnglish_TH',     // 75
  'CompEnglish_PR',     // 25
  'Physics_TH',         // 75
  'Physics_PR',         // 25
  'Chemistry_TH',       // 75
  'Chemistry_PR',       // 25
  'Mathematics_TH',     // 75
  'Mathematics_PR',     // 25
  // Optional (pick 1)
  'ComputerScience_TH', // 50 (optional)
  'ComputerScience_PR', // 50 (optional)
  'Biology_TH',         // 75 (optional)
  'Biology_PR',         // 25 (optional)
];

// Marks columns for Management (11 & 12)
const managementMarksColumns = [
  'admissionNumber',
  'rollNumber',
  'studentName',
  // Compulsory subjects
  'CompNepali_TH',       // 75
  'CompNepali_PR',       // 25
  'CompEnglish_TH',      // 75
  'CompEnglish_PR',      // 25
  'Accounting_TH',       // 75
  'Accounting_PR',       // 25
  'Economics_TH',        // 75
  'Economics_PR',        // 25
  // Optional Group 1 (pick 1 of 3)
  'ComputerScience_TH',  // 50 (optional)
  'ComputerScience_PR',  // 50 (optional)
  'BusinessStudies_TH',  // 75 (optional)
  'BusinessStudies_PR',  // 25 (optional)
  'HotelManagement_TH',  // 50 (optional)
  'HotelManagement_PR',  // 50 (optional)
  // Optional Group 2 (pick 1 of 2)
  'SocialStudies_TH',    // 75 (optional)
  'SocialStudies_PR',    // 25 (optional)
  'Mathematics_TH',      // 75 (optional)
  'Mathematics_PR',      // 25 (optional)
];

// =====================================================
// HELPER: Create instruction row with validation info
// =====================================================

function createStudentInstructionRow(isScience) {
  if (isScience) {
    return {
      firstName: 'Required',
      lastName: 'Required',
      email: 'Optional (auto-generated)',
      phone: 'Optional (+977-98XXXXXXXX)',
      admissionNumber: 'Required (STU20260001)',
      dateOfBirth: 'Required (YYYY-MM-DD)',
      gender: 'Required (male/female)',
      address: 'Optional (default: Kathmandu)',
      section: 'Required (A/B)',
      rollNumber: 'Required (number)',
      optionalSubject: 'Required: Computer Science OR Biology',
      parentFirstName: 'Required',
      parentLastName: 'Required',
      parentPhone: 'Required',
      parentOccupation: 'Optional',
    };
  } else {
    return {
      firstName: 'Required',
      lastName: 'Required',
      email: 'Optional (auto-generated)',
      phone: 'Optional (+977-98XXXXXXXX)',
      admissionNumber: 'Required (STU20260001)',
      dateOfBirth: 'Required (YYYY-MM-DD)',
      gender: 'Required (male/female)',
      address: 'Optional (default: Kathmandu)',
      section: 'Required (A/B)',
      rollNumber: 'Required (number)',
      optionalSubject1: 'Required: Computer Science OR Business Studies OR Hotel Management',
      optionalSubject2: 'Required: Social Studies OR Mathematics',
      parentFirstName: 'Required',
      parentLastName: 'Required',
      parentPhone: 'Required',
      parentOccupation: 'Optional',
    };
  }
}

function createMarksInstructionRow(isScience) {
  if (isScience) {
    return {
      admissionNumber: 'Required (links to student)',
      rollNumber: 'For reference',
      studentName: 'Display only (not imported)',
      CompNepali_TH: 'Max: 75',
      CompNepali_PR: 'Max: 25',
      CompEnglish_TH: 'Max: 75',
      CompEnglish_PR: 'Max: 25',
      Physics_TH: 'Max: 75',
      Physics_PR: 'Max: 25',
      Chemistry_TH: 'Max: 75',
      Chemistry_PR: 'Max: 25',
      Mathematics_TH: 'Max: 75',
      Mathematics_PR: 'Max: 25',
      ComputerScience_TH: 'Optional - Max: 50',
      ComputerScience_PR: 'Optional - Max: 50',
      Biology_TH: 'Optional - Max: 75',
      Biology_PR: 'Optional - Max: 25',
    };
  } else {
    return {
      admissionNumber: 'Required (links to student)',
      rollNumber: 'For reference',
      studentName: 'Display only (not imported)',
      CompNepali_TH: 'Max: 75',
      CompNepali_PR: 'Max: 25',
      CompEnglish_TH: 'Max: 75',
      CompEnglish_PR: 'Max: 25',
      Accounting_TH: 'Max: 75',
      Accounting_PR: 'Max: 25',
      Economics_TH: 'Max: 75',
      Economics_PR: 'Max: 25',
      ComputerScience_TH: 'OptGroup1 - Max: 50',
      ComputerScience_PR: 'OptGroup1 - Max: 50',
      BusinessStudies_TH: 'OptGroup1 - Max: 75',
      BusinessStudies_PR: 'OptGroup1 - Max: 25',
      HotelManagement_TH: 'OptGroup1 - Max: 50',
      HotelManagement_PR: 'OptGroup1 - Max: 50',
      SocialStudies_TH: 'OptGroup2 - Max: 75',
      SocialStudies_PR: 'OptGroup2 - Max: 25',
      Mathematics_TH: 'OptGroup2 - Max: 75',
      Mathematics_PR: 'OptGroup2 - Max: 25',
    };
  }
}

// =====================================================
// SAMPLE DATA ROWS
// =====================================================

function createScienceStudentSample(grade) {
  return [
    {
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: '',
      phone: '+977-9812345678',
      admissionNumber: `STU2026${grade}001`,
      dateOfBirth: '2008-05-15',
      gender: 'male',
      address: 'Kathmandu, Nepal',
      section: 'A',
      rollNumber: 1,
      optionalSubject: 'Computer Science',
      parentFirstName: 'Ram',
      parentLastName: 'Sharma',
      parentPhone: '+977-9845678901',
      parentOccupation: 'Business',
    },
    {
      firstName: 'Binita',
      lastName: 'Poudel',
      email: '',
      phone: '+977-9823456789',
      admissionNumber: `STU2026${grade}002`,
      dateOfBirth: '2008-08-22',
      gender: 'female',
      address: 'Lalitpur, Nepal',
      section: 'A',
      rollNumber: 2,
      optionalSubject: 'Biology',
      parentFirstName: 'Krishna',
      parentLastName: 'Poudel',
      parentPhone: '+977-9856789012',
      parentOccupation: 'Teacher',
    },
  ];
}

function createManagementStudentSample(grade) {
  return [
    {
      firstName: 'Dipesh',
      lastName: 'Thapa',
      email: '',
      phone: '+977-9834567890',
      admissionNumber: `STU2026${grade}003`,
      dateOfBirth: '2008-03-10',
      gender: 'male',
      address: 'Bhaktapur, Nepal',
      section: 'A',
      rollNumber: 1,
      optionalSubject1: 'Computer Science',
      optionalSubject2: 'Mathematics',
      parentFirstName: 'Hari',
      parentLastName: 'Thapa',
      parentPhone: '+977-9867890123',
      parentOccupation: 'Engineer',
    },
    {
      firstName: 'Gita',
      lastName: 'Adhikari',
      email: '',
      phone: '+977-9845678901',
      admissionNumber: `STU2026${grade}004`,
      dateOfBirth: '2008-11-28',
      gender: 'female',
      address: 'Kathmandu, Nepal',
      section: 'A',
      rollNumber: 2,
      optionalSubject1: 'Business Studies',
      optionalSubject2: 'Social Studies',
      parentFirstName: 'Bishnu',
      parentLastName: 'Adhikari',
      parentPhone: '+977-9878901234',
      parentOccupation: 'Doctor',
    },
  ];
}

function createScienceMarksSample() {
  return [
    {
      admissionNumber: 'STU202611001',
      rollNumber: 1,
      studentName: 'Aarav Sharma',
      CompNepali_TH: 65,
      CompNepali_PR: 22,
      CompEnglish_TH: 70,
      CompEnglish_PR: 23,
      Physics_TH: 68,
      Physics_PR: 22,
      Chemistry_TH: 72,
      Chemistry_PR: 24,
      Mathematics_TH: 74,
      Mathematics_PR: 23,
      ComputerScience_TH: 45,
      ComputerScience_PR: 48,
      Biology_TH: '',
      Biology_PR: '',
    },
    {
      admissionNumber: 'STU202611002',
      rollNumber: 2,
      studentName: 'Binita Poudel',
      CompNepali_TH: 70,
      CompNepali_PR: 24,
      CompEnglish_TH: 72,
      CompEnglish_PR: 24,
      Physics_TH: 65,
      Physics_PR: 21,
      Chemistry_TH: 68,
      Chemistry_PR: 23,
      Mathematics_TH: 70,
      Mathematics_PR: 22,
      ComputerScience_TH: '',
      ComputerScience_PR: '',
      Biology_TH: 71,
      Biology_PR: 24,
    },
  ];
}

function createManagementMarksSample() {
  return [
    {
      admissionNumber: 'STU202611003',
      rollNumber: 1,
      studentName: 'Dipesh Thapa',
      CompNepali_TH: 68,
      CompNepali_PR: 23,
      CompEnglish_TH: 71,
      CompEnglish_PR: 24,
      Accounting_TH: 72,
      Accounting_PR: 24,
      Economics_TH: 70,
      Economics_PR: 23,
      ComputerScience_TH: 46,
      ComputerScience_PR: 47,
      BusinessStudies_TH: '',
      BusinessStudies_PR: '',
      HotelManagement_TH: '',
      HotelManagement_PR: '',
      SocialStudies_TH: '',
      SocialStudies_PR: '',
      Mathematics_TH: 73,
      Mathematics_PR: 24,
    },
    {
      admissionNumber: 'STU202611004',
      rollNumber: 2,
      studentName: 'Gita Adhikari',
      CompNepali_TH: 72,
      CompNepali_PR: 24,
      CompEnglish_TH: 74,
      CompEnglish_PR: 25,
      Accounting_TH: 68,
      Accounting_PR: 22,
      Economics_TH: 71,
      Economics_PR: 23,
      ComputerScience_TH: '',
      ComputerScience_PR: '',
      BusinessStudies_TH: 70,
      BusinessStudies_PR: 23,
      HotelManagement_TH: '',
      HotelManagement_PR: '',
      SocialStudies_TH: 69,
      SocialStudies_PR: 22,
      Mathematics_TH: '',
      Mathematics_PR: '',
    },
  ];
}

// =====================================================
// MAIN: Generate Excel File
// =====================================================

function generateTemplate() {
  console.log('📊 Generating NEB Excel Template...\n');

  const workbook = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: Students_11Science
  // ==========================================
  console.log('   Creating sheet: Students_11Science');
  const sheet1Data = [
    scienceStudentColumns,
    Object.values(createStudentInstructionRow(true)),
    ...createScienceStudentSample(11).map(row => scienceStudentColumns.map(col => row[col] ?? '')),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = scienceStudentColumns.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(workbook, ws1, 'Students_11Science');

  // ==========================================
  // SHEET 2: Students_11Management
  // ==========================================
  console.log('   Creating sheet: Students_11Management');
  const sheet2Data = [
    managementStudentColumns,
    Object.values(createStudentInstructionRow(false)),
    ...createManagementStudentSample(11).map(row => managementStudentColumns.map(col => row[col] ?? '')),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = managementStudentColumns.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(workbook, ws2, 'Students_11Management');

  // ==========================================
  // SHEET 3: Students_12Science
  // ==========================================
  console.log('   Creating sheet: Students_12Science');
  const sheet3Data = [
    scienceStudentColumns,
    Object.values(createStudentInstructionRow(true)),
    ...createScienceStudentSample(12).map(row => scienceStudentColumns.map(col => row[col] ?? '')),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = scienceStudentColumns.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(workbook, ws3, 'Students_12Science');

  // ==========================================
  // SHEET 4: Students_12Management
  // ==========================================
  console.log('   Creating sheet: Students_12Management');
  const sheet4Data = [
    managementStudentColumns,
    Object.values(createStudentInstructionRow(false)),
    ...createManagementStudentSample(12).map(row => managementStudentColumns.map(col => row[col] ?? '')),
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Data);
  ws4['!cols'] = managementStudentColumns.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(workbook, ws4, 'Students_12Management');

  // ==========================================
  // SHEET 5: Marks_11Science_SecondTerminal
  // ==========================================
  console.log('   Creating sheet: Marks_11Science_SecondTerminal');
  const sheet5Data = [
    scienceMarksColumns,
    Object.values(createMarksInstructionRow(true)),
    ...createScienceMarksSample().map(row => scienceMarksColumns.map(col => row[col] ?? '')),
  ];
  const ws5 = XLSX.utils.aoa_to_sheet(sheet5Data);
  ws5['!cols'] = scienceMarksColumns.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(workbook, ws5, 'Marks_11Science_SecondTerminal');

  // ==========================================
  // SHEET 6: Marks_11Management_SecondTerminal
  // ==========================================
  console.log('   Creating sheet: Marks_11Management_SecondTerminal');
  const sheet6Data = [
    managementMarksColumns,
    Object.values(createMarksInstructionRow(false)),
    ...createManagementMarksSample().map(row => managementMarksColumns.map(col => row[col] ?? '')),
  ];
  const ws6 = XLSX.utils.aoa_to_sheet(sheet6Data);
  ws6['!cols'] = managementMarksColumns.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(workbook, ws6, 'Marks_11Mgmt_SecondTerminal');

  // ==========================================
  // SHEET 7: Marks_12Science_SecondTerminal
  // ==========================================
  console.log('   Creating sheet: Marks_12Science_SecondTerminal');
  const sheet7Data = [
    scienceMarksColumns,
    Object.values(createMarksInstructionRow(true)),
    // Empty rows for Grade 12 - users will fill in their data
  ];
  const ws7 = XLSX.utils.aoa_to_sheet(sheet7Data);
  ws7['!cols'] = scienceMarksColumns.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(workbook, ws7, 'Marks_12Science_SecondTerminal');

  // ==========================================
  // SHEET 8: Marks_12Management_SecondTerminal
  // ==========================================
  console.log('   Creating sheet: Marks_12Management_SecondTerminal');
  const sheet8Data = [
    managementMarksColumns,
    Object.values(createMarksInstructionRow(false)),
    // Empty rows for Grade 12 - users will fill in their data
  ];
  const ws8 = XLSX.utils.aoa_to_sheet(sheet8Data);
  ws8['!cols'] = managementMarksColumns.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(workbook, ws8, 'Marks_12Mgmt_SecondTerminal');

  // ==========================================
  // Write file
  // ==========================================
  const outputDir = path.join(__dirname, 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'NEB_Import_Template.xlsx');
  XLSX.writeFile(workbook, outputPath);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Excel Template Generated Successfully!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n📁 Output: ${outputPath}`);
  console.log('\n📋 Sheets created:');
  console.log('   1. Students_11Science         - Student data for Grade 11 Science');
  console.log('   2. Students_11Management      - Student data for Grade 11 Management');
  console.log('   3. Students_12Science         - Student data for Grade 12 Science');
  console.log('   4. Students_12Management      - Student data for Grade 12 Management');
  console.log('   5. Marks_11Science_SecondTerminal   - Marks for Grade 11 Science');
  console.log('   6. Marks_11Mgmt_SecondTerminal      - Marks for Grade 11 Management');
  console.log('   7. Marks_12Science_SecondTerminal   - Marks for Grade 12 Science');
  console.log('   8. Marks_12Mgmt_SecondTerminal      - Marks for Grade 12 Management');
  console.log('\n📝 Instructions:');
  console.log('   - Row 1: Column headers');
  console.log('   - Row 2: Validation hints (delete before import)');
  console.log('   - Row 3+: Sample data (replace with your data)');
  console.log('\n');
}

// =====================================================
// RUN
// =====================================================

generateTemplate();
