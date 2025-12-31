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
  schoolScope,
};
