const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");

/**
 * @desc    Get exams available for the teacher (PUBLISHED status only)
 * @route   GET /api/v1/exam-results/teacher/exams
 * @access  Private/Teacher
 */
const getTeacherExams = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { academicYearId } = req.query;

  // Get teacher's assigned subjects
  const teacherSubjects = await prisma.teacherSubject.findMany({
    where: {
      userId,
      ...(academicYearId ? { academicYearId: parseInt(academicYearId) } : {}),
    },
    select: { classSubjectId: true, sectionId: true },
  });

  if (teacherSubjects.length === 0) {
    return ApiResponse.success(res, [], "No subjects assigned to you.");
  }

  const classSubjectIds = [
    ...new Set(teacherSubjects.map((ts) => ts.classSubjectId)),
  ];

  // Find exams that have subjects assigned to this teacher
  const exams = await prisma.exam.findMany({
    where: {
      schoolId: req.user.schoolId,
      status: "PUBLISHED", // Only PUBLISHED exams for marks entry
      examSubjects: {
        some: {
          classSubjectId: { in: classSubjectIds },
        },
      },
      ...(academicYearId
        ? { academicYearId: parseInt(academicYearId) }
        : { academicYear: { isCurrent: true } }),
    },
    orderBy: { startDate: "desc" },
    include: {
      academicYear: true,
      examSubjects: {
        where: {
          classSubjectId: { in: classSubjectIds },
        },
        include: {
          classSubject: {
            include: {
              class: true,
              subject: true,
            },
          },
        },
      },
    },
  });

  // Attach section info to each exam subject based on teacher assignments
  const examsWithSections = exams.map((exam) => ({
    ...exam,
    examSubjects: exam.examSubjects.map((es) => {
      const assignedSections = teacherSubjects
        .filter((ts) => ts.classSubjectId === es.classSubjectId)
        .map((ts) => ts.sectionId);
      return {
        ...es,
        assignedSectionIds: assignedSections,
      };
    }),
  }));

  ApiResponse.success(res, examsWithSections);
});

/**
 * @desc    Get existing results for an exam subject
 * @route   GET /api/v1/exam-results/exam-subjects/:examSubjectId
 * @access  Private/Teacher
 */
