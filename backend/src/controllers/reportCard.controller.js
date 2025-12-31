const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');

/**
 * @desc    Generate/Recalculate report cards for a class-section in an exam
 * @route   POST /api/v1/report-cards/generate
 * @access  Private/Admin
 */
const generateReportCards = asyncHandler(async (req, res) => {
  const { examId, classId, sectionId } = req.body;

  if (!examId || !classId || !sectionId) {
    throw ApiError.badRequest('Exam ID, Class ID, and Section ID are required');
  }

  // 1. Get all students in this class-section
  const enrollments = await prisma.studentClass.findMany({
    where: {
      classId: parseInt(classId),
      sectionId: parseInt(sectionId),
      academicYearId: {
        equals: (await prisma.exam.findUnique({ where: { id: parseInt(examId) } })).academicYearId
      },
      status: 'active'
    }
  });

  if (enrollments.length === 0) throw ApiError.notFound('No students found in this section');

  // 2. Process each student
  const reportCards = await prisma.$transaction(async (tx) => {
    const results = [];
    
    for (const enrollment of enrollments) {
      // Get all results for this student in this exam
      const studentResults = await tx.examResult.findMany({
        where: {
          studentId: enrollment.studentId,
          examSubject: { examId: parseInt(examId) }
        },
        include: {
          examSubject: true
        }
      });

      if (studentResults.length === 0) continue;

      let totalObtained = 0;
      let totalFull = 0;
      
      studentResults.forEach(r => {
        totalObtained += (parseFloat(r.marksObtained) || 0) + (parseFloat(r.practicalMarks) || 0);
        totalFull += r.examSubject.fullMarks;
      });

      const percentage = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0;
      let overallGrade = 'F';
      if (percentage >= 90) overallGrade = 'A+';
      else if (percentage >= 80) overallGrade = 'A';
      else if (percentage >= 70) overallGrade = 'B+';
      else if (percentage >= 60) overallGrade = 'B';
      else if (percentage >= 50) overallGrade = 'C+';
      else if (percentage >= 40) overallGrade = 'C';

      // Upsert report card
      const rc = await tx.reportCard.upsert({
        where: {
          studentId_examId: {
            studentId: enrollment.studentId,
            examId: parseInt(examId)
          }
        },
        update: {
          studentClassId: enrollment.id,
          totalMarks: totalObtained,
          percentage: percentage,
          overallGrade,
          generatedAt: new Date()
        },
        create: {
          studentId: enrollment.studentId,
          examId: parseInt(examId),
          studentClassId: enrollment.id,
          totalMarks: totalObtained,
          percentage: percentage,
          overallGrade,
          generatedAt: new Date()
        }
      });
      results.push(rc);
    }

    // 3. Assign Ranks within this class-section
    const allRCs = await tx.reportCard.findMany({
      where: {
        examId: parseInt(examId),
        studentClass: {
          classId: parseInt(classId),
          sectionId: parseInt(sectionId)
        }
      },
      orderBy: { percentage: 'desc' }
    });

    for (let i = 0; i < allRCs.length; i++) {
      await tx.reportCard.update({
        where: { id: allRCs[i].id },
        data: { classRank: i + 1 }
      });
    }

    return results;
  });

  ApiResponse.success(res, reportCards, 'Report cards generated and ranks assigned successfully');
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
      studentId_examId: { studentId, examId }
    },
    include: {
      exam: true,
      student: { include: { user: true } },
      studentClass: { include: { class: true, section: true } }
    }
  });

  if (!reportCard) throw ApiError.notFound('Report card not found');

  // Authorization check
  const canSeeUnpublished = req.user.roles.includes('ADMIN') || req.user.roles.includes('TEACHER');
  if (!reportCard.isPublished && !canSeeUnpublished) {
    throw ApiError.forbidden('Report card not yet published');
  }

  // Get subject-wise details
  const results = await prisma.examResult.findMany({
    where: {
      studentId,
      examSubject: { examId }
    },
    include: {
      examSubject: {
        include: {
          classSubject: { include: { subject: true } }
        }
      }
    }
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
        sectionId: parseInt(sectionId)
      }
    },
    data: { isPublished: true }
  });

  ApiResponse.success(res, null, 'Report cards published successfully');
});

module.exports = {
  generateReportCards,
  getReportCard,
  publishReportCards
};
