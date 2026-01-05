const { body, param, query } = require("express-validator");

/**
 * Notice validation rules
 */

// Valid enum values
const VALID_TARGET_TYPES = ["GLOBAL", "ROLE_SPECIFIC", "CLASS_SPECIFIC"];
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];
const VALID_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];

// Create notice validation
const createNoticeRules = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 255 })
    .withMessage("Title must be less than 255 characters"),

  body("content").trim().notEmpty().withMessage("Content is required"),

  body("targetType")
    .optional()
    .isIn(VALID_TARGET_TYPES)
    .withMessage(
      `Target type must be one of: ${VALID_TARGET_TYPES.join(", ")}`
    ),

  body("priority")
    .optional()
    .isIn(VALID_PRIORITIES)
    .withMessage(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`),

  body("publishFrom")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("publishFrom must be a valid ISO 8601 date"),

  body("publishTo")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("publishTo must be a valid ISO 8601 date"),

  body("roleTargets")
    .optional()
    .isArray()
    .withMessage("roleTargets must be an array"),

  body("roleTargets.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each roleTarget must be a valid role ID"),

  body("classTargets")
    .optional()
    .isArray()
    .withMessage("classTargets must be an array"),

  body("classTargets.*.classId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each classTarget must have a valid classId"),

  body("classTargets.*.sectionId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("sectionId must be a valid section ID if provided"),
];

// Update notice validation (same as create, all optional)
const updateNoticeRules = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: 255 })
    .withMessage("Title must be less than 255 characters"),

  body("content")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Content cannot be empty"),

  body("targetType")
    .optional()
    .isIn(VALID_TARGET_TYPES)
    .withMessage(
      `Target type must be one of: ${VALID_TARGET_TYPES.join(", ")}`
    ),

  body("priority")
    .optional()
    .isIn(VALID_PRIORITIES)
    .withMessage(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`),

  body("publishFrom")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("publishFrom must be a valid ISO 8601 date"),

  body("publishTo")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("publishTo must be a valid ISO 8601 date"),

  body("roleTargets")
    .optional()
    .isArray()
    .withMessage("roleTargets must be an array"),

  body("classTargets")
    .optional()
    .isArray()
    .withMessage("classTargets must be an array"),
];

// Query params for listing notices
const listNoticeRules = [
  query("status")
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(", ")}`),

  query("priority")
    .optional()
    .isIn(VALID_PRIORITIES)
    .withMessage(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query must be less than 100 characters"),

  query("createdById")
    .optional()
    .isInt({ min: 1 })
    .withMessage("createdById must be a valid user ID"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

// Notice ID param validation
const noticeIdParamRule = param("id")
  .isInt({ min: 1 })
  .withMessage("Notice ID must be a valid positive integer");

module.exports = {
  createNoticeRules,
  updateNoticeRules,
  listNoticeRules,
  noticeIdParamRule,
};
