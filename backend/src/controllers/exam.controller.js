const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");

/**
 * @desc    Get all exams for an academic year
 * @route   GET /api/v1/exams
 * @access  Private
 */
const getExams = asyncHandler(async (req, res) => {
  const { academicYearId } = req.query;

  const where = { schoolId: req.user.schoolId };
  if (academicYearId) {
    where.academicYearId = parseInt(academicYearId);
  } else {
    where.academicYear = { isCurrent: true };
  }

  const exams = await prisma.exam.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: {
      academicYear: true,
      createdByUser: {
        select: { id: true, firstName: true, lastName: true },
      },
      _count: {
        select: { examSubjects: true },
      },
    },
  });

  ApiResponse.success(res, exams);
});

/**
 * @desc    Get single exam details with subjects
 * @route   GET /api/v1/exams/:id
 * @access  Private
 */
const getExam = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
    include: {
      academicYear: true,
      createdByUser: {
        select: { id: true, firstName: true, lastName: true },
      },
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

  if (!exam) {
    throw ApiError.notFound("Exam not found");
  }

  ApiResponse.success(res, exam);
});

/**
 * @desc    Create exam and auto-link subjects for specified classes
 * @route   POST /api/v1/exams
 * @access  Private/Admin
 */
const createExam = asyncHandler(async (req, res) => {
  const { name, examType, startDate, endDate, academicYearId, classIds } =
    req.body;

  // 1. Create Exam with DRAFT status
  const exam = await prisma.exam.create({
    data: {
      schoolId: req.user.schoolId,
      academicYearId: parseInt(academicYearId),
      name,
      examType,
      status: "DRAFT",
      createdBy: req.user.id,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  // 2. Auto-link subjects for the selected classes (if provided)
  if (classIds && Array.isArray(classIds) && classIds.length > 0) {
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        academicYearId: parseInt(academicYearId),
        classId: { in: classIds.map((id) => parseInt(id)) },
      },
    });

    if (classSubjects.length > 0) {
      // Copy evaluation structure from ClassSubject (single source of truth)
      await prisma.examSubject.createMany({
        data: classSubjects.map((cs) => ({
          examId: exam.id,
          classSubjectId: cs.id,
          // Snapshot evaluation flags from ClassSubject
          hasTheory: cs.hasTheory,
          hasPractical: cs.hasPractical,
          // Snapshot marks limits from ClassSubject
          fullMarks: cs.fullMarks,
          passMarks: cs.passMarks,
          theoryFullMarks: cs.theoryMarks || 100,
          practicalFullMarks: cs.practicalMarks || 0,
        })),
      });
    }
  }

  ApiResponse.created(
    res,
    exam,
    "Exam created with DRAFT status. Subjects linked successfully."
  );
});

/**
 * @desc    Add or update exam subjects manually
 * @route   POST /api/v1/exams/:id/subjects
 * @access  Private/Admin
 */
