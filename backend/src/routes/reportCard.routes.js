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
const { body, query } = require("express-validator");

router.use(authenticate);

// Get report cards for a class/section (Admin view)
router.get(
  "/",
  isAdmin,
  [
    query("examId").isInt().withMessage("Exam ID is required"),
    query("classId").isInt().withMessage("Class ID is required"),
    query("sectionId").isInt().withMessage("Section ID is required"),
  ],
  validate,
  reportCardController.getReportCards
);

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

// Unpublish report cards (Admin only)
router.put(
  "/unpublish",
  isAdmin,
  [body("examId").isInt(), body("classId").isInt(), body("sectionId").isInt()],
  validate,
  reportCardController.unpublishReportCards
);

// Get student's published exams (for student/parent to see available report cards)
router.get(
  "/student/:studentId/exams",
  authorize(
    "report_card.view_own",
    "report_card.view_all",
    "report_card.view_child"
  ),
  canAccessResults,
  reportCardController.getStudentPublishedExams
);

// Get PDF data for report card (used by frontend for PDF generation)
router.get(
  "/student/:studentId/exam/:examId/pdf-data",
  authorize(
    "report_card.view_own",
    "report_card.view_all",
    "report_card.view_child"
  ),
  canAccessResults,
  reportCardController.getReportCardPdfData
);

module.exports = router;
