const prisma = require("../config/database");
const {
  ApiError,
  ApiResponse,
  asyncHandler,
  gradeCalculator,
  dateConverter,
} = require("../utils");
const { toGradeReference } = require("../utils/gradeScale");
const {
  SCHOOL_REPORT_SELECT,
  normalizeLayout,
  classWithNumeral,
  issueDateBS,
  schoolForReport,
} = require("../utils/reportCardLayout");
const {
  attendanceWindow,
  attendanceDateFilter,
  tallyAttendance,
  attendanceForCard,
} = require("../utils/reportCardAttendance");
const {
  getDefaultScale,
  getScaleResolver,
} = require("../services/gradeScale.service");

/**
 * Build detailed subject results with Nepal-style grading
 * @param {Array} examResults - Raw exam results from database
 * @param {Object} scale - Normalized grade scale (see services/gradeScale.service.js)
 * @returns {Array} Processed subject results with grades and GPAs
 */
const buildSubjectResults = (examResults, scale) => {
  return examResults.map((result) => {
    const examSubject = result.examSubject;
    const classSubject = examSubject.classSubject;
    const totalCreditHours = parseFloat(classSubject.creditHours) || 4;

    // Calculate subject grade using Nepal rules, on the school's scale
    const gradeResult = gradeCalculator.calculateSubjectGrade(
      {
        theoryMarks: result.marksObtained,
        theoryFullMarks: examSubject.theoryFullMarks || examSubject.fullMarks,
        practicalMarks: result.practicalMarks,
        practicalFullMarks: examSubject.practicalFullMarks || 0,
        hasPractical: examSubject.hasPractical,
        isAbsent: result.isAbsent,
      },
      scale,
    );

    // Credit hour breakdown comes from the ClassSubject database fields
    let theoryCreditHours = parseFloat(classSubject.theoryCreditHours) || 0;
    const internalCreditHours =
      parseFloat(classSubject.practicalCreditHours) || 0;

    // Fallback: if not set in DB, use total credit hours for theory only
    if (theoryCreditHours === 0 && internalCreditHours === 0) {
      theoryCreditHours = totalCreditHours;
    }

    return {
      subjectId: classSubject.subject.id,
      subjectName: classSubject.subject.name,
      subjectCode: classSubject.subject.code,
      creditHours: totalCreditHours,
      theoryCreditHours,
      internalCreditHours,
      hasTheory: examSubject.hasTheory,
      hasPractical: examSubject.hasPractical,
      // Theory details
      theoryMarks: gradeResult.theoryMarks,
      theoryFullMarks: gradeResult.theoryFullMarks,
      theoryPercentage: gradeResult.theoryPercentage,
      theoryGrade: gradeResult.theoryGrade,
      theoryGpa: gradeResult.theoryGpa,
      // Practical/Internal details
      practicalMarks: gradeResult.practicalMarks,
      practicalFullMarks: gradeResult.practicalFullMarks,
      practicalPercentage: gradeResult.practicalPercentage,
      practicalGrade: gradeResult.practicalGrade,
      practicalGpa: gradeResult.practicalGpa,
      // Final/Combined
      totalMarks: gradeResult.totalMarks,
      totalFullMarks: gradeResult.totalFullMarks,
      finalPercentage: gradeResult.finalPercentage,
      finalGrade: gradeResult.finalGrade,
      finalGpa: gradeResult.finalGpa,
      isPassed: gradeResult.isPassed,
      isAbsent: gradeResult.isAbsent,
      remark: gradeResult.remark,
    };
  });
};

/**
 * @desc    Get report cards for a class/section in an exam (Admin view)
 * @route   GET /api/v1/report-cards
 * @access  Private/Admin
 */
