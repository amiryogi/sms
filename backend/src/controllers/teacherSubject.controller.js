const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');

/**
 * @desc    Get all teacher assignments
 * @route   GET /api/v1/teacher-subjects
 * @access  Private
 */
const getTeacherAssignments = asyncHandler(async (req, res) => {
  const { userId, classSubjectId, sectionId } = req.query;

  const where = {
    classSubject: {
      subject: { schoolId: req.user.schoolId }
    }
  };

  if (userId) where.userId = parseInt(userId);
  if (classSubjectId) where.classSubjectId = parseInt(classSubjectId);
  if (sectionId) where.sectionId = parseInt(sectionId);

  // Security: Non-admins can only see their own assignments
  if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('SUPER_ADMIN')) {
    if (userId && parseInt(userId) !== req.user.id) {
       throw ApiError.forbidden('You can only view your own assignments');
    }
    // Force filtering by own ID if not specifically requested (or if requested correctly)
    where.userId = req.user.id;
  }

  const assignments = await prisma.teacherSubject.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        }
      },
      classSubject: {
        include: {
          class: true,
          subject: true,
          academicYear: true,
        }
      },
      section: true,
    },
  });

  ApiResponse.success(res, assignments);
});

/**
 * @desc    Assign teacher to a class-subject-section
 * @route   POST /api/v1/teacher-subjects
 * @access  Private/Admin
 */
const assignTeacher = asyncHandler(async (req, res) => {
  const { userId, classSubjectId, sectionId, isClassTeacher } = req.body;

  // Verify teacher exists
  const teacher = await prisma.user.findFirst({
    where: {
      id: parseInt(userId),
      schoolId: req.user.schoolId,
      userRoles: { some: { role: { name: 'TEACHER' } } },
    }
  });

  if (!teacher) {
    throw ApiError.badRequest('Valid teacher not found in this school');
  }

  // Check if already assigned
  const existing = await prisma.teacherSubject.findUnique({
    where: {
      userId_classSubjectId_sectionId: {
        userId: parseInt(userId),
        classSubjectId: parseInt(classSubjectId),
        sectionId: parseInt(sectionId),
      },
    },
  });

  if (existing) {
    throw ApiError.conflict('Teacher is already assigned to this class-subject-section');
  }

  // If setting as class teacher, check if another exist
  if (isClassTeacher) {
    const existingClassTeacher = await prisma.teacherSubject.findFirst({
      where: {
        sectionId: parseInt(sectionId),
        classSubject: {
          id: parseInt(classSubjectId),
        },
        isClassTeacher: true,
      },
    });

    if (existingClassTeacher) {
      // Option: override or error. Let's error for safety.
      throw ApiError.conflict('Another teacher is already the class teacher for this section');
    }
  }

  // Get ClassSubject to find Academic Year
  const classSubject = await prisma.classSubject.findUnique({
    where: { id: parseInt(classSubjectId) },
  });

  if (!classSubject) {
    throw ApiError.badRequest('Invalid Subject selected');
  }

  const assignment = await prisma.teacherSubject.create({
    data: {
      user: { connect: { id: parseInt(userId) } },
      classSubject: { connect: { id: parseInt(classSubjectId) } },
      section: { connect: { id: parseInt(sectionId) } },
      academicYear: { connect: { id: classSubject.academicYearId } },
      isClassTeacher: !!isClassTeacher,
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      classSubject: { include: { subject: true, class: true } },
      section: true,
    },
  });

  ApiResponse.created(res, assignment, 'Teacher assigned successfully');
});

/**
 * @desc    Update teacher assignment
 * @route   PUT /api/v1/teacher-subjects/:id
 * @access  Private/Admin
 */
const updateAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, classSubjectId, sectionId, isClassTeacher } = req.body;

  const currentAssignment = await prisma.teacherSubject.findUnique({
    where: { id: parseInt(id) },
  });

  if (!currentAssignment) {
    throw ApiError.notFound('Assignment not found');
  }

  // Determine target values (new or existing)
  const targetUserId = userId ? parseInt(userId) : currentAssignment.userId;
  const targetClassSubjectId = classSubjectId ? parseInt(classSubjectId) : currentAssignment.classSubjectId;
  const targetSectionId = sectionId ? parseInt(sectionId) : currentAssignment.sectionId;
  const targetIsClassTeacher = isClassTeacher !== undefined ? isClassTeacher : currentAssignment.isClassTeacher;

  // Check unique constraint conflict only if FKs changed
  if (
    targetUserId !== currentAssignment.userId ||
    targetClassSubjectId !== currentAssignment.classSubjectId ||
    targetSectionId !== currentAssignment.sectionId
  ) {
    const existing = await prisma.teacherSubject.findUnique({
      where: {
        userId_classSubjectId_sectionId: {
          userId: targetUserId,
          classSubjectId: targetClassSubjectId,
          sectionId: targetSectionId,
        },
      },
    });

    if (existing && existing.id !== parseInt(id)) {
      throw ApiError.conflict('Teacher is already assigned to this class-subject-section');
    }
  }

  // If setting as class teacher, check if another exists (excluding self)
  if (targetIsClassTeacher) {
    const existingClassTeacher = await prisma.teacherSubject.findFirst({
      where: {
        sectionId: targetSectionId,
        classSubject: { id: targetClassSubjectId }, // Ensure same academic year scoping via classSubject
        isClassTeacher: true,
        NOT: { id: parseInt(id) },
      },
    });

    if (existingClassTeacher) {
      throw ApiError.conflict('Another teacher is already the class teacher for this section');
    }
  }

  // If classSubjectId changed, we need to ensure academicYearId is updated too
  let academicYearUpdate = {};
  if (targetClassSubjectId !== currentAssignment.classSubjectId) {
    const cs = await prisma.classSubject.findUnique({ where: { id: targetClassSubjectId } });
    if (!cs) throw ApiError.badRequest('Invalid Subject');
    academicYearUpdate = { academicYear: { connect: { id: cs.academicYearId } } };
  }

  const updated = await prisma.teacherSubject.update({
    where: { id: parseInt(id) },
    data: {
      user: { connect: { id: targetUserId } },
      classSubject: { connect: { id: targetClassSubjectId } },
      section: { connect: { id: targetSectionId } },
      isClassTeacher: targetIsClassTeacher,
      ...academicYearUpdate
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      classSubject: { include: { subject: true, class: true } },
      section: true,
    },
  });

  ApiResponse.success(res, updated, 'Assignment updated successfully');
});

/**
 * @desc    Remove teacher assignment
 * @route   POST /api/v1/teacher-subjects/remove
 * @access  Private/Admin
 */
const removeAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const assignment = await prisma.teacherSubject.findUnique({
    where: { id: parseInt(id) },
  });

  if (!assignment) {
    throw ApiError.notFound('Assignment not found');
  }

  // Check for related records (e.g., assignments/LMS data created by this teacher assignment)
  const lmsDataCount = await prisma.assignment.count({
    where: { teacherSubjectId: parseInt(id) },
  });

  if (lmsDataCount > 0) {
    throw ApiError.badRequest('Cannot remove assignment - LMS data (assignments) is linked to it');
  }

  await prisma.teacherSubject.delete({
    where: { id: parseInt(id) },
  });

  ApiResponse.success(res, null, 'Assignment removed successfully');
});

module.exports = {
  getTeacherAssignments,
  assignTeacher,
  updateAssignment,
  removeAssignment,
};
