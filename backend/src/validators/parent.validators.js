const { body } = require("express-validator");
const {
  idParamRule,
  paginationRules,
  emailRule,
  passwordRule,
  firstNameRule,
  lastNameRule,
  phoneRule,
} = require("./common.validators");
const { RELATIONSHIPS } = require("../services/parent.service");

const createParentRules = [
  emailRule,
  passwordRule,
  firstNameRule,
  lastNameRule,
  phoneRule,
  body("occupation")
    .optional()
    .isString()
    .withMessage("Occupation must be text"),
  body("workplace").optional().isString().withMessage("Workplace must be text"),
  body("address").optional().isString().withMessage("Address must be text"),
  body("students")
    .isArray({ min: 1 })
    .withMessage("At least one student link is required"),
  body("students.*.studentId")
    .isInt({ min: 1 })
    .withMessage("Student ID must be a valid integer"),
  body("students.*.relationship")
    .isIn(RELATIONSHIPS)
    .withMessage("Relationship must be father, mother, or guardian"),
  body("students.*.isPrimary")
    .optional()
    .isBoolean()
    .withMessage("isPrimary must be boolean"),
];

const updateParentRules = [
  idParamRule,
  body("email").optional().isEmail().withMessage("Valid email is required"),
  body("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty"),
  body("lastName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name cannot be empty"),
  phoneRule.optional(),
  body("status")
    .optional()
    .isIn(["active", "inactive", "suspended"])
    .withMessage("Invalid status"),
  body("occupation").optional().isString(),
  body("workplace").optional().isString(),
  body("address").optional().isString(),
  body("newPassword")
    .optional()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
];

const linkStudentRules = [
  idParamRule,
  body("studentId")
    .isInt({ min: 1 })
    .withMessage("Valid studentId is required"),
  body("relationship").isIn(RELATIONSHIPS).withMessage("Invalid relationship"),
  body("isPrimary")
    .optional()
    .isBoolean()
    .withMessage("isPrimary must be boolean"),
];

const unlinkStudentRules = [
  idParamRule,
  body("studentId")
    .isInt({ min: 1 })
    .withMessage("Valid studentId is required"),
];

module.exports = {
  createParentRules,
  updateParentRules,
  linkStudentRules,
  unlinkStudentRules,
  parentPaginationRules: paginationRules,
};
