const express = require("express");
const router = express.Router();
const schoolController = require("../controllers/school.controller");

/**
 * Public Routes (No authentication required)
 *
 * These endpoints expose ONLY non-sensitive school branding information
 * for use on login pages, public websites, etc.
 *
 * Security: No internal IDs, admin details, or PII exposed.
 */

// Get public school info by code (for login page branding)
// GET /api/v1/public/school/:code
router.get("/school/:code", schoolController.getPublicSchoolByCode);

module.exports = router;
