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

  // Security: Teachers can only see students in their assigned classes
  if (req.user.roles.includes('TEACHER') && !req.user.roles.includes('ADMIN') && !req.user.roles.includes('SUPER_ADMIN')) {
    const assignments = await prisma.teacherSubject.findMany({
      where: { userId: req.user.id },
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
    // Include program and subjects for editing (flattened)
    // Note: Student might have multiple subjects, so we map them
    program: enrollment?.studentProgram?.program,
    subjects: enrollment?.studentSubjects?.map(ss => ss.classSubject),
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
    classId, sectionId, academicYearId, rollNumber, programId, subjectIds
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

    const enrollment = await tx.studentClass.create({
      data: {
        studentId: newStudent.id,
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

    if (programId) {
      await tx.studentProgram.create({
        data: {
          studentClassId: enrollment.id,
          programId: parseInt(programId),
        }
      });
    }

    if (subjectIds && Array.isArray(subjectIds) && subjectIds.length > 0) {
      await tx.studentSubject.createMany({
        data: subjectIds.map(sid => ({
          studentClassId: enrollment.id,
          classSubjectId: parseInt(sid)
        }))
      });
    }

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
    dateOfBirth, gender, bloodGroup, address, emergencyContact, status,
    // Enrollment updates (ADMIN only)
    programId, subjectIds
  } = req.body;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
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

  // RBAC: Only ADMIN can update program/subjects
  const isAdmin = req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN');
  if ((programId !== undefined || subjectIds !== undefined) && !isAdmin) {
     throw ApiError.forbidden('Only Admins can update student program and subjects');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update User Profile
    await tx.user.update({
      where: { id: student.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(status && isAdmin && { status }), // Only Admin can change status
      },
    });

    // 2. Update Student Profile
    await tx.student.update({
      where: { id: studentId },
      data: {
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(bloodGroup !== undefined && { bloodGroup }),
        ...(address !== undefined && { address }),
        ...(emergencyContact !== undefined && { emergencyContact }),
      },
    });

    // 3. Update Enrollment (Program/Subjects) - ADMIN ONLY
    if (isAdmin && (programId !== undefined || subjectIds !== undefined)) {
      const currentEnrollment = student.studentClasses[0];
      if (currentEnrollment) {
        
        // Update Program
        if (programId !== undefined) {
           // Remove existing program (if any)
           await tx.studentProgram.deleteMany({
             where: { studentClassId: currentEnrollment.id }
           });
           
           if (programId) {
             await tx.studentProgram.create({
               data: {
                 studentClassId: currentEnrollment.id,
                 programId: parseInt(programId)
               }
             });
           }
        }

        // Update Subjects
        if (subjectIds !== undefined && Array.isArray(subjectIds)) {
           // Remove existing subjects
           await tx.studentSubject.deleteMany({
             where: { studentClassId: currentEnrollment.id }
           });

           // Add new subjects
           if (subjectIds.length > 0) {
             await tx.studentSubject.createMany({
               data: subjectIds.map(sid => ({
                 studentClassId: currentEnrollment.id,
                 classSubjectId: parseInt(sid),
                 status: 'ACTIVE'
               }))
             });
           }
        }
      }
    }
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
  const { classId, sectionId, academicYearId, rollNumber, programId, subjectIds } = req.body;

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

  const enrollment = await prisma.$transaction(async (tx) => {
    const newEnrollment = await tx.studentClass.create({
      data: {
        studentId,
        classId: parseInt(classId),
        sectionId: parseInt(sectionId),
        academicYearId: parseInt(academicYearId),
        rollNumber: rollNumber ? parseInt(rollNumber) : null,
      },
    });

    if (programId) {
      await tx.studentProgram.create({
        data: {
          studentClassId: newEnrollment.id,
          programId: parseInt(programId),
        }
      });
    }

    if (subjectIds && Array.isArray(subjectIds) && subjectIds.length > 0) {
      await tx.studentSubject.createMany({
        data: subjectIds.map(sid => ({
          studentClassId: newEnrollment.id,
          classSubjectId: parseInt(sid)
        }))
      });
    }

    return newEnrollment;
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
