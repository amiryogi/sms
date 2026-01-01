const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendance.controller");
const {
  authenticate,
  authorize,
  canAccessAttendance,
  validate,
} = require("../middleware");
const { body, query } = require("express-validator");

router.use(authenticate);

// Validation rules
const getAttendanceValidation = [
  query("classId").isInt().withMessage("Class ID must be an integer"),
  query("sectionId").isInt().withMessage("Section ID must be an integer"),
  query("date").isISO8601().withMessage("Valid date is required"),
];

const markAttendanceValidation = [
  body("classId").isInt().withMessage("Class ID must be an integer"),
  body("sectionId").isInt().withMessage("Section ID must be an integer"),
  body("date").isISO8601().withMessage("Valid date is required"),
  body("attendanceRecords")
    .isArray()
    .withMessage("Attendance records must be an array"),
  body("attendanceRecords.*.studentId")
    .isInt()
    .withMessage("Valid student ID is required"),
  body("attendanceRecords.*.status")
    .isIn(["present", "absent", "late", "excused"])
    .withMessage("Invalid status"),
];

// Routes
router.get(
  "/",
  authorize("attendance.view_class", "attendance.view_all"),
  getAttendanceValidation,
  validate,
  canAccessAttendance,
  attendanceController.getAttendance
);

router.post(
  "/",
  authorize("attendance.mark"),
  markAttendanceValidation,
  validate,
  canAccessAttendance,
  attendanceController.markAttendance
);

router.get(
  "/student/:studentId",
  authorize(
    "attendance.view_own",
    "attendance.view_all",
    "attendance.view_class"
  ),
  canAccessAttendance,
  attendanceController.getStudentAttendanceSummary
);

module.exports = router;
