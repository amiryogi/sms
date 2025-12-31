const { body, query } = require('express-validator');

/**
 * User validation rules
 */

// Create user validation
const createUserRules = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
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
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('roleIds')
    .isArray({ min: 1 })
    .withMessage('At least one role is required'),
  body('roleIds.*')
    .isInt({ min: 1 })
    .withMessage('Role ID must be a valid positive integer'),
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
    .optional()
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
    .withMessage('Role ID must be a valid positive integer'),
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
    .isIn(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT'])
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
