const { body } = require('express-validator');

const academicYearRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('isCurrent').optional().isBoolean().withMessage('isCurrent must be a boolean'),
];

const classRules = [
  body('name').trim().notEmpty().withMessage('Class name is required'),
  body('gradeLevel').isInt({ min: 1, max: 12 }).withMessage('Grade level must be 1-12'),
  body('displayOrder').optional().isInt({ min: 0 }).withMessage('Display order must be a non-negative integer'),
];

const sectionRules = [
  body('name').trim().notEmpty().withMessage('Section name is required'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
];

const subjectRules = [
  body('name').trim().notEmpty().withMessage('Subject name is required'),
  body('code').trim().notEmpty().withMessage('Subject code is required'),
  body('description').optional().trim(),
  body('isOptional').optional().isBoolean().withMessage('isOptional must be a boolean'),
];

const classSubjectRules = [
  body('classId').isInt().withMessage('Valid Class ID is required'),
  body('academicYearId').isInt().withMessage('Valid Academic Year ID is required'),
  body('subjectId').isInt().withMessage('Valid Subject ID is required'),
  body('fullMarks').optional().isInt({ min: 1 }).withMessage('Full marks must be at least 1'),
  body('passMarks').optional().isInt({ min: 1 }).withMessage('Pass marks must be at least 1'),
  body('creditHours').optional().isDecimal({ decimal_digits: '0,1' }).withMessage('Credit hours must be a decimal (e.g. 3.0)'),
];

module.exports = {
  academicYearRules,
  classRules,
  sectionRules,
  subjectRules,
  classSubjectRules,
};
