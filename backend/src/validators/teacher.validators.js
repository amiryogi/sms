const { body } = require('express-validator');

const teacherRules = [
  // User info
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phone').optional().trim(),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Valid status is required'),
];

const updateTeacherRules = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().trim(),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Valid status is required'),
];

module.exports = {
  teacherRules,
  updateTeacherRules,
};
