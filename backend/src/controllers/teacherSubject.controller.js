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

  const assignment = await prisma.teacherSubject.create({
    data: {
      userId: parseInt(userId),
      classSubjectId: parseInt(classSubjectId),
      sectionId: parseInt(sectionId),
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
  const { isClassTeacher } = req.body;

  const assignment = await prisma.teacherSubject.findUnique({
    where: { id: parseInt(id) },
  });

  if (!assignment) {
    throw ApiError.notFound('Assignment not found');
  }

  // If setting as class teacher, check if another exists (excluding self)
  if (isClassTeacher && !assignment.isClassTeacher) {
    const existingClassTeacher = await prisma.teacherSubject.findFirst({
      where: {
        sectionId: assignment.sectionId,
        classSubjectId: assignment.classSubjectId,
        isClassTeacher: true,
        NOT: { id: parseInt(id) },
      },
    });

    if (existingClassTeacher) {
      throw ApiError.conflict('Another teacher is already the class teacher for this section');
    }
  }

  const updated = await prisma.teacherSubject.update({
    where: { id: parseInt(id) },
    data: {
      isClassTeacher: isClassTeacher !== undefined ? isClassTeacher : assignment.isClassTeacher,
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
