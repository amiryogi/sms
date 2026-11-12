const { body } = require('express-validator');
const { middleNameRule, optionalEmailRule, usernameRule, optionalPasswordRule } = require('./common.validators');

const studentRules = [
  // User info
  optionalEmailRule,
  usernameRule,
  optionalPasswordRule(),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  middleNameRule,
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phone').optional().trim(),
  
  // Student info
  body('admissionNumber').trim().notEmpty().withMessage('Admission number is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
  body('bloodGroup').optional().trim(),
  body('address').optional().trim(),
  body('emergencyContact').optional().trim(),
  body('admissionDate').isISO8601().withMessage('Valid admission date is required'),
  
  // Enrollment info
  body('classId').isInt().withMessage('Valid Class ID is required'),
  body('sectionId').isInt().withMessage('Valid Section ID is required'),
  body('academicYearId').isInt().withMessage('Valid Academic Year ID is required'),
  body('rollNumber').optional().isInt({ min: 1 }).withMessage('Roll number must be a positive integer'),
];

const updateStudentRules = [
  optionalEmailRule,
  usernameRule,
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  middleNameRule,
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().trim(),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
  body('bloodGroup').optional().trim(),
  body('address').optional().trim(),
  body('emergencyContact').optional().trim(),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Valid status is required'),
];

const enrollmentRules = [
  body('classId').isInt().withMessage('Valid Class ID is required'),
  body('sectionId').isInt().withMessage('Valid Section ID is required'),
  body('academicYearId').isInt().withMessage('Valid Academic Year ID is required'),
  body('rollNumber').optional().isInt({ min: 1 }).withMessage('Roll number must be a positive integer'),
];

module.exports = {
  studentRules,
  updateStudentRules,
  enrollmentRules,
};

// Class logins (temporary passwords for a class, for printed login slips)
const bulkCredentialsRules = [
  body('classId').isInt({ min: 1 }).withMessage('Choose a class').toInt(),
  body('sectionId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('academicYearId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('includeParents').optional().isBoolean().toBoolean(),
  body('onlyNeverSignedIn').optional().isBoolean().toBoolean(),
  body('dryRun').optional().isBoolean().toBoolean(),
];

module.exports.bulkCredentialsRules = bulkCredentialsRules;