const getReportCards = asyncHandler(async (req, res) => {
  const { examId, classId, sectionId } = req.query;

  if (!examId || !classId || !sectionId) {
    throw ApiError.badRequest("Exam ID, Class ID, and Section ID are required");
  }

  // Get the exam with school info
  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(examId), schoolId: req.user.schoolId },
    include: {
      academicYear: true,
      examSubjects: {
        include: {
          classSubject: {
            include: { subject: true },
          },
        },
      },
    },
  });

  if (!exam) throw ApiError.notFound("Exam not found");

  // Get school info
  const school = await prisma.school.findUnique({
    where: { id: req.user.schoolId },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      logoUrl: true,
    },
  });

  // Get class and section info (scoped to the user's school)
  const classInfo = await prisma.class.findFirst({
    where: { id: parseInt(classId), schoolId: req.user.schoolId },
    select: { id: true, name: true, gradeLevel: true },
  });
  if (!classInfo) throw ApiError.notFound("Class not found");

  const sectionInfo = await prisma.section.findFirst({
    where: { id: parseInt(sectionId), schoolId: req.user.schoolId },
    select: { id: true, name: true },
  });
  if (!sectionInfo) throw ApiError.notFound("Section not found");

  // Get all students in this class/section for this academic year
  const enrollments = await prisma.studentClass.findMany({
    where: {
      classId: parseInt(classId),
      sectionId: parseInt(sectionId),
      academicYearId: exam.academicYearId,
      status: "active",
      schoolId: req.user.schoolId,
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          reportCards: {
            where: { examId: parseInt(examId) },
          },
        },
      },
      class: true,
      section: true,
    },
    orderBy: { rollNumber: "asc" },
  });

  // Get all exam results for these students
  const studentIds = enrollments.map((e) => e.studentId);

  const examResults = await prisma.examResult.findMany({
    where: {
      studentId: { in: studentIds },
      examSubject: {
        examId: parseInt(examId),
      },
    },
    include: {
      examSubject: {
        include: {
          classSubject: { include: { subject: true } },
        },
      },
    },
  });

  // Group results by student (subjects are class-wide for K-10)
  const resultsByStudent = {};

  enrollments.forEach((enrollment) => {
    resultsByStudent[enrollment.studentId] = examResults.filter(
      (r) => r.studentId === enrollment.studentId,
    );
  });

  // A student with a generated card is shown on that card's scale; one without
  // is previewed on the school default, which is what Generate would use.
  const scales = await getScaleResolver(req.user.schoolId);

  // Build response with student data, results, and report card status
  const data = enrollments.map((enrollment) => {
    const rawResults = resultsByStudent[enrollment.studentId] || [];
    const reportCard = enrollment.student.reportCards[0] || null;
    const scale = scales.forReportCard(reportCard);
    const subjectResults = buildSubjectResults(rawResults, scale);
    const overallResult = gradeCalculator.calculateOverallGPA(subjectResults, {
      scale,
    });

    const totalObtained = subjectResults.reduce(
      (sum, r) => sum + r.totalMarks,
      0,
    );
    const totalFull = subjectResults.reduce(
      (sum, r) => sum + r.totalFullMarks,
      0,
    );

    return {
      studentId: enrollment.studentId,
      enrollmentId: enrollment.id,
      rollNumber: enrollment.rollNumber,
      firstName: enrollment.student.user.firstName,
      lastName: enrollment.student.user.lastName,
      className: enrollment.class.name,
      sectionName: enrollment.section.name,
      results: subjectResults,
      totalObtained: Math.round(totalObtained * 100) / 100,
      totalFull,
      percentage: overallResult.averagePercentage,
      gpa: overallResult.gpa,
      overallGrade: overallResult.grade,
      isPassed: overallResult.isPassed,
      passedSubjects: overallResult.passedSubjects,
      failedSubjects: overallResult.failedSubjects,
      reportCard: reportCard
        ? {
            id: reportCard.id,
            overallGrade: reportCard.overallGrade,
            classRank: reportCard.classRank,
            isPublished: reportCard.isPublished,
            generatedAt: reportCard.generatedAt,
            daysPresent: reportCard.daysPresent,
            daysLate: reportCard.daysLate,
            totalWorkingDays: reportCard.totalWorkingDays,
          }
        : null,
    };
  });

  const window = attendanceWindow(exam, exam.academicYear);

  // Summary stats
  const summary = {
    examName: exam.name,
    examType: exam.examType,
    academicYear: exam.academicYear.name,
    school: school,
    class: classInfo,
    section: sectionInfo,
    totalStudents: data.length,
    reportCardsGenerated: data.filter((d) => d.reportCard).length,
    published: data.filter((d) => d.reportCard?.isPublished).length,
    passed: data.filter((d) => d.isPassed).length,
    failed: data.filter((d) => !d.isPassed).length,
    // Attendance: the admin enters working days per exam; generating freezes
    // them on each card, so cards made before a change need regenerating.
    attendance: {
      examId: exam.id,
      workingDays: exam.workingDays,
      fromBS: issueDateBS(window.from),
      toBS: issueDateBS(window.to),
      cardsOutdated: data.filter(
        (d) =>
          d.reportCard &&
          (d.reportCard.daysPresent === null ||
            d.reportCard.totalWorkingDays !== exam.workingDays),
      ).length,
    },
  };

  ApiResponse.success(res, { summary, students: data });
});

