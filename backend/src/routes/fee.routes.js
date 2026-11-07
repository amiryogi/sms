const express = require("express");
const router = express.Router();

const feeTypeController = require("../controllers/feeType.controller");
const feeStructureController = require("../controllers/feeStructure.controller");
const feePaymentController = require("../controllers/feePayment.controller");
const { body, param } = require("express-validator");
const {
  authenticate,
  isAdmin,
  canManageFees,
  requireRole,
  validate,
} = require("../middleware");
const {
  idParamRule,
  feeTypeRules,
  feeTypeUpdateRules,
  feeStructureRules,
  feeStructureUpdateRules,
  feePaymentRules,
  feeStructureQueryRules,
  studentFeeQueryRules,
  feePaymentIdParamRule,
  studentClassIdParamRule,
  studentIdParamRule,
} = require("../validators");

// Roles that may read fee data. Teachers and exam officers have no business
// with fees; students and parents are narrowed to their own records in the
// controllers.
const canReadFees = requireRole(
  "ADMIN",
  "SUPER_ADMIN",
  "ACCOUNTANT",
  "STUDENT",
  "PARENT"
);

// Route-local validators (not in validators/fee.validators.js)
const byClassParamRules = [
  param("classId")
    .isInt({ min: 1 })
    .withMessage("Class ID must be a valid positive integer"),
  param("academicYearId")
    .isInt({ min: 1 })
    .withMessage("Academic Year ID must be a valid positive integer"),
];

const bulkFeeStructureRules = [
  body("classId")
    .isInt({ min: 1 })
    .withMessage("Valid Class ID is required")
    .toInt(),
  body("academicYearId")
    .isInt({ min: 1 })
    .withMessage("Valid Academic Year ID is required")
    .toInt(),
  body("fees")
    .isArray({ min: 1 })
    .withMessage("fees must be a non-empty array"),
  body("fees.*.feeTypeId")
    .isInt({ min: 1 })
    .withMessage("Each fee needs a valid Fee Type ID")
    .toInt(),
  body("fees.*.amount")
    .isFloat({ min: 0 })
    .withMessage("Each fee amount must be a valid positive number"),
];

const bulkGenerateFeesRules = [
  body("classId")
    .isInt({ min: 1 })
    .withMessage("Valid Class ID is required")
    .toInt(),
  body("academicYearId")
    .isInt({ min: 1 })
    .withMessage("Valid Academic Year ID is required")
    .toInt(),
];

// All fee routes require authentication
router.use(authenticate);

// =====================================================
// FEE TYPES
// =====================================================

// GET /api/v1/fees/types - Get all fee types
router.get("/types", canReadFees, feeTypeController.getFeeTypes);

// GET /api/v1/fees/types/:id - Get single fee type
router.get(
  "/types/:id",
  canReadFees,
  [idParamRule],
  validate,
  feeTypeController.getFeeType
);

// POST /api/v1/fees/types - Create fee type (Admin or Accountant)
router.post(
  "/types",
  canManageFees,
  feeTypeRules,
  validate,
  feeTypeController.createFeeType
);

// PUT /api/v1/fees/types/:id - Update fee type (Admin or Accountant)
router.put(
  "/types/:id",
  canManageFees,
  [idParamRule, ...feeTypeUpdateRules],
  validate,
  feeTypeController.updateFeeType
);

// DELETE /api/v1/fees/types/:id - Delete fee type (Admin only)
router.delete(
  "/types/:id",
  isAdmin,
  [idParamRule],
  validate,
  feeTypeController.deleteFeeType
);

// =====================================================
// FEE STRUCTURES
// =====================================================

// GET /api/v1/fees/structures - Get all fee structures
router.get(
  "/structures",
  canReadFees,
  feeStructureQueryRules,
  validate,
  feeStructureController.getFeeStructures
);

// GET /api/v1/fees/structures/by-class/:classId/:academicYearId - Get structures for class
router.get(
  "/structures/by-class/:classId/:academicYearId",
  canReadFees,
  byClassParamRules,
  validate,
  feeStructureController.getFeeStructuresByClass
);

// GET /api/v1/fees/structures/:id - Get single fee structure
router.get(
  "/structures/:id",
  canReadFees,
  [idParamRule],
  validate,
  feeStructureController.getFeeStructure
);

// POST /api/v1/fees/structures - Create fee structure (Admin or Accountant)
router.post(
  "/structures",
  canManageFees,
  feeStructureRules,
  validate,
  feeStructureController.createFeeStructure
);

// POST /api/v1/fees/structures/bulk - Bulk create fee structures (Admin or Accountant)
router.post(
  "/structures/bulk",
  canManageFees,
  bulkFeeStructureRules,
  validate,
  feeStructureController.bulkCreateFeeStructures
);

// PUT /api/v1/fees/structures/:id - Update fee structure (Admin or Accountant)
router.put(
  "/structures/:id",
  canManageFees,
  [idParamRule, ...feeStructureUpdateRules],
  validate,
  feeStructureController.updateFeeStructure
);

// DELETE /api/v1/fees/structures/:id - Delete fee structure (Admin only)
router.delete(
  "/structures/:id",
  isAdmin,
  [idParamRule],
  validate,
  feeStructureController.deleteFeeStructure
);

// =====================================================
// FEE PAYMENTS
// =====================================================

// GET /api/v1/fees/payments - Get all payments (filtered by role)
router.get(
  "/payments",
  canReadFees,
  studentFeeQueryRules,
  validate,
  feePaymentController.getFeePayments
);

// GET /api/v1/fees/payments/student/:studentId - Get student fee summary
router.get(
  "/payments/student/:studentId",
  canReadFees,
  [studentIdParamRule],
  validate,
  feePaymentController.getStudentFeeSummary
);

// POST /api/v1/fees/payments/:feePaymentId/pay - Record payment (Admin or Accountant)
router.post(
  "/payments/:feePaymentId/pay",
  canManageFees,
  [feePaymentIdParamRule, ...feePaymentRules],
  validate,
  feePaymentController.recordPayment
);

// POST /api/v1/fees/payments/generate/:studentClassId - Generate fees for student (Admin or Accountant)
router.post(
  "/payments/generate/:studentClassId",
  canManageFees,
  [studentClassIdParamRule],
  validate,
  feePaymentController.generateStudentFees
);

// POST /api/v1/fees/payments/generate-bulk - Bulk generate fees (Admin or Accountant)
router.post(
  "/payments/generate-bulk",
  canManageFees,
  bulkGenerateFeesRules,
  validate,
  feePaymentController.bulkGenerateFees
);

module.exports = router;
