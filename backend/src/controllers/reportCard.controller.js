const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");

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

  // Get the exam to verify it belongs to this school
  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(examId), schoolId: req.user.schoolId },
    include: { academicYear: true },
  });

  if (!exam) throw ApiError.notFound("Exam not found");

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

  // Group results by student
  const resultsByStudent = {};
  examResults.forEach((r) => {
    if (!resultsByStudent[r.studentId]) resultsByStudent[r.studentId] = [];
    resultsByStudent[r.studentId].push({
      subjectName: r.examSubject.classSubject.subject.name,
      theoryMarks: r.marksObtained,
      practicalMarks: r.practicalMarks || 0,
      totalMarks:
        (parseFloat(r.marksObtained) || 0) +
        (parseFloat(r.practicalMarks) || 0),
      fullMarks: r.examSubject.fullMarks,
      grade: r.grade,
      hasPractical: r.examSubject.hasPractical,
    });
  });

  // Build response with student data, results, and report card status
  const data = enrollments.map((enrollment) => {
    const studentResults = resultsByStudent[enrollment.studentId] || [];
    const reportCard = enrollment.student.reportCards[0] || null;

    const totalObtained = studentResults.reduce(
      (sum, r) => sum + r.totalMarks,
      0
    );
    const totalFull = studentResults.reduce((sum, r) => sum + r.fullMarks, 0);

    return {
      studentId: enrollment.studentId,
      rollNumber: enrollment.rollNumber,
      firstName: enrollment.student.user.firstName,
      lastName: enrollment.student.user.lastName,
      className: enrollment.class.name,
      sectionName: enrollment.section.name,
      results: studentResults,
      totalObtained,
      totalFull,
      percentage:
        totalFull > 0 ? ((totalObtained / totalFull) * 100).toFixed(2) : 0,
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
    totalStudents: data.length,
    reportCardsGenerated: data.filter((d) => d.reportCard).length,
    published: data.filter((d) => d.reportCard?.isPublished).length,
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

  // 1. Get all students in this class-section
  const enrollments = await prisma.studentClass.findMany({
    where: {
      classId: parseInt(classId),
      sectionId: parseInt(sectionId),
      academicYearId: {
        equals: (
          await prisma.exam.findUnique({ where: { id: parseInt(examId) } })
        ).academicYearId,
      },
      status: "active",
    },
  });

  if (enrollments.length === 0)
    throw ApiError.notFound("No students found in this section");

  // 2. Process each student
  const reportCards = await prisma.$transaction(async (tx) => {
    const results = [];

    for (const enrollment of enrollments) {
      // Get all results for this student in this exam
      const studentResults = await tx.examResult.findMany({
        where: {
          studentId: enrollment.studentId,
          examSubject: { examId: parseInt(examId) },
        },
        include: {
          examSubject: true,
        },
      });

      if (studentResults.length === 0) continue;

      let totalObtained = 0;
      let totalFull = 0;

      studentResults.forEach((r) => {
        totalObtained +=
          (parseFloat(r.marksObtained) || 0) +
          (parseFloat(r.practicalMarks) || 0);
        totalFull += r.examSubject.fullMarks;
      });

      const percentage = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0;
      let overallGrade = "F";
      if (percentage >= 90) overallGrade = "A+";
      else if (percentage >= 80) overallGrade = "A";
      else if (percentage >= 70) overallGrade = "B+";
      else if (percentage >= 60) overallGrade = "B";
      else if (percentage >= 50) overallGrade = "C+";
      else if (percentage >= 40) overallGrade = "C";

      // Upsert report card
      const rc = await tx.reportCard.upsert({
        where: {
          studentId_examId: {
            studentId: enrollment.studentId,
            examId: parseInt(examId),
          },
        },
        update: {
          studentClassId: enrollment.id,
          totalMarks: totalObtained,
          percentage: percentage,
          overallGrade,
          generatedAt: new Date(),
        },
        create: {
          studentId: enrollment.studentId,
          examId: parseInt(examId),
          studentClassId: enrollment.id,
          totalMarks: totalObtained,
          percentage: percentage,
          overallGrade,
          generatedAt: new Date(),
        },
      });
      results.push(rc);
    }

    // 3. Assign Ranks within this class-section
    const allRCs = await tx.reportCard.findMany({
      where: {
        examId: parseInt(examId),
        studentClass: {
          classId: parseInt(classId),
          sectionId: parseInt(sectionId),
        },
      },
      orderBy: { percentage: "desc" },
    });

    for (let i = 0; i < allRCs.length; i++) {
      await tx.reportCard.update({
        where: { id: allRCs[i].id },
        data: { classRank: i + 1 },
      });
    }

    return results;
  });

  ApiResponse.success(
    res,
    reportCards,
    "Report cards generated and ranks assigned successfully"
  );
});

/**
 * @desc    Get report card for a student (published only for students/parents)
 * @route   GET /api/v1/report-cards/student/:studentId/exam/:examId
 * @access  Private
 */
const getReportCard = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const examId = parseInt(req.params.examId);

  const reportCard = await prisma.reportCard.findUnique({
    where: {
      studentId_examId: { studentId, examId },
    },
    include: {
      exam: true,
      student: { include: { user: true } },
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

  // Get subject-wise details
  const results = await prisma.examResult.findMany({
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
  });

  ApiResponse.success(res, { reportCard, results });
});

/**
 * @desc    Publish report cards for entire class/section
 * @route   PUT /api/v1/report-cards/publish
 * @access  Private/Admin
 */
const publishReportCards = asyncHandler(async (req, res) => {
  const { examId, classId, sectionId } = req.body;

  await prisma.reportCard.updateMany({
    where: {
      examId: parseInt(examId),
      studentClass: {
        classId: parseInt(classId),
        sectionId: parseInt(sectionId),
      },
    },
    data: { isPublished: true },
  });

  ApiResponse.success(res, null, "Report cards published successfully");
});

/**
 * @desc    Unpublish report cards for entire class/section
 * @route   PUT /api/v1/report-cards/unpublish
 * @access  Private/Admin
 */
const unpublishReportCards = asyncHandler(async (req, res) => {
  const { examId, classId, sectionId } = req.body;

  const result = await prisma.reportCard.updateMany({
    where: {
      examId: parseInt(examId),
      studentClass: {
        classId: parseInt(classId),
        sectionId: parseInt(sectionId),
      },
    },
    data: { isPublished: false },
  });

  ApiResponse.success(
    res,
    { updated: result.count },
    "Report cards unpublished successfully"
  );
});

module.exports = {
  getReportCards,
  generateReportCards,
  getReportCard,
  publishReportCards,
  unpublishReportCards,
};
