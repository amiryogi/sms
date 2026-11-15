const { body } = require("express-validator");
const { isDateOnly } = require("../utils/calendar/dateValidation");

const assignmentRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("teacherSubjectId")
    .isInt()
    .withMessage("Valid teacher subject ID is required"),
  body("dueDate").optional().custom(isDateOnly).withMessage("Valid due date required"),
  body("totalMarks").optional().isInt({ min: 1 }),
  body("isPublished").optional(),
];

const submissionRules = [
  body("assignmentId").isInt().withMessage("Valid assignment ID is required"),
  body("content").optional().trim(),
];

const gradingRules = [
  body("marksObtained")
    .isDecimal({ min: 0 })
    .withMessage("Marks must be a non-negative number"),
  body("feedback").optional().trim(),
];

module.exports = {
  assignmentRules,
  submissionRules,
  gradingRules,
};
