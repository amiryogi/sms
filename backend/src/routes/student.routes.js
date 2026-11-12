const express = require('express');
const router = express.Router();

const studentController = require('../controllers/student.controller');
const { authenticate, isAdmin, isOwnStudent, validate, requireRole } = require('../middleware');
const { studentRules, updateStudentRules, enrollmentRules, idParamRule, paginationRules } = require('../validators');
const { bulkCredentialsRules } = require('../validators/student.validators');

router.use(authenticate);

// Class logins: temporary passwords for a class's students (and parents), for printed slips
router.post('/credentials/bulk', isAdmin, bulkCredentialsRules, validate, studentController.bulkCredentials);

// List students (Admin, Teacher; Exam Officer and Accountant read-only)
router.get('/', requireRole('ADMIN', 'TEACHER', 'EXAM_OFFICER', 'ACCOUNTANT'), paginationRules, validate, studentController.getStudents);

// Get single student (Admin/Teacher or Owner/Parent)
router.get('/:id', [idParamRule], validate, isOwnStudent, studentController.getStudent);

// Create student (Admin only)
router.post('/', isAdmin, studentRules, validate, studentController.createStudent);

// Update student (Admin or Owner/Parent)
router.put('/:id', [idParamRule], validate, isOwnStudent, updateStudentRules, validate, studentController.updateStudent);

// Enroll student (Admin only)
router.post('/:id/enroll', isAdmin, [idParamRule, ...enrollmentRules], validate, studentController.enrollStudent);

module.exports = router;
