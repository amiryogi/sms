const { body, param } = require('express-validator');

// Program CRUD validation rules
const programRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Program name is required')
    .isLength({ max: 100 })
    .withMessage('Program name must be at most 100 characters'),
  body('academicYearId')
    .isInt({ min: 1 })
    .withMessage('Valid Academic Year ID is required'),
  body('description')
    .optional()
    .trim(),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// Program subject assignment rules
const programSubjectsRules = [
  body('classSubjectIds')
    .isArray({ min: 1 })
    .withMessage('classSubjectIds must be a non-empty array'),
  body('classSubjectIds.*')
    .isInt({ min: 1 })
    .withMessage('Each classSubjectId must be a valid integer'),
  body('isCompulsory')
    .optional()
    .isBoolean()
    .withMessage('isCompulsory must be a boolean'),
];

// Student program assignment rules
const studentProgramRules = [
  body('studentClassId')
    .isInt({ min: 1 })
    .withMessage('Valid studentClassId is required'),
];

module.exports = {
  programRules,
  programSubjectsRules,
  studentProgramRules,
};
