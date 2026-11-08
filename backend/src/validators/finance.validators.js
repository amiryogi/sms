/**
 * Validation for the fee ledger endpoints (docs/plans/finance-and-portals.md §5).
 * Money is checked here for shape (positive, at most 2 decimals); the services
 * check it again against balances under a lock.
 */
const { body, param, query } = require("express-validator");

const METHODS = ["cash", "cheque", "bank_transfer", "wallet", "card"];
const REVERSAL_CATEGORIES = ["CORRECTION", "REFUND"];
const twoDecimals = (value) => /^\d+(\.\d{1,2})?$/.test(String(value));

const money = (field) =>
  body(field)
    .custom((v) => twoDecimals(v) && Number(v) > 0)
    .withMessage(`${field} must be an amount greater than 0 with at most 2 decimal places`);

const reason = (field = "reason") =>
  body(field).isString().trim().isLength({ min: 5, max: 500 }).withMessage(`${field} must be 5 to 500 characters`);

const note = body("note").optional({ values: "falsy" }).isString().trim().isLength({ max: 500 }).withMessage("note cannot exceed 500 characters");

const idParam = (name = "id") => param(name).isInt({ min: 1 }).withMessage(`${name} must be a positive integer`).toInt();

const recordPaymentRules = [
  body("studentId").isInt({ min: 1 }).withMessage("studentId is required").toInt(),
  body("academicYearId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
  money("amount"),
  body("allocations").optional().isArray({ max: 100 }).withMessage("allocations must be a list"),
  body("allocations.*.installmentId").isInt({ min: 1 }).withMessage("Each allocation needs an installmentId").toInt(),
  body("allocations.*.amount")
    .custom((v) => twoDecimals(v) && Number(v) > 0)
    .withMessage("Each allocation amount must be greater than 0 with at most 2 decimal places"),
  body("method").isIn(METHODS).withMessage(`method must be one of: ${METHODS.join(", ")}`),
  body("reference").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
  body("remarks").optional({ values: "falsy" }).isString().trim().isLength({ max: 500 }),
  body("paidOn").optional({ values: "falsy" }).isISO8601({ strict: true }).withMessage("paidOn must be a date (YYYY-MM-DD)"),
  body("idempotencyKey").optional({ values: "falsy" }).isUUID().withMessage("idempotencyKey must be a UUID"),
];

const transactionListRules = [
  query("from").optional({ values: "falsy" }).isISO8601(),
  query("to").optional({ values: "falsy" }).isISO8601(),
  query("type").optional({ values: "falsy" }).isIn(["PAYMENT", "REVERSAL"]),
  query("method").optional({ values: "falsy" }).isIn(METHODS),
  query("classId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
  query("academicYearId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
  query("studentId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
];

const reversalRules = [reason(), body("category").isIn(REVERSAL_CATEGORIES).withMessage("category must be CORRECTION or REFUND")];

const discountRules = [
  body("studentId").isInt({ min: 1 }).withMessage("studentId is required").toInt(),
  body("academicYearId").isInt({ min: 1 }).withMessage("academicYearId is required").toInt(),
  body("feeTypeId").optional({ values: "null" }).isInt({ min: 1 }).toInt(),
  body("kind").isIn(["FIXED", "PERCENT"]).withMessage("kind must be FIXED or PERCENT"),
  money("value"),
  body("category").isIn(["DISCOUNT", "SCHOLARSHIP"]).withMessage("category must be DISCOUNT or SCHOLARSHIP"),
  body("name").isString().trim().isLength({ min: 2, max: 100 }).withMessage("name must be 2 to 100 characters"),
  reason(),
];

const discountUpdateRules = [
  idParam(),
  body("feeTypeId").optional({ values: "null" }).isInt({ min: 1 }).toInt(),
  body("kind").optional().isIn(["FIXED", "PERCENT"]),
  body("value").optional().custom((v) => twoDecimals(v) && Number(v) > 0).withMessage("value must be greater than 0 with at most 2 decimal places"),
  body("category").optional().isIn(["DISCOUNT", "SCHOLARSHIP"]),
  body("name").optional().isString().trim().isLength({ min: 2, max: 100 }),
  body("reason").optional().isString().trim().isLength({ min: 5, max: 500 }),
];

const discountListRules = [
  query("status").optional({ values: "falsy" }).isIn(["PENDING", "APPROVED", "REJECTED", "REVOKED"]),
  query("studentId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
  query("academicYearId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
];

const accountListRules = [
  query("academicYearId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
  query("classId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
  query("sectionId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
  query("status").optional({ values: "falsy" }).isIn(["paid", "partial", "pending", "overdue", "none"]),
  query("search").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
];

const templateRules = [
  idParam(),
  body("installments").isArray({ max: 24 }).withMessage("installments must be a list of up to 24"),
  body("installments.*.label").isString().trim().isLength({ min: 1, max: 100 }).withMessage("Each installment needs a label"),
  body("installments.*.dueDate").optional({ values: "null" }).isISO8601().withMessage("dueDate must be a date"),
  body("installments.*.amount").custom((v) => twoDecimals(v) && Number(v) > 0).withMessage("Each amount must be greater than 0 with at most 2 decimal places"),
];

module.exports = {
  PAYMENT_METHODS: METHODS,
  idParam,
  note,
  reason,
  recordPaymentRules,
  transactionListRules,
  reversalRules,
  discountRules,
  discountUpdateRules,
  discountListRules,
  accountListRules,
  templateRules,
};

const dashboardRules = [
  query("academicYearId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
  query("classId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
  query("feeTypeId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
  query("method").optional({ values: "falsy" }).isIn(METHODS),
  query("from").optional({ values: "falsy" }).isISO8601({ strict: true }).withMessage("from must be a date (YYYY-MM-DD)"),
  query("to").optional({ values: "falsy" }).isISO8601({ strict: true }).withMessage("to must be a date (YYYY-MM-DD)"),
];

const reportRules = [
  param("report").isIn(["collections", "outstanding", "discounts", "reversals"]).withMessage("Unknown report"),
  ...dashboardRules,
  query("sectionId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
  query("groupBy").optional({ values: "falsy" }).isIn(["day", "month", "class", "feeType", "method"]),
  query("status").optional({ values: "falsy" }).isIn(["PENDING", "APPROVED", "REJECTED", "REVOKED"]),
  query("overdueOnly").optional({ values: "falsy" }).isIn(["true", "false"]),
  query("format").optional({ values: "falsy" }).isIn(["json", "csv"]),
];

module.exports.dashboardRules = dashboardRules;
module.exports.reportRules = reportRules;
