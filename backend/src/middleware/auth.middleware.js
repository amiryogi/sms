const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');
const { ApiError, asyncHandler } = require('../utils');

const userInclude = {
  school: true,
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
  student: true,
  parent: true,
};

/**
 * SUPER_ADMIN is seeded with every permission; older databases seeded before
 * that have it with none, so it also receives the ADMIN role's permissions
 * here. It gains nothing cross-school — every controller still scopes by
 * req.user.schoolId.
 */
const loadAdminPermissions = async () => {
  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
    include: { rolePermissions: { include: { permission: true } } },
  });
  return adminRole ? adminRole.rolePermissions.map((rp) => rp.permission.name) : [];
};

/**
 * Verify the bearer token and build the req.user context.
 * Throws ApiError on any failure; never touches next().
 */
const resolveUser = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token is required');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expired');
    }
    throw ApiError.unauthorized('Invalid token');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: userInclude,
  });

  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  if (user.status !== 'active') {
    throw ApiError.unauthorized('Account is not active');
  }

  if (!user.school || !user.school.isActive) {
    throw ApiError.forbidden('Your school account is not active');
  }

  // Extract roles and permissions
  const roles = user.userRoles.map((ur) => ur.role.name);

  if (roles.length === 0) {
    throw ApiError.forbidden('Your account has no role assigned');
  }

  const permissions = new Set();
  user.userRoles.forEach((ur) => {
    ur.role.rolePermissions.forEach((rp) => {
      permissions.add(rp.permission.name);
    });
  });

  // A super admin is an admin everywhere: every `isAdmin`, `requireRole('ADMIN')`
  // and `roles.includes('ADMIN')` check passes. Super-admin-only actions
  // (managing admins and super admins) test for 'SUPER_ADMIN' itself.
  if (roles.includes('SUPER_ADMIN')) {
    if (!roles.includes('ADMIN')) roles.push('ADMIN');
    (await loadAdminPermissions()).forEach((p) => permissions.add(p));
  }

  return {
    id: user.id,
    username: user.username ?? null,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName ?? null,
    lastName: user.lastName,
    schoolId: user.schoolId,
    school: user.school,
    roles,
    permissions: Array.from(permissions),
    studentId: user.student?.id,
    parentId: user.parent?.id,
  };
};

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = asyncHandler(async (req, res, next) => {
  req.user = await resolveUser(req);
  next();
});

/**
 * Optional authentication middleware
 * Sets req.user if token is valid, but doesn't fail if no token or the
 * token/account is rejected. Unexpected errors (e.g. database down) still
 * propagate to the error handler.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    req.user = await resolveUser(req);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error;
    }
    // Ignore auth errors for optional auth
    req.user = undefined;
  }

  next();
});

module.exports = {
  authenticate,
  optionalAuth,
};
