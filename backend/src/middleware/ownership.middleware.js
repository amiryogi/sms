const prisma = require('../config/database');
const { ApiError, asyncHandler } = require('../utils');

/**
 * OWNERSHIP CHECK MIDDLEWARE
 *
 * These middleware functions verify that users can only access
 * resources they own or are authorized to access.
 *
 * Every check here FAILS CLOSED: a missing profile id (a user holding the
 * STUDENT or PARENT role without a Student / Parent row), a missing or
 * malformed id in the request, or a lookup that finds nothing all deny.
 * Never pass a possibly-undefined value into a Prisma `where` — Prisma drops
 * undefined filters, which turns "this parent's child" into "anyone's child".
 */

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH']);

const isAdminUser = (user) =>
  user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN');

/** Parse a positive integer id; anything else becomes null. */
const toId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Read a request value from the same place the controller will read it:
 * route params first, then the body for writes (POST/PUT/PATCH) or the query
 * string for reads. Never mixes body and query, so a query string cannot
 * override the body that the controller actually acts on.
 */
const readParam = (req, name) => {
  if (req.params && req.params[name] !== undefined) return req.params[name];
  const source = WRITE_METHODS.has(req.method) ? req.body : req.query;
  return source ? source[name] : undefined;
};

/** Id of the school's current academic year, or null if none is set. */
const getCurrentAcademicYearId = async (schoolId) => {
  const year = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
    select: { id: true },
  });
  return year ? year.id : null;
};

/** True only when the user has a Student profile and it is this student. */
const isSelfStudent = (user, studentId) =>
  Boolean(user.studentId) && Boolean(studentId) && user.studentId === studentId;

/** Parent-child link for this user, or null. Requires a Parent profile. */
const findParentLink = async (user, studentId) => {
  if (!user.parentId || !studentId) return null;
  return prisma.studentParent.findFirst({
    where: {
      parentId: user.parentId,
      studentId,
      schoolId: user.schoolId,
    },
  });
};

/**
 * Teacher assignment for a class/section in a given academic year, or null.
 * sectionId is optional only where the caller deliberately allows any section.
 */
const findTeacherAssignment = async (user, { academicYearId, classId, sectionId, classSubjectId, subjectId }) => {
  if (!academicYearId) return null;
  return prisma.teacherSubject.findFirst({
    where: {
      userId: user.id,
      academicYearId,
      ...(sectionId && { sectionId }),
      ...(classSubjectId && { classSubjectId }),
      classSubject: {
        academicYearId,
        ...(classId && { classId }),
        ...(subjectId && { subjectId }),
        class: { schoolId: user.schoolId },
      },
    },
  });
};

/** True when the teacher teaches the student's current-year class/section. */
const teacherTeachesStudent = async (user, studentId) => {
  if (!studentId) return false;
  const academicYearId = await getCurrentAcademicYearId(user.schoolId);
  if (!academicYearId) return false;

  const studentClass = await prisma.studentClass.findFirst({
    where: {
      studentId,
      academicYearId,
      schoolId: user.schoolId,
    },
  });
  if (!studentClass) return false;

  const assignment = await findTeacherAssignment(user, {
    academicYearId,
    classId: studentClass.classId,
    sectionId: studentClass.sectionId,
  });
  return Boolean(assignment);
};

/**
 * Check if the logged-in user is the owner of the requested user resource
 * Used for user profile endpoints
 */
