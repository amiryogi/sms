const express = require("express");
const router = express.Router();
const layoutController = require("../controllers/reportCardLayout.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { isAdmin } = require("../middleware/authorize.middleware");

/**
 * Report-card layout routes. Admin only, scoped to req.user.schoolId.
 *
 * Other roles never call these: the layout reaches them inside every
 * report-card response as `layout`. Validation lives in
 * utils/reportCardLayout.js so it can be unit-tested.
 */

router.get("/", authenticate, isAdmin, layoutController.getLayout);
router.put("/", authenticate, isAdmin, layoutController.updateLayout);
router.delete("/", authenticate, isAdmin, layoutController.resetLayout);

module.exports = router;
