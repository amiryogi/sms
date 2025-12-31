const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');

/**
 * @desc    Get results for an exam subject (for teachers to enter marks)
 * @route   GET /api/v1/results/:examSubjectId
 * @access  Private/Admin/Teacher
 */
const getResultsBySubject = asyncHandler(async (req, res) => {
  const examSubjectId = parseInt(req.params.examSubjectId);
  const { sectionId } = req.query;

  if (!sectionId) throw ApiError.badRequest('Section ID is required');

  const examSubject = await prisma.examSubject.findUnique({
    where: { id: examSubjectId },
    include: {
      classSubject: { include: { class: true, subject: true } }
    }
  });

  if (!examSubject) throw ApiError.notFound('Exam subject not found');

  // Get all students enrolled in this section for this academic year
  const students = await prisma.studentClass.findMany({
    where: {
      classId: examSubject.classSubject.classId,
      sectionId: parseInt(sectionId),
      academicYearId: examSubject.classSubject.academicYearId,
      status: 'active'
    },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true } },
          examResults: {
            where: { examSubjectId }
          }
        }
      }
    },
    orderBy: { rollNumber: 'asc' }
  });

  const formattedResults = students.map(enrollment => ({
    studentId: enrollment.student.id,
    rollNumber: enrollment.rollNumber,
    firstName: enrollment.student.user.firstName,
    lastName: enrollment.student.user.lastName,
    marksObtained: enrollment.student.examResults[0]?.marksObtained || null,
    practicalMarks: enrollment.student.examResults[0]?.practicalMarks || 0,
    grade: enrollment.student.examResults[0]?.grade || null,
    remarks: enrollment.student.examResults[0]?.remarks || '',
    resultId: enrollment.student.examResults[0]?.id || null
  }));

  ApiResponse.success(res, {
    examSubject,
    results: formattedResults
  });
});

/**
 * @desc    Bulk enter/update marks for an exam subject
 * @route   POST /api/v1/results
 * @access  Private/Admin/Teacher
 */
const saveResults = asyncHandler(async (req, res) => {
  const { examSubjectId, results } = req.body; // results: Array of { studentId, marksObtained, practicalMarks, remarks }

  if (!examSubjectId || !Array.isArray(results)) {
    throw ApiError.badRequest('Exam Subject ID and results array are required');
  }

  const examSubject = await prisma.examSubject.findUnique({
    where: { id: parseInt(examSubjectId) }
  });

  if (!examSubject) throw ApiError.notFound('Exam subject not found');

  const savedResults = await prisma.$transaction(async (tx) => {
    const updated = [];
    for (const res of results) {
      // Logic for grading can be added here
      const totalMarks = (parseFloat(res.marksObtained) || 0) + (parseFloat(res.practicalMarks) || 0);
      let grade = null;
      
      // Simple grading logic example (can be customized per school)
      const percentage = (totalMarks / examSubject.fullMarks) * 100;
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B+';
      else if (percentage >= 60) grade = 'B';
      else if (percentage >= 50) grade = 'C+';
      else if (percentage >= 40) grade = 'C';
      else grade = 'F';

      const result = await tx.examResult.upsert({
        where: {
          examSubjectId_studentId: {
            examSubjectId: parseInt(examSubjectId),
            studentId: parseInt(res.studentId)
          }
        },
        update: {
          marksObtained: res.marksObtained,
          practicalMarks: res.practicalMarks || 0,
          grade,
          remarks: res.remarks || null,
          enteredBy: req.user.id
        },
        create: {
          examSubjectId: parseInt(examSubjectId),
          studentId: parseInt(res.studentId),
          marksObtained: res.marksObtained,
          practicalMarks: res.practicalMarks || 0,
          grade,
          remarks: res.remarks || null,
          enteredBy: req.user.id
        }
      });
      updated.push(result);
    }
    return updated;
  });

  ApiResponse.success(res, savedResults, 'Results saved successfully');
});

/**
 * @desc    Get student's own results for a specific exam
 * @route   GET /api/v1/results/student/:studentId/exam/:examId
 * @access  Private/Admin/Teacher/Student/Parent
 */
const getStudentExamResults = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const examId = parseInt(req.params.examId);

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId: req.user.schoolId }
  });

  if (!exam) throw ApiError.notFound('Exam not found');

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

  // Only show results if published, or if user is Admin/Teacher
  const canSeeAll = req.user.roles.includes('ADMIN') || req.user.roles.includes('TEACHER');
  if (!exam.isPublished && !canSeeAll) {
    throw ApiError.forbidden('Results for this exam have not been published yet');
  }

  ApiResponse.success(res, results);
});

module.exports = {
  getResultsBySubject,
  saveResults,
  getStudentExamResults
};
