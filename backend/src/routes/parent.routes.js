/**
 * Parent-facing routes (for logged-in parents only)
 * NOT to be confused with parentAdmin.routes.js which is for admins managing parents
 */
const express = require("express");
const router = express.Router();

const parentController = require("../controllers/parent.controller");
const { authenticate, isParent } = require("../middleware");

// All routes require authentication and PARENT role
router.use(authenticate, isParent);

/**
 * @route   GET /api/v1/parents/me/children
 * @desc    Get logged-in parent's linked children with full details
 * @access  Private (PARENT only)
 */
router.get("/me/children", parentController.getMyChildren);

/**
 * @route   GET /api/v1/parents/me/children/:studentId
 * @desc    Get specific child details (only if linked to parent)
 * @access  Private (PARENT only)
 */
router.get("/me/children/:studentId", parentController.getChildById);

module.exports = router;
