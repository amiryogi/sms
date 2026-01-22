const express = require("express");
const router = express.Router();
const schoolController = require("../controllers/school.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { isAdmin } = require("../middleware/authorize.middleware");
const { upload } = require("../middleware/upload.middleware");
const validate = require("../middleware/validate.middleware");
const { updateSchoolRules } = require("../validators/school.validators");

/**
 * School Settings Routes
 *
 * All routes scoped to the authenticated user's school (schoolId from JWT).
 * Admins can manage school settings; all users can view.
 */

// Get current user's school settings
// GET /api/v1/school
router.get("/", authenticate, schoolController.getMySchool);

// Update school settings (ADMIN only)
// PUT /api/v1/school
router.put(
  "/",
  authenticate,
  isAdmin,
  updateSchoolRules,
  validate,
  schoolController.updateMySchool,
);

// Upload school logo (ADMIN only)
// POST /api/v1/school/logo
router.post(
  "/logo",
  authenticate,
  isAdmin,
  upload.single("logo"),
  schoolController.uploadLogo,
);

// Upload school banner (ADMIN only)
// POST /api/v1/school/banner
router.post(
  "/banner",
  authenticate,
  isAdmin,
  upload.single("banner"),
  schoolController.uploadBanner,
);

module.exports = router;
