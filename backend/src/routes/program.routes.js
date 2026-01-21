const express = require('express');
const router = express.Router();
const { param } = require('express-validator');

const programController = require('../controllers/program.controller');
const { authenticate, isAdmin, validate } = require('../middleware');
const { programRules, programSubjectsRules, studentProgramRules } = require('../validators');

// Custom param rules
const idParam = param('id').isInt({ min: 1 }).withMessage('ID must be a valid positive integer');
const classIdParam = param('classId').isInt({ min: 1 }).withMessage('Class ID must be a valid positive integer');
const studentClassIdParam = param('studentClassId').isInt({ min: 1 }).withMessage('Student Class ID must be a valid positive integer');

// All routes require authentication
router.use(authenticate);

// Public read routes (for all authenticated users)
router.get('/', programController.getPrograms);
router.get('/by-class/:classId', [classIdParam], validate, programController.getProgramsByClass);
router.get('/:id', [idParam], validate, programController.getProgram);
router.get('/:id/students', [idParam], validate, programController.getStudentsByProgram);

// Admin-only write routes
router.post('/', isAdmin, programRules, validate, programController.createProgram);
router.put('/:id', isAdmin, [idParam, ...programRules], validate, programController.updateProgram);
router.delete('/:id', isAdmin, [idParam], validate, programController.deleteProgram);

// Subject assignment (Admin only)
router.put('/:id/subjects', isAdmin, [idParam, ...programSubjectsRules], validate, programController.assignSubjects);

// Student assignment (Admin only)
router.post('/:id/students', isAdmin, [idParam, ...studentProgramRules], validate, programController.assignStudentToProgram);
router.delete('/:id/students/:studentClassId', isAdmin, [idParam, studentClassIdParam], validate, programController.removeStudentFromProgram);

module.exports = router;

