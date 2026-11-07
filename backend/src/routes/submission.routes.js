const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submission.controller');
const { authenticate, isStudent, requireRole, validate } = require('../middleware');
const { upload } = require('../middleware/upload.middleware');
const { submissionRules, gradingRules, idParamRule } = require('../validators');

router.use(authenticate);

// submission.controller.js lets ADMIN view/grade any submission in the school,
// so the guard must not turn admins away.
const canReviewSubmissions = requireRole('TEACHER', 'ADMIN');

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
  canReviewSubmissions,
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
  canReviewSubmissions,
  [idParamRule], 
  validate, 
  gradingRules, 
  validate, 
  submissionController.gradeSubmission
);

module.exports = router;