const isOwner = asyncHandler(async (req, res, next) => {
  const resourceUserId = toId(req.params.userId || req.params.id);

  if (!resourceUserId) {
    throw ApiError.badRequest('User ID is required');
  }

  // Admins can access any user in their school
  if (isAdminUser(req.user)) {
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
  if (isAdminUser(req.user)) {
    return next();
  }

  // Must be a teacher
  if (!req.user.roles.includes('TEACHER')) {
    throw ApiError.forbidden('Only teachers can access this resource');
  }

  const classId = toId(readParam(req, 'classId'));
  const sectionId = toId(readParam(req, 'sectionId'));
  const subjectId = toId(readParam(req, 'subjectId'));
  const requestedYearId = toId(readParam(req, 'academicYearId'));

  if (!classId || !sectionId) {
    throw ApiError.badRequest('Class ID and Section ID are required');
  }

  const academicYearId = requestedYearId || (await getCurrentAcademicYearId(req.user.schoolId));
  if (!academicYearId) {
    throw ApiError.forbidden('No current academic year is set');
  }

  // Find teacher's assignments
  const teacherAssignment = await prisma.teacherSubject.findFirst({
    where: {
      userId: req.user.id,
      sectionId,
      academicYearId,
      classSubject: {
        classId,
        academicYearId,
        class: { schoolId: req.user.schoolId },
        ...(subjectId && { subjectId }),
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
  if (isAdminUser(req.user)) {
    return next();
  }

  if (!req.user.roles.includes('TEACHER')) {
    throw ApiError.forbidden('Only teachers can access this resource');
  }

  const classSubjectId = toId(readParam(req, 'classSubjectId'));
  const sectionId = toId(readParam(req, 'sectionId'));

  if (!classSubjectId) {
    throw ApiError.badRequest('Class Subject ID is required');
  }

  // ClassSubject is year-scoped, so matching it pins the academic year.
  const assignment = await prisma.teacherSubject.findFirst({
    where: {
      userId: req.user.id,
      classSubjectId,
      ...(sectionId && { sectionId }),
      classSubject: { class: { schoolId: req.user.schoolId } },
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
 * Grants access when ANY of the user's roles allows it.
 */
const isOwnStudent = asyncHandler(async (req, res, next) => {
  // Admins can access any student
  if (isAdminUser(req.user)) {
    return next();
  }

  const studentId = toId(req.params.studentId || req.params.id);
  if (!studentId) {
    throw ApiError.badRequest('Student ID is required');
  }

  let denial = 'Access denied';

  // Teachers can access students in their assigned classes (current year)
  if (req.user.roles.includes('TEACHER')) {
    if (await teacherTeachesStudent(req.user, studentId)) {
      return next();
    }
    denial = 'You are not assigned to this student\'s class';
  }

  // Students can only access their own data
  if (req.user.roles.includes('STUDENT')) {
    if (isSelfStudent(req.user, studentId)) {
      return next();
    }
    denial = 'You can only access your own data';
  }

  // Parents can access their children's data
  if (req.user.roles.includes('PARENT')) {
    if (await findParentLink(req.user, studentId)) {
      return next();
    }
    denial = 'You can only access your children\'s data';
  }

  throw ApiError.forbidden(denial);
});

/**
 * Check if parent can access child's data
 */
const isParentOfStudent = asyncHandler(async (req, res, next) => {
  // Admins bypass
  if (isAdminUser(req.user)) {
    return next();
  }

  if (!req.user.roles.includes('PARENT')) {
    throw ApiError.forbidden('Only parents can access this resource');
  }

  if (!req.user.parentId) {
    throw ApiError.forbidden('No parent profile is linked to this account');
  }

  const studentId = toId(readParam(req, 'studentId'));

  if (!studentId) {
    throw ApiError.badRequest('Student ID is required');
  }

  const parentChild = await findParentLink(req.user, studentId);

  if (!parentChild) {
    throw ApiError.forbidden('You are not a guardian of this student');
  }

  req.parentChildRelation = parentChild;
  next();
});

/**
 * Verify access to attendance records
 * Teachers: Can view/mark attendance for their assigned sections (current year)
 * Students: Can view their own attendance
 * Parents: Can view their children's attendance
 */
const canAccessAttendance = asyncHandler(async (req, res, next) => {
  // Admins have full access
  if (isAdminUser(req.user)) {
    return next();
  }

  const classId = toId(readParam(req, 'classId'));
  const sectionId = toId(readParam(req, 'sectionId'));
  const studentId = toId(readParam(req, 'studentId'));

  let denial = 'Access denied';

  if (req.user.roles.includes('TEACHER')) {
    // Teachers accessing class attendance
    if (classId && sectionId) {
      const academicYearId = await getCurrentAcademicYearId(req.user.schoolId);
      const assignment = await findTeacherAssignment(req.user, {
        academicYearId,
        classId,
        sectionId,
      });
      if (assignment) {
        return next();
      }
      denial = 'You are not assigned to this class/section';
    } else if (studentId) {
      // Teachers viewing one student's attendance
      if (await teacherTeachesStudent(req.user, studentId)) {
        return next();
      }
      denial = 'You are not assigned to this student\'s class';
    }
  }

  // Students viewing own attendance
  if (req.user.roles.includes('STUDENT') && studentId) {
    if (isSelfStudent(req.user, studentId)) {
      return next();
    }
    denial = 'You can only view your own attendance';
  }

  // Parents viewing child's attendance
  if (req.user.roles.includes('PARENT') && studentId) {
    if (await findParentLink(req.user, studentId)) {
      return next();
    }
    denial = 'You can only view your children\'s attendance';
  }

  throw ApiError.forbidden(denial);
});

/**
 * Verify access to exam results
 * Teachers: Can view/enter results for their assigned subjects (current year)
 * Exam officers: Can view/enter results for any subject in their school
 * Students: Can view their own results (if published)
 * Parents: Can view their children's results (if published)
 */
const canAccessResults = asyncHandler(async (req, res, next) => {
  // Admins have full access
  if (isAdminUser(req.user)) {
    return next();
  }

  const examSubjectId = toId(readParam(req, 'examSubjectId'));
  const sectionId = toId(readParam(req, 'sectionId'));
  const studentId = toId(req.params.studentId);

  const isTeacher = req.user.roles.includes('TEACHER');
  const isExamOfficer = req.user.roles.includes('EXAM_OFFICER');

  let denial = 'Access denied';

  // Teachers / exam officers entering or viewing results for an exam subject
  if (examSubjectId && (isTeacher || isExamOfficer)) {
    const examSubject = await prisma.examSubject.findFirst({
      where: {
        id: examSubjectId,
        exam: { schoolId: req.user.schoolId },
      },
      include: {
        classSubject: true,
        exam: { select: { academicYearId: true } },
      },
    });

    if (!examSubject) {
      throw ApiError.notFound('Exam subject not found');
    }

    if (isExamOfficer) {
      req.examSubject = examSubject;
      return next();
    }

    // Check if teacher is assigned to this subject (and section, when given)
    // in the current academic year
    const academicYearId = await getCurrentAcademicYearId(req.user.schoolId);
    const assignment = await findTeacherAssignment(req.user, {
      academicYearId,
      classSubjectId: examSubject.classSubjectId,
      sectionId,
    });

    if (assignment) {
      req.examSubject = examSubject;
      return next();
    }
    denial = sectionId
      ? 'You are not assigned to this subject for this section'
      : 'You are not assigned to this subject';
  }

  // One student's results or report card. Exam officers: any student in their
  // school. Teachers: a student they teach this year. The controller then
  // applies the exam-status and publication rules.
  if (studentId && isExamOfficer) {
    const inSchool = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.user.schoolId },
      select: { id: true },
    });
    if (inSchool) return next();
  }
  if (studentId && isTeacher && (await teacherTeachesStudent(req.user, studentId))) {
    return next();
  }

  // Students viewing own results
  if (req.user.roles.includes('STUDENT') && studentId) {
    if (isSelfStudent(req.user, studentId)) {
      return next();
    }
    denial = 'You can only view your own results';
  }

  // Parents viewing child's results
  if (req.user.roles.includes('PARENT') && studentId) {
    if (await findParentLink(req.user, studentId)) {
      return next();
    }
    denial = 'You can only view your children\'s results';
  }

  throw ApiError.forbidden(denial);
});

/**
 * Verify access to assignments
 * Teachers: Can create/grade assignments for their classes
 * Students: Can view/submit assignments
 */
const canAccessAssignment = asyncHandler(async (req, res, next) => {
  // Admins have full access
  if (isAdminUser(req.user)) {
    return next();
  }

  const assignmentId = toId(req.params.assignmentId || req.params.id);

  if (!assignmentId) {
    // Creating new assignment - check teacher assignment exists
    if (req.user.roles.includes('TEACHER')) {
      return next(); // Will be validated in controller
    }
    throw ApiError.forbidden('Only teachers can create assignments');
  }

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      teacherSubject: {
        classSubject: { class: { schoolId: req.user.schoolId } },
      },
    },
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

  let denial = 'Access denied';

  // Teachers can access their own assignments
  if (req.user.roles.includes('TEACHER')) {
    if (assignment.teacherSubject.userId === req.user.id) {
      req.assignment = assignment;
      return next();
    }
    denial = 'You can only access your own assignments';
  }

  // Students can view assignments for their class
  if (req.user.roles.includes('STUDENT')) {
    if (!req.user.studentId) {
      throw ApiError.forbidden('No student profile is linked to this account');
    }

    const studentClass = await prisma.studentClass.findFirst({
      where: {
        studentId: req.user.studentId,
        schoolId: req.user.schoolId,
        academicYearId: assignment.teacherSubject.academicYearId,
        classId: assignment.teacherSubject.classSubject.classId,
        sectionId: assignment.teacherSubject.sectionId,
      },
    });

    if (studentClass) {
      req.assignment = assignment;
      return next();
    }
    denial = 'This assignment is not for your class';
  }

  throw ApiError.forbidden(denial);
});

/**
 * Generic resource ownership check factory
 * Creates a middleware that checks if user owns a specific resource
 */
const checkOwnership = (model, userIdField = 'userId') => {
  return asyncHandler(async (req, res, next) => {
    // Admins bypass
    if (isAdminUser(req.user)) {
      return next();
    }

    const resourceId = toId(req.params.id);

    if (!resourceId) {
      throw ApiError.badRequest('Resource ID is required');
    }

    const resource = await prisma[model].findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw ApiError.notFound('Resource not found');
    }

    if (resource[userIdField] === undefined || resource[userIdField] !== req.user.id) {
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
