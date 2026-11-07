const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler, parsePagination, parseSort, buildSearchQuery } = require('../utils');

const isAdminUser = (user) => user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN');

/**
 * Verify that the class, section and academic year of an enrollment all belong
 * to the caller's school. Throws 404 for the first one that does not.
 */
const assertEnrollmentTargetsInSchool = async (schoolId, { classId, sectionId, academicYearId }) => {
  const [cls, section, year] = await Promise.all([
    prisma.class.findFirst({ where: { id: parseInt(classId), schoolId }, select: { id: true } }),
    prisma.section.findFirst({ where: { id: parseInt(sectionId), schoolId }, select: { id: true } }),
    prisma.academicYear.findFirst({ where: { id: parseInt(academicYearId), schoolId }, select: { id: true } }),
  ]);
  if (!cls) throw ApiError.notFound('Class not found in your school');
  if (!section) throw ApiError.notFound('Section not found in your school');
  if (!year) throw ApiError.notFound('Academic year not found in your school');
};

// Fields a non-admin (the student, a linked parent, or an assigned teacher) may
// change via PUT /students/:id. Everything else — name, date of birth, gender,
// blood group (printed on report cards) and status — is admin-only.
const SELF_SERVICE_FIELDS = ['phone', 'address', 'avatarUrl', 'emergencyContact'];
const ADMIN_ONLY_FIELDS = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'bloodGroup', 'status'];

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
    enrollmentWhere.academicYear = { isCurrent: true, schoolId: req.user.schoolId };
  }

  if (classId) enrollmentWhere.classId = parseInt(classId);
  if (sectionId) enrollmentWhere.sectionId = parseInt(sectionId);

  // Security: Teachers can only see students in their assigned classes, for the
  // current academic year only (last year's assignment grants nothing now).
  if (req.user.roles.includes('TEACHER') && !isAdminUser(req.user)) {
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId: req.user.schoolId, isCurrent: true },
      select: { id: true },
    });

    if (!currentYear) {
      return ApiResponse.paginated(res, [], { page, limit, total: 0 });
    }

    // Force current-year enrollments regardless of the requested academicYearId
    delete enrollmentWhere.academicYear;
    enrollmentWhere.academicYearId = currentYear.id;

    const assignments = await prisma.teacherSubject.findMany({
      where: { userId: req.user.id, academicYearId: currentYear.id },
      select: {
        classSubject: { select: { classId: true } },
        sectionId: true,
      },
    });

    if (assignments.length === 0) {
      return ApiResponse.paginated(res, [], { page, limit, total: 0 });
    }

    const authorizedScopes = assignments.map(a => ({
      classId: a.classSubject.classId,
      sectionId: a.sectionId,
    }));

    // If limits specified in query, validate them
    if (classId && sectionId) {
      const isAuthorized = authorizedScopes.some(
        scope => scope.classId === parseInt(classId) && scope.sectionId === parseInt(sectionId)
      );
      if (!isAuthorized) {
        // Return empty instead of error to avoid leaking existence
        return ApiResponse.paginated(res, [], { page, limit, total: 0 });
      }
    } else {
      // Apply strict filter to only assigned scopes
      enrollmentWhere.OR = authorizedScopes;
    }
  }

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
      phone: user.phone,
      admissionNumber: user.student.admissionNumber,
      dateOfBirth: user.student.dateOfBirth,
      gender: user.student.gender,
      bloodGroup: user.student.bloodGroup,
      address: user.student.address,
      emergencyContact: user.student.emergencyContact,
      admissionDate: user.student.admissionDate,
      rollNumber: enrollment?.rollNumber,
      class: enrollment?.class.name,
      section: enrollment?.section.name,
      status: user.status,
      avatarUrl: user.avatarUrl,
      // Nested user object for frontend components expecting it (e.g., Attendance, MarksEntry)
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      },
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

  // Flatten current enrollment for consistency
  const enrollment = student.studentClasses[0];
  const formattedStudent = {
    ...student,
    firstName: student.user.firstName,
    lastName: student.user.lastName,
    email: student.user.email,
    phone: student.user.phone || student.phone, // hierarchy: user phone > student phone
    avatarUrl: student.user.avatarUrl,
    class: enrollment?.class,
    section: enrollment?.section,
    rollNumber: enrollment?.rollNumber,
    academicYear: enrollment?.academicYear,
    studentClassId: enrollment?.id
  };

  ApiResponse.success(res, formattedStudent);
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

  // Class, section and academic year must all belong to the caller's school
  await assertEnrollmentTargetsInSchool(req.user.schoolId, { classId, sectionId, academicYearId });

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
        schoolId: req.user.schoolId,
        admissionNumber,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        bloodGroup,
        address,
        emergencyContact,
        admissionDate: new Date(admissionDate),
      },
    });

    const enrollment = await tx.studentClass.create({
      data: {
        studentId: newStudent.id,
        schoolId: req.user.schoolId,
        classId: parseInt(classId),
        sectionId: parseInt(sectionId),
        academicYearId: parseInt(academicYearId),
        rollNumber: rollNumber ? parseInt(rollNumber) : null,
      },
      include: {
        // Include relations to return confirming data
        class: true,
        section: true,
      }
    });

    return {
      ...newStudent,
      avatarUrl: user.avatarUrl, // ensure avatarUrl is returned
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl
      },
      class: enrollment.class,
      section: enrollment.section,
      rollNumber: enrollment.rollNumber
    };
  });

  ApiResponse.created(res, student, 'Student created and enrolled successfully');
});

