const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");

/**
 * @desc    Get results for an exam subject (for teachers to enter marks)
 * @route   GET /api/v1/results/:examSubjectId
 * @access  Private/Admin/Teacher
 */
const getResultsBySubject = asyncHandler(async (req, res) => {
  const examSubjectId = parseInt(req.params.examSubjectId);
  const { sectionId } = req.query;

  if (!sectionId) throw ApiError.badRequest("Section ID is required");

  const examSubject = await prisma.examSubject.findFirst({
    where: {
      id: examSubjectId,
      exam: {
        schoolId: req.user.schoolId, // School-level isolation
      },
      classSubject: {
        class: {
          schoolId: req.user.schoolId, // Additional school check
        },
      },
    },
    include: {
      exam: true,
      classSubject: {
        include: {
          class: true,
          subject: true,
          academicYear: true,
        },
      },
    },
  });

  if (!examSubject) {
    throw ApiError.notFound(
      "Exam subject not found or does not belong to your school"
    );
  }

  if (examSubject.exam.status !== "PUBLISHED") {
    throw ApiError.badRequest(
      `Cannot enter marks. Exam status is ${examSubject.exam.status}.`
    );
  }

  // Validate academic year belongs to school
  if (examSubject.classSubject.academicYear.schoolId !== req.user.schoolId) {
    throw ApiError.forbidden("Academic year does not belong to your school");
  }

  // Validate section belongs to school
  const section = await prisma.section.findFirst({
    where: { id: parseInt(sectionId), schoolId: req.user.schoolId },
  });
  if (!section) {
    throw ApiError.notFound(
      "Section not found or does not belong to your school"
    );
  }

  // Get all students enrolled in this section for this academic year
  const students = await prisma.studentClass.findMany({
    where: {
      classId: examSubject.classSubject.classId,
      sectionId: parseInt(sectionId),
      academicYearId: examSubject.classSubject.academicYearId,
      status: "active",
      student: {
        user: {
          schoolId: req.user.schoolId, // School-level isolation
        },
      },
    },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true } },
          examResults: {
            where: { examSubjectId },
          },
        },
      },
    },
    orderBy: { rollNumber: "asc" },
  });

  const formattedResults = students.map((enrollment) => ({
    studentId: enrollment.student.id,
    rollNumber: enrollment.rollNumber,
    firstName: enrollment.student.user.firstName,
    lastName: enrollment.student.user.lastName,
    marksObtained: enrollment.student.examResults[0]?.marksObtained || null,
    practicalMarks: enrollment.student.examResults[0]?.practicalMarks || 0,
    grade: enrollment.student.examResults[0]?.grade || null,
    remarks: enrollment.student.examResults[0]?.remarks || "",
    resultId: enrollment.student.examResults[0]?.id || null,
  }));

  ApiResponse.success(res, {
    examSubject,
    results: formattedResults,
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
    throw ApiError.badRequest("Exam Subject ID and results array are required");
  }

  const examSubject = await prisma.examSubject.findFirst({
    where: {
      id: parseInt(examSubjectId),
      exam: {
        schoolId: req.user.schoolId, // School-level isolation
      },
      classSubject: {
        class: {
          schoolId: req.user.schoolId, // Additional school check
        },
      },
    },
    include: {
      exam: true,
      classSubject: {
        include: {
          academicYear: true,
          class: true,
        },
      },
    },
  });

  if (!examSubject) {
    throw ApiError.notFound(
      "Exam subject not found or does not belong to your school"
    );
  }

  // Validate academic year belongs to school
  if (examSubject.classSubject.academicYear.schoolId !== req.user.schoolId) {
    throw ApiError.forbidden("Academic year does not belong to your school");
  }

  const savedResults = await prisma.$transaction(async (tx) => {
    const updated = [];
    for (const res of results) {
      // Validate student belongs to school
      const student = await tx.student.findFirst({
        where: {
          id: parseInt(res.studentId),
          user: {
            schoolId: req.user.schoolId,
          },
        },
      });

      if (!student) {
        throw ApiError.badRequest(
          `Student ${res.studentId} not found or does not belong to your school`
        );
      }
      const enrollment = await tx.studentClass.findFirst({
        where: {
          studentId: student.id,
          classId: examSubject.classSubject.classId,
          academicYearId: examSubject.classSubject.academicYearId,
          status: "active",
          schoolId: req.user.schoolId,
        },
      });

      if (!enrollment) {
        throw ApiError.badRequest(
          `Student ${res.studentId} is not enrolled for this class/year`
        );
      }
      const theoryObtained = res.marksObtained
        ? parseFloat(res.marksObtained)
        : 0;
      const practicalObtained = res.practicalMarks
        ? parseFloat(res.practicalMarks)
        : 0;
      if (theoryObtained < 0 || practicalObtained < 0) {
        throw ApiError.badRequest(
          `Marks cannot be negative for student ${res.studentId}`
        );
      }
      if (
        theoryObtained >
        (examSubject.theoryFullMarks || examSubject.fullMarks || 100)
      ) {
        throw ApiError.badRequest(
          `Theory marks for student ${res.studentId} cannot exceed ${
            examSubject.theoryFullMarks || examSubject.fullMarks || 100
          }`
        );
      }
      if (practicalObtained > (examSubject.practicalFullMarks || 0)) {
        throw ApiError.badRequest(
          `Practical marks for student ${res.studentId} cannot exceed ${
            examSubject.practicalFullMarks || 0
          }`
        );
      }
      // Logic for grading can be added here
      const totalMarks = theoryObtained + practicalObtained;
      let grade = null;

      // Simple grading logic example (can be customized per school)
      const percentage = (totalMarks / examSubject.fullMarks) * 100;
      if (percentage >= 90) grade = "A+";
      else if (percentage >= 80) grade = "A";
      else if (percentage >= 70) grade = "B+";
      else if (percentage >= 60) grade = "B";
      else if (percentage >= 50) grade = "C+";
      else if (percentage >= 40) grade = "C";
      else grade = "F";

      const result = await tx.examResult.upsert({
        where: {
          examSubjectId_studentId: {
            examSubjectId: parseInt(examSubjectId),
            studentId: parseInt(res.studentId),
          },
        },
        update: {
          marksObtained: res.marksObtained,
          practicalMarks: res.practicalMarks || 0,
          grade,
          remarks: res.remarks || null,
          enteredBy: req.user.id,
          studentClassId: enrollment.id,
          schoolId: req.user.schoolId,
        },
        create: {
          examSubjectId: parseInt(examSubjectId),
          studentId: parseInt(res.studentId),
          marksObtained: res.marksObtained,
          practicalMarks: res.practicalMarks || 0,
          grade,
          remarks: res.remarks || null,
          enteredBy: req.user.id,
          studentClassId: enrollment.id,
          schoolId: req.user.schoolId,
        },
      });
      updated.push(result);
    }
    return updated;
  });

  ApiResponse.success(res, savedResults, "Results saved successfully");
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
    where: { id: examId, schoolId: req.user.schoolId },
  });

  if (!exam) throw ApiError.notFound("Exam not found");

  // Validate student belongs to school
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      user: {
        schoolId: req.user.schoolId, // School-level isolation
      },
    },
  });

  if (!student) {
    throw ApiError.notFound(
      "Student not found or does not belong to your school"
    );
  }

  const results = await prisma.examResult.findMany({
    where: {
      studentId,
      examSubject: {
        examId,
        exam: {
          schoolId: req.user.schoolId, // Additional school filter
        },
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

  // Only show results if published, or if user is Admin/Teacher
  const canSeeAll =
    req.user.roles.includes("ADMIN") || req.user.roles.includes("TEACHER");
  if (!exam.isPublished && !canSeeAll) {
    throw ApiError.forbidden(
      "Results for this exam have not been published yet"
    );
  }

  ApiResponse.success(res, results);
});

module.exports = {
  getResultsBySubject,
  saveResults,
  getStudentExamResults,
};
