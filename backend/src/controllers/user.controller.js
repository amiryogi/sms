const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler, parsePagination, parseSort, buildSearchQuery } = require('../utils');

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
    const searchQuery = buildSearchQuery(search, ['firstName', 'lastName', 'email']);
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
    email: user.email,
    firstName: user.firstName,
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
    email: user.email,
    firstName: user.firstName,
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
  const { email, password, firstName, lastName, phone, roleIds, status = 'active' } = req.body;

  // Check if email already exists for this school
  const existingUser = await prisma.user.findFirst({
    where: {
      email,
      schoolId: req.user.schoolId,
    },
  });

  if (existingUser) {
    throw ApiError.conflict('Email already registered for this school');
  }

  // Verify all role IDs are valid
  const roles = await prisma.role.findMany({
    where: {
      id: { in: roleIds },
    },
  });

  if (roles.length !== roleIds.length) {
    throw ApiError.badRequest('One or more role IDs are invalid');
  }

  // Prevent non-super-admins from creating super admins
  const hasSuperAdmin = roles.some((r) => r.name === 'SUPER_ADMIN');
  if (hasSuperAdmin && !req.user.roles.includes('SUPER_ADMIN')) {
    throw ApiError.forbidden('Only super admins can create super admin users');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user with roles
  const user = await prisma.user.create({
    data: {
      schoolId: req.user.schoolId,
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      status,
      userRoles: {
        create: roleIds.map((roleId) => ({
          roleId,
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
  });

  ApiResponse.created(res, {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    status: user.status,
    roles: user.userRoles.map((ur) => ur.role.name),
    createdAt: user.createdAt,
  });
});

/**
 * @desc    Update user
 * @route   PUT /api/v1/users/:id
 * @access  Private/Admin or Owner
 */
const updateUser = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { email, firstName, lastName, phone, status, avatarUrl } = req.body;

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      schoolId: req.user.schoolId,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
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

  // Check email uniqueness if changing email
  if (email && email !== user.email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        schoolId: req.user.schoolId,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      throw ApiError.conflict('Email already in use');
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(email && { email }),
      ...(firstName && { firstName }),
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
    email: updatedUser.email,
    firstName: updatedUser.firstName,
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

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      schoolId: req.user.schoolId,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Verify all role IDs are valid
  const roles = await prisma.role.findMany({
    where: {
      id: { in: roleIds },
    },
  });

  if (roles.length !== roleIds.length) {
    throw ApiError.badRequest('One or more role IDs are invalid');
  }

  // Prevent non-super-admins from assigning super admin role
  const hasSuperAdmin = roles.some((r) => r.name === 'SUPER_ADMIN');
  if (hasSuperAdmin && !req.user.roles.includes('SUPER_ADMIN')) {
    throw ApiError.forbidden('Only super admins can assign super admin role');
  }

  // Delete existing roles and create new ones
  await prisma.$transaction([
    prisma.userRole.deleteMany({
      where: { userId },
    }),
    prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({
        userId,
        roleId,
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
    email: updatedUser.email,
    firstName: updatedUser.firstName,
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

  // Delete user (cascades to related records)
  await prisma.user.delete({
    where: { id: userId },
  });

  ApiResponse.success(res, null, 'User deleted successfully');
});

/**
 * @desc    Get all roles
 * @route   GET /api/v1/users/roles
 * @access  Private/Admin
 */
const getRoles = asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({
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

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  updateUserRoles,
  deleteUser,
  getRoles,
  getPermissions,
};
