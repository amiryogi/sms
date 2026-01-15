const express = require("express");
const router = express.Router();
const { param } = require("express-validator");
const resultController = require("../controllers/result.controller");
const {
  authenticate,
  authorize,
  canAccessResults,
  validate,
} = require("../middleware");
const { resultSaveRules } = require("../validators");

router.use(authenticate);

// Validator for examSubjectId param
const examSubjectIdRule = param("examSubjectId")
  .isInt({ min: 1 })
  .withMessage("Exam Subject ID must be a valid positive integer");

// Get results for an exam subject (Admin/Teacher)
router.get(
  "/:examSubjectId",
  authorize("result.enter", "result.view_all"),
  [examSubjectIdRule],
  validate,
  canAccessResults,
  resultController.getResultsBySubject
);

// Bulk marks entry (Admin/Teacher)
router.post(
  "/",
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
  canAccessResults,
  resultController.getStudentExamResults
);

module.exports = router;
