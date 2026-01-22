const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");
const { getMarksEntryRole } = require("../middleware");

/**
 * Helper: Check if user can bypass teacher assignment check
 * EXAM_OFFICER and ADMIN can enter marks for any subject
 */
const canBypassTeacherCheck = (user) => {
  const bypassRoles = ["EXAM_OFFICER", "ADMIN", "SUPER_ADMIN"];
  return user.roles.some((role) => bypassRoles.includes(role));
};

/**
 * @desc    Get exams available for marks entry (PUBLISHED status only)
 * @route   GET /api/v1/exam-results/exams
 * @access  Private/Teacher, EXAM_OFFICER, Admin
 */
const getExamsForMarksEntry = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { academicYearId } = req.query;
  const isExamOfficerOrAdmin = canBypassTeacherCheck(req.user);

  // Determine academic year filter
  let yearFilter = {};
  if (academicYearId) {
    yearFilter = { academicYearId: parseInt(academicYearId) };
  } else {
    // Default to current academic year
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId: req.user.schoolId, isCurrent: true },
    });
    if (currentYear) {
      yearFilter = { academicYearId: currentYear.id };
    }
  }

  // EXAM_OFFICER/ADMIN: Can see all exams for the school
  if (isExamOfficerOrAdmin) {
    const exams = await prisma.exam.findMany({
      where: {
        schoolId: req.user.schoolId,
        status: "PUBLISHED",
        ...yearFilter,
      },
      orderBy: { startDate: "desc" },
      include: {
        academicYear: true,
        examSubjects: {
          select: {
            id: true,
            examId: true,
            classSubjectId: true,
            examDate: true,
            startTime: true,
            endTime: true,
            hasTheory: true,
            hasPractical: true,
            fullMarks: true,
            passMarks: true,
            theoryFullMarks: true,
            practicalFullMarks: true,
            createdAt: true,
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

    // For EXAM_OFFICER/ADMIN, get all sections for each class
    const examsWithSections = await Promise.all(
      exams.map(async (exam) => ({
        ...exam,
        examSubjects: await Promise.all(
          exam.examSubjects.map(async (es) => {
            // Get all sections that have students enrolled in this class
            const sections = await prisma.section.findMany({
              where: {
                schoolId: req.user.schoolId,
                studentClasses: {
                  some: {
                    classId: es.classSubject.classId,
                    academicYearId: exam.academicYearId,
                    status: "active",
                  },
                },
              },
              select: { id: true, name: true },
            });

            // Check if NEB class (Grade 11-12) and fetch components
            const gradeLevel = es.classSubject.class.gradeLevel;
            const isNEBClass = gradeLevel >= 11;
            let nebComponents = null;

            if (isNEBClass) {
              nebComponents = await prisma.subjectComponent.findMany({
                where: {
                  classId: es.classSubject.classId,
                  subjectId: es.classSubject.subjectId,
                },
                orderBy: { type: "asc" },
              });
            }

            return {
              ...es,
              assignedSectionIds: sections.map((s) => s.id),
              sections: sections,
              isNEBClass,
              nebComponents: nebComponents || [],
            };
          }),
        ),
      })),
    );

    return ApiResponse.success(res, examsWithSections);
  }

  // TEACHER: Can only see exams for assigned subjects
  const teacherSubjects = await prisma.teacherSubject.findMany({
    where: {
      userId,
      ...yearFilter,
    },
    select: { classSubjectId: true, sectionId: true, academicYearId: true },
  });

  if (teacherSubjects.length === 0) {
    return ApiResponse.success(
      res,
      [],
      "No subjects assigned to you for this academic year.",
    );
  }

  const classSubjectIds = [
    ...new Set(teacherSubjects.map((ts) => ts.classSubjectId)),
  ];
  const academicYearIds = [
    ...new Set(teacherSubjects.map((ts) => ts.academicYearId)),
  ];

  const exams = await prisma.exam.findMany({
    where: {
      schoolId: req.user.schoolId,
      status: "PUBLISHED",
      academicYearId: { in: academicYearIds },
      examSubjects: {
        some: {
          classSubjectId: { in: classSubjectIds },
        },
      },
    },
    orderBy: { startDate: "desc" },
    include: {
      academicYear: true,
      examSubjects: {
        where: {
          classSubjectId: { in: classSubjectIds },
        },
        select: {
          id: true,
          examId: true,
          classSubjectId: true,
          examDate: true,
          startTime: true,
          endTime: true,
          hasTheory: true,
          hasPractical: true,
          fullMarks: true,
          passMarks: true,
          theoryFullMarks: true,
          practicalFullMarks: true,
          createdAt: true,
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

  // Map exams with sections and NEB info
  const examsWithSections = await Promise.all(
    exams.map(async (exam) => ({
      ...exam,
      examSubjects: await Promise.all(
        exam.examSubjects.map(async (es) => {
          const assignedSections = teacherSubjects
            .filter((ts) => ts.classSubjectId === es.classSubjectId)
            .map((ts) => ts.sectionId);

          // Check if NEB class (Grade 11-12) and fetch components
          const gradeLevel = es.classSubject.class.gradeLevel;
          const isNEBClass = gradeLevel >= 11;
          let nebComponents = null;

          if (isNEBClass) {
            nebComponents = await prisma.subjectComponent.findMany({
              where: {
                classId: es.classSubject.classId,
                subjectId: es.classSubject.subjectId,
              },
              orderBy: { type: "asc" },
            });
          }

          return {
            ...es,
            assignedSectionIds: assignedSections,
            isNEBClass,
            nebComponents: nebComponents || [],
          };
        }),
      ),
    })),
  );

  ApiResponse.success(res, examsWithSections);
});

/**
 * @desc    Get exams available for the teacher (PUBLISHED status only)
 * @route   GET /api/v1/exam-results/teacher/exams
 * @access  Private/Teacher
 * @deprecated Use getExamsForMarksEntry instead
 */
const getTeacherExams = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { academicYearId } = req.query;

  // Determine academic year filter
  let yearFilter = {};
  if (academicYearId) {
    yearFilter = { academicYearId: parseInt(academicYearId) };
  } else {
    // Default to current academic year
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId: req.user.schoolId, isCurrent: true },
    });
    if (currentYear) {
      yearFilter = { academicYearId: currentYear.id };
    }
  }

  // Get teacher's assigned subjects for the academic year
  const teacherSubjects = await prisma.teacherSubject.findMany({
    where: {
      userId,
      ...yearFilter,
    },
    select: { classSubjectId: true, sectionId: true, academicYearId: true },
  });

  if (teacherSubjects.length === 0) {
    return ApiResponse.success(
      res,
      [],
      "No subjects assigned to you for this academic year.",
    );
  }

  const classSubjectIds = [
    ...new Set(teacherSubjects.map((ts) => ts.classSubjectId)),
  ];
  const academicYearIds = [
    ...new Set(teacherSubjects.map((ts) => ts.academicYearId)),
  ];

  // Find exams that have subjects assigned to this teacher
  const exams = await prisma.exam.findMany({
    where: {
      schoolId: req.user.schoolId,
      status: "PUBLISHED", // Only PUBLISHED exams for marks entry
      academicYearId: { in: academicYearIds }, // Only exams from teacher's assigned years
      examSubjects: {
        some: {
          classSubjectId: { in: classSubjectIds },
        },
      },
    },
    orderBy: { startDate: "desc" },
    include: {
      academicYear: true,
      examSubjects: {
        where: {
          classSubjectId: { in: classSubjectIds },
        },
        select: {
          id: true,
          examId: true,
          classSubjectId: true,
          examDate: true,
          startTime: true,
          endTime: true,
          hasTheory: true,
          hasPractical: true,
          fullMarks: true,
          passMarks: true,
          theoryFullMarks: true,
          practicalFullMarks: true,
          createdAt: true,
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
 * @access  Private/Teacher, EXAM_OFFICER, Admin
 */
const getResultsByExamSubject = asyncHandler(async (req, res) => {
  const { examSubjectId } = req.params;
  const { sectionId } = req.query;
  const userId = req.user.id;
  const isExamOfficerOrAdmin = canBypassTeacherCheck(req.user);

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

  // Check if this is NEB class (Grade 11 or 12) and get SubjectComponents
  const gradeLevel = examSubject.classSubject.class.gradeLevel;
  const isNEBClass = gradeLevel >= 11;
  let nebComponents = null;

  if (isNEBClass) {
    // Fetch NEB subject components for this subject/class combination
    nebComponents = await prisma.subjectComponent.findMany({
      where: {
        classId: examSubject.classSubject.classId,
        subjectId: examSubject.classSubject.subjectId,
      },
      orderBy: { type: "asc" }, // THEORY first, then PRACTICAL
    });
  }

  // TEACHER: Verify teacher is assigned to this subject
  // EXAM_OFFICER/ADMIN: Skip assignment check
  if (!isExamOfficerOrAdmin) {
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
  }

  // Get existing results with student info
  const results = await prisma.examResult.findMany({
    where: {
      examSubjectId: parseInt(examSubjectId),
      schoolId: req.user.schoolId, // Fix Issue #6: Add schoolId filter
      student: {
        studentClasses: {
          some: {
            classId: examSubject.classSubject.classId,
            sectionId: parseInt(sectionId),
            academicYearId: examSubject.exam.academicYearId,
            status: "active",
            schoolId: req.user.schoolId, // Additional school isolation
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
          // Include studentClasses to get rollNumber
          studentClasses: {
            where: {
              classId: examSubject.classSubject.classId,
              sectionId: parseInt(sectionId),
              academicYearId: examSubject.exam.academicYearId,
              status: "active",
            },
            select: {
              id: true,
              rollNumber: true,
            },
          },
        },
      },
    },
  });

  ApiResponse.success(res, {
    examSubject,
    results,
    // NEB-specific info for Grade 11-12
    isNEBClass,
    nebComponents: nebComponents || [],
  });
});

/**
 * @desc    Save/update exam results (marks entry)
 * @route   POST /api/v1/exam-results
 * @access  Private/Teacher, EXAM_OFFICER, Admin
 */
const saveResults = asyncHandler(async (req, res) => {
  const { examSubjectId, sectionId, results } = req.body;
  const userId = req.user.id;
  const isExamOfficerOrAdmin = canBypassTeacherCheck(req.user);
  const enteredByRole = getMarksEntryRole(req.user);

  // 1. Validate exam subject exists
  const examSubject = await prisma.examSubject.findUnique({
    where: { id: parseInt(examSubjectId) },
    include: {
      exam: true,
      classSubject: {
        include: {
          subject: true,
          class: true,
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

  // 2. CHECK: Exam must be PUBLISHED (not DRAFT or LOCKED)
  if (examSubject.exam.status !== "PUBLISHED") {
    throw ApiError.badRequest(
      `Cannot enter marks. Exam status is ${examSubject.exam.status}. Marks can only be entered when exam is PUBLISHED.`,
    );
  }

  // 3. CHECK: Teacher must be assigned OR user is EXAM_OFFICER/ADMIN
  if (!isExamOfficerOrAdmin) {
    const teacherAssignment = await prisma.teacherSubject.findFirst({
      where: {
        userId,
        classSubjectId: examSubject.classSubjectId,
        sectionId: parseInt(sectionId),
      },
    });

    if (!teacherAssignment) {
      throw ApiError.forbidden(
        "You are not assigned to this subject/section. Cannot enter marks.",
      );
    }
  }

  // 4. Validate students belong to correct class/section
  const studentIds = results.map((r) => parseInt(r.studentId));

  // Check if this is NEB class (Grade 11-12) - requires student_subject validation
  const gradeLevel = examSubject.classSubject.class?.gradeLevel;
  const isNEBClass = gradeLevel >= 11;

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

  const studentClassMap = new Map(
    validStudents.map((vs) => [vs.studentId, vs.id]),
  );

  // For Grade 11-12: MUST validate subject enrollment via student_subject table
  // This prevents marks being entered for subjects not assigned to the student
  let validStudentIds;
  if (isNEBClass) {
    const studentClassIds = validStudents.map((vs) => vs.id);

    // Get students who are explicitly enrolled in this subject
    const enrolledStudents = await prisma.studentSubject.findMany({
      where: {
        studentClassId: { in: studentClassIds },
        classSubjectId: examSubject.classSubjectId,
        status: "ACTIVE",
      },
      select: {
        studentClass: { select: { studentId: true } },
      },
    });

    validStudentIds = new Set(
      enrolledStudents.map((es) => es.studentClass.studentId),
    );

    // Check for rejected students and provide helpful error
    const rejectedStudents = studentIds.filter(
      (sid) => !validStudentIds.has(sid) && studentClassMap.has(sid),
    );
    if (rejectedStudents.length > 0) {
      throw ApiError.badRequest(
        `Grade 11-12 validation failed: Students [${rejectedStudents.join(", ")}] are not enrolled in subject "${examSubject.classSubject.subject.name}". ` +
          `Marks can only be entered for subjects explicitly assigned to each student.`,
      );
    }
  } else {
    // Grade 1-10: All students in class/section can have marks for all class subjects
    validStudentIds = new Set(validStudents.map((vs) => vs.studentId));
  }

  // Filter to only valid students
  const validResults = results.filter((r) =>
    validStudentIds.has(parseInt(r.studentId)),
  );

  if (validResults.length === 0) {
    throw ApiError.badRequest(
      isNEBClass
        ? "No valid students found. For Grade 11-12, students must be enrolled in this specific subject via StudentSubject mapping."
        : "No valid students found. Students must be enrolled in the correct class/section.",
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

      // CORRECT: Use ExamSubject.hasPractical (single source of truth for evaluation structure)
      // This is a snapshot copied from ClassSubject at exam creation time
      const hasPracticalFlag = examSubject.hasPractical === true;
      const hasTheoryFlag = examSubject.hasTheory !== false; // Default to true

      // Reject practical marks if the exam subject doesn't have practical component
      if (!hasPracticalFlag && practicalObtained > 0) {
        throw ApiError.badRequest(
          `Practical marks not allowed for student ${result.studentId} - this subject does not have a practical component`,
        );
      }

      // Reject theory marks if the exam subject is practical-only (rare case)
      if (!hasTheoryFlag && theoryObtained > 0) {
        throw ApiError.badRequest(
          `Theory marks not allowed for student ${result.studentId} - this is a practical-only subject`,
        );
      }

      // Calculate limits from ExamSubject full marks (already a snapshot)
      const theoryLimit = examSubject.theoryFullMarks || 100;
      const practicalLimit = hasPracticalFlag
        ? examSubject.practicalFullMarks || 0
        : 0;

      if (theoryObtained < 0 || practicalObtained < 0) {
        throw ApiError.badRequest(
          `Marks cannot be negative for student ${result.studentId}`,
        );
      }
      if (hasTheoryFlag && theoryObtained > theoryLimit) {
        throw ApiError.badRequest(
          `Theory marks for student ${result.studentId} cannot exceed ${theoryLimit}`,
        );
      }
      if (hasPracticalFlag && practicalObtained > practicalLimit) {
        throw ApiError.badRequest(
          `Practical marks for student ${result.studentId} cannot exceed ${practicalLimit}`,
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
          enteredByRole: enteredByRole,
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
          enteredByRole: enteredByRole,
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
    `Successfully saved marks for ${savedResults.length} students.`,
  );
});

/**
 * @desc    Get students for marks entry
 * @route   GET /api/v1/exam-results/students
 * @access  Private/Teacher, EXAM_OFFICER, Admin
 */
const getStudentsForMarksEntry = asyncHandler(async (req, res) => {
  const { examSubjectId, sectionId } = req.query;
  const userId = req.user.id;
  const isExamOfficerOrAdmin = canBypassTeacherCheck(req.user);

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

  if (examSubject.exam.schoolId !== req.user.schoolId) {
    throw ApiError.forbidden("Exam subject does not belong to your school");
  }

  // TEACHER: Verify teacher assignment
  // EXAM_OFFICER/ADMIN: Skip assignment check
  if (!isExamOfficerOrAdmin) {
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
  }

  // Check if this is NEB class (Grade 11-12)
  const gradeLevel = examSubject.classSubject.class.gradeLevel;
  const isNEBClass = gradeLevel >= 11;

  // Get students in this class/section
  const studentClasses = await prisma.studentClass.findMany({
    where: {
      classId: examSubject.classSubject.classId,
      sectionId: parseInt(sectionId),
      academicYearId: examSubject.exam.academicYearId,
      status: "active",
      schoolId: req.user.schoolId,
      // For Grade 11-12: Only include students who have this subject in student_subject
      ...(isNEBClass && {
        studentSubjects: {
          some: {
            classSubjectId: examSubject.classSubjectId,
            status: "ACTIVE",
          },
        },
      }),
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
      studentProgram: isNEBClass
        ? {
            include: { program: true },
          }
        : false,
    },
    orderBy: { rollNumber: "asc" },
  });

  // Transform data
  const students = studentClasses.map((sc) => ({
    studentId: sc.student.id,
    studentClassId: sc.id,
    rollNumber: sc.rollNumber,
    firstName: sc.student.user.firstName,
    lastName: sc.student.user.lastName,
    programName: sc.studentProgram?.program?.name || null,
    existingResult: sc.student.examResults[0] || null,
  }));

  ApiResponse.success(res, {
    examSubject,
    students,
    isNEBClass,
  });
});

/**
 * @desc    Get students for marks entry filtered by program (Grade 11-12 only)
 * @route   GET /api/v1/exam-results/students-by-program
 * @access  Private/Teacher, EXAM_OFFICER, Admin
 */
const getStudentsByProgram = asyncHandler(async (req, res) => {
  const { examSubjectId, sectionId, programId } = req.query;
  const userId = req.user.id;
  const isExamOfficerOrAdmin = canBypassTeacherCheck(req.user);

  if (!examSubjectId || !sectionId || !programId) {
    throw ApiError.badRequest(
      "examSubjectId, sectionId, and programId are required",
    );
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

  if (examSubject.exam.schoolId !== req.user.schoolId) {
    throw ApiError.forbidden("Exam subject does not belong to your school");
  }

  // Validate class is Grade 11 or 12
  const gradeLevel = examSubject.classSubject.class.gradeLevel;
  if (gradeLevel < 11) {
    throw ApiError.badRequest(
      "Program-based student filtering is only available for Grade 11-12",
    );
  }

  // Validate program exists
  const program = await prisma.program.findFirst({
    where: {
      id: parseInt(programId),
      schoolId: req.user.schoolId,
    },
  });

  if (!program) {
    throw ApiError.notFound("Program not found");
  }

  // TEACHER: Verify teacher assignment
  if (!isExamOfficerOrAdmin) {
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
  }

  // Get students enrolled in this class/section AND in the specified program
  // CRITICAL FIX: Also filter by student_subject enrollment for the specific subject
  // This ensures only students who are enrolled in THIS subject appear
  const studentClasses = await prisma.studentClass.findMany({
    where: {
      classId: examSubject.classSubject.classId,
      sectionId: parseInt(sectionId),
      academicYearId: examSubject.exam.academicYearId,
      status: "active",
      schoolId: req.user.schoolId,
      // Filter by program through StudentProgram
      studentProgram: {
        programId: parseInt(programId),
      },
      // CRITICAL: Filter by subject enrollment via StudentSubject
      // This is the fix for the bug where Science + Management subjects appeared together
      studentSubjects: {
        some: {
          classSubjectId: examSubject.classSubjectId,
          status: "ACTIVE",
        },
      },
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
      studentProgram: {
        include: { program: true },
      },
    },
    orderBy: { rollNumber: "asc" },
  });

  // Transform data
  const students = studentClasses.map((sc) => ({
    studentId: sc.student.id,
    studentClassId: sc.id,
    rollNumber: sc.rollNumber,
    firstName: sc.student.user.firstName,
    lastName: sc.student.user.lastName,
    programName: sc.studentProgram?.program?.name || null,
    existingResult: sc.student.examResults[0] || null,
  }));

  ApiResponse.success(res, {
    examSubject,
    program,
    students,
    isNEBClass: true,
  });
});

/**
 * @desc    Get subjects assigned to a student from StudentSubject table
 * @route   GET /api/v1/exam-results/student-subjects
 * @access  Private/Teacher, EXAM_OFFICER, Admin
 */
const getStudentSubjects = asyncHandler(async (req, res) => {
  const { studentClassId } = req.query;
  const isExamOfficerOrAdmin = canBypassTeacherCheck(req.user);

  if (!studentClassId) {
    throw ApiError.badRequest("studentClassId is required");
  }

  // Get student class record
  const studentClass = await prisma.studentClass.findUnique({
    where: { id: parseInt(studentClassId) },
    include: {
      class: true,
      student: true,
    },
  });

  if (!studentClass) {
    throw ApiError.notFound("Student class record not found");
  }

  if (studentClass.schoolId !== req.user.schoolId) {
    throw ApiError.forbidden("Record does not belong to your school");
  }

  // Fetch subjects ONLY from StudentSubject table
  const studentSubjects = await prisma.studentSubject.findMany({
    where: {
      studentClassId: parseInt(studentClassId),
      status: "ACTIVE",
    },
    include: {
      classSubject: {
        include: {
          subject: true,
          class: true,
          // Get subject components for NEB classes
          subjectComponents: {
            orderBy: { type: "asc" },
          },
        },
      },
    },
  });

  // Transform to include all needed metadata
  const subjects = studentSubjects.map((ss) => {
    const cs = ss.classSubject;
    const components = cs.subjectComponents || [];
    const theoryComponent = components.find((c) => c.type === "THEORY");
    const practicalComponent = components.find((c) => c.type === "PRACTICAL");

    return {
      studentSubjectId: ss.id,
      classSubjectId: cs.id,
      subjectId: cs.subjectId,
      subjectName: cs.subject.name,
      subjectCode: theoryComponent?.subjectCode || cs.subject.code || null,
      componentType: components.length > 0 ? "SPLIT" : "UNIFIED",
      hasTheory: !!theoryComponent || components.length === 0,
      hasPractical: !!practicalComponent,
      theoryFullMarks: theoryComponent?.fullMarks || cs.fullMarks || 100,
      practicalFullMarks: practicalComponent?.fullMarks || 0,
      theoryPassMarks: theoryComponent?.passMarks || cs.passMarks || 0,
      practicalPassMarks: practicalComponent?.passMarks || 0,
      creditHours:
        (theoryComponent?.creditHours || 0) +
        (practicalComponent?.creditHours || 0),
      theoryCredits: theoryComponent?.creditHours || 0,
      practicalCredits: practicalComponent?.creditHours || 0,
    };
  });

  ApiResponse.success(res, {
    studentClassId: parseInt(studentClassId),
    gradeLevel: studentClass.class.gradeLevel,
    subjects,
  });
});

module.exports = {
  getExamsForMarksEntry,
  getTeacherExams,
  getResultsByExamSubject,
  saveResults,
  getStudentsForMarksEntry,
  getStudentsByProgram,
  getStudentSubjects,
};
