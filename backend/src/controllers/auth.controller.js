const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");

const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const formatParentForAuth = (parent) => {
  if (!parent) return undefined;

  const children = (parent.studentParents || []).map((sp) => {
    const enrollment = sp.student.studentClasses?.[0];
    return {
      studentId: sp.studentId,
      studentName: `${sp.student.user.firstName} ${sp.student.user.lastName}`,
      email: sp.student.user.email,
      phone: sp.student.user.phone,
      class: enrollment?.class?.name,
      section: enrollment?.section?.name,
      rollNumber: enrollment?.rollNumber,
      relationship: sp.relationship,
      isPrimary: sp.isPrimary,
    };
  });

  return {
    id: parent.id,
    children,
  };
};

const extractTokenMetadata = (req) => ({
  userAgent: req.headers["user-agent"]
    ? req.headers["user-agent"].slice(0, 255)
    : null,
  ipAddress: req.ip || req.connection?.remoteAddress || null,
});

/**
 * Generate access and refresh tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign(
    { userId, tokenId: uuidv4() },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

/**
 * Parse expiration time string to milliseconds
 */
const parseExpiresIn = (expiresIn) => {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000; // Default 1 day
  }
};

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email (across all schools for now)
  const user = await prisma.user.findFirst({
    where: { email },
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
      student: {
        include: {
          studentClasses: {
            where: { status: "active" },
            orderBy: { academicYear: { startDate: "desc" } },
            take: 1,
            include: {
              class: true,
              section: true,
              academicYear: true,
            },
          },
        },
      },
      parent: {
        include: {
          studentParents: {
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                    },
                  },
                  studentClasses: {
                    where: { status: "active" },
                    orderBy: { academicYear: { startDate: "desc" } },
                    take: 1,
                    include: {
                      class: true,
                      section: true,
                      academicYear: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Check if user is active
  if (user.status !== "active") {
    throw ApiError.unauthorized(
      "Account is not active. Please contact administrator."
    );
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // Store refresh token in database (hashed, with metadata)
  const expiresAt = new Date(
    Date.now() + parseExpiresIn(config.jwt.refreshExpiresIn)
  );
  const hashedToken = hashRefreshToken(refreshToken);
  const { userAgent, ipAddress } = extractTokenMetadata(req);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt,
      userAgent,
      ipAddress,
    },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // Prepare response - extract roles and permissions
  const roles = user.userRoles.map((ur) => ur.role.name);

  // Extract unique permissions from all roles
  const permissions = [];
  user.userRoles.forEach((ur) => {
    ur.role.rolePermissions.forEach((rp) => {
      if (!permissions.includes(rp.permission.name)) {
        permissions.push(rp.permission.name);
      }
    });
  });

  ApiResponse.success(
    res,
    {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        roles,
        permissions,
        school: {
          code: user.school.code,
        },
        student: user.student
          ? {
              ...user.student,
              rollNumber: user.student.studentClasses?.[0]?.rollNumber,
              enrollments: user.student.studentClasses,
            }
          : undefined,
        parent: formatParentForAuth(user.parent),
      },
      accessToken,
      refreshToken,
    },
    "Login successful"
  );
});

/**
 * @desc    Register new user (Admin creates users)
 * @route   POST /api/v1/auth/register
 * @access  Public (for initial setup) / Admin only later
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, schoolCode } = req.body;

  // Find school by code
  const school = await prisma.school.findUnique({
    where: { code: schoolCode },
  });

  if (!school) {
    throw ApiError.badRequest("Invalid school code");
  }

  // Check if email already exists for this school
  const existingUser = await prisma.user.findFirst({
    where: {
      email,
      schoolId: school.id,
    },
  });

  if (existingUser) {
    throw ApiError.conflict("Email already registered for this school");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      schoolId: school.id,
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      status: "active",
    },
  });

  // For initial setup, check if this is the first user (make them admin)
  const userCount = await prisma.user.count({
    where: { schoolId: school.id },
  });

  if (userCount === 1) {
    // First user becomes admin
    const adminRole = await prisma.role.findUnique({
      where: { name: "ADMIN" },
    });

    if (adminRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });
    }
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // Store refresh token (hashed) with metadata
  const expiresAt = new Date(
    Date.now() + parseExpiresIn(config.jwt.refreshExpiresIn)
  );
  const hashedToken = hashRefreshToken(refreshToken);
  const { userAgent, ipAddress } = extractTokenMetadata(req);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt,
      userAgent,
      ipAddress,
    },
  });

  ApiResponse.created(
    res,
    {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        school: {
          id: school.id,
          name: school.name,
          code: school.code,
        },
      },
      accessToken,
      refreshToken,
    },
    "Registration successful"
  );
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const hashedToken = hashRefreshToken(token);
  const now = new Date();

  // Check if token exists in database and is not revoked
  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      token: hashedToken,
      userId: decoded.userId,
      expiresAt: { gt: now },
      revokedAt: null,
    },
  });

  if (!storedToken) {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  // Generate new tokens
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    decoded.userId
  );
  const hashedNewToken = hashRefreshToken(newRefreshToken);
  const expiresAt = new Date(
    Date.now() + parseExpiresIn(config.jwt.refreshExpiresIn)
  );
  const { userAgent, ipAddress } = extractTokenMetadata(req);

  // Rotate tokens atomically: create new, revoke old
  await prisma.$transaction(async (tx) => {
    const created = await tx.refreshToken.create({
      data: {
        userId: decoded.userId,
        token: hashedNewToken,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    await tx.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revokedAt: now,
        replacedByTokenId: created.id,
      },
    });
  });

  ApiResponse.success(
    res,
    {
      accessToken,
      refreshToken: newRefreshToken,
    },
    "Token refreshed successfully"
  );
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Delete all refresh tokens for this user
  await prisma.refreshToken.deleteMany({
    where: { userId: req.user.id },
  });

  ApiResponse.success(res, null, "Logout successful");
});

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
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
      student: {
        include: {
          studentClasses: {
            where: { status: "active" },
            orderBy: { academicYear: { startDate: "desc" } },
            take: 1,
            include: {
              class: true,
              section: true,
              academicYear: true,
            },
          },
        },
      },
      parent: {
        include: {
          studentParents: {
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                    },
                  },
                  studentClasses: {
                    where: { status: "active" },
                    orderBy: { academicYear: { startDate: "desc" } },
                    take: 1,
                    include: {
                      class: true,
                      section: true,
                      academicYear: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissions = [];

  user.userRoles.forEach((ur) => {
    ur.role.rolePermissions.forEach((rp) => {
      if (!permissions.includes(rp.permission.name)) {
        permissions.push(rp.permission.name);
      }
    });
  });

  ApiResponse.success(res, {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    status: user.status,
    roles,
    permissions,
    school: {
      id: user.school.id,
      name: user.school.name,
      code: user.school.code,
    },
    student: user.student
      ? {
          ...user.student,
          rollNumber: user.student.studentClasses?.[0]?.rollNumber, // Flatten for dashboard
          enrollments: user.student.studentClasses, // Match frontend "enrollments" expectation
        }
      : undefined,
    parent: formatParentForAuth(user.parent),
    lastLogin: user.lastLogin,
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  // Verify current password
  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!isPasswordValid) {
    throw ApiError.badRequest("Current password is incorrect");
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash },
  });

  // Invalidate all refresh tokens
  await prisma.refreshToken.deleteMany({
    where: { userId: req.user.id },
  });

  ApiResponse.success(
    res,
    null,
    "Password changed successfully. Please login again."
  );
});

module.exports = {
  login,
  register,
  refreshToken,
  logout,
  getMe,
  changePassword,
};