/**
 * @desc    Generate/Recalculate report cards for a class-section in an exam
 * @route   POST /api/v1/report-cards/generate
 * @access  Private/Admin
 */
const generateReportCards = asyncHandler(async (req, res) => {
  const { examId, classId, sectionId } = req.body;

  if (!examId || !classId || !sectionId) {
    throw ApiError.badRequest("Exam ID, Class ID, and Section ID are required");
  }

  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(examId), schoolId: req.user.schoolId },
    include: { academicYear: true },
  });

  if (!exam)
    throw ApiError.notFound("Exam not found or does not belong to your school");

  const classInfo = await prisma.class.findFirst({
    where: { id: parseInt(classId), schoolId: req.user.schoolId },
    select: { id: true, name: true, gradeLevel: true },
  });

  if (!classInfo) throw ApiError.notFound("Class not found");

  const sectionInfo = await prisma.section.findFirst({
    where: { id: parseInt(sectionId), schoolId: req.user.schoolId },
    select: { id: true },
  });

  if (!sectionInfo) throw ApiError.notFound("Section not found");

  // Get all students in this class-section
  const enrollments = await prisma.studentClass.findMany({
    where: {
      classId: parseInt(classId),
      sectionId: parseInt(sectionId),
      academicYearId: exam.academicYearId,
      status: "active",
      schoolId: req.user.schoolId,
    },
  });

  if (enrollments.length === 0) {
    throw ApiError.notFound("No students found in this section");
  }

  // Grade on the school's current default scale and record which one, so the
  // card keeps printing these grades if the default changes later.
  const scale = await getDefaultScale(req.user.schoolId);

  // Attendance from the academic year start to the exam's end, one grouped
  // query for the whole section. Frozen on each card below, with the exam's
  // admin-entered working days as the total.
  const attendance = tallyAttendance(
    await prisma.attendance.groupBy({
      by: ["studentClassId", "status"],
      where: {
        schoolId: req.user.schoolId,
        studentClassId: { in: enrollments.map((e) => e.id) },
        status: { in: ["present", "late"] },
        attendanceDate: attendanceDateFilter(
          attendanceWindow(exam, exam.academicYear),
        ),
      },
      _count: { _all: true },
    }),
  );

  // Process each student and generate report cards
  const reportCards = await prisma.$transaction(async (tx) => {
    const results = [];
    const studentData = [];

    for (const enrollment of enrollments) {
      // Get all results for this student in this exam
      const studentResults = await tx.examResult.findMany({
        where: {
          studentId: enrollment.studentId,
          examSubject: { examId: parseInt(examId) },
        },
        include: {
          examSubject: {
            include: {
              classSubject: { include: { subject: true } },
            },
          },
        },
      });

      if (studentResults.length === 0) continue;

      // Process with Nepal grading (unweighted GPA for K-10)
      const subjectResults = buildSubjectResults(studentResults, scale);
      const overallResult = gradeCalculator.calculateOverallGPA(
        subjectResults,
        { scale },
      );

      const totalObtained = subjectResults.reduce(
        (sum, r) => sum + r.totalMarks,
        0,
      );
      const totalFull = subjectResults.reduce(
        (sum, r) => sum + r.totalFullMarks,
        0,
      );

      // Store for ranking
      studentData.push({
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        totalMarks: totalObtained,
        totalFullMarks: totalFull,
        percentage: overallResult.averagePercentage,
        gpa: overallResult.gpa,
        grade: overallResult.grade,
        isPassed: overallResult.isPassed,
        daysPresent: attendance.get(enrollment.id)?.present ?? 0,
        daysLate: attendance.get(enrollment.id)?.late ?? 0,
      });
    }

    // Sort by GPA (primary) and percentage (secondary) for ranking
    studentData.sort((a, b) => {
      if (b.gpa !== a.gpa) return b.gpa - a.gpa;
      return b.percentage - a.percentage;
    });

    // Assign ranks and upsert report cards
    for (let i = 0; i < studentData.length; i++) {
      const data = studentData[i];
      const rank = i + 1;

      const rc = await tx.reportCard.upsert({
        where: {
          studentId_examId: {
            studentId: data.studentId,
            examId: parseInt(examId),
          },
        },
        update: {
          studentClassId: data.enrollmentId,
          totalMarks: data.totalMarks,
          percentage: data.percentage,
          overallGrade: data.grade,
          classRank: rank,
          gradeScaleId: scale.id,
          daysPresent: data.daysPresent,
          daysLate: data.daysLate,
          totalWorkingDays: exam.workingDays,
          generatedAt: new Date(),
        },
        create: {
          studentId: data.studentId,
          examId: parseInt(examId),
          studentClassId: data.enrollmentId,
          totalMarks: data.totalMarks,
          percentage: data.percentage,
          overallGrade: data.grade,
          classRank: rank,
          gradeScaleId: scale.id,
          daysPresent: data.daysPresent,
          daysLate: data.daysLate,
          totalWorkingDays: exam.workingDays,
          generatedAt: new Date(),
        },
      });
      results.push(rc);
    }

    return results;
  });

  ApiResponse.success(
    res,
    { count: reportCards.length },
    "Report cards generated and ranks assigned successfully",
  );
});

