const express = require("express");
const router = express.Router();

const noticeController = require("../controllers/notice.controller");
const { authenticate, requireRole, validate } = require("../middleware");
const {
  createNoticeRules,
  updateNoticeRules,
  listNoticeRules,
  noticeIdParamRule,
} = require("../validators/notice.validators");

/**
 * Notice Routes
 *
 * All routes require authentication.
 * RBAC is enforced at the service layer for granular control.
 *
 * POST   /notices              - Create notice (ADMIN, TEACHER)
 * GET    /notices              - List notices (all roles, filtered by visibility)
 * GET    /notices/:id          - Get single notice (visibility check in service)
 * PUT    /notices/:id          - Update notice (owner/admin, DRAFT only)
 * DELETE /notices/:id          - Delete notice (owner/admin, DRAFT only)
 * PATCH  /notices/:id/publish  - Publish notice (owner/admin)
 * PATCH  /notices/:id/archive  - Archive notice (owner/admin)
 */

// All routes require authentication
router.use(authenticate);

// =============================================================================
// LIST & READ (All authenticated users - filtering done in service)
// =============================================================================

/**
 * @route   GET /api/v1/notices
 * @desc    Get notices visible to the current user
 * @access  Private (All roles)
 */
router.get("/", listNoticeRules, validate, noticeController.getNotices);

/**
 * @route   GET /api/v1/notices/:id
 * @desc    Get a single notice by ID
 * @access  Private (visibility enforced in service)
 */
router.get("/:id", [noticeIdParamRule], validate, noticeController.getNotice);

// =============================================================================
// CREATE (ADMIN and TEACHER only)
// =============================================================================

/**
 * @route   POST /api/v1/notices
 * @desc    Create a new notice
 * @access  Private (ADMIN, SUPER_ADMIN, TEACHER)
 *
 * Note: Teacher restrictions (CLASS_SPECIFIC only, own classes)
 *       are enforced in the service layer
 */
router.post(
  "/",
  requireRole("ADMIN", "SUPER_ADMIN", "TEACHER"),
  createNoticeRules,
  validate,
  noticeController.createNotice
);

// =============================================================================
// UPDATE & DELETE (Owner or ADMIN, DRAFT only - enforced in service)
// =============================================================================

/**
 * @route   PUT /api/v1/notices/:id
 * @desc    Update a notice (DRAFT status only)
 * @access  Private (Owner or ADMIN)
 */
router.put(
  "/:id",
  requireRole("ADMIN", "SUPER_ADMIN", "TEACHER"),
  [noticeIdParamRule, ...updateNoticeRules],
  validate,
  noticeController.updateNotice
);

/**
 * @route   DELETE /api/v1/notices/:id
 * @desc    Delete a notice (DRAFT status only)
 * @access  Private (Owner or ADMIN)
 */
router.delete(
  "/:id",
  requireRole("ADMIN", "SUPER_ADMIN", "TEACHER"),
  [noticeIdParamRule],
  validate,
  noticeController.deleteNotice
);

// =============================================================================
// STATUS TRANSITIONS (Owner or ADMIN - enforced in service)
// =============================================================================

/**
 * @route   PATCH /api/v1/notices/:id/publish
 * @desc    Publish a notice (DRAFT → PUBLISHED)
 * @access  Private (Owner or ADMIN)
 */
router.patch(
  "/:id/publish",
  requireRole("ADMIN", "SUPER_ADMIN", "TEACHER"),
  [noticeIdParamRule],
  validate,
  noticeController.publishNotice
);

/**
 * @route   PATCH /api/v1/notices/:id/archive
 * @desc    Archive a notice (PUBLISHED → ARCHIVED)
 * @access  Private (Owner or ADMIN)
 */
router.patch(
  "/:id/archive",
  requireRole("ADMIN", "SUPER_ADMIN", "TEACHER"),
  [noticeIdParamRule],
  validate,
  noticeController.archiveNotice
);

module.exports = router;
