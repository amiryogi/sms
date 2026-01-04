const express = require("express");
const router = express.Router();

const parentController = require("../controllers/parent.controller");
const { authenticate, isAdmin, validate } = require("../middleware");
const {
  createParentRules,
  updateParentRules,
  linkStudentRules,
  unlinkStudentRules,
  parentPaginationRules,
} = require("../validators");

router.use(authenticate, isAdmin);

router.get("/", parentPaginationRules, validate, parentController.getParents);
router.post("/", createParentRules, validate, parentController.createParent);
router.put("/:id", updateParentRules, validate, parentController.updateParent);
router.post(
  "/:id/link-student",
  linkStudentRules,
  validate,
  parentController.linkStudent
);
router.delete(
  "/:id/unlink-student",
  unlinkStudentRules,
  validate,
  parentController.unlinkStudent
);

module.exports = router;
