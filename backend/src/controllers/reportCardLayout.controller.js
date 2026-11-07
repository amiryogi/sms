const { Prisma } = require("@prisma/client");
const prisma = require("../config/database");
const {
  ApiError,
  ApiResponse,
  asyncHandler,
  gradeCalculator,
  dateConverter,
} = require("../utils");
const { toGradeReference } = require("../utils/gradeScale");
const { getDefaultScale } = require("../services/gradeScale.service");
const {
  TEMPLATE_FIELDS,
  SCHOOL_REPORT_SELECT,
  validateLayout,
  normalizeLayout,
  classWithNumeral,
  issueDateBS,
  listPresets,
  schoolForReport,
} = require("../utils/reportCardLayout");

/**
 * School Settings -> Report Card Layout.
 *
 * One layout per school, stored on School.reportCardConfig. Every report-card
 * response carries the normalized layout as `layout`, so students, parents and
 * bulk print all follow it without re-login.
 *
 * Unlike grade scales, a layout is not snapshotted on each report card: it only
 * changes how the same grades are printed, never what they are.
 */

// Marks for the preview's made-up student. Graded on the school's own default
// scale, so the preview shows the letters and points that school would print.
const SAMPLE_SUBJECTS = [
  { name: "English", code: "ENG", th: [62, 75], pr: [21, 25] },
  { name: "Nepali", code: "NEP", th: [41, 75], pr: [20, 25] },
  { name: "Science & Technology", code: "SCI", th: [48, 75], pr: [19, 25] },
  { name: "Social Studies", code: "SOC", th: [37, 75], pr: [18, 25] },
  { name: "Compulsory Mathematics", code: "MTH", th: [58, 100], pr: null },
  { name: "Optional Mathematics", code: "OPT", th: [86, 100], pr: null },
];

const buildSample = (school, scale) => {
  const subjects = SAMPLE_SUBJECTS.map((s, i) => {
    const g = gradeCalculator.calculateSubjectGrade(
      {
        theoryMarks: s.th[0],
        theoryFullMarks: s.th[1],
        practicalMarks: s.pr ? s.pr[0] : null,
        practicalFullMarks: s.pr ? s.pr[1] : 0,
        hasPractical: Boolean(s.pr),
        isAbsent: false,
      },
      scale,
    );
    return {
      subjectId: -(i + 1),
      subjectName: s.name,
      subjectCode: s.code,
      creditHours: 4,
      theoryCreditHours: s.pr ? 3 : 4,
      internalCreditHours: s.pr ? 1 : 0,
      hasTheory: true,
      hasPractical: Boolean(s.pr),
      ...g,
    };
  });
  const overall = gradeCalculator.calculateOverallGPA(subjects, { scale });
  const now = new Date();
  const yearAD = now.getFullYear();

  return {
    school: schoolForReport(school),
    examination: {
      name: "First Term Examination",
      academicYear: `${yearAD}-${yearAD + 1}`,
      academicYearBS: String(dateConverter.getApproxBSYear(yearAD)),
      yearAD: String(yearAD),
      yearBS: String(dateConverter.getApproxBSYear(yearAD)),
    },
    student: {
      id: 0,
      name: "Sample Student",
      rollNumber: 7,
      class: "Grade 9",
      classWithNumeral: classWithNumeral(9),
      section: "A",
      gradeLevel: 9,
      admissionNumber: "ADM-2083-001",
    },
    subjects,
    summary: {
      totalMarks: subjects.reduce((t, s) => t + s.totalMarks, 0),
      totalFullMarks: subjects.reduce((t, s) => t + s.totalFullMarks, 0),
      percentage: overall.averagePercentage,
      gpa: overall.gpa,
      grade: overall.grade,
      classRank: 4,
      isPassed: overall.isPassed,
      resultStatus: gradeCalculator.getResultStatus(overall.isPassed),
      totalSubjects: overall.totalSubjects,
      passedSubjects: overall.passedSubjects,
      failedSubjects: overall.failedSubjects,
      attendancePresent: null,
      attendanceTotal: null,
    },
    remarks: {
      teacher: "Works hard; needs more practice in Social Studies.",
      principal: null,
    },
    meta: {
      reportCardId: 0,
      isPublished: false,
      generatedAt: now,
      issueDateBS: issueDateBS(now),
      gradeScale: scale.name,
      isSample: true,
    },
    gradeReference: toGradeReference(scale),
  };
};

const respondWithLayout = async (req, res, message) => {
  const school = await prisma.school.findUnique({
    where: { id: req.user.schoolId },
    select: SCHOOL_REPORT_SELECT,
  });
  if (!school) throw ApiError.notFound("School not found");

  const scale = await getDefaultScale(req.user.schoolId);

  return ApiResponse.success(
    res,
    {
      config: normalizeLayout(school.reportCardConfig),
      isCustom: school.reportCardConfig !== null,
      presets: listPresets(),
      templateFields: TEMPLATE_FIELDS,
      sample: buildSample(school, scale),
    },
    message,
  );
};

/**
 * @desc    The school's report-card layout, the presets, and a sample card
 * @route   GET /api/v1/report-card-layout
 * @access  Private/Admin
 */
const getLayout = asyncHandler(async (req, res) =>
  respondWithLayout(req, res, "Report card layout"),
);

/**
 * @desc    Save the school's report-card layout
 * @route   PUT /api/v1/report-card-layout   body: { config }
 * @access  Private/Admin
 */
const updateLayout = asyncHandler(async (req, res) => {
  const raw = req.body?.config;
  const errors = validateLayout(raw);
  if (errors.length) {
    throw ApiError.badRequest("The report card layout is not valid", errors);
  }

  await prisma.school.update({
    where: { id: req.user.schoolId },
    data: { reportCardConfig: normalizeLayout(raw) },
  });

  return respondWithLayout(req, res, "Report card layout saved");
});

/**
 * @desc    Go back to the original NEB grade sheet
 * @route   DELETE /api/v1/report-card-layout
 * @access  Private/Admin
 */
const resetLayout = asyncHandler(async (req, res) => {
  await prisma.school.update({
    where: { id: req.user.schoolId },
    data: { reportCardConfig: Prisma.DbNull },
  });

  return respondWithLayout(req, res, "Report card layout reset");
});

module.exports = { getLayout, updateLayout, resetLayout };
