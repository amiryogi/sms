const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submission.controller');
const { authenticate, isStudent, isTeacher, validate } = require('../middleware');
const { upload } = require('../middleware/upload.middleware');
const { submissionRules, gradingRules, idParamRule } = require('../validators');

router.use(authenticate);

// Submit assignment (Student only)
router.post('/', 
  isStudent, 
  upload.array('files', 3), 
  submissionRules, 
  validate, 
  submissionController.submitAssignment
);

const { param } = require('express-validator');

// Get submissions for an assignment (Teacher/Admin only)
router.get('/assignment/:assignmentId', 
  isTeacher, 
  [
    param('assignmentId')
      .isInt({ min: 1 })
      .withMessage('Assignment ID must be a valid positive integer')
  ], 
  validate, 
  submissionController.getSubmissionsByAssignment
);

// Grade a submission (Teacher/Admin only)
router.put('/:id/grade', 
  isTeacher, 
  [idParamRule], 
  validate, 
  gradingRules, 
  validate, 
  submissionController.gradeSubmission
);

module.exports = router;
