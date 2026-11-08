const express = require("express");
const { param } = require("express-validator");
const { authenticate, isOwnStudent, validate } = require("../middleware");
const { ApiResponse, asyncHandler } = require("../utils");
const portal = require("../services/portal.service");

/**
 * Student and parent portal (docs/plans/finance-and-portals.md, Phases 6-7).
 * isOwnStudent: a student reads only themself, a parent only a linked child;
 * staff keep their usual read access.
 */
const router = express.Router();

router.get(
  "/students/:studentId/overview",
  authenticate,
  [param("studentId").isInt({ min: 1 }).withMessage("Student ID must be a positive integer").toInt()],
  validate,
  isOwnStudent,
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await portal.overview({ schoolId: req.user.schoolId, studentId: req.params.studentId }), "Student overview");
  }),
);

module.exports = router;
