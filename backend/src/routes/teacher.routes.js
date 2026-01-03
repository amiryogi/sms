const express = require("express");
const router = express.Router();

const teacherController = require("../controllers/teacher.controller");
const {
  authenticate,
  isAdmin,
  isOwner,
  isTeacher,
  validate,
} = require("../middleware");
const {
  teacherRules,
  updateTeacherRules,
  idParamRule,
  paginationRules,
} = require("../validators");

router.use(authenticate);

// =====================================================
// TEACHER SELF-SERVICE ROUTES (Must be before :id routes)
// =====================================================

// Get students for teacher's assigned classes/sections
router.get("/my-students", isTeacher, teacherController.getMyStudents);

// =====================================================
// ADMIN ROUTES
// =====================================================

// List teachers (Admin only)
router.get(
  "/",
  isAdmin,
  paginationRules,
  validate,
  teacherController.getTeachers
);

// Get single teacher (Admin or Owner)
router.get(
  "/:id",
  [idParamRule],
  validate,
  isOwner,
  teacherController.getTeacher
);

// Create teacher (REMOVED - Use POST /api/v1/users with role='TEACHER')
// router.post('/', isAdmin, teacherRules, validate, teacherController.createTeacher);

// Update teacher (Admin or Owner)
router.put(
  "/:id",
  [idParamRule],
  validate,
  isOwner,
  updateTeacherRules,
  validate,
  teacherController.updateTeacher
);

module.exports = router;
