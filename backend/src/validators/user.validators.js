const { body, query } = require('express-validator');

/**
 * User validation rules
 */

// Roles an admin may grant through the generic user endpoints. SUPER_ADMIN is
// never grantable by a school admin; STUDENT and PARENT need a profile row and
// are created through POST /students and POST /admin/parents instead.
const ASSIGNABLE_ROLES = ['ADMIN', 'TEACHER', 'EXAM_OFFICER', 'ACCOUNTANT'];

// Every role that can be filtered on when listing users.
const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'EXAM_OFFICER', 'ACCOUNTANT', 'STUDENT', 'PARENT'];

// Create user validation
const createUserRules = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('roleIds')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Roles must be an array'),
  body('roleIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Role ID must be a valid positive integer')
    .toInt(),
  body('role')
    .optional()
    .isString()
    .isIn(ASSIGNABLE_ROLES)
    .withMessage(`Role must be one of ${ASSIGNABLE_ROLES.join(', ')}`),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be active, inactive, or suspended'),
];

// Update user validation
const updateUserRules = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be active, inactive, or suspended'),
];

// Update roles validation
const updateRolesRules = [
  body('roleIds')
    .isArray({ min: 1 })
    .withMessage('At least one role is required'),
  body('roleIds.*')
    .isInt({ min: 1 })
    .withMessage('Role ID must be a valid positive integer')
    .toInt(),
];

// List users query validation
const listUsersRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .isString()
    .trim(),
  query('role')
    .optional()
    .isString()
    .isIn(ALL_ROLES)
    .withMessage('Invalid role filter'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status filter'),
];

module.exports = {
  createUserRules,
  updateUserRules,
  updateRolesRules,
  listUsersRules,
};
