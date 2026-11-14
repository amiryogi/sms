const prisma = require('../config/database');
const { dialect } = require('../database');
const { ApiError, ApiResponse, asyncHandler, parsePagination, parseSort, buildSearchQuery } = require('../utils');
const { normalizeMiddleName, fullName } = require('../utils/names');
const { normalizeEmail, resolveUsername, assertEmailFree, initialPassword, setTemporaryPassword, logPasswordSet, createWithSignInName } = require('../services/account.service');

// Roles that need a profile row (Student / Parent). They are created through
// their own flows — POST /students and POST /admin/parents — never by
// granting the bare role here, which would leave a role without a profile.
const PROFILE_ROLES = ['STUDENT', 'PARENT'];
const PROFILE_ROLE_MESSAGE =
  'STUDENT and PARENT roles cannot be granted here. Create students via POST /students and parents via POST /admin/parents so the profile is created with the account.';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

/**
 * Load Role rows for a list of ids (deduplicated). Roles are global, not
 * per-school, so there is no schoolId to scope them by.
 */
const loadRoles = async (roleIds) => {
  const ids = [...new Set(roleIds.map((id) => parseInt(id, 10)))];
  if (ids.some((id) => !Number.isInteger(id) || id < 1)) {
    throw ApiError.badRequest('One or more role IDs are invalid');
  }
  const roles = await prisma.role.findMany({ where: { id: { in: ids } } });
  if (roles.length !== ids.length) {
    throw ApiError.badRequest('One or more role IDs are invalid');
  }
  return roles;
};

/**
 * @desc    Get all users (with pagination and filters)
 * @route   GET /api/v1/users
 * @access  Private/Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, role, status } = req.query;

  // Build where clause
  const where = {
    schoolId: req.user.schoolId,
  };

  // Add search filter
  if (search) {
    const searchQuery = buildSearchQuery(search, ['firstName', 'middleName', 'lastName', 'username', 'email'], dialect.text.search);
    if (searchQuery) {
      where.OR = searchQuery.OR;
    }
  }

  // Add status filter
  if (status) {
    where.status = status;
  }

  // Add role filter
  if (role) {
    where.userRoles = {
      some: {
        role: {
          name: role,
        },
      },
    };
  }

  // Get users with pagination
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: parseSort(req.query.sort, ['firstName', 'lastName', 'email', 'createdAt']),
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Format response
  const formattedUsers = users.map((user) => ({
    id: user.id,
    username: user.username ?? null,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName ?? null,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    status: user.status,
    roles: user.userRoles.map((ur) => ur.role.name),
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
  }));

  ApiResponse.paginated(res, formattedUsers, { page, limit, total });
});

/**
 * @desc    Get single user by ID
 * @route   GET /api/v1/users/:id
 * @access  Private/Admin or Owner
 */