/**
 * Whether the requester may see a report card before it is published.
 * ADMIN / SUPER_ADMIN / EXAM_OFFICER: yes (queries are already school-scoped).
 * TEACHER: only with a TeacherSubject for the card's class + section in the
 * card's academic year. Everyone else: no.
 */
const canSeeUnpublishedCard = async (req, reportCard) => {
  const roles = req.user.roles || [];
  if (roles.some((r) => ["ADMIN", "SUPER_ADMIN", "EXAM_OFFICER"].includes(r))) {
    return true;
  }
  if (!roles.includes("TEACHER") || !reportCard.studentClass) return false;

  const { classId, sectionId, academicYearId } = reportCard.studentClass;
  const assignment = await prisma.teacherSubject.findFirst({
    where: {
      userId: req.user.id,
      sectionId,
      academicYearId,
      classSubject: { classId, class: { schoolId: req.user.schoolId } },
    },
    select: { id: true },
  });
  return Boolean(assignment);
};

/**
 * @desc    Get detailed report card for a student (Nepal-style format)
 * @route   GET /api/v1/report-cards/student/:studentId/exam/:examId
 * @access  Private
 */
const getReportCard = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const examId = parseInt(req.params.examId);

  // Get report card with all relations - use findFirst with schoolId filter
  const reportCard = await prisma.reportCard.findFirst({
    where: {
      studentId,
      examId,
      exam: { schoolId: req.user.schoolId },
    },
    include: {
      exam: {
        include: {
          academicYear: true,
        },
      },
      student: {
        select: {
          id: true,
          admissionNumber: true,
          dateOfBirth: true,
          gender: true,
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
      studentClass: {
        include: {
          class: true,
          section: true,
        },
      },
    },
  });

  if (!reportCard) throw ApiError.notFound("Report card not found");

  // Authorization check: unpublished cards are visible only to admins, exam
  // officers (own school), and teachers assigned to the card's class + section
  // in the card's academic year.
  if (!reportCard.isPublished && !(await canSeeUnpublishedCard(req, reportCard))) {
    throw ApiError.forbidden("Report card not yet published");
  }

  // Get school info. Must select every field the header below reads; this
  // used to fetch six and print `undefined` for tagline, website and the rest.
  const school = await prisma.school.findUnique({
    where: { id: req.user.schoolId },
    select: SCHOOL_REPORT_SELECT,
  });

  // The scale this card was generated with
  const scale = (await getScaleResolver(req.user.schoolId)).forReportCard(
    reportCard,
  );
  const layout = normalizeLayout(school.reportCardConfig);

  // Get subject-wise results with Nepal grading
  const examResults = await prisma.examResult.findMany({
    where: {
      studentId,
      examSubject: {
        examId,
      },
    },
    include: {
      examSubject: {
        include: {
          classSubject: { include: { subject: true } },
        },
      },
    },
    orderBy: {
      examSubject: {
        classSubject: {
          subject: { name: "asc" },
        },
      },
    },
  });

  // Process with Nepal grading (unweighted GPA for K-10)
  const subjectResults = buildSubjectResults(examResults, scale);
  const overallResult = gradeCalculator.calculateOverallGPA(subjectResults, {
    scale,
  });

  // Convert student DOB to BS format
  const dobBS = reportCard.student.dateOfBirth
    ? dateConverter.convertADToBS(reportCard.student.dateOfBirth)
    : null;
  const dobAD = reportCard.student.dateOfBirth
    ? dateConverter.formatADDate(reportCard.student.dateOfBirth)
    : null;

  // Get academic year in BS (approximately AD year + 57)
  const academicYearAD = reportCard.exam.academicYear?.name || "";
  // Extract year from academicYear name (e.g., "2081-2082" or "2024-2025")
  const yearMatch = academicYearAD.match(/\d{4}/);
  const academicYearBS = yearMatch
    ? dateConverter.getApproxBSYear(parseInt(yearMatch[0]))
    : null;

  // Build Nepal-style report card response
  const response = {
    // School Information (full branding for print)
    school: schoolForReport(school),
    // Examination Information
    examination: {
      name: reportCard.exam.name,
      type: reportCard.exam.examType,
      academicYear: reportCard.exam.academicYear.name,
      academicYearBS: academicYearBS ? `${academicYearBS}` : null,
      yearAD: yearMatch ? yearMatch[0] : new Date().getFullYear().toString(),
      yearBS: academicYearBS ? academicYearBS.toString() : null,
      startDate: reportCard.exam.startDate,
      endDate: reportCard.exam.endDate,
    },
    // Student Information
    student: {
      id: reportCard.student.id,
      name: `${reportCard.student.user.firstName} ${reportCard.student.user.lastName}`,
      firstName: reportCard.student.user.firstName,
      lastName: reportCard.student.user.lastName,
      rollNumber: reportCard.studentClass.rollNumber,
      class: reportCard.studentClass.class.name,
      section: reportCard.studentClass.section.name,
      gradeLevel: reportCard.studentClass.class.gradeLevel,
      classWithNumeral: classWithNumeral(
        reportCard.studentClass.class.gradeLevel,
      ),
      admissionNumber: reportCard.student.admissionNumber,
      dateOfBirth: reportCard.student.dateOfBirth,
      dobBS: dobBS?.formatted || null,
      dobAD: dobAD,
      gender: reportCard.student.gender,
    },
    // Subject-wise Results (Nepal format)
    subjects: subjectResults,
    // Overall Summary
    summary: {
      totalMarks: subjectResults.reduce((sum, s) => sum + s.totalMarks, 0),
      totalFullMarks: subjectResults.reduce(
        (sum, s) => sum + s.totalFullMarks,
        0,
      ),
      percentage: overallResult.averagePercentage,
      gpa: overallResult.gpa,
      grade: overallResult.grade,
      classRank: reportCard.classRank,
      isPassed: overallResult.isPassed,
      resultStatus: gradeCalculator.getResultStatus(overallResult.isPassed),
      totalSubjects: overallResult.totalSubjects,
      passedSubjects: overallResult.passedSubjects,
      failedSubjects: overallResult.failedSubjects,
      ...attendanceForCard(reportCard, layout),
    },
    // Remarks
    remarks: {
      teacher: reportCard.teacherRemarks,
      principal: reportCard.principalRemarks,
    },
    // Metadata
    meta: {
      reportCardId: reportCard.id,
      isPublished: reportCard.isPublished,
      generatedAt: reportCard.generatedAt,
      issueDateBS: issueDateBS(reportCard.generatedAt),
      gradeScale: scale.name,
    },
    // The bands of the scale this card was graded on
    gradeReference: toGradeReference(scale),
    // How this school prints its report cards (School Settings)
    layout,
  };

  ApiResponse.success(res, response);
});

