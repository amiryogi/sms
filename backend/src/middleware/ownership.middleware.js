const prisma = require('../config/database');
const { ApiError, asyncHandler } = require('../utils');

/**
 * OWNERSHIP CHECK MIDDLEWARE
 * 
 * These middleware functions verify that users can only access
 * resources they own or are authorized to access.
 */

/**
 * Check if the logged-in user is the owner of the requested user resource
 * Used for user profile endpoints
 */
const isOwner = asyncHandler(async (req, res, next) => {
  const resourceUserId = parseInt(req.params.userId || req.params.id, 10);
  
  if (!resourceUserId) {
    throw ApiError.badRequest('User ID is required');
  }

  // Admins can access any user in their school
  if (req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN')) {
    // Verify the target user belongs to the same school
    const targetUser = await prisma.user.findUnique({
      where: { id: resourceUserId },
    });

    if (!targetUser) {
      throw ApiError.notFound('User not found');
    }

    if (targetUser.schoolId !== req.user.schoolId && !req.user.roles.includes('SUPER_ADMIN')) {
      throw ApiError.forbidden('Cannot access users from other schools');
    }

    req.targetUser = targetUser;
    return next();
  }

  // Regular users can only access their own data
  if (resourceUserId !== req.user.id) {
    throw ApiError.forbidden('You can only access your own data');
  }

  next();
});

/**
 * Check if teacher is assigned to the requested class/section
 * Used for attendance, marks entry, etc.
 */
const isAssignedTeacher = asyncHandler(async (req, res, next) => {
  // Admins bypass this check
  if (req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN')) {
    return next();
  }

  // Must be a teacher
  if (!req.user.roles.includes('TEACHER')) {
    throw ApiError.forbidden('Only teachers can access this resource');
  }

  const { classId, sectionId, subjectId, academicYearId } = req.body || req.query || req.params;

  if (!classId || !sectionId) {
    throw ApiError.badRequest('Class ID and Section ID are required');
  }

  // Find teacher's assignments
  const teacherAssignment = await prisma.teacherSubject.findFirst({
    where: {
      userId: req.user.id,
      sectionId: parseInt(sectionId, 10),
      classSubject: {
        classId: parseInt(classId, 10),
        ...(academicYearId && { academicYearId: parseInt(academicYearId, 10) }),
        ...(subjectId && { subjectId: parseInt(subjectId, 10) }),
      },
    },
    include: {
      classSubject: {
        include: {
          class: true,
          academicYear: true,
          subject: true,
        },
      },
      section: true,
    },
  });

  if (!teacherAssignment) {
    throw ApiError.forbidden(
      'You are not assigned to this class/section/subject combination'
    );
  }

  // Attach assignment info to request for use in controllers
  req.teacherAssignment = teacherAssignment;
  next();
});

/**
 * Verify teacher can access specific subject in a class
 * More granular check for marks entry
 */
const canAccessSubject = asyncHandler(async (req, res, next) => {
  // Admins bypass this check
  if (req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN')) {
    return next();
  }

  if (!req.user.roles.includes('TEACHER')) {
    throw ApiError.forbidden('Only teachers can access this resource');
  }

  const classSubjectId = parseInt(req.params.classSubjectId || req.body.classSubjectId, 10);
  const sectionId = parseInt(req.params.sectionId || req.body.sectionId, 10);

  if (!classSubjectId) {
    throw ApiError.badRequest('Class Subject ID is required');
  }

  const assignment = await prisma.teacherSubject.findFirst({
    where: {
      userId: req.user.id,
      classSubjectId,
      ...(sectionId && { sectionId }),
    },
  });

  if (!assignment) {
    throw ApiError.forbidden('You are not assigned to teach this subject');
  }

  req.teacherSubjectAssignment = assignment;
  next();
});

/**
 * Check if student can access the requested resource (their own data)
 */
