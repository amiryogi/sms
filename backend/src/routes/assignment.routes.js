const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const { authenticate, requireRole, validate } = require('../middleware');
const { upload } = require('../middleware/upload.middleware');
const { assignmentRules, idParamRule } = require('../validators');

router.use(authenticate);

// Controllers have admin branches (create for any TeacherSubject in the school,
// edit/delete any assignment), so admins must get past the route guard.
const canManageAssignments = requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN');

// Get assignments (Admin all, Teacher own, Student/Parent published for their class;
// other roles are refused in the controller)
router.get('/', assignmentController.getAssignments);

// Get single assignment
router.get('/:id', [idParamRule], validate, assignmentController.getAssignment);

// Create assignment (Teacher/Admin)
router.post('/',
  canManageAssignments,
  upload.array('files', 5),
  assignmentRules,
  validate,
  assignmentController.createAssignment
);

// Update assignment (Teacher/Admin)
router.put('/:id',
  canManageAssignments,
  upload.array('files', 5),
  [idParamRule],
  validate,
  assignmentController.updateAssignment
);

// Delete assignment (Teacher/Admin)
router.delete('/:id',
  canManageAssignments,
  [idParamRule],
  validate,
  assignmentController.deleteAssignment
);

module.exports = router;
