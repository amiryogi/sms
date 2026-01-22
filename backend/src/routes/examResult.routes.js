const express = require('express');
const router = express.Router();
const examResultController = require('../controllers/examResult.controller');
const { authenticate, isTeacher, canEnterMarks, validate } = require('../middleware');
const { resultSaveRules, idParamRule } = require('../validators');
const { param } = require('express-validator');

router.use(authenticate);

// Get exams available for marks entry (Teacher, EXAM_OFFICER, Admin)
// New unified endpoint for all roles
router.get('/exams', canEnterMarks, examResultController.getExamsForMarksEntry);

// Get exams available for teacher (PUBLISHED only) - kept for backward compatibility
router.get('/teacher/exams', isTeacher, examResultController.getTeacherExams);

// Get students for marks entry (Teacher, EXAM_OFFICER, Admin)
router.get('/students', canEnterMarks, examResultController.getStudentsForMarksEntry);

// Get students filtered by program for Grade 11-12 (Teacher, EXAM_OFFICER, Admin)
router.get('/students-by-program', canEnterMarks, examResultController.getStudentsByProgram);

// Get subjects assigned to a student from StudentSubject mapping (Grade 11-12)
router.get('/student-subjects', canEnterMarks, examResultController.getStudentSubjects);

// Get existing results for an exam subject (Teacher, EXAM_OFFICER, Admin)
router.get('/exam-subjects/:examSubjectId',
    canEnterMarks,
    [param('examSubjectId').isInt({ min: 1 }).withMessage('Invalid Exam Subject ID')],
    validate,
    examResultController.getResultsByExamSubject
);

// Save/update marks (Teacher, EXAM_OFFICER, Admin - PUBLISHED exams only)
router.post('/', canEnterMarks, resultSaveRules, validate, examResultController.saveResults);

module.exports = router;
