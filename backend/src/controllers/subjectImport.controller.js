const XLSX = require('xlsx');
const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');
const { createSubjectAudit } = require('../utils/subjectAudit');

/**
 * @desc    Import Grade 11-12 subjects from Excel file
 * @route   POST /api/v1/subjects/import
 * @access  Private/Admin
 * 
 * Expected Excel columns:
 * - Grade (11 or 12)
 * - Subject Name
 * - Subject Code
 * - Component (Theory / Practical / Both)
 * - Credit Hour
 * - Full Marks (theory full marks if component is Theory)
 * - Pass Marks
 * - Practical Marks (optional, only if hasPractical)
 */
const importSubjects = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded. Please upload an Excel file.');
  }

  // Parse Excel file from buffer
  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) {
    throw ApiError.badRequest('Excel file is empty or has no data rows.');
  }

  const errors = [];
  const validSubjects = [];
  const existingCodes = new Set();

  // Fetch existing subject codes for this school
  const existingSubjects = await prisma.subject.findMany({
    where: { schoolId: req.user.schoolId },
    select: { code: true, id: true },
  });
  existingSubjects.forEach(s => existingCodes.add(s.code.toLowerCase()));

  // Fetch classes for Grade 11/12
  const classes = await prisma.class.findMany({
    where: { 
      schoolId: req.user.schoolId,
      gradeLevel: { in: [11, 12] }
    },
    select: { id: true, gradeLevel: true, name: true },
  });
  const classMap = {};
  classes.forEach(c => {
    if (!classMap[c.gradeLevel]) classMap[c.gradeLevel] = c;
  });

  // Get current academic year
  const currentYear = await prisma.academicYear.findFirst({
    where: { schoolId: req.user.schoolId, isCurrent: true },
  });

  if (!currentYear) {
    throw ApiError.badRequest('No current academic year set. Please configure academic year first.');
  }

  // Validate each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel row number (1-indexed + header)
    const rowErrors = [];

    // Extract and normalize values
    const grade = parseInt(row['Grade'] || row['grade'] || 0);
    const subjectName = String(row['Subject Name'] || row['subject_name'] || row['SubjectName'] || '').trim();
    const subjectCode = String(row['Subject Code'] || row['subject_code'] || row['SubjectCode'] || '').trim().toUpperCase();
    const component = String(row['Component'] || row['component'] || 'Both').trim().toLowerCase();
    const creditHour = parseFloat(row['Credit Hour'] || row['credit_hour'] || row['CreditHour'] || 3);
    const fullMarks = parseInt(row['Full Marks'] || row['full_marks'] || row['FullMarks'] || 100);
    const passMarks = parseInt(row['Pass Marks'] || row['pass_marks'] || row['PassMarks'] || 40);
    const practicalMarks = parseInt(row['Practical Marks'] || row['practical_marks'] || row['PracticalMarks'] || 0);

    // Validation
    if (!grade || (grade !== 11 && grade !== 12)) {
      rowErrors.push('Grade must be 11 or 12');
    }
    if (!subjectName) {
      rowErrors.push('Subject Name is required');
    }
    if (!subjectCode) {
      rowErrors.push('Subject Code is required');
    }
    if (existingCodes.has(subjectCode.toLowerCase())) {
      rowErrors.push(`Subject code "${subjectCode}" already exists`);
    }
    if (fullMarks <= 0) {
      rowErrors.push('Full Marks must be positive');
    }
    if (passMarks < 0 || passMarks > fullMarks + practicalMarks) {
      rowErrors.push('Pass Marks invalid');
    }
    if (!classMap[grade]) {
      rowErrors.push(`No Grade ${grade} class found in system`);
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, subjectCode, subjectName, errors: rowErrors });
    } else {
      // Determine theory/practical flags
      const hasTheory = component !== 'practical';
      const hasPractical = component === 'practical' || component === 'both' || practicalMarks > 0;
      
      validSubjects.push({
        grade,
        subjectName,
        subjectCode,
        creditHour,
        fullMarks: hasTheory ? fullMarks : 0,
        passMarks,
        practicalMarks: hasPractical ? practicalMarks : 0,
        hasTheory,
        hasPractical,
        classId: classMap[grade].id,
      });

      // Track to prevent duplicates within file
      existingCodes.add(subjectCode.toLowerCase());
    }
  }

  // If all rows have errors, return without any inserts
  if (validSubjects.length === 0) {
    return ApiResponse.success(res, {
      imported: 0,
      errors,
    }, 'No valid subjects to import');
  }

  // Transaction: Create subjects and class subjects
  let importedCount = 0;
  await prisma.$transaction(async (tx) => {
    for (const sub of validSubjects) {
      // Create Subject
      const subject = await tx.subject.create({
        data: {
          schoolId: req.user.schoolId,
          name: sub.subjectName,
          code: sub.subjectCode,
          creditHours: sub.creditHour,
          hasPractical: sub.hasPractical,
        },
      });

      // Create ClassSubject linking to current academic year
      const classSubject = await tx.classSubject.create({
        data: {
          classId: sub.classId,
          academicYearId: currentYear.id,
          subjectId: subject.id,
          hasTheory: sub.hasTheory,
          hasPractical: sub.hasPractical,
          theoryMarks: sub.fullMarks,
          practicalMarks: sub.practicalMarks,
          fullMarks: sub.fullMarks + sub.practicalMarks,
          passMarks: sub.passMarks,
          creditHours: sub.creditHour,
        },
      });

      // Audit
      await createSubjectAudit({
        classSubjectId: classSubject.id,
        subjectId: subject.id,
        action: 'CREATE',
        newValue: { subject, classSubject },
        userId: req.user.id,
      });

      importedCount++;
    }
  });

  ApiResponse.success(res, {
    imported: importedCount,
    total: rows.length,
    errors,
  }, `Successfully imported ${importedCount} subjects`);
});

