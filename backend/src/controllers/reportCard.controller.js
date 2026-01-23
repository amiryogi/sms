const prisma = require("../config/database");
const {
  ApiError,
  ApiResponse,
  asyncHandler,
  gradeCalculator,
  dateConverter,
} = require("../utils");

/**
 * Build detailed subject results with Nepal-style grading
 * @param {Array} examResults - Raw exam results from database
 * @param {boolean} isNEBClass - Whether this is Grade 11/12 (NEB curriculum)
 * @returns {Array} Processed subject results with grades and GPAs
 */
const buildSubjectResults = (examResults, isNEBClass = false) => {
  return examResults.map((result) => {
    const examSubject = result.examSubject;
    const classSubject = examSubject.classSubject;
    const totalCreditHours = parseFloat(classSubject.creditHours) || 4;

    // Calculate subject grade using Nepal rules
    const gradeResult = gradeCalculator.calculateSubjectGrade({
      theoryMarks: result.marksObtained,
      theoryFullMarks: examSubject.theoryFullMarks || examSubject.fullMarks,
      practicalMarks: result.practicalMarks,
      practicalFullMarks: examSubject.practicalFullMarks || 0,
      hasPractical: examSubject.hasPractical,
      isAbsent: result.isAbsent,
    });

    // Get credit hours from database (Grade 1-10: ClassSubject, Grade 11-12: calculated or SubjectComponent)
    let theoryCreditHours = 0;
    let internalCreditHours = 0;

    if (isNEBClass) {
      // For NEB classes (Grade 11-12), use calculated 75/25 split or SubjectComponent
      theoryCreditHours = Math.round(totalCreditHours * 0.75 * 100) / 100;
      internalCreditHours = Math.round(totalCreditHours * 0.25 * 100) / 100;
    } else {
      // For Grade 1-10, read from ClassSubject database fields
      theoryCreditHours = parseFloat(classSubject.theoryCreditHours) || 0;
      internalCreditHours = parseFloat(classSubject.practicalCreditHours) || 0;
      
      // Fallback: if not set in DB, use total credit hours for theory only
      if (theoryCreditHours === 0 && internalCreditHours === 0) {
        theoryCreditHours = totalCreditHours;
      }
    }

    return {
      subjectId: classSubject.subject.id,
      subjectName: classSubject.subject.name,
      subjectCode: classSubject.subject.code,
      creditHours: totalCreditHours,
      // Credit hour breakdown (from DB for Grade 1-10, calculated for NEB)
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

  // Get class and section info
  const classInfo = await prisma.class.findUnique({
    where: { id: parseInt(classId) },
    select: { id: true, name: true, gradeLevel: true },
  });

  const sectionInfo = await prisma.section.findUnique({
    where: { id: parseInt(sectionId) },
    select: { id: true, name: true },
  });

  // Get all students in this class/section for this academic year
  const enrollments = await prisma.studentClass.findMany({
    where: {
      classId: parseInt(classId),
      sectionId: parseInt(sectionId),
      academicYearId: exam.academicYearId,
      status: "active",
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

  // Group results by student and process with Nepal grading
  const resultsByStudent = {};
  examResults.forEach((r) => {
    if (!resultsByStudent[r.studentId]) resultsByStudent[r.studentId] = [];
    resultsByStudent[r.studentId].push(r);
  });

  // Check if this is NEB class (Grade 11 or 12) for credit-weighted GPA
  const isNEBClass = classInfo.gradeLevel >= 11;

  // Build response with student data, results, and report card status
  const data = enrollments.map((enrollment) => {
    const rawResults = resultsByStudent[enrollment.studentId] || [];
    const subjectResults = buildSubjectResults(rawResults, isNEBClass);
    const overallResult = gradeCalculator.calculateOverallGPA(subjectResults, {
      useCreditWeighting: isNEBClass,
    });
    const reportCard = enrollment.student.reportCards[0] || null;

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
          }
        : null,
    };
  });

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

  // Get class info to determine if NEB (Grade 11-12)
  const classInfo = await prisma.class.findUnique({
    where: { id: parseInt(classId) },
    select: { id: true, name: true, gradeLevel: true },
  });

  if (!classInfo) throw ApiError.notFound("Class not found");

  const isNEBClass = classInfo.gradeLevel >= 11;

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

      // Process with Nepal grading - use credit weighting for NEB classes
      const subjectResults = buildSubjectResults(studentResults, isNEBClass);
      const overallResult = gradeCalculator.calculateOverallGPA(
        subjectResults,
        {
          useCreditWeighting: isNEBClass,
        },
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

  // Authorization check
  const canSeeUnpublished =
    req.user.roles.includes("ADMIN") || req.user.roles.includes("TEACHER");
  if (!reportCard.isPublished && !canSeeUnpublished) {
    throw ApiError.forbidden("Report card not yet published");
  }

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

  // Get subject-wise results with Nepal grading
  const examResults = await prisma.examResult.findMany({
    where: {
      studentId,
      examSubject: { examId },
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

  // Process with Nepal grading - use credit weighting for NEB classes (Grade 11-12)
  const isNEBClass = reportCard.studentClass.class.gradeLevel >= 11;
  const subjectResults = buildSubjectResults(examResults, isNEBClass);
  const overallResult = gradeCalculator.calculateOverallGPA(subjectResults, {
    useCreditWeighting: isNEBClass,
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
    school: {
      name: school.name,
      address: school.address,
      phone: school.phone,
      email: school.email,
      logoUrl: school.logoUrl,
      tagline: school.tagline,
      website: school.website,
      landlineNumber: school.landlineNumber,
      principalName: school.principalName,
      establishedYear: school.establishedYear,
    },
    // Examination Information
    examination: {
      name: reportCard.exam.name,
      type: reportCard.exam.examType,
      academicYear: reportCard.exam.academicYear.name,
      academicYearBS: academicYearBS ? `${academicYearBS}` : null,
      // Year for NEB grade sheet display
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
      admissionNumber: reportCard.student.admissionNumber,
      dateOfBirth: reportCard.student.dateOfBirth,
      dobBS: dobBS?.formatted || null,
      dobAD: dobAD,
      gender: reportCard.student.gender,
    },
    // Subject-wise Results (Nepal format)
    subjects: subjectResults,
    // NEB (Nepal Education Board) specific info
    isNEBClass,
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
      totalCredits: overallResult.totalCredits, // NEB credit hours total
      passedSubjects: overallResult.passedSubjects,
      failedSubjects: overallResult.failedSubjects,
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
    },
    // Grade reference table for display
    gradeReference: gradeCalculator.GRADE_THRESHOLDS,
  };

  ApiResponse.success(res, response);
});

/**
 * @desc    Get detailed report card data for PDF generation
 * @route   GET /api/v1/report-cards/student/:studentId/exam/:examId/pdf-data
 * @access  Private
 */
const getReportCardPdfData = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const examId = parseInt(req.params.examId);

  const reportCard = await prisma.reportCard.findFirst({
    where: {
      studentId,
      examId,
      exam: { schoolId: req.user.schoolId },
    },
    include: {
      exam: { include: { academicYear: true } },
      student: {
        include: {
          user: true,
        },
      },
      studentClass: { include: { class: true, section: true } },
    },
  });

  if (!reportCard) throw ApiError.notFound("Report card not found");

  // Authorization check
  const canSeeUnpublished =
    req.user.roles.includes("ADMIN") || req.user.roles.includes("TEACHER");
  if (!reportCard.isPublished && !canSeeUnpublished) {
    throw ApiError.forbidden("Report card not yet published");
  }

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

  const examResults = await prisma.examResult.findMany({
    where: { studentId, examSubject: { examId } },
    include: {
      examSubject: {
        include: { classSubject: { include: { subject: true } } },
      },
    },
    orderBy: { examSubject: { classSubject: { subject: { name: "asc" } } } },
  });

  // Use credit-weighted GPA for NEB classes (Grade 11-12)
  const isNEBClass = reportCard.studentClass.class.gradeLevel >= 11;
  const subjectResults = buildSubjectResults(examResults, isNEBClass);
  const overallResult = gradeCalculator.calculateOverallGPA(subjectResults, {
    useCreditWeighting: isNEBClass,
  });

  // Convert student DOB to BS format for PDF
  const dobBS = reportCard.student.dateOfBirth
    ? dateConverter.convertADToBS(reportCard.student.dateOfBirth)
    : null;
  const dobAD = reportCard.student.dateOfBirth
    ? dateConverter.formatADDate(reportCard.student.dateOfBirth)
    : null;

  // Get academic year in BS
  const academicYearAD = reportCard.exam.academicYear?.name || "";
  const yearMatch = academicYearAD.match(/\d{4}/);
  const academicYearBS = yearMatch
    ? dateConverter.getApproxBSYear(parseInt(yearMatch[0]))
    : null;

  // Return formatted data for PDF generation
  ApiResponse.success(res, {
    school,
    examination: {
      name: reportCard.exam.name,
      type: reportCard.exam.examType,
      academicYear: reportCard.exam.academicYear.name,
      yearAD: yearMatch ? yearMatch[0] : new Date().getFullYear().toString(),
      yearBS: academicYearBS ? academicYearBS.toString() : null,
    },
    student: {
      ...reportCard.student,
      user: reportCard.student.user,
      name: `${reportCard.student.user.firstName} ${reportCard.student.user.lastName}`,
      class: reportCard.studentClass.class,
      section: reportCard.studentClass.section,
      rollNumber: reportCard.studentClass.rollNumber,
      gradeLevel: reportCard.studentClass.class.gradeLevel,
      dobBS: dobBS?.formatted || null,
      dobAD: dobAD,
    },
    subjects: subjectResults,
    isNEBClass,
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
      totalCredits: overallResult.totalCredits,
    },
    remarks: {
      teacher: reportCard.teacherRemarks,
      principal: reportCard.principalRemarks,
    },
    gradeReference: gradeCalculator.GRADE_THRESHOLDS,
    generatedAt: new Date().toISOString(),
  });
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
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      logoUrl: true,
      tagline: true,
      website: true,
      landlineNumber: true,
      principalName: true,
      establishedYear: true,
    },
  });

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
    throw ApiError.notFound("No report cards found. Please generate them first.");
  }

  const isNEBClass = classInfo.gradeLevel >= 11;

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

      const subjectResults = buildSubjectResults(examResults, isNEBClass);
      const overallResult = gradeCalculator.calculateOverallGPA(subjectResults, {
        useCreditWeighting: isNEBClass,
      });

      // Convert student DOB to BS format
      const dobBS = reportCard.student.dateOfBirth
        ? dateConverter.convertADToBS(reportCard.student.dateOfBirth)
        : null;
      const dobAD = reportCard.student.dateOfBirth
        ? dateConverter.formatADDate(reportCard.student.dateOfBirth)
        : null;

      return {
        school: {
          name: school.name,
          address: school.address,
          phone: school.phone,
          email: school.email,
          logoUrl: school.logoUrl,
          tagline: school.tagline,
          website: school.website,
          landlineNumber: school.landlineNumber,
          principalName: school.principalName,
          establishedYear: school.establishedYear,
        },
        examination: {
          name: exam.name,
          type: exam.examType,
          academicYear: exam.academicYear.name,
          academicYearBS: academicYearBS ? `${academicYearBS}` : null,
          yearAD: yearMatch ? yearMatch[0] : new Date().getFullYear().toString(),
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
          admissionNumber: reportCard.student.admissionNumber,
          dateOfBirth: reportCard.student.dateOfBirth,
          dobBS: dobBS?.formatted || null,
          dobAD: dobAD,
          gender: reportCard.student.gender,
        },
        subjects: subjectResults,
        isNEBClass,
        summary: {
          totalMarks: subjectResults.reduce((sum, s) => sum + s.totalMarks, 0),
          totalFullMarks: subjectResults.reduce((sum, s) => sum + s.totalFullMarks, 0),
          percentage: overallResult.averagePercentage,
          gpa: overallResult.gpa,
          grade: overallResult.grade,
          classRank: reportCard.classRank,
          isPassed: overallResult.isPassed,
          resultStatus: gradeCalculator.getResultStatus(overallResult.isPassed),
          totalSubjects: overallResult.totalSubjects,
          totalCredits: overallResult.totalCredits,
          passedSubjects: overallResult.passedSubjects,
          failedSubjects: overallResult.failedSubjects,
        },
        remarks: {
          teacher: reportCard.teacherRemarks,
          principal: reportCard.principalRemarks,
        },
        meta: {
          reportCardId: reportCard.id,
          isPublished: reportCard.isPublished,
          generatedAt: reportCard.generatedAt,
        },
        gradeReference: gradeCalculator.GRADE_THRESHOLDS,
      };
    })
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
  getReportCardPdfData,
  publishReportCards,
  unpublishReportCards,
  getStudentPublishedExams,
  getBulkReportCards,
};
