const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");
const { createSubjectAudit, isClassSubjectLocked } = require("../utils/subjectAudit");

/**
 * @desc    Get subjects for a class in an academic year
 * @route   GET /api/v1/class-subjects
 * @access  Private
 */
const getClassSubjects = asyncHandler(async (req, res) => {
  const { classId, academicYearId } = req.query;

  if (!academicYearId) {
    throw ApiError.badRequest("Academic Year ID is required");
  }

  const where = {
    academicYearId: parseInt(academicYearId),
  };

  if (classId) {
    where.classId = parseInt(classId);
  }

  const classSubjects = await prisma.classSubject.findMany({
    where,
    include: {
      subject: true,
      class: { select: { id: true, name: true, gradeLevel: true } },
      teacherSubjects: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          section: true,
        },
      },
    },
  });

  ApiResponse.success(res, classSubjects);
});

/**
 * @desc    Assign subject to a class for an academic year
 * @route   POST /api/v1/class-subjects
 * @access  Private/Admin
 */
const assignSubjectToClass = asyncHandler(async (req, res) => {
  const {
    classId,
    academicYearId,
    subjectId,
    fullMarks,
    passMarks,
    creditHours,
    theoryMarks,
    practicalMarks,
    hasTheory,
    hasPractical,
  } = req.body;

  // Ensure class, subject, and academic year belong to the same school
  const [cls, subj, year] = await Promise.all([
    prisma.class.findFirst({
      where: { id: parseInt(classId), schoolId: req.user.schoolId },
    }),
    prisma.subject.findFirst({
      where: { id: parseInt(subjectId), schoolId: req.user.schoolId },
    }),
    prisma.academicYear.findFirst({
      where: { id: parseInt(academicYearId), schoolId: req.user.schoolId },
    }),
  ]);

  if (!cls) throw ApiError.forbidden("Class not found for your school");
  if (!subj) throw ApiError.forbidden("Subject not found for your school");
  if (!year)
    throw ApiError.forbidden("Academic year not found for your school");

  const tMarks = theoryMarks !== undefined ? parseInt(theoryMarks, 10) : 100;
  const pMarks =
    practicalMarks !== undefined ? parseInt(practicalMarks, 10) : 0;
  const computedFull = tMarks + pMarks;
  const computedPass = passMarks !== undefined ? parseInt(passMarks, 10) : 40;

  // Derive hasTheory/hasPractical from marks if not explicitly provided
  const resolvedHasTheory = hasTheory !== undefined ? hasTheory : tMarks > 0;
  const resolvedHasPractical =
    hasPractical !== undefined ? hasPractical : pMarks > 0;

  if (tMarks < 0 || pMarks < 0 || computedFull <= 0) {
    throw ApiError.badRequest("Marks must be positive numbers");
  }
  if (computedPass < 0 || computedPass > computedFull) {
    throw ApiError.badRequest(
      "Pass marks cannot exceed full marks or be negative"
    );
  }

  // Check if already assigned
  const existing = await prisma.classSubject.findUnique({
    where: {
      classId_academicYearId_subjectId: {
        classId: parseInt(classId),
        academicYearId: parseInt(academicYearId),
        subjectId: parseInt(subjectId),
      },
    },
  });

  if (existing) {
    throw ApiError.conflict(
      "This subject is already assigned to this class for the year"
    );
  }

  const classSubject = await prisma.classSubject.create({
    data: {
      classId: parseInt(classId),
      academicYearId: parseInt(academicYearId),
      subjectId: parseInt(subjectId),
      hasTheory: resolvedHasTheory,
      hasPractical: resolvedHasPractical,
      fullMarks: computedFull,
      passMarks: computedPass,
      theoryMarks: tMarks,
      practicalMarks: pMarks,
      creditHours: creditHours || 3.0,
    },
    include: {
      subject: true,
    },
  });

  // Audit: CREATE
  await createSubjectAudit({
    classSubjectId: classSubject.id,
    action: 'CREATE',
    newValue: classSubject,
    userId: req.user.id,
  });

  ApiResponse.created(
    res,
    classSubject,
    "Subject assigned to class successfully"
  );
});

/**
 * @desc    Update class subject details
 * @route   PUT /api/v1/class-subjects/:id
 * @access  Private/Admin
 */
const updateClassSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    fullMarks,
    passMarks,
    creditHours,
    theoryMarks,
    practicalMarks,
    hasTheory,
    hasPractical,
  } = req.body;

  const classSubject = await prisma.classSubject.findUnique({
    where: { id: parseInt(id) },
    include: {
      class: true,
    },
  });

  if (!classSubject) {
    throw ApiError.notFound("Class subject assignment not found");
  }

  if (classSubject.class.schoolId !== req.user.schoolId) {
    throw ApiError.forbidden("Class subject does not belong to your school");
  }

  // Check if locked
  if (classSubject.isLocked) {
    throw ApiError.forbidden(
      "This subject is locked and cannot be modified. Exams or marks have been created."
    );
  }

  const tMarks =
    theoryMarks !== undefined
      ? parseInt(theoryMarks, 10)
      : classSubject.theoryMarks;
  const pMarks =
    practicalMarks !== undefined
      ? parseInt(practicalMarks, 10)
      : classSubject.practicalMarks;
  const full =
    fullMarks !== undefined ? parseInt(fullMarks, 10) : tMarks + pMarks;
  const pass =
    passMarks !== undefined ? parseInt(passMarks, 10) : classSubject.passMarks;

  if (tMarks < 0 || pMarks < 0 || full <= 0) {
    throw ApiError.badRequest("Marks must be positive numbers");
  }
  if (pass < 0 || pass > full) {
    throw ApiError.badRequest(
      "Pass marks cannot exceed full marks or be negative"
    );
  }

  const oldValue = {
    hasTheory: classSubject.hasTheory,
    hasPractical: classSubject.hasPractical,
    fullMarks: classSubject.fullMarks,
    passMarks: classSubject.passMarks,
    theoryMarks: classSubject.theoryMarks,
    practicalMarks: classSubject.practicalMarks,
    creditHours: classSubject.creditHours,
  };

  const updated = await prisma.classSubject.update({
    where: { id: parseInt(id) },
    data: {
      hasTheory: hasTheory !== undefined ? hasTheory : classSubject.hasTheory,
      hasPractical:
        hasPractical !== undefined ? hasPractical : classSubject.hasPractical,
      fullMarks: full,
      passMarks: pass,
      theoryMarks: tMarks,
      practicalMarks: pMarks,
      creditHours: creditHours || classSubject.creditHours,
    },
    include: {
      subject: true,
    },
  });

  // Audit: UPDATE
  await createSubjectAudit({
    classSubjectId: parseInt(id),
    action: 'UPDATE',
    oldValue,
    newValue: {
      hasTheory: updated.hasTheory,
      hasPractical: updated.hasPractical,
      fullMarks: updated.fullMarks,
      passMarks: updated.passMarks,
      theoryMarks: updated.theoryMarks,
      practicalMarks: updated.practicalMarks,
      creditHours: updated.creditHours,
    },
    userId: req.user.id,
  });

  ApiResponse.success(res, updated, "Class subject updated successfully");
});

/**
 * @desc    Remove subject from a class
 * @route   DELETE /api/v1/class-subjects/:id
 * @access  Private/Admin
 */
const removeSubjectFromClass = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classSubject = await prisma.classSubject.findUnique({
    where: { id: parseInt(id) },
    include: { subject: true },
  });

  if (!classSubject) {
    throw ApiError.notFound("Class subject assignment not found");
  }

  // Check if locked
  if (classSubject.isLocked) {
    throw ApiError.forbidden(
      "This subject is locked and cannot be deleted. Exams or marks have been created."
    );
  }

  // Check if teacher assigned
  const teacherCount = await prisma.teacherSubject.count({
    where: { classSubjectId: parseInt(id) },
  });

  if (teacherCount > 0) {
    throw ApiError.badRequest(
      "Cannot remove subject - teachers are assigned to it"
    );
  }

  // Check if exams exist
  const examCount = await prisma.examSubject.count({
    where: { classSubjectId: parseInt(id) },
  });

  if (examCount > 0) {
    throw ApiError.badRequest("Cannot remove subject - exams are linked to it");
  }

  // Audit: DELETE (before actual delete)
  await createSubjectAudit({
    classSubjectId: parseInt(id),
    action: 'DELETE',
    oldValue: classSubject,
    userId: req.user.id,
  });

  await prisma.classSubject.delete({
    where: { id: parseInt(id) },
  });

  ApiResponse.success(res, null, "Subject removed from class successfully");
});

/**
 * @desc    Get audit log for a class subject
 * @route   GET /api/v1/class-subjects/:id/audit
 * @access  Private/Admin
 */
const getClassSubjectAudit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const auditLogs = await prisma.subjectAudit.findMany({
    where: { classSubjectId: parseInt(id) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  ApiResponse.success(res, auditLogs);
});

module.exports = {
  getClassSubjects,
  assignSubjectToClass,
  updateClassSubject,
  removeSubjectFromClass,
  getClassSubjectAudit,
};
