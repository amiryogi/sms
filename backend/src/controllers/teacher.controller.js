const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler, parsePagination, parseSort, buildSearchQuery } = require('../utils');

/**
 * @desc    Get all teachers
 * @route   GET /api/v1/teachers
 * @access  Private/Admin
 */
const getTeachers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, status } = req.query;

  const where = {
    schoolId: req.user.schoolId,
    userRoles: {
      some: {
        role: { name: 'TEACHER' },
      },
    },
  };

  if (status) where.status = status;
  
  if (search) {
    const searchQuery = buildSearchQuery(search, ['firstName', 'lastName', 'email']);
    if (searchQuery) where.OR = searchQuery.OR;
  }

  const [teachers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: parseSort(req.query.sort, ['firstName', 'lastName', 'createdAt']),
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        teacherSubjects: {
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
    }),
    prisma.user.count({ where }),
  ]);

  ApiResponse.paginated(res, teachers, { page, limit, total });
});

/**
 * @desc    Get single teacher details with assignments
 * @route   GET /api/v1/teachers/:id
 * @access  Private/Admin or Owner
 */
const getTeacher = asyncHandler(async (req, res) => {
  const teacherId = parseInt(req.params.id);

  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      schoolId: req.user.schoolId,
      userRoles: {
        some: { role: { name: 'TEACHER' } },
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      status: true,
      lastLogin: true,
      createdAt: true,
      teacherSubjects: {
        include: {
          classSubject: {
            include: {
              class: true,
              subject: true,
              academicYear: true,
            },
          },
          section: true,
        },
      },
    },
  });

  if (!teacher) {
    throw ApiError.notFound('Teacher not found');
  }

  ApiResponse.success(res, teacher);
});

/**
 * @desc    Create teacher
 * @route   POST /api/v1/teachers
 * @access  Private/Admin
 */
const createTeacher = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, status = 'active' } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findFirst({
    where: { email, schoolId: req.user.schoolId },
  });

  if (existingUser) {
    throw ApiError.conflict('User with this email already exists in this school');
  }

  // Get teacher role
  const teacherRole = await prisma.role.findUnique({ where: { name: 'TEACHER' } });
  if (!teacherRole) throw ApiError.internal('Teacher role not configured');

  const passwordHash = await bcrypt.hash(password || 'Teacher@123', 10);

  const teacher = await prisma.user.create({
    data: {
      schoolId: req.user.schoolId,
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      status,
      userRoles: {
        create: { roleId: teacherRole.id },
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  });

  ApiResponse.created(res, teacher, 'Teacher created successfully');
});

/**
 * @desc    Update teacher profile
 * @route   PUT /api/v1/teachers/:id
 * @access  Private/Admin or Owner
 */
const updateTeacher = asyncHandler(async (req, res) => {
  const teacherId = parseInt(req.params.id);
  const { firstName, lastName, phone, avatarUrl, status } = req.body;

  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      schoolId: req.user.schoolId,
      userRoles: { some: { role: { name: 'TEACHER' } } },
    },
  });

  if (!teacher) {
    throw ApiError.notFound('Teacher not found');
  }

  const updatedTeacher = await prisma.user.update({
    where: { id: teacherId },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(status && req.user.roles.includes('ADMIN') && { status }),
    },
  });

  ApiResponse.success(res, null, 'Teacher updated successfully');
});

module.exports = {
  getTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
};
