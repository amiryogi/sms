const express = require("express");
const router = express.Router();
const gradeScaleController = require("../controllers/gradeScale.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { isAdmin } = require("../middleware/authorize.middleware");
const validate = require("../middleware/validate.middleware");
const { idParamRule } = require("../validators/common.validators");

/**
 * Grade scale routes. Admin only, scoped to req.user.schoolId.
 *
 * Other roles never call these: the scale reaches them inside report-card
 * responses as `gradeReference`. Band-level validation (contiguity, gaps,
 * overlaps) lives in utils/gradeScale.js so it can be unit-tested.
 */

router.get("/", authenticate, isAdmin, gradeScaleController.listGradeScales);
router.get("/presets", authenticate, isAdmin, gradeScaleController.listPresets);
router.post("/", authenticate, isAdmin, gradeScaleController.createGradeScale);
router.put(
  "/:id",
  authenticate,
  isAdmin,
  idParamRule,
  validate,
  gradeScaleController.updateGradeScale,
);
router.put(
  "/:id/default",
  authenticate,
  isAdmin,
  idParamRule,
  validate,
  gradeScaleController.setDefaultGradeScale,
);
router.delete(
  "/:id",
  authenticate,
  isAdmin,
  idParamRule,
  validate,
  gradeScaleController.deleteGradeScale,
);

module.exports = router;
