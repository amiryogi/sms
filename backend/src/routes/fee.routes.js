const express = require("express");
const router = express.Router();

const feeTypeController = require("../controllers/feeType.controller");
const feeStructureController = require("../controllers/feeStructure.controller");
const financeController = require("../controllers/finance.controller");
const { body, param, query } = require("express-validator");
const {
  idParam: financeIdParam,
  note: financeNote,
  reason: financeReason,
  recordPaymentRules,
  transactionListRules,
  daybookRules,
  billRules,
  studentBillRules,
  reversalRules,
  discountRules,
  discountUpdateRules,
  discountListRules,
  accountListRules,
  templateRules,
  dashboardRules,
  reportRules,
} = require("../validators/finance.validators");
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
  feeStructureQueryRules,
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
// LEDGER (docs/plans/finance-and-portals.md §5)
// Fee staff = ACCOUNTANT, ADMIN, SUPER_ADMIN (canManageFees).
// Approvals, direct reversals, waivers and reconcile are admin only (isAdmin);
// the services also refuse to let anyone approve their own request.
// =====================================================

// Accounts and statements
router.get("/accounts", canManageFees, accountListRules, validate, financeController.listAccounts);
router.get("/accounts/:studentId", canReadFees, [studentIdParamRule], validate, financeController.getStatement);

// Fee bills / due notices: a class at once (fee staff), or one student (ownership-checked)
router.get("/bills", canManageFees, billRules, validate, financeController.listBills);
router.get("/bills/student/:studentId", canReadFees, [studentIdParamRule, ...studentBillRules], validate, financeController.getStudentBill);

// Payments (the ledger is append-only: no update or delete routes)
router.post("/transactions", canManageFees, recordPaymentRules, validate, financeController.recordPayment);
router.get("/transactions", canManageFees, transactionListRules, validate, financeController.listTransactions);
// The printed day book (before /transactions/:id, which would read "daybook" as an id)
router.get("/transactions/daybook", canManageFees, daybookRules, validate, financeController.getDaybook);
router.get("/transactions/:id", canReadFees, [financeIdParam()], validate, financeController.getTransaction);

// Reversals
router.post("/transactions/:id/reversal-requests", canManageFees, [financeIdParam(), ...reversalRules], validate, financeController.requestReversal);
router.post("/transactions/:id/reverse", isAdmin, [financeIdParam(), ...reversalRules], validate, financeController.reverseDirectly);
router.get("/reversal-requests", canManageFees, [query("status").optional({ values: "falsy" }).isIn(["PENDING", "APPROVED", "REJECTED"])], validate, financeController.listReversalRequests);
router.post("/reversal-requests/:id/approve", isAdmin, [financeIdParam(), financeNote], validate, financeController.approveReversal);
router.post("/reversal-requests/:id/reject", isAdmin, [financeIdParam(), financeNote], validate, financeController.rejectReversal);

// Discounts and scholarships
router.get("/discounts", canManageFees, discountListRules, validate, financeController.listDiscounts);
router.post("/discounts", canManageFees, discountRules, validate, financeController.requestDiscount);
router.put("/discounts/:id", canManageFees, discountUpdateRules, validate, financeController.updateDiscount);
router.post("/discounts/:id/approve", isAdmin, [financeIdParam(), financeNote], validate, financeController.approveDiscount);
router.post("/discounts/:id/reject", isAdmin, [financeIdParam(), financeNote], validate, financeController.rejectDiscount);
router.post("/discounts/:id/revoke", isAdmin, [financeIdParam(), financeReason()], validate, financeController.revokeDiscount);

// Obligations and installment plans
router.post("/obligations/generate/:studentClassId", canManageFees, [studentClassIdParamRule], validate, financeController.generateForEnrolment);
router.post("/obligations/generate-bulk", canManageFees, bulkGenerateFeesRules, validate, financeController.generateForClass);
router.post("/obligations/:id/cancel", isAdmin, [financeIdParam(), financeReason()], validate, financeController.cancelObligation);
router.get("/structures/:id/installments", canManageFees, [financeIdParam()], validate, financeController.getInstallmentTemplate);
router.put("/structures/:id/installments", canManageFees, templateRules, validate, financeController.setInstallmentTemplate);

// Dashboard and reports (Phase 5): fee staff only
router.get("/dashboard", canManageFees, dashboardRules, validate, financeController.getDashboard);
router.get("/reports/:report", canManageFees, reportRules, validate, financeController.getReport);

// Integrity check: recompute every cached balance from the ledger (read-only)
router.get("/reconcile", isAdmin, financeController.reconcile);

module.exports = router;
