const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler, parsePagination, parseSort, buildSearchQuery } = require('../utils');

/**
 * @desc    Get all students
 * @route   GET /api/v1/students
 * @access  Private/Admin
 */
const getStudents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, classId, sectionId, academicYearId, status } = req.query;

  // Build where clause for studentClasses (enrollment)
  const enrollmentWhere = {
    status: status || 'active',
  };

  if (academicYearId) {
    enrollmentWhere.academicYearId = parseInt(academicYearId);
  } else {
    enrollmentWhere.academicYear = { isCurrent: true };
  }

  if (classId) enrollmentWhere.classId = parseInt(classId);
  if (sectionId) enrollmentWhere.sectionId = parseInt(sectionId);

  // Build where clause for user search
  const userWhere = {
    schoolId: req.user.schoolId,
    student: {
      studentClasses: {
        some: enrollmentWhere,
      },
    },
  };

  if (search) {
    const searchQuery = buildSearchQuery(search, ['firstName', 'lastName', 'email']);
    if (searchQuery) userWhere.OR = searchQuery.OR;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      skip,
      take: limit,
      orderBy: parseSort(req.query.sort, ['firstName', 'lastName', 'createdAt']),
      include: {
        student: {
          include: {
            studentClasses: {
              where: enrollmentWhere,
              include: {
                class: true,
                section: true,
                academicYear: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.count({ where: userWhere }),
  ]);

  const formattedStudents = users.map((user) => {
    const enrollment = user.student.studentClasses[0];
    return {
      id: user.student.id,
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admissionNumber: user.student.admissionNumber,
      rollNumber: enrollment?.rollNumber,
      class: enrollment?.class.name,
      section: enrollment?.section.name,
      status: user.status,
      avatarUrl: user.avatarUrl,
    };
  });

  ApiResponse.paginated(res, formattedStudents, { page, limit, total });
});

/**
 * @desc    Get single student details
 * @route   GET /api/v1/students/:id
 * @access  Private/Admin or Owner
 */
const getStudent = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id);

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      user: { schoolId: req.user.schoolId },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          status: true,
        },
      },
      studentClasses: {
        orderBy: { academicYear: { startDate: 'desc' } },
        include: {
          class: true,
          section: true,
          academicYear: true,
        },
      },
      studentParents: {
        include: {
          parent: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  ApiResponse.success(res, student);
});

/**
 * @desc    Create student with automated user account
 * @route   POST /api/v1/students
 * @access  Private/Admin
 */
const createStudent = asyncHandler(async (req, res) => {
  const {
    email, password, firstName, lastName, phone,
    admissionNumber, dateOfBirth, gender, bloodGroup, address, emergencyContact, admissionDate,
    classId, sectionId, academicYearId, rollNumber
  } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findFirst({
    where: { email, schoolId: req.user.schoolId },
  });

  if (existingUser) {
    throw ApiError.conflict('User with this email already exists in this school');
  }

  // Check if admission number exists
  const existingStudent = await prisma.student.findFirst({
    where: { admissionNumber, user: { schoolId: req.user.schoolId } },
  });

  if (existingStudent) {
    throw ApiError.conflict('Admission number already exists');
  }

  // Get student role
  const studentRole = await prisma.role.findUnique({ where: { name: 'STUDENT' } });
  if (!studentRole) throw ApiError.internal('Student role not configured');

  const passwordHash = await bcrypt.hash(password || 'Student@123', 10);

  // Transaction: Create User -> Create Student -> Create Enrollment
  const student = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        schoolId: req.user.schoolId,
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        status: 'active',
        userRoles: {
          create: { roleId: studentRole.id },
        },
      },
    });

    const newStudent = await tx.student.create({
      data: {
        userId: user.id,
        admissionNumber,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        bloodGroup,
        address,
        emergencyContact,
        admissionDate: new Date(admissionDate),
      },
    });

    await tx.studentClass.create({
      data: {
        studentId: newStudent.id,
        classId: parseInt(classId),
        sectionId: parseInt(sectionId),
        academicYearId: parseInt(academicYearId),
        rollNumber: rollNumber ? parseInt(rollNumber) : null,
      },
    });

    return newStudent;
  });

  ApiResponse.created(res, student, 'Student created and enrolled successfully');
});

/**
 * @desc    Update student profile
 * @route   PUT /api/v1/students/:id
 * @access  Private/Admin or Owner
 */
const updateStudent = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id);
  const {
    firstName, lastName, phone, avatarUrl,
    dateOfBirth, gender, bloodGroup, address, emergencyContact, status
  } = req.body;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });

  if (!student || student.user.schoolId !== req.user.schoolId) {
    throw ApiError.notFound('Student not found');
  }

  // Logic for Admin vs Owner check if needed (already handled by middleware but good to be safe)
  
  await prisma.$transaction([
    prisma.user.update({
      where: { id: student.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(status && req.user.roles.includes('ADMIN') && { status }),
      },
    }),
    prisma.student.update({
      where: { id: studentId },
      data: {
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(bloodGroup !== undefined && { bloodGroup }),
        ...(address !== undefined && { address }),
        ...(emergencyContact !== undefined && { emergencyContact }),
      },
    }),
  ]);

  ApiResponse.success(res, null, 'Student profile updated successfully');
});

/**
 * @desc    Enroll student in a class/section (for a new year or transition)
 * @route   POST /api/v1/students/:id/enroll
 * @access  Private/Admin
 */
const enrollStudent = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id);
  const { classId, sectionId, academicYearId, rollNumber } = req.body;

  // Check if already enrolled in this year
  const existingEnrollment = await prisma.studentClass.findUnique({
    where: {
      studentId_academicYearId: {
        studentId,
        academicYearId: parseInt(academicYearId),
      },
    },
  });

  if (existingEnrollment) {
    throw ApiError.conflict('Student is already enrolled in this academic year');
  }

  const enrollment = await prisma.studentClass.create({
    data: {
      studentId,
      classId: parseInt(classId),
      sectionId: parseInt(sectionId),
      academicYearId: parseInt(academicYearId),
      rollNumber: rollNumber ? parseInt(rollNumber) : null,
    },
  });

  ApiResponse.created(res, enrollment, 'Student enrolled successfully');
});

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  enrollStudent,
};
