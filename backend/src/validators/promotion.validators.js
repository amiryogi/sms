const { body, query } = require('express-validator');

/**
 * Validation rules for processing a single promotion
 */
const processPromotionRules = [
  body('studentId').isInt({ min: 1 }).withMessage('Valid student ID is required'),
  body('fromClassId').isInt({ min: 1 }).withMessage('Valid from class ID is required'),
  body('fromAcademicYearId').isInt({ min: 1 }).withMessage('Valid from academic year ID is required'),
  body('toAcademicYearId').isInt({ min: 1 }).withMessage('Valid to academic year ID is required'),
  body('status')
    .isIn(['promoted', 'detained', 'graduated'])
    .withMessage('Status must be promoted, detained, or graduated'),
  body('toClassId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Valid to class ID is required for promotion/detention'),
  body('toSectionId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Valid to section ID is required'),
  body('rollNumber')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Roll number must be a positive integer'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks cannot exceed 500 characters'),
];

/**
 * Validation rules for bulk promotion
 */
const bulkPromotionRules = [
  body('fromClassId').isInt({ min: 1 }).withMessage('Valid from class ID is required'),
  body('fromSectionId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Valid from section ID is required'),
  body('fromAcademicYearId').isInt({ min: 1 }).withMessage('Valid from academic year ID is required'),
  body('toClassId').isInt({ min: 1 }).withMessage('Valid to class ID is required'),
  body('toSectionId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Valid to section ID is required'),
  body('toAcademicYearId').isInt({ min: 1 }).withMessage('Valid to academic year ID is required'),
  body('students')
    .isArray({ min: 1 })
    .withMessage('At least one student must be selected'),
  body('students.*.studentId')
    .isInt({ min: 1 })
    .withMessage('Valid student ID is required'),
  body('students.*.status')
    .isIn(['promoted', 'detained', 'graduated'])
    .withMessage('Status must be promoted, detained, or graduated'),
  body('students.*.rollNumber')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Roll number must be a positive integer'),
  body('students.*.remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks cannot exceed 500 characters'),
];

/**
 * Query rules for fetching eligible students
 */
const eligibleStudentsQueryRules = [
  query('classId').isInt({ min: 1 }).withMessage('Valid class ID is required'),
  query('sectionId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid section ID is required'),
  query('academicYearId').isInt({ min: 1 }).withMessage('Valid academic year ID is required'),
];

/**
 * Query rules for promotion history
 */
const promotionHistoryQueryRules = [
  query('studentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid student ID is required'),
  query('fromAcademicYearId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid from academic year ID is required'),
  query('toAcademicYearId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid to academic year ID is required'),
  query('status')
    .optional()
    .isIn(['promoted', 'detained', 'graduated'])
    .withMessage('Status must be promoted, detained, or graduated'),
];

module.exports = {
  processPromotionRules,
  bulkPromotionRules,
  eligibleStudentsQueryRules,
  promotionHistoryQueryRules,
};