const isOwnStudent = asyncHandler(async (req, res, next) => {
  // Admins can access any student
  if (req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN')) {
    return next();
  }

  // Teachers can access students in their assigned classes
  if (req.user.roles.includes('TEACHER')) {
    const studentId = parseInt(req.params.studentId || req.params.id, 10);
    
    // Get the student's current enrollment
    const studentClass = await prisma.studentClass.findFirst({
      where: {
        studentId,
        academicYear: { isCurrent: true },
      },
    });

    if (!studentClass) {
      throw ApiError.notFound('Student enrollment not found');
    }

    // Check if teacher is assigned to this class/section
    const teacherAssignment = await prisma.teacherSubject.findFirst({
      where: {
        userId: req.user.id,
        sectionId: studentClass.sectionId,
        classSubject: {
          classId: studentClass.classId,
        },
      },
    });

    if (!teacherAssignment) {
      throw ApiError.forbidden('You are not assigned to this student\'s class');
    }

    return next();
  }

  // Students can only access their own data
  if (req.user.roles.includes('STUDENT')) {
    const studentId = parseInt(req.params.studentId || req.params.id, 10);
    
    if (req.user.studentId !== studentId) {
      throw ApiError.forbidden('You can only access your own data');
    }

    return next();
  }

  // Parents can access their children's data
  if (req.user.roles.includes('PARENT')) {
    const studentId = parseInt(req.params.studentId || req.params.id, 10);
    
    const parentChild = await prisma.studentParent.findFirst({
      where: {
        parentId: req.user.parentId,
        studentId,
      },
    });

    if (!parentChild) {
      throw ApiError.forbidden('You can only access your children\'s data');
    }

    return next();
  }

  throw ApiError.forbidden('Access denied');
});

/**
 * Check if parent can access child's data
 */
const isParentOfStudent = asyncHandler(async (req, res, next) => {
  // Admins bypass
  if (req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN')) {
    return next();
  }

  if (!req.user.roles.includes('PARENT')) {
    throw ApiError.forbidden('Only parents can access this resource');
  }

  const studentId = parseInt(req.params.studentId || req.body.studentId, 10);

  if (!studentId) {
    throw ApiError.badRequest('Student ID is required');
  }

  const parentChild = await prisma.studentParent.findFirst({
    where: {
      parentId: req.user.parentId,
      studentId,
    },
  });

  if (!parentChild) {
    throw ApiError.forbidden('You are not a guardian of this student');
  }

  req.parentChildRelation = parentChild;
  next();
});

/**
 * Verify access to attendance records
 * Teachers: Can view/mark attendance for their assigned sections
 * Students: Can view their own attendance
 * Parents: Can view their children's attendance
 */
const canAccessAttendance = asyncHandler(async (req, res, next) => {
  // Admins have full access
  if (req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN')) {
    return next();
  }

  const { classId, sectionId, studentId } = req.params;

  // Teachers accessing class attendance
  if (req.user.roles.includes('TEACHER') && classId && sectionId) {
    const assignment = await prisma.teacherSubject.findFirst({
      where: {
        userId: req.user.id,
        sectionId: parseInt(sectionId, 10),
        classSubject: {
          classId: parseInt(classId, 10),
        },
      },
    });

    if (!assignment) {
      throw ApiError.forbidden('You are not assigned to this class/section');
    }

    return next();
  }

  // Students viewing own attendance
  if (req.user.roles.includes('STUDENT')) {
    if (studentId && parseInt(studentId, 10) !== req.user.studentId) {
      throw ApiError.forbidden('You can only view your own attendance');
    }
    return next();
  }

  // Parents viewing child's attendance
  if (req.user.roles.includes('PARENT') && studentId) {
    const parentChild = await prisma.studentParent.findFirst({
      where: {
        parentId: req.user.parentId,
        studentId: parseInt(studentId, 10),
      },
    });

    if (!parentChild) {
      throw ApiError.forbidden('You can only view your children\'s attendance');
    }

    return next();
  }

  throw ApiError.forbidden('Access denied');
});

/**
 * Verify access to exam results
 * Teachers: Can view/enter results for their assigned subjects
 * Students: Can view their own results (if published)
 * Parents: Can view their children's results (if published)
 */
