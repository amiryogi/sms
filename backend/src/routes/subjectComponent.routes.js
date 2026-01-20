const express = require("express");
const router = express.Router();

const subjectComponentController = require("../controllers/subjectComponent.controller");
const { authenticate, isAdmin, validate } = require("../middleware");
const { subjectComponentRules, idParamRule } = require("../validators");

// Apply authentication to all routes
router.use(authenticate);

// GET NEB-eligible classes (Grade 11 and 12)
router.get("/neb-classes", subjectComponentController.getNEBClasses);

// GET all subject components (with optional filters)
router.get("/", subjectComponentController.getSubjectComponents);

// GET subject component by ID
router.get("/:id", [idParamRule], validate, subjectComponentController.getSubjectComponentById);

// GET components for a specific subject in a class
router.get(
  "/class/:classId/subject/:subjectId",
  subjectComponentController.getComponentsBySubject
);

// POST create new subject component (Admin only)
router.post(
  "/",
  isAdmin,
  subjectComponentRules,
  validate,
  subjectComponentController.createSubjectComponent
);

// PUT update subject component (Admin only)
router.put(
  "/:id",
  isAdmin,
  [idParamRule, ...subjectComponentRules],
  validate,
  subjectComponentController.updateSubjectComponent
);

// DELETE subject component (Admin only)
router.delete(
  "/:id",
  isAdmin,
  [idParamRule],
  validate,
  subjectComponentController.deleteSubjectComponent
);

module.exports = router;