/**
 * @desc    Publish report cards for entire class/section
 * @route   PUT /api/v1/report-cards/publish
 * @access  Private/Admin
 */
const publishReportCards = asyncHandler(async (req, res) => {
  const { examId, classId, sectionId } = req.body;

  // Verify exam belongs to school
  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(examId), schoolId: req.user.schoolId },
  });
  if (!exam) throw ApiError.notFound("Exam not found");

  const result = await prisma.reportCard.updateMany({
    where: {
      examId: parseInt(examId),
      studentClass: {
        classId: parseInt(classId),
        sectionId: parseInt(sectionId),
        schoolId: req.user.schoolId,
      },
    },
    data: { isPublished: true },
  });

  ApiResponse.success(
    res,
    { updated: result.count },
    "Report cards published successfully",
  );
});

/**
 * @desc    Unpublish report cards for entire class/section
 * @route   PUT /api/v1/report-cards/unpublish
 * @access  Private/Admin
 */
const unpublishReportCards = asyncHandler(async (req, res) => {
  const { examId, classId, sectionId } = req.body;

  // Verify exam belongs to school
  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(examId), schoolId: req.user.schoolId },
  });
  if (!exam) throw ApiError.notFound("Exam not found");

  const result = await prisma.reportCard.updateMany({
    where: {
      examId: parseInt(examId),
      studentClass: {
        classId: parseInt(classId),
        sectionId: parseInt(sectionId),
        schoolId: req.user.schoolId,
      },
    },
    data: { isPublished: false },
  });

  ApiResponse.success(
    res,
    { updated: result.count },
    "Report cards unpublished successfully",
  );
});

