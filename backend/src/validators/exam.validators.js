const { body } = require('express-validator');

const examRules = [
  body('name').trim().notEmpty().withMessage('Exam name is required'),
  body('examType').isIn(['unit_test', 'midterm', 'final', 'board']).withMessage('Invalid exam type'),
  body('academicYearId').isInt().withMessage('Valid Academic Year ID is required'),
  body('startDate').optional().isISO8601().withMessage('Valid start date required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date required'),
  body('classIds').optional().isArray().withMessage('Class IDs must be an array'),
];

const examSubjectUpdateRules = [
  body('subjects').isArray({ min: 1 }).withMessage('Subjects array is required'),
  body('subjects.*.classSubjectId').isInt().withMessage('Valid class subject ID required'),
  body('subjects.*.fullMarks').optional().isInt({ min: 1 }),
  body('subjects.*.passMarks').optional().isInt({ min: 1 }),
  body('subjects.*.examDate').optional().isISO8601(),
];

const resultSaveRules = [
  body('examSubjectId').isInt().withMessage('Valid exam subject ID is required'),
  body('results').isArray({ min: 1 }).withMessage('Results array is required'),
  body('results.*.studentId').isInt().withMessage('Valid student ID required'),
  body('results.*.marksObtained').isDecimal().withMessage('Marks obtained must be a number'),
  body('results.*.practicalMarks').optional().isDecimal(),
];

module.exports = {
  examRules,
  examSubjectUpdateRules,
  resultSaveRules,
};