const updateExamSubjects = asyncHandler(async (req, res) => {
  const examId = parseInt(req.params.id);
  const { subjects } = req.body; // Array of { classSubjectId, examDate, startTime, endTime, fullMarks, passMarks }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId: req.user.schoolId },
  });

  if (!exam) throw ApiError.notFound("Exam not found");

  // Only allow subject updates when exam is DRAFT
  if (exam.status !== "DRAFT") {
    throw ApiError.badRequest(
      "Cannot modify exam subjects after publishing. Exam must be in DRAFT status."
    );
  }

  const results = await prisma.$transaction(async (tx) => {
    const updatedSubjects = [];
    for (const sub of subjects) {
      const full =
        sub.fullMarks !== undefined ? parseInt(sub.fullMarks, 10) : undefined;
      const pass =
        sub.passMarks !== undefined ? parseInt(sub.passMarks, 10) : undefined;
      const theoryFull =
        sub.theoryFullMarks !== undefined
          ? parseInt(sub.theoryFullMarks, 10)
          : undefined;
      const practicalFull =
        sub.practicalFullMarks !== undefined
          ? parseInt(sub.practicalFullMarks, 10)
          : undefined;

      // Fetch ClassSubject to get evaluation flags for new subjects
      const classSubject = await tx.classSubject.findUnique({
        where: { id: parseInt(sub.classSubjectId) },
        select: {
          hasTheory: true,
          hasPractical: true,
          theoryMarks: true,
          practicalMarks: true,
        },
      });

      const resolvedTheory = theoryFull ?? classSubject?.theoryMarks ?? 100;
      const resolvedPractical =
        practicalFull ?? classSubject?.practicalMarks ?? 0;
      const resolvedFull = full ?? resolvedTheory + resolvedPractical;
      const resolvedPass = pass ?? 40;

      if (resolvedTheory < 0 || resolvedPractical < 0 || resolvedFull <= 0) {
        throw ApiError.badRequest("Marks must be positive numbers");
      }
      if (resolvedPass < 0 || resolvedPass > resolvedFull) {
        throw ApiError.badRequest(
          "Pass marks cannot exceed full marks or be negative"
        );
      }

      const examSub = await tx.examSubject.upsert({
        where: {
          examId_classSubjectId: {
            examId,
            classSubjectId: parseInt(sub.classSubjectId),
          },
        },
        update: {
          examDate: sub.examDate ? new Date(sub.examDate) : undefined,
          startTime: sub.startTime ? new Date(sub.startTime) : undefined,
          endTime: sub.endTime ? new Date(sub.endTime) : undefined,
          fullMarks: resolvedFull,
          passMarks: resolvedPass,
          theoryFullMarks: resolvedTheory,
          practicalFullMarks: resolvedPractical,
          // Note: hasTheory/hasPractical not updated on UPDATE - they are snapshot at creation
        },
        create: {
          examId,
          classSubjectId: parseInt(sub.classSubjectId),
          examDate: sub.examDate ? new Date(sub.examDate) : null,
          startTime: sub.startTime ? new Date(sub.startTime) : null,
          endTime: sub.endTime ? new Date(sub.endTime) : null,
          // Copy evaluation flags from ClassSubject (snapshot)
          hasTheory: classSubject?.hasTheory ?? true,
          hasPractical: classSubject?.hasPractical ?? false,
          fullMarks: resolvedFull,
          passMarks: resolvedPass,
          theoryFullMarks: resolvedTheory,
          practicalFullMarks: resolvedPractical,
        },
      });
      updatedSubjects.push(examSub);
    }
    return updatedSubjects;
  });

  ApiResponse.success(res, results, "Exam subjects updated successfully");
});

/**
 * @desc    Update exam details
 * @route   PUT /api/v1/exams/:id
 * @access  Private/Admin
 */
const updateExam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, examType, startDate, endDate, academicYearId } = req.body;

  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!exam) throw ApiError.notFound("Exam not found");

  // Only allow edits when exam is DRAFT
  if (exam.status !== "DRAFT") {
    throw ApiError.badRequest(
      "Cannot edit exam after publishing. Exam must be in DRAFT status."
    );
  }

  const updatedExam = await prisma.exam.update({
    where: { id: parseInt(id) },
    data: {
      name: name || exam.name,
      examType: examType || exam.examType,
      startDate: startDate ? new Date(startDate) : exam.startDate,
      endDate: endDate ? new Date(endDate) : exam.endDate,
      academicYearId: academicYearId
        ? parseInt(academicYearId)
        : exam.academicYearId,
    },
  });

  ApiResponse.success(res, updatedExam, "Exam updated successfully");
});

/**
 * @desc    Publish exam - allows teachers to enter marks
 * @route   PUT /api/v1/exams/:id/publish
 * @access  Private/Admin
 */
const publishExam = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
    include: {
      examSubjects: {
        select: { classSubjectId: true }
      }
    }
  });

  if (!exam) {
    throw ApiError.notFound("Exam not found or does not belong to your school");
  }

  if (exam.status !== "DRAFT") {
    throw ApiError.badRequest(
      `Cannot publish exam. Current status is ${exam.status}.`
    );
  }

  // Check if exam has subjects linked
  if (exam.examSubjects.length === 0) {
    throw ApiError.badRequest(
      "Cannot publish exam without any subjects. Please link classes/subjects first."
    );
  }

  const updatedExam = await prisma.exam.update({
    where: { id: parseInt(id) },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  // Auto-lock all class subjects linked to this exam
  const classSubjectIds = exam.examSubjects.map(es => es.classSubjectId);
  if (classSubjectIds.length > 0) {
    const { lockClassSubject } = require("../utils/subjectAudit");
    for (const csId of classSubjectIds) {
      await lockClassSubject(csId, req.user.id);
    }
  }

  ApiResponse.success(
    res,
    updatedExam,
    "Exam published successfully. Teachers can now enter marks."
  );
});