/**
 * @desc    Get published exams for a student
 * @route   GET /api/v1/report-cards/student/:studentId/exams
 * @access  Private
 */
const getStudentPublishedExams = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.studentId);

  // Get all published report cards for this student (filtered by school)
  const reportCards = await prisma.reportCard.findMany({
    where: {
      studentId,
      isPublished: true,
      exam: { schoolId: req.user.schoolId },
    },
    include: {
      exam: {
        include: {
          academicYear: true,
        },
      },
      studentClass: {
        include: {
          class: true,
          section: true,
        },
      },
    },
    orderBy: {
      exam: {
        startDate: "desc",
      },
    },
  });

  const exams = reportCards.map((rc) => ({
    examId: rc.exam.id,
    examName: rc.exam.name,
    examType: rc.exam.examType,
    academicYear: rc.exam.academicYear.name,
    className: rc.studentClass.class.name,
    sectionName: rc.studentClass.section.name,
    overallGrade: rc.overallGrade,
    percentage: rc.percentage,
    classRank: rc.classRank,
    generatedAt: rc.generatedAt,
  }));

  ApiResponse.success(res, exams);
});

/**
 * @desc    Get all report cards for a class/section (bulk print)
 * @route   GET /api/v1/report-cards/bulk/:examId/:classId/:sectionId
 * @access  Private/Admin
 */
