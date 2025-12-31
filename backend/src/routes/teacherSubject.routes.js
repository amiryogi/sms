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

router.get('/', teacherSubjectController.getTeacherAssignments);

router.post('/', isAdmin, assignmentRules, validate, teacherSubjectController.assignTeacher);
router.put('/:id', isAdmin, [idParamRule], validate, teacherSubjectController.updateAssignment);
router.delete('/:id', isAdmin, [idParamRule], validate, teacherSubjectController.removeAssignment);

module.exports = router;
