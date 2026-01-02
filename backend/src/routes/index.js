const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const academicYearRoutes = require("./academicYear.routes");
const classRoutes = require("./class.routes");
const sectionRoutes = require("./section.routes");
const subjectRoutes = require("./subject.routes");
const classSubjectRoutes = require("./classSubject.routes");
const studentRoutes = require("./student.routes");
const teacherRoutes = require("./teacher.routes");
const teacherSubjectRoutes = require("./teacherSubject.routes");
const attendanceRoutes = require("./attendance.routes");
const examRoutes = require("./exam.routes");
const examResultRoutes = require("./examResult.routes");
const resultRoutes = require("./result.routes");
const reportCardRoutes = require("./reportCard.routes");
const assignmentRoutes = require("./assignment.routes");
const submissionRoutes = require("./submission.routes");
const uploadRoutes = require("./upload.routes");
// These will be created in subsequent steps
// const assignmentRoutes = require('./assignment.routes');
// const noticeRoutes = require('./notice.routes');
// const promotionRoutes = require('./promotion.routes');

// API Version prefix
const API_VERSION = "/v1";

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/users`, userRoutes);
router.use(`${API_VERSION}/academic-years`, academicYearRoutes);
router.use(`${API_VERSION}/classes`, classRoutes);
router.use(`${API_VERSION}/sections`, sectionRoutes);
router.use(`${API_VERSION}/subjects`, subjectRoutes);
router.use(`${API_VERSION}/class-subjects`, classSubjectRoutes);
router.use(`${API_VERSION}/students`, studentRoutes);
router.use(`${API_VERSION}/teachers`, teacherRoutes);
router.use(`${API_VERSION}/teacher-subjects`, teacherSubjectRoutes);
router.use(`${API_VERSION}/attendance`, attendanceRoutes);
router.use(`${API_VERSION}/exams`, examRoutes);
router.use(`${API_VERSION}/exam-results`, examResultRoutes);
router.use(`${API_VERSION}/results`, resultRoutes);
router.use(`${API_VERSION}/report-cards`, reportCardRoutes);
router.use(`${API_VERSION}/assignments`, assignmentRoutes);
router.use(`${API_VERSION}/submissions`, submissionRoutes);
router.use(`${API_VERSION}/uploads`, uploadRoutes);
// router.use(`${API_VERSION}/notices`, noticeRoutes);
// router.use(`${API_VERSION}/notices`, noticeRoutes);
// router.use(`${API_VERSION}/promotions`, promotionRoutes);

// Root route
router.get("/", (req, res) => {
  res.json({
    message: "School Management System API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/v1/auth",
      users: "/api/v1/users",
      students: "/api/v1/students",
      teachers: "/api/v1/teachers",
      academicYears: "/api/v1/academic-years",
      classes: "/api/v1/classes",
      sections: "/api/v1/sections",
      subjects: "/api/v1/subjects",
      classSubjects: "/api/v1/class-subjects",
      teacherSubjects: "/api/v1/teacher-subjects",
      attendance: "/api/v1/attendance",
      exams: "/api/v1/exams",
      results: "/api/v1/results",
      reportCards: "/api/v1/report-cards",
      assignments: "/api/v1/assignments",
      notices: "/api/v1/notices",
      promotions: "/api/v1/promotions",
    },
  });
});

module.exports = router;