const getResultsByExamSubject = asyncHandler(async (req, res) => {
  const { examSubjectId } = req.params;
  const { sectionId } = req.query;
  const userId = req.user.id;

  // Validate exam subject exists
  const examSubject = await prisma.examSubject.findUnique({
    where: { id: parseInt(examSubjectId) },
    include: {
      exam: true,
      classSubject: {
        include: { class: true, subject: true },
      },
    },
  });

  if (!examSubject) {
    throw ApiError.notFound("Exam subject not found");
  }

  if (examSubject.exam.schoolId !== req.user.schoolId) {
    throw ApiError.forbidden("Exam subject does not belong to your school");
  }

  // Verify teacher is assigned to this subject
  const teacherAssignment = await prisma.teacherSubject.findFirst({
    where: {
      userId,
      classSubjectId: examSubject.classSubjectId,
      sectionId: sectionId ? parseInt(sectionId) : undefined,
    },
  });

  if (!teacherAssignment) {
    throw ApiError.forbidden("You are not assigned to this subject/section");
  }

  // Get existing results with student info
  const results = await prisma.examResult.findMany({
    where: {
      examSubjectId: parseInt(examSubjectId),
      student: {
        studentClasses: {
          some: {
            classId: examSubject.classSubject.classId,
            sectionId: parseInt(sectionId),
            academicYearId: examSubject.exam.academicYearId,
            status: "active",
          },
        },
      },
    },
    include: {
      student: {
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
  });

  ApiResponse.success(res, {
    examSubject,
    results,
  });
});

/**
 * @desc    Save/update exam results (marks entry)
 * @route   POST /api/v1/exam-results
 * @access  Private/Teacher
 */
const saveResults = asyncHandler(async (req, res) => {
  const { examSubjectId, sectionId, results } = req.body;
  const userId = req.user.id;

  // 1. Validate exam subject exists
  const examSubject = await prisma.examSubject.findUnique({
    where: { id: parseInt(examSubjectId) },
    include: {
      exam: true,
      classSubject: {
        include: {
          subject: true,
        },
      },
    },
  });

  if (!examSubject) {
    throw ApiError.notFound("Exam subject not found");
  }

  if (examSubject.exam.schoolId !== req.user.schoolId) {
    throw ApiError.forbidden("Exam subject does not belong to your school");
  }

  // 2. CHECK: Exam must be PUBLISHED
  if (examSubject.exam.status !== "PUBLISHED") {
    throw ApiError.badRequest(
      `Cannot enter marks. Exam status is ${examSubject.exam.status}. Marks can only be entered when exam is PUBLISHED.`
    );
  }

  // 3. CHECK: Teacher must be assigned to this subject/section
  const teacherAssignment = await prisma.teacherSubject.findFirst({
    where: {
      userId,
      classSubjectId: examSubject.classSubjectId,
      sectionId: parseInt(sectionId),
    },
  });

  if (!teacherAssignment) {
    throw ApiError.forbidden(
      "You are not assigned to this subject/section. Cannot enter marks."
    );
  }

  // 4. Validate students belong to correct class/section
  const studentIds = results.map((r) => parseInt(r.studentId));

  const validStudents = await prisma.studentClass.findMany({
    where: {
      studentId: { in: studentIds },
      classId: examSubject.classSubject.classId,
      sectionId: parseInt(sectionId),
      academicYearId: examSubject.exam.academicYearId,
      status: "active",
      schoolId: req.user.schoolId,
    },
    select: { studentId: true, id: true },
  });

  const validStudentIds = new Set(validStudents.map((vs) => vs.studentId));
  const studentClassMap = new Map(
    validStudents.map((vs) => [vs.studentId, vs.id])
  );

  // Filter to only valid students
  const validResults = results.filter((r) =>
    validStudentIds.has(parseInt(r.studentId))
  );

  if (validResults.length === 0) {
    throw ApiError.badRequest(
      "No valid students found. Students must be enrolled in the correct class/section."
    );
  }

  // 5. Upsert results
  const savedResults = await prisma.$transaction(async (tx) => {
    const upsertedResults = [];

    for (const result of validResults) {
      // Validate marks limits
      const theoryObtained = result.marksObtained
        ? parseFloat(result.marksObtained)
        : 0;
      const practicalObtained = result.practicalMarks
        ? parseFloat(result.practicalMarks)
        : 0;

      // Practical limit: prefer exam subject, then class subject, otherwise allow entered value when subject is practical
      const hasPracticalFlag =
        (examSubject.practicalFullMarks ?? 0) > 0 ||
        (examSubject.classSubject?.practicalMarks ?? 0) > 0 ||
        !!examSubject.classSubject?.subject?.hasPractical;

      const practicalLimit = Math.max(
        examSubject.practicalFullMarks ?? 0,
        examSubject.classSubject?.practicalMarks ?? 0,
        hasPracticalFlag ? practicalObtained : 0,
        0
      );

      if (theoryObtained < 0 || practicalObtained < 0) {
        throw ApiError.badRequest(
          `Marks cannot be negative for student ${result.studentId}`
        );
      }
      if (theoryObtained > (examSubject.theoryFullMarks || 100)) {
        throw ApiError.badRequest(
          `Theory marks for student ${result.studentId} cannot exceed ${
            examSubject.theoryFullMarks || 100
          }`
        );
      }
      if (practicalObtained > practicalLimit) {
        throw ApiError.badRequest(
          `Practical marks for student ${result.studentId} cannot exceed ${practicalLimit}`
        );
      }

      const studentClassId =
        studentClassMap.get(parseInt(result.studentId)) || null;

      const upserted = await tx.examResult.upsert({
        where: {
          examSubjectId_studentId: {
            examSubjectId: parseInt(examSubjectId),
            studentId: parseInt(result.studentId),
          },
        },
        update: {
          marksObtained: result.isAbsent
            ? null
            : parseFloat(result.marksObtained) || null,
          practicalMarks: result.practicalMarks
            ? parseFloat(result.practicalMarks)
            : null,
          isAbsent: result.isAbsent || false,
          remarks: result.remarks || null,
          enteredBy: userId,
          studentClassId,
          schoolId: req.user.schoolId,
        },
        create: {
          examSubjectId: parseInt(examSubjectId),
          studentId: parseInt(result.studentId),
          marksObtained: result.isAbsent
            ? null
            : parseFloat(result.marksObtained) || null,
          practicalMarks: result.practicalMarks
            ? parseFloat(result.practicalMarks)
            : null,
          isAbsent: result.isAbsent || false,
          remarks: result.remarks || null,
          enteredBy: userId,
          studentClassId,
          schoolId: req.user.schoolId,
        },
      });
      upsertedResults.push(upserted);
    }

    return upsertedResults;
  });

  ApiResponse.success(
    res,
    savedResults,
    `Successfully saved marks for ${savedResults.length} students.`
  );
});

/**
 * @desc    Get students for marks entry
 * @route   GET /api/v1/exam-results/students
 * @access  Private/Teacher
 */
const getStudentsForMarksEntry = asyncHandler(async (req, res) => {
  const { examSubjectId, sectionId } = req.query;
  const userId = req.user.id;

  if (!examSubjectId || !sectionId) {
    throw ApiError.badRequest("examSubjectId and sectionId are required");
  }

  // Validate exam subject
  const examSubject = await prisma.examSubject.findUnique({
    where: { id: parseInt(examSubjectId) },
    include: {
      exam: true,
      classSubject: {
        include: { class: true, subject: true },
      },
    },
  });

  if (!examSubject) {
    throw ApiError.notFound("Exam subject not found");
  }

  // Verify teacher assignment
  const teacherAssignment = await prisma.teacherSubject.findFirst({
    where: {
      userId,
      classSubjectId: examSubject.classSubjectId,
      sectionId: parseInt(sectionId),
    },
  });

  if (!teacherAssignment) {
    throw ApiError.forbidden("You are not assigned to this subject/section");
  }

  // Get students in this class/section
  const studentClasses = await prisma.studentClass.findMany({
    where: {
      classId: examSubject.classSubject.classId,
      sectionId: parseInt(sectionId),
      academicYearId: examSubject.exam.academicYearId,
      status: "active",
    },
    include: {
      student: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          examResults: {
            where: { examSubjectId: parseInt(examSubjectId) },
          },
        },
      },
    },
    orderBy: { rollNumber: "asc" },
  });

  // Transform data
  const students = studentClasses.map((sc) => ({
    studentId: sc.student.id,
    rollNumber: sc.rollNumber,
    firstName: sc.student.user.firstName,
    lastName: sc.student.user.lastName,
    existingResult: sc.student.examResults[0] || null,
  }));

  ApiResponse.success(res, {
    examSubject,
    students,
  });
});

module.exports = {
  getTeacherExams,
  getResultsByExamSubject,
  saveResults,
  getStudentsForMarksEntry,
};
