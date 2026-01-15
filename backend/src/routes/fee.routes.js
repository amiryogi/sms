const express = require("express");
const router = express.Router();

const feeTypeController = require("../controllers/feeType.controller");
const feeStructureController = require("../controllers/feeStructure.controller");
const feePaymentController = require("../controllers/feePayment.controller");
const { authenticate, isAdmin, validate } = require("../middleware");
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

// POST /api/v1/fees/types - Create fee type (Admin only)
router.post(
  "/types",
  isAdmin,
  feeTypeRules,
  validate,
  feeTypeController.createFeeType
);

// PUT /api/v1/fees/types/:id - Update fee type (Admin only)
router.put(
  "/types/:id",
  isAdmin,
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

// POST /api/v1/fees/structures - Create fee structure (Admin only)
router.post(
  "/structures",
  isAdmin,
  feeStructureRules,
  validate,
  feeStructureController.createFeeStructure
);

// POST /api/v1/fees/structures/bulk - Bulk create fee structures (Admin only)
router.post(
  "/structures/bulk",
  isAdmin,
  feeStructureController.bulkCreateFeeStructures
);

// PUT /api/v1/fees/structures/:id - Update fee structure (Admin only)
router.put(
  "/structures/:id",
  isAdmin,
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
  [idParamRule],
  validate,
  feePaymentController.getStudentFeeSummary
);

// POST /api/v1/fees/payments/:feePaymentId/pay - Record payment (Admin only)
router.post(
  "/payments/:feePaymentId/pay",
  isAdmin,
  [feePaymentIdParamRule, ...feePaymentRules],
  validate,
  feePaymentController.recordPayment
);

// POST /api/v1/fees/payments/generate/:studentClassId - Generate fees for student (Admin only)
router.post(
  "/payments/generate/:studentClassId",
  isAdmin,
  [studentClassIdParamRule],
  validate,
  feePaymentController.generateStudentFees
);

// POST /api/v1/fees/payments/generate-bulk - Bulk generate fees (Admin only)
router.post(
  "/payments/generate-bulk",
  isAdmin,
  feePaymentController.bulkGenerateFees
);

module.exports = router;