const getBulkReportCards = asyncHandler(async (req, res) => {
  const { examId, classId, sectionId } = req.params;

  // Verify exam belongs to school
  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(examId), schoolId: req.user.schoolId },
    include: { academicYear: true },
  });
  if (!exam) throw ApiError.notFound("Exam not found");

  // Get class info
  const classInfo = await prisma.class.findFirst({
    where: { id: parseInt(classId), schoolId: req.user.schoolId },
  });
  if (!classInfo) throw ApiError.notFound("Class not found");

  // Get section info
  const sectionInfo = await prisma.section.findFirst({
    where: { id: parseInt(sectionId), schoolId: req.user.schoolId },
  });
  if (!sectionInfo) throw ApiError.notFound("Section not found");

  // Get school info
  const school = await prisma.school.findUnique({
    where: { id: req.user.schoolId },
    select: SCHOOL_REPORT_SELECT,
  });

  // Each card prints on the scale it was generated with
  const scales = await getScaleResolver(req.user.schoolId);
  const layout = normalizeLayout(school.reportCardConfig);

  // Get all report cards for this class/section
  const reportCards = await prisma.reportCard.findMany({
    where: {
      examId: parseInt(examId),
      studentClass: {
        classId: parseInt(classId),
        sectionId: parseInt(sectionId),
        schoolId: req.user.schoolId,
      },
    },
    include: {
      student: {
        select: {
          id: true,
          admissionNumber: true,
          dateOfBirth: true,
          gender: true,
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
      studentClass: {
        include: {
          class: true,
          section: true,
        },
      },
    },
    orderBy: {
      studentClass: { rollNumber: "asc" },
    },
  });

  if (reportCards.length === 0) {
    throw ApiError.notFound(
      "No report cards found. Please generate them first.",
    );
  }

  // Get academic year in BS
  const academicYearAD = exam.academicYear?.name || "";
  const yearMatch = academicYearAD.match(/\d{4}/);
  const academicYearBS = yearMatch
    ? dateConverter.getApproxBSYear(parseInt(yearMatch[0]))
    : null;

  // Build response for each student
  const reportCardsData = await Promise.all(
    reportCards.map(async (reportCard) => {
      // Get subject-wise results
      const examResults = await prisma.examResult.findMany({
        where: {
          studentId: reportCard.studentId,
          examSubject: { examId: parseInt(examId) },
        },
        include: {
          examSubject: {
            include: {
              classSubject: { include: { subject: true } },
            },
          },
        },
        orderBy: {
          examSubject: {
            classSubject: {
              subject: { name: "asc" },
            },
          },
        },
      });

      const scale = scales.forReportCard(reportCard);
      const subjectResults = buildSubjectResults(examResults, scale);
      const overallResult = gradeCalculator.calculateOverallGPA(
        subjectResults,
        { scale },
      );

      // Convert student DOB to BS format
      const dobBS = reportCard.student.dateOfBirth
        ? dateConverter.convertADToBS(reportCard.student.dateOfBirth)
        : null;
      const dobAD = reportCard.student.dateOfBirth
        ? dateConverter.formatADDate(reportCard.student.dateOfBirth)
        : null;

      return {
        school: schoolForReport(school),
        examination: {
          name: exam.name,
          type: exam.examType,
          academicYear: exam.academicYear.name,
          academicYearBS: academicYearBS ? `${academicYearBS}` : null,
          yearAD: yearMatch
            ? yearMatch[0]
            : new Date().getFullYear().toString(),
          yearBS: academicYearBS ? academicYearBS.toString() : null,
          startDate: exam.startDate,
          endDate: exam.endDate,
        },
        student: {
          id: reportCard.student.id,
          name: `${reportCard.student.user.firstName} ${reportCard.student.user.lastName}`,
          firstName: reportCard.student.user.firstName,
          lastName: reportCard.student.user.lastName,
          rollNumber: reportCard.studentClass.rollNumber,
          class: reportCard.studentClass.class.name,
          section: reportCard.studentClass.section.name,
          gradeLevel: reportCard.studentClass.class.gradeLevel,
          classWithNumeral: classWithNumeral(
            reportCard.studentClass.class.gradeLevel,
          ),
          admissionNumber: reportCard.student.admissionNumber,
          dateOfBirth: reportCard.student.dateOfBirth,
          dobBS: dobBS?.formatted || null,
          dobAD: dobAD,
          gender: reportCard.student.gender,
        },
        subjects: subjectResults,
        summary: {
          totalMarks: subjectResults.reduce((sum, s) => sum + s.totalMarks, 0),
          totalFullMarks: subjectResults.reduce(
            (sum, s) => sum + s.totalFullMarks,
            0,
          ),
          percentage: overallResult.averagePercentage,
          gpa: overallResult.gpa,
          grade: overallResult.grade,
          classRank: reportCard.classRank,
          isPassed: overallResult.isPassed,
          resultStatus: gradeCalculator.getResultStatus(overallResult.isPassed),
          totalSubjects: overallResult.totalSubjects,
          passedSubjects: overallResult.passedSubjects,
          failedSubjects: overallResult.failedSubjects,
          ...attendanceForCard(reportCard, layout),
        },
        remarks: {
          teacher: reportCard.teacherRemarks,
          principal: reportCard.principalRemarks,
        },
        meta: {
          reportCardId: reportCard.id,
          isPublished: reportCard.isPublished,
          generatedAt: reportCard.generatedAt,
          issueDateBS: issueDateBS(reportCard.generatedAt),
          gradeScale: scale.name,
        },
        gradeReference: toGradeReference(scale),
        layout,
      };
    }),
  );

  ApiResponse.success(res, {
    examName: exam.name,
    className: classInfo.name,
    sectionName: sectionInfo.name,
    totalStudents: reportCardsData.length,
    reportCards: reportCardsData,
  });
});

module.exports = {
  getReportCards,
  generateReportCards,
  getReportCard,
  publishReportCards,
  unpublishReportCards,
  getStudentPublishedExams,
  getBulkReportCards,
};
