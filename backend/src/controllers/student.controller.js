const prisma = require('../config/database');
const { dialect } = require('../database');
const { ApiError, ApiResponse, asyncHandler, parsePagination, parseSort, buildSearchQuery } = require('../utils');
const { normalizeMiddleName } = require('../utils/names');
const { normalizeEmail, resolveUsername, assertEmailFree, initialPassword, logPasswordSet, createWithGeneratedNumber } = require('../services/account.service');
const credentials = require('../services/credentials.service');

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
const ADMIN_ONLY_FIELDS = ['username', 'email', 'firstName', 'middleName', 'lastName', 'dateOfBirth', 'gender', 'bloodGroup', 'status'];

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
    const searchQuery = buildSearchQuery(search, ['firstName', 'middleName', 'lastName', 'username', 'email'], dialect.text.search);
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
      username: user.username ?? null,
      email: user.email,
      firstName: user.firstName,
      middleName: user.middleName ?? null,
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
        middleName: user.middleName ?? null,
        lastName: user.lastName,
        username: user.username ?? null,
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
          username: true,
          email: true,
          firstName: true,
          middleName: true,
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
                  middleName: true,
                  lastName: true,
                  phone: true,
                  username: true,
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
    middleName: student.user.middleName ?? null,
    lastName: student.user.lastName,
    username: student.user.username ?? null,
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
    password, firstName, middleName, lastName, phone,
    admissionNumber, dateOfBirth, gender, bloodGroup, address, emergencyContact, admissionDate,
    classId, sectionId, academicYearId, rollNumber
  } = req.body;

  // Email is optional; the username defaults to the admission number.
  const email = normalizeEmail(req.body.email);
  await assertEmailFree(prisma, req.user.schoolId, email);

  // A typed admission number must be free. An empty one is generated below.
  const typedNumber = typeof admissionNumber === 'string' ? admissionNumber.trim() : '';
  if (typedNumber) {
    const existingStudent = await prisma.student.findFirst({
      where: { admissionNumber: dialect.text.equals(typedNumber), user: { schoolId: req.user.schoolId } },
      select: { id: true },
    });
    if (existingStudent) throw ApiError.conflict('Admission number already exists');
  }

  // Class, section and academic year must all belong to the caller's school
  await assertEnrollmentTargetsInSchool(req.user.schoolId, { classId, sectionId, academicYearId });

  // Get student role
  const studentRole = await prisma.role.findUnique({ where: { name: 'STUDENT' } });
  if (!studentRole) throw ApiError.internal('Student role not configured');

  // Typed by the admin or generated; the student chooses their own at first sign-in.
  const { passwordHash, mustChangePassword, temporaryPassword } = await initialPassword(password);

  // Transaction: Create User -> Create Student -> Create Enrollment
  const create = (admissionNumber, username) => prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
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
        middleName: user.middleName ?? null,
        lastName: user.lastName,
        username: user.username ?? null,
        email: user.email,
        avatarUrl: user.avatarUrl
      },
      class: enrollment.class,
      section: enrollment.section,
      rollNumber: enrollment.rollNumber
    };
  });

  let student;
  if (typedNumber) {
    const username = await resolveUsername(prisma, req.user.schoolId, { requested: req.body.username, suggestion: { kind: "student", admissionNumber: typedNumber } });
    student = await create(typedNumber, username);
  } else {
    // Generated: the school's initials and a running number (SVI-0001), also the sign-in name.
    const typedUsername = req.body.username
      ? await resolveUsername(prisma, req.user.schoolId, { requested: req.body.username })
      : null;
    student = await createWithGeneratedNumber(prisma, req.user.schoolId, create, { typedUsername });
  }

  // A generated password is shown to the admin once, here; it is not stored anywhere.
  logPasswordSet(req.user, { id: student.userId ?? student.user?.id, username: student.user.username }, "account created");
  ApiResponse.created(res, { ...student, temporaryPassword }, 'Student created and enrolled successfully');
});

/**
 * @desc    Update student profile and enrollment (Admin only for enrollment)
 * @route   PUT /api/v1/students/:id
 * @access  Private/Admin or Owner
 */
const updateStudent = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id);
  const {
    firstName, middleName, lastName, phone, avatarUrl,
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

  // Sign-in details (admin only; checked above): a new username must be free,
  // an emptied email is stored as null.
  const signIn = {};
  if (isAdmin && req.body.username !== undefined && req.body.username !== "") {
    signIn.username = await resolveUsername(prisma, req.user.schoolId, { requested: req.body.username, exceptUserId: student.userId });
  }
  if (isAdmin && req.body.email !== undefined) {
    signIn.email = normalizeEmail(req.body.email);
    await assertEmailFree(prisma, req.user.schoolId, signIn.email, student.userId);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update User Profile
    await tx.user.update({
      where: { id: student.userId },
      data: {
        ...signIn,
        ...(firstName && isAdmin && { firstName }),
        ...(middleName !== undefined && isAdmin && { middleName: normalizeMiddleName(middleName) }),
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

/**
 * @desc    Temporary passwords for a class's students (and parents), for login slips
 * @route   POST /api/v1/students/credentials/bulk
 * @access  Private/Admin
 * Body: classId, sectionId?, academicYearId?, includeParents?, onlyNeverSignedIn? (default true), dryRun?
 */
const bulkCredentials = asyncHandler(async (req, res) => {
  const { classId, sectionId, academicYearId, includeParents, onlyNeverSignedIn, dryRun } = req.body;
  const result = await credentials.classLogins({
    actor: req.user,
    schoolId: req.user.schoolId,
    classId,
    sectionId,
    academicYearId,
    includeParents: includeParents === true,
    onlyNeverSignedIn: onlyNeverSignedIn !== false,
    dryRun: dryRun === true,
  });
  const n = result.students + result.parents;
  ApiResponse.success(res, result, dryRun ? `${n} account(s) would get a new password` : `${n} temporary password(s) created`);
});

module.exports.bulkCredentials = bulkCredentials;
