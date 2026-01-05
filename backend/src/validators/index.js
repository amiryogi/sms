const commonValidators = require("./common.validators");
const userValidators = require("./user.validators");
const academicValidators = require("./academic.validators");
const studentValidators = require("./student.validators");
const teacherValidators = require("./teacher.validators");
const examValidators = require("./exam.validators");
const assignmentValidators = require("./assignment.validators");
const parentValidators = require("./parent.validators");
const noticeValidators = require("./notice.validators");

module.exports = {
  ...commonValidators,
  ...userValidators,
  ...academicValidators,
  ...studentValidators,
  ...teacherValidators,
  ...examValidators,
  ...assignmentValidators,
  ...parentValidators,
  ...noticeValidators,
};
