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
        select: { id: true, firstName: true, lastName: true }
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
        select: { id: true, firstName: true, lastName: true }
      },
      examSubjects: {
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
      await prisma.examSubject.createMany({
        data: classSubjects.map((cs) => ({
          examId: exam.id,
          classSubjectId: cs.id,
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
    throw ApiError.badRequest("Cannot modify exam subjects after publishing. Exam must be in DRAFT status.");
  }

  const results = await prisma.$transaction(async (tx) => {
    const updatedSubjects = [];
    for (const sub of subjects) {
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
          fullMarks: sub.fullMarks || undefined,
          passMarks: sub.passMarks || undefined,
          theoryFullMarks: sub.theoryFullMarks || undefined,
          practicalFullMarks: sub.practicalFullMarks || undefined,
        },
        create: {
          examId,
          classSubjectId: parseInt(sub.classSubjectId),
          examDate: sub.examDate ? new Date(sub.examDate) : null,
          startTime: sub.startTime ? new Date(sub.startTime) : null,
          endTime: sub.endTime ? new Date(sub.endTime) : null,
          fullMarks: sub.fullMarks || 100,
          passMarks: sub.passMarks || 40,
          theoryFullMarks: sub.theoryFullMarks || 100,
          practicalFullMarks: sub.practicalFullMarks || 0,
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
    throw ApiError.badRequest("Cannot edit exam after publishing. Exam must be in DRAFT status.");
  }

  const updatedExam = await prisma.exam.update({
    where: { id: parseInt(id) },
    data: {
      name: name || exam.name,
      examType: examType || exam.examType,
      startDate: startDate ? new Date(startDate) : exam.startDate,
      endDate: endDate ? new Date(endDate) : exam.endDate,
      academicYearId: academicYearId ? parseInt(academicYearId) : exam.academicYearId,
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
  });

  if (!exam) {
    throw ApiError.notFound("Exam not found or does not belong to your school");
  }

  if (exam.status !== "DRAFT") {
    throw ApiError.badRequest(`Cannot publish exam. Current status is ${exam.status}.`);
  }

  // Check if exam has subjects linked
  const subjectCount = await prisma.examSubject.count({
    where: { examId: parseInt(id) }
  });

  if (subjectCount === 0) {
    throw ApiError.badRequest("Cannot publish exam without any subjects. Please link classes/subjects first.");
  }

  const updatedExam = await prisma.exam.update({
    where: { id: parseInt(id) },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date()
    },
  });

  ApiResponse.success(res, updatedExam, "Exam published successfully. Teachers can now enter marks.");
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
    throw ApiError.badRequest(`Cannot lock exam. Exam must be PUBLISHED first. Current status is ${exam.status}.`);
  }

  const updatedExam = await prisma.exam.update({
    where: { id: parseInt(id) },
    data: { status: "LOCKED" },
  });

  ApiResponse.success(res, updatedExam, "Exam locked successfully. Marks are now frozen.");
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

module.exports = {
  getExams,
  getExam,
  createExam,
  updateExam,
  updateExamSubjects,
  publishExam,
  lockExam,
  deleteExam,
};
