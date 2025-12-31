const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const { authenticate, isTeacher, validate } = require('../middleware');
const { upload } = require('../middleware/upload.middleware');
const { assignmentRules, idParamRule } = require('../validators');

router.use(authenticate);

// Get assignments (Student/Teacher/Admin)
router.get('/', assignmentController.getAssignments);

// Get single assignment
router.get('/:id', [idParamRule], validate, assignmentController.getAssignment);

// Create assignment (Teacher only)
router.post('/', 
  isTeacher, 
  upload.array('files', 5), 
  assignmentRules, 
  validate, 
  assignmentController.createAssignment
);

// Update assignment (Teacher/Admin)
router.put('/:id', 
  isTeacher, 
  [idParamRule], 
  validate, 
  assignmentController.updateAssignment
);

// Delete assignment (Teacher/Admin)
router.delete('/:id', 
  isTeacher, 
  [idParamRule], 
  validate, 
  assignmentController.deleteAssignment
);

module.exports = router;
