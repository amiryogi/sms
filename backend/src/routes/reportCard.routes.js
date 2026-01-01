const express = require("express");
const router = express.Router();
const reportCardController = require("../controllers/reportCard.controller");
const {
  authenticate,
  isAdmin,
  authorize,
  canAccessResults,
  validate,
} = require("../middleware");
const { body } = require("express-validator");

router.use(authenticate);

// Generate report cards (Admin only)
router.post(
  "/generate",
  isAdmin,
  [body("examId").isInt(), body("classId").isInt(), body("sectionId").isInt()],
  validate,
  reportCardController.generateReportCards
);

// Get specific report card
router.get(
  "/student/:studentId/exam/:examId",
  authorize(
    "report_card.view_own",
    "report_card.view_all",
    "report_card.view_child"
  ),
  canAccessResults,
  reportCardController.getReportCard
);

// Publish report cards (Admin only)
router.put(
  "/publish",
  isAdmin,
  [body("examId").isInt(), body("classId").isInt(), body("sectionId").isInt()],
  validate,
  reportCardController.publishReportCards
);

module.exports = router;
