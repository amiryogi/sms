const express = require("express");
const router = express.Router();
const controller = require("../controllers/assistant.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { isAdmin } = require("../middleware/authorize.middleware");
const { assistantLimiter } = require("../middleware/rateLimit.middleware");
const validate = require("../middleware/validate.middleware");
const { chatRules, idParamRule, feedbackRules, testProviderRules, usageRules, listRules } = require("../validators/assistant.validators");

/**
 * AI help assistant. Read-only: it explains the app and never changes a record.
 * The user, role and school always come from the access token; the browser's page path is
 * checked against the user's role before it is used (services/assistant/routeCatalog.js).
 */

router.get("/bootstrap", authenticate, controller.getBootstrap);

router.post("/chat/stream", authenticate, assistantLimiter, chatRules, validate, controller.chatStream);
router.post("/chat", authenticate, assistantLimiter, chatRules, validate, controller.chat);

router.get("/conversations", authenticate, listRules, validate, controller.listConversations);
router.delete("/conversations", authenticate, controller.deleteAllConversations);
router.get("/conversations/:id", authenticate, idParamRule, validate, controller.getConversation);
router.delete("/conversations/:id", authenticate, idParamRule, validate, controller.deleteConversation);

router.post("/messages/:id/feedback", authenticate, feedbackRules, validate, controller.giveFeedback);

// Administrators (a super admin is an admin). Settings are the user's own school only.
router.get("/admin/settings", authenticate, isAdmin, controller.getSettings);
router.put("/admin/settings", authenticate, isAdmin, controller.updateSettings);
router.post("/admin/test-provider", authenticate, isAdmin, assistantLimiter, testProviderRules, validate, controller.testProvider);
router.get("/admin/usage", authenticate, isAdmin, usageRules, validate, controller.getUsage);

module.exports = router;