/**
 * @desc    Lock exam - freezes all marks
 * @route   PUT /api/v1/exams/:id/lock
 * @access  Private/Admin
 */
const lockExam = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!exam) {
    throw ApiError.notFound("Exam not found or does not belong to your school");
  }

  if (exam.status !== "PUBLISHED") {
    throw ApiError.badRequest(
      `Cannot lock exam. Exam must be PUBLISHED first. Current status is ${exam.status}.`
    );
  }

  const updatedExam = await prisma.exam.update({
    where: { id: parseInt(id) },
    data: { status: "LOCKED" },
  });

  ApiResponse.success(
    res,
    updatedExam,
    "Exam locked successfully. Marks are now frozen."
  );
});

/**
 * @desc    Unlock exam - move LOCKED exam back to PUBLISHED so marks can be edited
 * @route   PUT /api/v1/exams/:id/unlock
 * @access  Private/Admin
 */
const unlockExam = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!exam) {
    throw ApiError.notFound("Exam not found or does not belong to your school");
  }

  if (exam.status !== "LOCKED") {
    throw ApiError.badRequest(
      `Cannot unlock exam. Exam must be LOCKED. Current status is ${exam.status}.`
    );
  }

  const updatedExam = await prisma.exam.update({
    where: { id: parseInt(id) },
    data: { status: "PUBLISHED" },
  });

  ApiResponse.success(
    res,
    updatedExam,
    "Exam unlocked. Marks entry is enabled again."
  );
});

/**
 * @desc    Delete exam
 * @route   DELETE /api/v1/exams/:id
 * @access  Private/Admin
 */
const deleteExam = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!exam) throw ApiError.notFound("Exam not found");

  // Only allow deletion of DRAFT exams or by checking results count
  if (exam.status !== "DRAFT") {
    // Check if results exist
    const resultCount = await prisma.examResult.count({
      where: { examSubject: { examId: parseInt(id) } },
    });

    if (resultCount > 0) {
      throw ApiError.badRequest(
        "Cannot delete exam - marks have already been entered. Lock the exam instead."
      );
    }
  }

  await prisma.exam.delete({
    where: { id: parseInt(id) },
  });

  ApiResponse.success(res, null, "Exam deleted successfully");
});

/**
 * @desc    Delete a specific exam subject
 * @route   DELETE /api/v1/exams/:id/subjects/:subjectId
 * @access  Private/Admin
 */
const deleteExamSubject = asyncHandler(async (req, res) => {
  const { id, subjectId } = req.params;

  // Verify exam exists and belongs to school
  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!exam) throw ApiError.notFound("Exam not found");

  // Only allow modification of DRAFT exams
  if (exam.status !== "DRAFT") {
    throw ApiError.badRequest(
      "Cannot modify exam subjects - exam is not in DRAFT status"
    );
  }

  // Verify exam subject exists and belongs to this exam
  const examSubject = await prisma.examSubject.findFirst({
    where: { id: parseInt(subjectId), examId: parseInt(id) },
    include: { classSubject: { include: { class: true, subject: true } } },
  });

  if (!examSubject) {
    throw ApiError.notFound("Exam subject not found");
  }

  // Check if any results exist for this exam subject
  const resultCount = await prisma.examResult.count({
    where: { examSubjectId: parseInt(subjectId) },
  });

  if (resultCount > 0) {
    throw ApiError.badRequest(
      `Cannot remove - ${resultCount} marks have been entered for this subject`
    );
  }

  await prisma.examSubject.delete({
    where: { id: parseInt(subjectId) },
  });

  const className = examSubject.classSubject?.class?.name || "Unknown";
  const subjectName = examSubject.classSubject?.subject?.name || "Unknown";

  ApiResponse.success(
    res,
    null,
    `${className} - ${subjectName} removed from exam`
  );
});

module.exports = {
  getExams,
  getExam,
  createExam,
  updateExam,
  updateExamSubjects,
  publishExam,
  lockExam,
  unlockExam,
  deleteExam,
  deleteExamSubject,
};
