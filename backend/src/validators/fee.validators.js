const { body, param, query } = require("express-validator");
// Param validators
const studentClassIdParamRule = param("studentClassId")
  .isInt({ min: 1 })
  .withMessage("Student Class ID must be a valid positive integer");

const studentIdParamRule = param("studentId")
  .isInt({ min: 1 })
  .withMessage("Student ID must be a valid positive integer");
// Fee Type validators
const feeTypeRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Fee type name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("description").optional().trim(),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

const feeTypeUpdateRules = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Fee type name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("description").optional().trim(),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

// Fee Structure validators
const feeStructureRules = [
  body("feeTypeId")
    .isInt({ min: 1 })
    .withMessage("Valid Fee Type ID is required"),
  body("classId").isInt({ min: 1 }).withMessage("Valid Class ID is required"),
  body("academicYearId")
    .isInt({ min: 1 })
    .withMessage("Valid Academic Year ID is required"),
  body("amount")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a valid positive number"),
];

const feeStructureUpdateRules = [
  body("amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Amount must be a valid positive number"),
];

// Query validators for filtering
const feeStructureQueryRules = [
  query("classId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Class ID must be a valid integer"),
  query("academicYearId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Academic Year ID must be a valid integer"),
  query("feeTypeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Fee Type ID must be a valid integer"),
];

module.exports = {
  studentClassIdParamRule,
  studentIdParamRule,
  feeTypeRules,
  feeTypeUpdateRules,
  feeStructureRules,
  feeStructureUpdateRules,
  feeStructureQueryRules,
};
