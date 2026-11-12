const { body } = require('express-validator');
const { middleNameRule, optionalEmailRule, usernameRule, optionalPasswordRule } = require('./common.validators');

const teacherRules = [
  // User info
  optionalEmailRule,
  usernameRule,
  optionalPasswordRule(),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  middleNameRule,
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phone').optional().trim(),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Valid status is required'),
];

const updateTeacherRules = [
  optionalEmailRule,
  usernameRule,
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  middleNameRule,
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().trim(),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Valid status is required'),
];

module.exports = {
  teacherRules,
  updateTeacherRules,
};
