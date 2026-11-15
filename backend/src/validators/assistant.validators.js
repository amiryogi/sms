const { body, param, query } = require("express-validator");
const { isDateOnly } = require("../utils/calendar/dateValidation");
const { PROVIDER_IDS } = require("../utils/assistantConfig");
const { MAX_QUESTION } = require("../services/assistant/promptBuilder");

/** POST /assistant/chat and /assistant/chat/stream */
const chatRules = [
  body("message")
    .isString().withMessage("message must be text")
    .bail()
    .trim()
    .isLength({ min: 1, max: MAX_QUESTION }).withMessage(`message must be 1 to ${MAX_QUESTION} characters`),
  body("conversationId").optional({ values: "null" }).isInt({ min: 1 }).withMessage("conversationId must be a positive integer").toInt(),
  body("language").optional().isIn(["auto", "en", "ne"]).withMessage("language must be auto, en or ne"),
  body("context").optional({ values: "null" }).isObject().withMessage("context must be an object"),
  // Only the path is used, and the server checks it against the user's role.
  body("context.route").optional({ values: "null" }).isString().isLength({ max: 300 }).withMessage("context.route is too long"),
];

const idParamRule = param("id").isInt({ min: 1 }).withMessage("ID must be a valid positive integer").toInt();

/** POST /assistant/messages/:id/feedback */
const feedbackRules = [
  idParamRule,
  body("value").isInt({ min: -1, max: 1 }).withMessage("value must be -1, 0 or 1").toInt(),
  body("comment").optional({ values: "null" }).isString().trim().isLength({ max: 500 }).withMessage("comment can be at most 500 characters"),
];

/** POST /assistant/admin/test-provider */
const testProviderRules = [
  body("provider").isIn(PROVIDER_IDS).withMessage(`provider must be one of: ${PROVIDER_IDS.join(", ")}`),
  body("model").isString().trim().matches(/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/).withMessage("model must be a model id"),
];

/** GET /assistant/admin/usage?from=YYYY-MM-DD&to=YYYY-MM-DD */
const usageRules = [
  query("from").optional().custom(isDateOnly).withMessage("from must be a date (YYYY-MM-DD)"),
  query("to").optional().custom(isDateOnly).withMessage("to must be a date (YYYY-MM-DD)"),
];

const listRules = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
];

module.exports = { chatRules, idParamRule, feedbackRules, testProviderRules, usageRules, listRules };
