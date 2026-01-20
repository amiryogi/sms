const express = require("express");
const router = express.Router();

const feeTypeController = require("../controllers/feeType.controller");
const feeStructureController = require("../controllers/feeStructure.controller");
const feePaymentController = require("../controllers/feePayment.controller");
const { authenticate, isAdmin, canManageFees, validate } = require("../middleware");
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

// All fee routes require authentication
router.use(authenticate);

// =====================================================
// FEE TYPES
// =====================================================

// GET /api/v1/fees/types - Get all fee types
router.get("/types", feeTypeController.getFeeTypes);

// GET /api/v1/fees/types/:id - Get single fee type
router.get("/types/:id", [idParamRule], validate, feeTypeController.getFeeType);

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
  feeStructureQueryRules,
  validate,
  feeStructureController.getFeeStructures
);

// GET /api/v1/fees/structures/by-class/:classId/:academicYearId - Get structures for class
router.get(
  "/structures/by-class/:classId/:academicYearId",
  feeStructureController.getFeeStructuresByClass
);

// GET /api/v1/fees/structures/:id - Get single fee structure
router.get(
  "/structures/:id",
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
  studentFeeQueryRules,
  validate,
  feePaymentController.getFeePayments
);

// GET /api/v1/fees/payments/student/:studentId - Get student fee summary
router.get(
  "/payments/student/:studentId",
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
  feePaymentController.bulkGenerateFees
);

module.exports = router;
