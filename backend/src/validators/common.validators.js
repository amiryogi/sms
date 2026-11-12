const { body, param, query } = require('express-validator');
const { usernameProblem } = require("../utils/usernames");
const { meetsPolicy, PASSWORD_POLICY_MESSAGE } = require("../utils/passwords");

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

// Optional email: many students and parents have none (they sign in by username).
// An empty value is allowed and stored as null.
const optionalEmailRule = body("email")
  .optional({ values: "falsy" })
  .isEmail()
  .withMessage("Please provide a valid email")
  .normalizeEmail();

// Username: optional on input (the server suggests one), validated when given.
const usernameRule = body("username")
  .optional({ values: "falsy" })
  .isString()
  .withMessage("Username must be text")
  .custom((v) => {
    const problem = usernameProblem(v);
    if (problem) throw new Error(problem);
    return true;
  });

// A password an admin may type when creating an account. Empty: one is generated.
const optionalPasswordRule = (field = "password") =>
  body(field)
    .optional({ values: "falsy" })
    .isString()
    .custom((v) => {
      if (!meetsPolicy(v)) throw new Error(PASSWORD_POLICY_MESSAGE);
      return true;
    });

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

// Optional middle name (Ram Bahadur Thapa). Empty clears it; the controller stores null.
const middleNameRule = body('middleName')
  .optional({ values: 'null' })
  .isString()
  .withMessage('Middle name must be text')
  .trim()
  .isLength({ max: 100 })
  .withMessage('Middle name must be less than 100 characters');

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
  optionalEmailRule,
  usernameRule,
  optionalPasswordRule,
  passwordRule,
  firstNameRule,
  middleNameRule,
  lastNameRule,
  phoneRule,
  dateRule,
  academicYearIdRule,
  classIdRule,
  sectionIdRule,
  subjectIdRule,
};
