const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");

// A revoked refresh token presented again within this window of its rotation
// is treated as a benign concurrent refresh (no session-wide revocation).
const REFRESH_REUSE_GRACE_MS = 10 * 1000;

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
    { expiresIn: config.jwt.refreshExpiresIn },
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
      "Account is not active. Please contact administrator.",
    );
  }

  // Check the school is active
  if (!user.school || !user.school.isActive) {
    throw ApiError.forbidden(
      "Your school account is not active. Please contact administrator.",
    );
  }

  // A user with no role can do nothing; `authenticate` would reject every call
  if (user.userRoles.length === 0) {
    throw ApiError.forbidden(
      "Your account has no role assigned. Please contact administrator.",
    );
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // Store refresh token in database (hashed, with metadata)
  const expiresAt = new Date(
    Date.now() + parseExpiresIn(config.jwt.refreshExpiresIn),
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
          id: user.school.id,
          name: user.school.name,
          code: user.school.code,
          logoUrl: user.school.logoUrl,
          bannerUrl: user.school.bannerUrl,
          tagline: user.school.tagline,
          address: user.school.address,
          phone: user.school.phone,
          email: user.school.email,
          website: user.school.website,
          landlineNumber: user.school.landlineNumber,
          facebookUrl: user.school.facebookUrl,
          instagramUrl: user.school.instagramUrl,
          youtubeUrl: user.school.youtubeUrl,
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
    "Login successful",
  );
});

/**
 * @desc    Register a new staff/admin user in the caller's school
 * @route   POST /api/v1/auth/register
 * @access  Private/Admin (route: authenticate + isAdmin)
 *
 * The account is created in req.user.schoolId; any client schoolCode is
 * ignored. No tokens are issued — the new user logs in themselves.
 * STUDENT / PARENT are rejected by the route validator: those need a profile
 * row and have their own creation flows.
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, role } = req.body;
  const schoolId = req.user.schoolId;

  // Check if email already exists for this school
  const existingUser = await prisma.user.findFirst({
    where: {
      email,
      schoolId,
    },
  });

  if (existingUser) {
    throw ApiError.conflict("Email already registered for this school");
  }

  const roleRecord = await prisma.role.findUnique({
    where: { name: role },
  });

  if (!roleRecord) {
    throw ApiError.badRequest(`Role '${role}' not found`);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user and role in one write
  const user = await prisma.user.create({
    data: {
      schoolId,
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      status: "active",
      userRoles: {
        create: [{ roleId: roleRecord.id }],
      },
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
        phone: user.phone,
        status: user.status,
        roles: [roleRecord.name],
        schoolId,
      },
    },
    "Registration successful",
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

  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      token: hashedToken,
      userId: decoded.userId,
    },
  });

  if (!storedToken || storedToken.expiresAt <= now) {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  if (storedToken.revokedAt) {
    // A rotated token presented again. Within a short grace window this is
    // almost always the frontend firing parallel refreshes with the same
    // token; outside it, treat it as theft and kill every session the user has.
    const sinceRevokedMs = now.getTime() - new Date(storedToken.revokedAt).getTime();
    const isConcurrentRotation =
      storedToken.replacedByTokenId && sinceRevokedMs < REFRESH_REUSE_GRACE_MS;

    if (!isConcurrentRotation) {
      await prisma.refreshToken.updateMany({
        where: { userId: decoded.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    }
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  // Refuse to refresh for an account or school that has been deactivated
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      status: true,
      school: { select: { isActive: true } },
      _count: { select: { userRoles: true } },
    },
  });

  if (
    !user ||
    user.status !== "active" ||
    !user.school?.isActive ||
    user._count.userRoles === 0
  ) {
    await prisma.refreshToken.updateMany({
      where: { userId: decoded.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    throw ApiError.unauthorized("Account is not active");
  }

  // Generate new tokens
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    decoded.userId,
  );
  const hashedNewToken = hashRefreshToken(newRefreshToken);
  const expiresAt = new Date(
    Date.now() + parseExpiresIn(config.jwt.refreshExpiresIn),
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

    // Only revoke if still unrevoked, so two parallel refreshes with the same
    // token cannot both succeed; the loser rolls back its new token.
    const revoked = await tx.refreshToken.updateMany({
      where: { id: storedToken.id, revokedAt: null },
      data: {
        revokedAt: now,
        replacedByTokenId: created.id,
      },
    });

    if (revoked.count !== 1) {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }
  });

  ApiResponse.success(
    res,
    {
      accessToken,
      refreshToken: newRefreshToken,
    },
    "Token refreshed successfully",
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
      logoUrl: user.school.logoUrl,
      bannerUrl: user.school.bannerUrl,
      tagline: user.school.tagline,
      address: user.school.address,
      phone: user.school.phone,
      email: user.school.email,
      website: user.school.website,
      landlineNumber: user.school.landlineNumber,
      facebookUrl: user.school.facebookUrl,
      instagramUrl: user.school.instagramUrl,
      youtubeUrl: user.school.youtubeUrl,
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
    user.passwordHash,
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
    "Password changed successfully. Please login again.",
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
