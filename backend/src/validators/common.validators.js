const { body, param, query } = require('express-validator');

/**
 * Common validation rules used across multiple endpoints
 */

// Pagination validation
const paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isString()
    .withMessage('Sort must be a string'),
];

// ID parameter validation
const idParamRule = param('id')
  .isInt({ min: 1 })
  .withMessage('ID must be a valid positive integer');

// User ID validation
const userIdRule = body('userId')
  .isInt({ min: 1 })
  .withMessage('User ID must be a valid positive integer');

// Email validation
const emailRule = body('email')
  .isEmail()
  .withMessage('Please provide a valid email')
  .normalizeEmail();

// Password validation
const passwordRule = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain uppercase, lowercase, and number');

// Name validation
const firstNameRule = body('firstName')
  .trim()
  .notEmpty()
  .withMessage('First name is required')
  .isLength({ max: 100 })
  .withMessage('First name must be less than 100 characters');

const lastNameRule = body('lastName')
  .trim()
  .notEmpty()
  .withMessage('Last name is required')
  .isLength({ max: 100 })
  .withMessage('Last name must be less than 100 characters');

// Phone validation
const phoneRule = body('phone')
  .optional()
  .isMobilePhone()
  .withMessage('Please provide a valid phone number');

// Date validation
const dateRule = (field) =>
  body(field)
    .isISO8601()
    .withMessage(`${field} must be a valid date`);

// Academic year ID validation
const academicYearIdRule = body('academicYearId')
  .isInt({ min: 1 })
  .withMessage('Academic year ID must be a valid positive integer');

// Class ID validation  
const classIdRule = body('classId')
  .isInt({ min: 1 })
  .withMessage('Class ID must be a valid positive integer');

// Section ID validation
const sectionIdRule = body('sectionId')
  .isInt({ min: 1 })
  .withMessage('Section ID must be a valid positive integer');

// Subject ID validation
const subjectIdRule = body('subjectId')
  .isInt({ min: 1 })
  .withMessage('Subject ID must be a valid positive integer');

module.exports = {
  paginationRules,
  idParamRule,
  userIdRule,
  emailRule,
  passwordRule,
  firstNameRule,
  lastNameRule,
  phoneRule,
  dateRule,
  academicYearIdRule,
  classIdRule,
  sectionIdRule,
  subjectIdRule,
};
