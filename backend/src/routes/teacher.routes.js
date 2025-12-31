const express = require('express');
const router = express.Router();

const teacherController = require('../controllers/teacher.controller');
const { authenticate, isAdmin, isOwner, validate } = require('../middleware');
const { teacherRules, updateTeacherRules, idParamRule, paginationRules } = require('../validators');

router.use(authenticate);

// List teachers (Admin only)
router.get('/', isAdmin, paginationRules, validate, teacherController.getTeachers);

// Get single teacher (Admin or Owner)
router.get('/:id', [idParamRule], validate, isOwner, teacherController.getTeacher);

// Create teacher (Admin only)
router.post('/', isAdmin, teacherRules, validate, teacherController.createTeacher);

// Update teacher (Admin or Owner)
router.put('/:id', [idParamRule], validate, isOwner, updateTeacherRules, validate, teacherController.updateTeacher);

module.exports = router;
