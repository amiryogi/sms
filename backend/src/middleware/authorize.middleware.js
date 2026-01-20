const { ApiError } = require('../utils');

/**
 * Authorization middleware factory
 * Checks if user has required permission(s)
 */
const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const userPermissions = req.user.permissions || [];

    // Check if user has ANY of the required permissions
    const hasPermission = requiredPermissions.some((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasPermission) {
      throw ApiError.forbidden(
        `Access denied. Required permission: ${requiredPermissions.join(' or ')}`
      );
    }

    next();
  };
};

/**
 * Role check middleware factory
 * Checks if user has required role(s)
 */
const requireRole = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const userRoles = req.user.roles || [];

    // Check if user has ANY of the required roles
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw ApiError.forbidden(
        `Access denied. Required role: ${requiredRoles.join(' or ')}`
      );
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
  const hasAdminRole = req.user.roles.some((role) => adminRoles.includes(role));

  if (!hasAdminRole) {
    throw ApiError.forbidden('Admin access required');
  }

  next();
};

/**
 * Check if user is teacher
 */
const isTeacher = (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  if (!req.user.roles.includes('TEACHER')) {
    throw ApiError.forbidden('Teacher access required');
  }

  next();
};

/**
 * Check if user is student
 */
const isStudent = (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  if (!req.user.roles.includes('STUDENT')) {
    throw ApiError.forbidden('Student access required');
  }

  next();
};

/**
 * Check if user is parent
 */
const isParent = (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  if (!req.user.roles.includes('PARENT')) {
    throw ApiError.forbidden('Parent access required');
  }

  next();
};

/**
 * Check if user is exam officer
 */
const isExamOfficer = (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  if (!req.user.roles.includes('EXAM_OFFICER')) {
    throw ApiError.forbidden('Exam Officer access required');
  }

  next();
};

/**
 * Check if user is accountant
 */
const isAccountant = (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  if (!req.user.roles.includes('ACCOUNTANT')) {
    throw ApiError.forbidden('Accountant access required');
  }

  next();
};

/**
 * Check if user can manage fees (ACCOUNTANT or ADMIN)
 * ACCOUNTANT: full fee management access
 * ADMIN: full access with override capability
 */
const canManageFees = (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const allowedRoles = ['ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN'];
  const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));

  if (!hasRole) {
    throw ApiError.forbidden('You do not have permission to manage fees');
  }

  next();
};

/**
 * Determine the role used for fee operations (for audit trail)
 * Priority: ACCOUNTANT > ADMIN
 */
const getFeeManagementRole = (user) => {
  if (user.roles.includes('ACCOUNTANT')) {
    return 'ACCOUNTANT';
  }
  if (user.roles.includes('SUPER_ADMIN') || user.roles.includes('ADMIN')) {
    return 'ADMIN';
  }
  return 'UNKNOWN';
};

/**
 * Check if user can enter marks (TEACHER, EXAM_OFFICER, or ADMIN)
 * TEACHER: must be assigned to the subject (checked in controller)
 * EXAM_OFFICER: can enter marks for any subject
 * ADMIN: can enter marks with override flag
 */
const canEnterMarks = (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const allowedRoles = ['TEACHER', 'EXAM_OFFICER', 'ADMIN', 'SUPER_ADMIN'];
  const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));

  if (!hasRole) {
    throw ApiError.forbidden('You do not have permission to enter marks');
  }

  next();
};

/**
 * Determine the role used for marks entry (for audit trail)
 * Priority: EXAM_OFFICER > ADMIN > TEACHER
 */
const getMarksEntryRole = (user) => {
  if (user.roles.includes('EXAM_OFFICER')) {
    return 'EXAM_OFFICER';
  }
  if (user.roles.includes('SUPER_ADMIN') || user.roles.includes('ADMIN')) {
    return 'ADMIN';
  }
  if (user.roles.includes('TEACHER')) {
    return 'TEACHER';
  }
  return 'UNKNOWN';
};

/**
 * School scope middleware
 * Ensures user can only access data from their own school
 */
const schoolScope = (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  // Attach school ID filter for use in queries
  req.schoolId = req.user.schoolId;
  
  next();
};

module.exports = {
  authorize,
  requireRole,
  isAdmin,
  isTeacher,
  isStudent,
  isParent,
  isExamOfficer,
  isAccountant,
  canEnterMarks,
  getMarksEntryRole,
  canManageFees,
  getFeeManagementRole,
  schoolScope,
};