const getUser = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      schoolId: req.user.schoolId,
    },
    include: {
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
    throw ApiError.notFound('User not found');
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
    username: user.username ?? null,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName ?? null,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    status: user.status,
    roles,
    permissions,
    studentId: user.student?.id,
    parentId: user.parent?.id,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

/**
 * @desc    Create new user
 * @route   POST /api/v1/users
 * @access  Private/Admin
 */
const createUser = asyncHandler(async (req, res) => {
  const { password, firstName, middleName, lastName, phone, roleIds = [], role, status = 'active', avatarUrl } = req.body;

  // Check if neither roleIds nor role is provided
  if (!role && (!roleIds || roleIds.length === 0)) {
    throw ApiError.badRequest('At least one role is required');
  }

  // Email is optional. With no username typed, the account gets a generated number (svi-0001).
  const email = normalizeEmail(req.body.email);
  await assertEmailFree(prisma, req.user.schoolId, email);
  const typedUsername = req.body.username
    ? await resolveUsername(prisma, req.user.schoolId, { requested: req.body.username })
    : null;

  // Handle role string payload (e.g., "TEACHER")
  const finalRoleIds = [...(roleIds || [])];
  if (role) {
    const roleRecord = await prisma.role.findUnique({
      where: { name: role }
    });
    if (!roleRecord) {
      throw ApiError.badRequest(`Role '${role}' not found`);
    }
    finalRoleIds.push(roleRecord.id);
  }

  // Verify all role IDs are valid
  const roles = await loadRoles(finalRoleIds);

  // Students and parents need a profile row; they have their own flows
  if (roles.some((r) => PROFILE_ROLES.includes(r.name))) {
    throw ApiError.badRequest(PROFILE_ROLE_MESSAGE);
  }

  // Prevent non-super-admins from creating super admins
  const hasSuperAdmin = roles.some((r) => r.name === 'SUPER_ADMIN');
  if (hasSuperAdmin && !req.user.roles.includes('SUPER_ADMIN')) {
    throw ApiError.forbidden('Only super admins can create super admin users');
  }

  // Typed by the admin or generated; the user chooses their own at first sign-in.
  const { passwordHash, mustChangePassword, temporaryPassword } = await initialPassword(password);

  // Create user with roles
  const user = await createWithSignInName(prisma, req.user.schoolId, typedUsername, (username) => prisma.user.create({
    data: {
      schoolId: req.user.schoolId,
      username,
      email,
      passwordHash,
      mustChangePassword,
      firstName,
      middleName: normalizeMiddleName(middleName),
      lastName,
      phone,
      status,
      avatarUrl, // Save avatarUrl
      userRoles: {
        create: roles.map((r) => ({
          roleId: r.id,
        })),
      },
    },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  }));

  ApiResponse.created(res, {
    id: user.id,
    username: user.username ?? null,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName ?? null,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl, // Return avatarUrl
    status: user.status,
    roles: user.userRoles.map((ur) => ur.role.name),
    createdAt: user.createdAt,
    // shown to the admin once when generated; never stored in plain text
    temporaryPassword,
  });
  logPasswordSet(req.user, user, "account created");
});

/**
 * @desc    Update user
 * @route   PUT /api/v1/users/:id
 * @access  Private/Admin or Owner
 */
const updateUser = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { firstName, middleName, lastName, phone, status, avatarUrl } = req.body;

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      schoolId: req.user.schoolId,
    },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // A school admin can't change or deactivate a super admin's account.
  const targetIsSuperAdmin = user.userRoles.some((ur) => ur.role.name === 'SUPER_ADMIN');
  if (targetIsSuperAdmin && userId !== req.user.id && !req.user.roles.includes('SUPER_ADMIN')) {
    throw ApiError.forbidden('Only super admins can change a super admin account');
  }

  // Non-admins can only update their own profile (basic fields)
  const isAdmin = req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN');

  if (!isAdmin && userId !== req.user.id) {
    throw ApiError.forbidden('You can only update your own profile');
  }

  // Non-admins cannot change status
  if (!isAdmin && status) {
    throw ApiError.forbidden('Only admins can change user status');
  }

  // Sign-in details: only an admin changes a username; an emptied email is null.
  const signIn = {};
  if (req.body.username !== undefined && req.body.username !== "") {
    if (!isAdmin) throw ApiError.forbidden('Only admins can change a username');
    signIn.username = await resolveUsername(prisma, req.user.schoolId, { requested: req.body.username, exceptUserId: userId });
  }
  if (req.body.email !== undefined) {
    signIn.email = normalizeEmail(req.body.email);
    await assertEmailFree(prisma, req.user.schoolId, signIn.email, userId);
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...signIn,
      ...(firstName && { firstName }),
      ...(middleName !== undefined && { middleName: normalizeMiddleName(middleName) }),
      ...(lastName && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(isAdmin && status && { status }),
    },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  ApiResponse.success(res, {
    id: updatedUser.id,
    username: updatedUser.username ?? null,
    email: updatedUser.email,
    firstName: updatedUser.firstName,
    middleName: updatedUser.middleName ?? null,
    lastName: updatedUser.lastName,
    phone: updatedUser.phone,
    avatarUrl: updatedUser.avatarUrl,
    status: updatedUser.status,
    roles: updatedUser.userRoles.map((ur) => ur.role.name),
    updatedAt: updatedUser.updatedAt,
  }, 'User updated successfully');
});

/**
 * @desc    Update user roles
 * @route   PUT /api/v1/users/:id/roles
 * @access  Private/Admin
 */