const canAccessResults = asyncHandler(async (req, res, next) => {
  // Admins have full access
  if (req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN')) {
    return next();
  }

  const { examSubjectId, studentId } = req.params;

  // Teachers entering/viewing results
  if (req.user.roles.includes('TEACHER') && examSubjectId) {
    const examSubject = await prisma.examSubject.findUnique({
      where: { id: parseInt(examSubjectId, 10) },
      include: {
        classSubject: true,
      },
    });

    if (!examSubject) {
      throw ApiError.notFound('Exam subject not found');
    }

    // Check if teacher is assigned to this subject
    const assignment = await prisma.teacherSubject.findFirst({
      where: {
        userId: req.user.id,
        classSubjectId: examSubject.classSubjectId,
      },
    });

    if (!assignment) {
      throw ApiError.forbidden('You are not assigned to this subject');
    }

    req.examSubject = examSubject;
    return next();
  }

  // Students viewing own results
  if (req.user.roles.includes('STUDENT')) {
    if (studentId && parseInt(studentId, 10) !== req.user.studentId) {
      throw ApiError.forbidden('You can only view your own results');
    }
    return next();
  }

  // Parents viewing child's results
  if (req.user.roles.includes('PARENT') && studentId) {
    const parentChild = await prisma.studentParent.findFirst({
      where: {
        parentId: req.user.parentId,
        studentId: parseInt(studentId, 10),
      },
    });

    if (!parentChild) {
      throw ApiError.forbidden('You can only view your children\'s results');
    }

    return next();
  }

  throw ApiError.forbidden('Access denied');
});

/**
 * Verify access to assignments
 * Teachers: Can create/grade assignments for their classes
 * Students: Can view/submit assignments
 */
const canAccessAssignment = asyncHandler(async (req, res, next) => {
  // Admins have full access
  if (req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN')) {
    return next();
  }

  const assignmentId = parseInt(req.params.assignmentId || req.params.id, 10);

  if (!assignmentId) {
    // Creating new assignment - check teacher assignment exists
    if (req.user.roles.includes('TEACHER')) {
      return next(); // Will be validated in controller
    }
    throw ApiError.forbidden('Only teachers can create assignments');
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      teacherSubject: {
        include: {
          classSubject: {
            include: {
              class: true,
              subject: true,
            },
          },
          section: true,
        },
      },
    },
  });

  if (!assignment) {
    throw ApiError.notFound('Assignment not found');
  }

  // Teachers can access their own assignments
  if (req.user.roles.includes('TEACHER')) {
    if (assignment.teacherSubject.userId !== req.user.id) {
      throw ApiError.forbidden('You can only access your own assignments');
    }
    req.assignment = assignment;
    return next();
  }

  // Students can view assignments for their class
  if (req.user.roles.includes('STUDENT')) {
    const studentClass = await prisma.studentClass.findFirst({
      where: {
        studentId: req.user.studentId,
        academicYear: { isCurrent: true },
        classId: assignment.teacherSubject.classSubject.classId,
        sectionId: assignment.teacherSubject.sectionId,
      },
    });

    if (!studentClass) {
      throw ApiError.forbidden('This assignment is not for your class');
    }

    req.assignment = assignment;
    return next();
  }

  throw ApiError.forbidden('Access denied');
});

/**
 * Generic resource ownership check factory
 * Creates a middleware that checks if user owns a specific resource
 */
const checkOwnership = (model, userIdField = 'userId') => {
  return asyncHandler(async (req, res, next) => {
    // Admins bypass
    if (req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    const resourceId = parseInt(req.params.id, 10);
    
    if (!resourceId) {
      throw ApiError.badRequest('Resource ID is required');
    }

    const resource = await prisma[model].findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw ApiError.notFound('Resource not found');
    }

    if (resource[userIdField] !== req.user.id) {
      throw ApiError.forbidden('You do not own this resource');
    }

    req.resource = resource;
    next();
  });
};

module.exports = {
  isOwner,
  isAssignedTeacher,
  canAccessSubject,
  isOwnStudent,
  isParentOfStudent,
  canAccessAttendance,
  canAccessResults,
  canAccessAssignment,
  checkOwnership,
};
