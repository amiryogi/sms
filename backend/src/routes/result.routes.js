const express = require('express');
const router = express.Router();
const resultController = require('../controllers/result.controller');
const { authenticate, authorize, canAccessResults, validate } = require('../middleware');
const { resultSaveRules, idParamRule } = require('../validators');

router.use(authenticate);

// Get results for an exam subject (Admin/Teacher)
router.get('/:examSubjectId', 
  authorize('results:enter'), 
  [idParamRule.replace('id', 'examSubjectId')], 
  validate, 
  canAccessResults, 
  resultController.getResultsBySubject
);

// Bulk marks entry (Admin/Teacher)
router.post('/', 
  authorize('results:enter'), 
  resultSaveRules, 
  validate, 
  canAccessResults, 
  resultController.saveResults
);

// Get student's individual results
router.get('/student/:studentId/exam/:examId', 
  authorize('results:view'), 
  canAccessResults, 
  resultController.getStudentExamResults
);

module.exports = router;