const updateUserRoles = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { roleIds } = req.body;

  // Find user (in the caller's school only)
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      schoolId: req.user.schoolId,
    },
    include: {
      userRoles: { include: { role: true } },
      student: { select: { id: true } },
      parent: { select: { id: true } },
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Verify all role IDs are valid
  const roles = await loadRoles(roleIds);
  const newRoleNames = roles.map((r) => r.name);
  const currentRoleNames = user.userRoles.map((ur) => ur.role.name);
  const isSuperAdminCaller = req.user.roles.includes('SUPER_ADMIN');

  // STUDENT / PARENT only when the matching profile row already exists
  if (
    (newRoleNames.includes('STUDENT') && !user.student) ||
    (newRoleNames.includes('PARENT') && !user.parent)
  ) {
    throw ApiError.badRequest(PROFILE_ROLE_MESSAGE);
  }

  // Prevent non-super-admins from assigning or removing super admin role
  const addsSuperAdmin = newRoleNames.includes('SUPER_ADMIN');
  const holdsSuperAdmin = currentRoleNames.includes('SUPER_ADMIN');
  if ((addsSuperAdmin || holdsSuperAdmin) && !isSuperAdminCaller) {
    throw ApiError.forbidden('Only super admins can assign or change super admin roles');
  }

  // Prevent an admin from locking themselves out
  if (userId === req.user.id && !newRoleNames.some((r) => ADMIN_ROLES.includes(r))) {
    throw ApiError.badRequest('You cannot remove your own admin role');
  }

  // Delete existing roles and create new ones
  await prisma.$transaction([
    prisma.userRole.deleteMany({
      where: { userId },
    }),
    prisma.userRole.createMany({
      data: roles.map((r) => ({
        userId,
        roleId: r.id,
      })),
    }),
  ]);

  // Get updated user
  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  ApiResponse.success(res, {
    id: updatedUser.id,
    username: updatedUser.username ?? null,
    email: updatedUser.email,
    firstName: updatedUser.firstName,
    middleName: updatedUser.middleName ?? null,
    lastName: updatedUser.lastName,
    roles: updatedUser.userRoles.map((ur) => ur.role.name),
  }, 'User roles updated successfully');
});

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      schoolId: req.user.schoolId,
    },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Prevent deleting yourself
  if (userId === req.user.id) {
    throw ApiError.badRequest('You cannot delete your own account');
  }

  // Prevent non-super-admins from deleting super admins
  const isSuperAdmin = user.userRoles.some((ur) => ur.role.name === 'SUPER_ADMIN');
  if (isSuperAdmin && !req.user.roles.includes('SUPER_ADMIN')) {
    throw ApiError.forbidden('Only super admins can delete super admin users');
  }

  // Financial records are never deleted, so a user linked to any of them (a
  // student with fees, or staff who recorded payments or decided requests)
  // can only be deactivated.
  const student = await prisma.student.findFirst({ where: { userId }, select: { id: true } });
  const [studentFees, staffFinance] = await Promise.all([
    student
      ? prisma.feeObligation.count({ where: { studentClass: { studentId: student.id } } })
      : 0,
    prisma.feeTransaction.count({ where: { recordedById: userId } }).then(async (n) =>
      n +
      (await prisma.feeReversalRequest.count({ where: { OR: [{ requestedById: userId }, { decidedById: userId }] } })) +
      (await prisma.feeDiscount.count({ where: { OR: [{ requestedById: userId }, { approvedById: userId }, { revokedById: userId }] } })),
    ),
  ]);
  if (studentFees > 0 || staffFinance > 0) {
    throw ApiError.conflict('This user has fee records, which are never deleted. Deactivate the account instead.');
  }

  // Delete user (cascades to related records)
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    if (error.code === 'P2003') {
      throw ApiError.conflict('This user is linked to records that cannot be deleted. Deactivate the account instead.');
    }
    throw error;
  }

  ApiResponse.success(res, null, 'User deleted successfully');
});

/**
 * @desc    Get all roles
 * @route   GET /api/v1/users/roles
 * @access  Private/Admin
 */
const getRoles = asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { id: "asc" },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  const formattedRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.rolePermissions.map((rp) => rp.permission.name),
    permissionCount: role.rolePermissions.length,
  }));

  ApiResponse.success(res, formattedRoles);
});

/**
 * @desc    Get all permissions
 * @route   GET /api/v1/users/permissions
 * @access  Private/Admin
 */
const getPermissions = asyncHandler(async (req, res) => {
  const permissions = await prisma.permission.findMany({
    orderBy: [
      { module: 'asc' },
      { name: 'asc' },
    ],
  });

  // Group by module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push({
      id: perm.id,
      name: perm.name,
      description: perm.description,
    });
    return acc;
  }, {});

  ApiResponse.success(res, {
    permissions,
    grouped: groupedPermissions,
  });
});

/**
 * @desc    Reset a user's password (typed by the admin, or generated)
 * @route   POST /api/v1/users/:id/reset-password
 * @access  Private/Admin
 *
 * Any student, parent or staff member of the school. Only a super admin resets
 * a super admin; nobody resets their own password here (they change it). The
 * user must choose a new password at the next sign-in, and every session of
 * theirs ends. The temporary password is returned once and never stored.
 */
const resetPassword = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const user = await prisma.user.findFirst({
    where: { id: userId, schoolId: req.user.schoolId },
    include: { userRoles: { include: { role: true } } },
  });
  if (!user) throw ApiError.notFound('User not found');
  if (userId === req.user.id) throw ApiError.badRequest('Use "Change password" for your own account');
  const targetIsSuperAdmin = user.userRoles.some((ur) => ur.role.name === 'SUPER_ADMIN');
  if (targetIsSuperAdmin && !req.user.roles.includes('SUPER_ADMIN')) {
    throw ApiError.forbidden('Only super admins can reset a super admin password');
  }

  const temporaryPassword = await setTemporaryPassword(prisma, userId, req.body.password);
  logPasswordSet(req.user, user, 'password reset');
  ApiResponse.success(
    res,
    { userId, username: user.username, name: fullName(user), roles: user.userRoles.map((ur) => ur.role.name), temporaryPassword },
    'Password reset. They will choose a new one at the next sign-in.',
  );
});

module.exports = {
  resetPassword,
  getUsers,
  getUser,
  createUser,
  updateUser,
  updateUserRoles,
  deleteUser,
  getRoles,
  getPermissions,
};
