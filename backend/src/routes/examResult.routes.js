const express = require('express');
const router = express.Router();
const examResultController = require('../controllers/examResult.controller');
const { authenticate, isTeacher, validate } = require('../middleware');
const { resultSaveRules, idParamRule } = require('../validators');

router.use(authenticate);

// Get exams available for teacher (PUBLISHED only)
router.get('/teacher/exams', isTeacher, examResultController.getTeacherExams);

// Get students for marks entry
router.get('/students', isTeacher, examResultController.getStudentsForMarksEntry);

const { param } = require('express-validator');

// Get existing results for an exam subject
router.get('/exam-subjects/:examSubjectId',
    isTeacher,
    [param('examSubjectId').isInt({ min: 1 }).withMessage('Invalid Exam Subject ID')],
    validate,
    examResultController.getResultsByExamSubject
);

// Save/update marks (Teacher only, PUBLISHED exams only)
router.post('/', isTeacher, resultSaveRules, validate, examResultController.saveResults);

module.exports = router;