/**
 * @desc    Preview Excel import (dry run)
 * @route   POST /api/v1/subjects/import/preview
 * @access  Private/Admin
 */
const previewImport = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded. Please upload an Excel file.');
  }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) {
    throw ApiError.badRequest('Excel file is empty.');
  }

  // Fetch existing codes
  const existingSubjects = await prisma.subject.findMany({
    where: { schoolId: req.user.schoolId },
    select: { code: true },
  });
  const existingCodes = new Set(existingSubjects.map(s => s.code.toLowerCase()));

  const preview = [];
  const seenCodes = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const errors = [];

    const grade = parseInt(row['Grade'] || row['grade'] || 0);
    const subjectName = String(row['Subject Name'] || row['subject_name'] || row['SubjectName'] || '').trim();
    const subjectCode = String(row['Subject Code'] || row['subject_code'] || row['SubjectCode'] || '').trim().toUpperCase();
    const component = String(row['Component'] || row['component'] || 'Both').trim();
    const creditHour = parseFloat(row['Credit Hour'] || row['credit_hour'] || row['CreditHour'] || 3);
    const fullMarks = parseInt(row['Full Marks'] || row['full_marks'] || row['FullMarks'] || 100);

    if (!grade || (grade !== 11 && grade !== 12)) errors.push('Invalid grade');
    if (!subjectName) errors.push('Missing name');
    if (!subjectCode) errors.push('Missing code');
    if (existingCodes.has(subjectCode.toLowerCase())) errors.push('Duplicate in DB');
    if (seenCodes.has(subjectCode.toLowerCase())) errors.push('Duplicate in file');

    seenCodes.add(subjectCode.toLowerCase());

    preview.push({
      row: rowNum,
      grade,
      subjectName,
      subjectCode,
      component,
      creditHour,
      fullMarks,
      valid: errors.length === 0,
      errors,
    });
  }

  const validCount = preview.filter(p => p.valid).length;

  ApiResponse.success(res, {
    total: rows.length,
    valid: validCount,
    invalid: rows.length - validCount,
    preview: preview.slice(0, 50), // Limit preview to 50 rows
  });
});

module.exports = {
  importSubjects,
  previewImport,
};
