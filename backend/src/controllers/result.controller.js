const prisma = require("../config/database");
const {
  ApiError,
  ApiResponse,
  asyncHandler,
  gradeCalculator,
} = require("../utils");
const { getDefaultScale } = require("../services/gradeScale.service");

/**
 * @desc    Get results for an exam subject (for teachers to enter marks)
 * @route   GET /api/v1/results/:examSubjectId
 * @access  Private/Admin (LEGACY -- superseded by /exam-results; admin-only)
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

  // Verify teacher is assigned to this subject/section (skip for admins)
  if (
    req.user.roles.includes("TEACHER") &&
    !req.user.roles.includes("ADMIN") &&
    !req.user.roles.includes("SUPER_ADMIN")
  ) {
    const teacherAssignment = await prisma.teacherSubject.findFirst({
      where: {
        userId: req.user.id,
        classSubjectId: examSubject.classSubjectId,
        sectionId: parseInt(sectionId),
      },
    });

    if (!teacherAssignment) {
      throw ApiError.forbidden(
        "You are not assigned to this subject/section. Cannot view results."
      );
    }
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
    orderBy: { rollNumber: { sort: "asc", nulls: "first" } },
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
 * @access  Private/Admin (LEGACY -- superseded by /exam-results; admin-only)
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

  // Fix Issue #7: Check exam status before marks entry
  if (examSubject.exam.status !== "PUBLISHED") {
    throw ApiError.badRequest(
      `Cannot enter marks. Exam status is ${examSubject.exam.status}. Marks can only be entered when exam is PUBLISHED.`
    );
  }

  // Validate academic year belongs to school
  if (examSubject.classSubject.academicYear.schoolId !== req.user.schoolId) {
    throw ApiError.forbidden("Academic year does not belong to your school");
  }

  // Fix Issue #2: Verify teacher is assigned to this subject (skip for admins)
  if (
    req.user.roles.includes("TEACHER") &&
    !req.user.roles.includes("ADMIN") &&
    !req.user.roles.includes("SUPER_ADMIN")
  ) {
    const { sectionId } = req.body;
    if (!sectionId) {
      throw ApiError.badRequest("Section ID is required for teachers");
    }

    const teacherAssignment = await prisma.teacherSubject.findFirst({
      where: {
        userId: req.user.id,
        classSubjectId: examSubject.classSubjectId,
        sectionId: parseInt(sectionId),
      },
    });

    if (!teacherAssignment) {
      throw ApiError.forbidden(
        "You are not assigned to this subject/section. Cannot enter marks."
      );
    }
  }

  // Stored grades use the school's default scale, like a newly generated card.
  const scale = await getDefaultScale(req.user.schoolId);

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
      // Grade via the shared calculator so the stored grade is identical to the
      // one the report card renders for these marks (CLAUDE.md invariant #8).
      // It applies the per-component rule: failing theory or practical below
      // the scale's pass percentage makes the whole subject fail.
      const { finalGrade: grade } = gradeCalculator.calculateSubjectGrade(
        {
          theoryMarks: theoryObtained,
          theoryFullMarks:
            examSubject.theoryFullMarks || examSubject.fullMarks || 100,
          practicalMarks: practicalObtained,
          practicalFullMarks: examSubject.practicalFullMarks || 0,
          hasPractical: Boolean(examSubject.hasPractical),
          isAbsent: Boolean(res.isAbsent),
        },
        scale,
      );

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
    orderBy: { id: "asc" },
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

  // Visibility of raw marks:
  //  - ADMIN / SUPER_ADMIN / EXAM_OFFICER (own school): always
  //  - TEACHER: only with a TeacherSubject for the student's class + section in
  //    the exam's academic year
  //  - STUDENT / PARENT: only once the student's report card for this exam is
  //    published, or the exam is LOCKED (marks entry closed). PUBLISHED alone is
  //    not enough -- marks entry is still open then.
  const roles = req.user.roles || [];
  let allowed = false;

  if (roles.some((r) => ["ADMIN", "SUPER_ADMIN", "EXAM_OFFICER"].includes(r))) {
    allowed = true;
  } else if (roles.includes("TEACHER") && exam.status !== "DRAFT") {
    const enrollment = await prisma.studentClass.findFirst({
      where: {
        studentId,
        academicYearId: exam.academicYearId,
        schoolId: req.user.schoolId,
      },
      select: { classId: true, sectionId: true },
    });
    if (enrollment) {
      const assignment = await prisma.teacherSubject.findFirst({
        where: {
          userId: req.user.id,
          sectionId: enrollment.sectionId,
          academicYearId: exam.academicYearId,
          classSubject: {
            classId: enrollment.classId,
            class: { schoolId: req.user.schoolId },
          },
        },
        select: { id: true },
      });
      allowed = Boolean(assignment);
    }
  }

  if (!allowed && (roles.includes("STUDENT") || roles.includes("PARENT"))) {
    if (exam.status === "LOCKED") {
      allowed = true;
    } else if (exam.status === "PUBLISHED") {
      const publishedCard = await prisma.reportCard.findFirst({
        where: { studentId, examId, isPublished: true },
        select: { id: true },
      });
      allowed = Boolean(publishedCard);
    }
    if (!allowed) {
      throw ApiError.forbidden("Results not yet published");
    }
  }

  if (!allowed) {
    throw ApiError.forbidden("You are not allowed to view these results");
  }

  ApiResponse.success(res, results);
});

module.exports = {
  getResultsBySubject,
  saveResults,
  getStudentExamResults,
};
