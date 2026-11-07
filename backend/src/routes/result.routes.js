const express = require("express");
const router = express.Router();
const { param } = require("express-validator");
const resultController = require("../controllers/result.controller");
const {
  authenticate,
  authorize,
  isAdmin,
  canAccessResults,
  validate,
} = require("../middleware");
const { resultSaveRules } = require("../validators");

router.use(authenticate);

// Validator for examSubjectId param
const examSubjectIdRule = param("examSubjectId")
  .isInt({ min: 1 })
  .withMessage("Exam Subject ID must be a valid positive integer");

// LEGACY: GET /:examSubjectId and POST / are superseded by /exam-results
// (marks entry with theory/practical, exam-officer support and section-level
// teacher checks). Kept for backwards compatibility but restricted to admins;
// teachers and exam officers must use /exam-results.

// Get results for an exam subject (Admin only, legacy)
router.get(
  "/:examSubjectId",
  isAdmin,
  authorize("result.enter", "result.view_all"),
  [examSubjectIdRule],
  validate,
  canAccessResults,
  resultController.getResultsBySubject
);

// Bulk marks entry (Admin only, legacy)
router.post(
  "/",
  isAdmin,
  authorize("result.enter"),
  resultSaveRules,
  validate,
  canAccessResults,
  resultController.saveResults
);

// Get student's individual results
router.get(
  "/student/:studentId/exam/:examId",
  authorize("result.view_own", "result.view_all", "result.view_child"),
  [
    param("studentId")
      .isInt({ min: 1 })
      .withMessage("Student ID must be a valid positive integer"),
    param("examId")
      .isInt({ min: 1 })
      .withMessage("Exam ID must be a valid positive integer"),
  ],
  validate,
  canAccessResults,
  resultController.getStudentExamResults
);

module.exports = router;
