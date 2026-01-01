const express = require('express');
const router = express.Router();

const studentController = require('../controllers/student.controller');
const { authenticate, isAdmin, isOwnStudent, validate, requireRole } = require('../middleware');
const { studentRules, updateStudentRules, enrollmentRules, idParamRule, paginationRules } = require('../validators');

router.use(authenticate);

// List students (Admin/Teacher only)
router.get('/', requireRole('ADMIN', 'TEACHER'), paginationRules, validate, studentController.getStudents);

// Get single student (Admin/Teacher or Owner/Parent)
router.get('/:id', [idParamRule], validate, isOwnStudent, studentController.getStudent);

// Create student (Admin only)
router.post('/', isAdmin, studentRules, validate, studentController.createStudent);

// Update student (Admin or Owner/Parent)
router.put('/:id', [idParamRule], validate, isOwnStudent, updateStudentRules, validate, studentController.updateStudent);

// Enroll student (Admin only)
router.post('/:id/enroll', isAdmin, [idParamRule, ...enrollmentRules], validate, studentController.enrollStudent);

module.exports = router;
