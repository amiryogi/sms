const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');
const { ApiError, asyncHandler } = require('../utils');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token is required');
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Get user from database with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
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
      },
    });

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (user.status !== 'active') {
      throw ApiError.unauthorized('Account is not active');
    }

    // Extract roles and permissions
    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = new Set();
    
    user.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        permissions.add(rp.permission.name);
      });
    });

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      schoolId: user.schoolId,
      school: user.school,
      roles,
      permissions: Array.from(permissions),
      studentId: user.student?.id,
      parentId: user.parent?.id,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expired');
    }
    throw error;
  }
});

/**
 * Optional authentication middleware
 * Sets req.user if token is valid, but doesn't fail if no token
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    await authenticate(req, res, next);
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
});

module.exports = {
  authenticate,
  optionalAuth,
};