/**
 * @desc    Update student profile and enrollment (Admin only for enrollment)
 * @route   PUT /api/v1/students/:id
 * @access  Private/Admin or Owner
 */
const updateStudent = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id);
  const {
    firstName, lastName, phone, avatarUrl,
    dateOfBirth, gender, bloodGroup, address, emergencyContact, status
  } = req.body;

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: req.user.schoolId } },
    include: { 
      user: true,
      studentClasses: {
        orderBy: { academicYear: { startDate: 'desc' } },
        take: 1
      }
    },
  });

  if (!student || student.user.schoolId !== req.user.schoolId) {
    throw ApiError.notFound('Student not found');
  }

  const isAdmin = isAdminUser(req.user);

  // Non-admins may only edit the self-service contact fields
  if (!isAdmin) {
    const forbiddenFields = ADMIN_ONLY_FIELDS.filter((field) => req.body[field] !== undefined);
    if (forbiddenFields.length > 0) {
      throw ApiError.forbidden(
        `Only an administrator can change: ${forbiddenFields.join(', ')}. You may update ${SELF_SERVICE_FIELDS.join(', ')}.`
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update User Profile
    await tx.user.update({
      where: { id: student.userId },
      data: {
        ...(firstName && isAdmin && { firstName }),
        ...(lastName && isAdmin && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(status && isAdmin && { status }), // Only Admin can change status
      },
    });

    // 2. Update Student Profile
    await tx.student.update({
      where: { id: studentId },
      data: {
        ...(dateOfBirth && isAdmin && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && isAdmin && { gender }),
        ...(bloodGroup !== undefined && isAdmin && { bloodGroup }),
        ...(address !== undefined && { address }),
        ...(emergencyContact !== undefined && { emergencyContact }),
      },
    });
  });

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

  // Student, class, section and academic year must all belong to the caller's school
  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: req.user.schoolId } },
    select: { id: true },
  });
  if (!student) {
    throw ApiError.notFound('Student not found');
  }
  await assertEnrollmentTargetsInSchool(req.user.schoolId, { classId, sectionId, academicYearId });

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
    // Idempotency check: If trying to enroll in same class/section/year, return success
    if (
      existingEnrollment.classId === parseInt(classId) &&
      existingEnrollment.sectionId === parseInt(sectionId)
    ) {
       return ApiResponse.success(res, existingEnrollment, 'Student is already enrolled in this class and section');
    }
    
    // If trying to enroll in DIFFERENT section/class for SAME year, it's a conflict (should use transfer/update)
    throw ApiError.conflict('Student is already enrolled in this academic year in a different class/section');
  }

  const enrollment = await prisma.studentClass.create({
    data: {
      studentId,
      schoolId: req.user.schoolId,
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
