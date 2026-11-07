const express = require('express');
const router = express.Router();

const teacherSubjectController = require('../controllers/teacherSubject.controller');
const { authenticate, isAdmin, validate } = require('../middleware');
const { idParamRule } = require('../validators');
const { body } = require('express-validator');

router.use(authenticate);

const assignmentRules = [
  body('userId').isInt().withMessage('Valid teacher ID is required'),
  body('classSubjectId').isInt().withMessage('Valid class subject ID is required'),
  body('sectionId').isInt().withMessage('Valid section ID is required'),
  body('isClassTeacher').optional().isBoolean().withMessage('isClassTeacher must be a boolean'),
];

// PUT: every field optional; omitted fields keep their current value
const updateAssignmentRules = [
  body('userId').optional().isInt().withMessage('Valid teacher ID is required'),
  body('classSubjectId').optional().isInt().withMessage('Valid class subject ID is required'),
  body('sectionId').optional().isInt().withMessage('Valid section ID is required'),
  body('isClassTeacher').optional().isBoolean().withMessage('isClassTeacher must be a boolean').toBoolean(),
];

router.get('/', teacherSubjectController.getTeacherAssignments);

router.post('/', isAdmin, assignmentRules, validate, teacherSubjectController.assignTeacher);
router.put('/:id', isAdmin, [idParamRule, ...updateAssignmentRules], validate, teacherSubjectController.updateAssignment);
router.delete('/:id', isAdmin, [idParamRule], validate, teacherSubjectController.removeAssignment);

module.exports = router;
