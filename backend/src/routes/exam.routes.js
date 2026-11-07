const express = require("express");
const router = express.Router();
const examController = require("../controllers/exam.controller");
const { authenticate, isAdmin, validate } = require("../middleware");
const {
  examRules,
  examSubjectUpdateRules,
  workingDaysRules,
  idParamRule,
} = require("../validators");

router.use(authenticate);

// Get all exams
router.get("/", examController.getExams);

// Get single exam details
router.get("/:id", [idParamRule], validate, examController.getExam);

// Create exam (Admin only)
router.post("/", isAdmin, examRules, validate, examController.createExam);

// Update exam details (Admin only)
router.put(
  "/:id",
  isAdmin,
  [idParamRule, ...examRules],
  validate,
  examController.updateExam
);

// Working days for report-card attendance (Admin only). Allowed in any exam
// status: the number is usually known only when report cards are made.
router.put(
  "/:id/working-days",
  isAdmin,
  [idParamRule, ...workingDaysRules],
  validate,
  examController.setWorkingDays
);

// Update/Add exam subjects (Admin only)
router.post(
  "/:id/subjects",
  isAdmin,
  [idParamRule, ...examSubjectUpdateRules],
  validate,
  examController.updateExamSubjects
);

// Publish exam (Admin only)
router.put(
  "/:id/publish",
  isAdmin,
  [idParamRule],
  validate,
  examController.publishExam
);

// Lock exam (Admin only)
router.put(
  "/:id/lock",
  isAdmin,
  [idParamRule],
  validate,
  examController.lockExam
);

// Unlock exam (Admin only)
router.put(
  "/:id/unlock",
  isAdmin,
  [idParamRule],
  validate,
  examController.unlockExam
);

// Delete exam (Admin only)
router.delete(
  "/:id",
  isAdmin,
  [idParamRule],
  validate,
  examController.deleteExam
);

// Delete a specific exam subject (Admin only)
router.delete(
  "/:id/subjects/:subjectId",
  isAdmin,
  [idParamRule],
  validate,
  examController.deleteExamSubject
);

module.exports = router;
