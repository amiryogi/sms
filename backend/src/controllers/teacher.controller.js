const bcrypt = require("bcryptjs");
const prisma = require("../config/database");
const {
  ApiError,
  ApiResponse,
  asyncHandler,
  parsePagination,
  parseSort,
  buildSearchQuery,
} = require("../utils");

/**
 * @desc    Get all teachers
 * @route   GET /api/v1/teachers
 * @access  Private/Admin
 */
const getTeachers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, status, role } = req.query;

  // Build role filter - include both TEACHER and EXAM_OFFICER by default
  const staffRoles = role ? [role] : ["TEACHER", "EXAM_OFFICER"];

  const where = {
    schoolId: req.user.schoolId,
    userRoles: {
      some: {
        role: { name: { in: staffRoles } },
      },
    },
  };

  if (status) where.status = status;

  if (search) {
    const searchQuery = buildSearchQuery(search, [
      "firstName",
      "lastName",
      "email",
    ]);
    if (searchQuery) where.OR = searchQuery.OR;
  }

  const [teachers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: parseSort(req.query.sort, [
        "firstName",
        "lastName",
        "createdAt",
      ]),
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
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
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

  // Format response to include roles array
  const formattedTeachers = teachers.map((t) => ({
    ...t,
    roles: t.userRoles.map((ur) => ur.role.name),
    userRoles: undefined,
  }));

  ApiResponse.paginated(res, formattedTeachers, { page, limit, total });
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
        some: { role: { name: "TEACHER" } },
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
    throw ApiError.notFound("Teacher not found");
  }

  ApiResponse.success(res, teacher);
});

// /**
//  * @desc    Create teacher
//  * @route   POST /api/v1/teachers
//  * @access  Private/Admin
//  */
// const createTeacher = asyncHandler(async (req, res) => {
//   // DEPRECATED: Use POST /api/v1/users with role="TEACHER"
//   throw ApiError.gone('Use POST /api/v1/users to create teachers');
// });

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
      userRoles: { some: { role: { name: "TEACHER" } } },
    },
  });

  if (!teacher) {
    throw ApiError.notFound("Teacher not found");
  }

  const updatedTeacher = await prisma.user.update({
    where: { id: teacherId },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(status && req.user.roles.includes("ADMIN") && { status }),
    },
  });

  ApiResponse.success(res, null, "Teacher updated successfully");
});

/**
 * @desc    Get students for teacher's assigned classes/sections
 * @route   GET /api/v1/teachers/my-students
 * @access  Private/Teacher
 */
const getMyStudents = asyncHandler(async (req, res) => {
  const teacherId = req.user.id;
  const schoolId = req.user.schoolId;
  const { academicYearId } = req.query;

  // Determine academic year (default to current)
  let yearFilter = {};
  if (academicYearId) {
    yearFilter = { academicYearId: parseInt(academicYearId) };
  } else {
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    if (!currentYear) {
      return ApiResponse.success(res, [], "No current academic year found.");
    }
    yearFilter = { academicYearId: currentYear.id };
  }

  // Step 1: Get teacher's assignments (class/section combinations)
  const teacherAssignments = await prisma.teacherSubject.findMany({
    where: {
      userId: teacherId,
      ...yearFilter,
    },
    include: {
      classSubject: {
        include: {
          class: true,
          subject: true,
        },
      },
      section: true,
    },
  });

  if (teacherAssignments.length === 0) {
    return ApiResponse.success(
      res,
      [],
      "No class assignments found for this academic year."
    );
  }

  // Step 2: Extract unique class/section combinations the teacher is assigned to
  const classSectionCombos = [];
  const seenCombos = new Set();

  for (const assignment of teacherAssignments) {
    const key = `${assignment.classSubject.classId}-${assignment.sectionId}`;
    if (!seenCombos.has(key)) {
      seenCombos.add(key);
      classSectionCombos.push({
        classId: assignment.classSubject.classId,
        className: assignment.classSubject.class.name,
        classDisplayOrder: assignment.classSubject.class.displayOrder,
        sectionId: assignment.sectionId,
        sectionName: assignment.section.name,
      });
    }
  }

  // Step 3: Fetch students enrolled in those class/section combinations
  const studentClasses = await prisma.studentClass.findMany({
    where: {
      OR: classSectionCombos.map((combo) => ({
        classId: combo.classId,
        sectionId: combo.sectionId,
      })),
      ...yearFilter,
      status: "active",
      schoolId: schoolId,
    },
    include: {
      student: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      class: true,
      section: true,
    },
    orderBy: [
      { class: { displayOrder: "asc" } },
      { section: { name: "asc" } },
      { rollNumber: "asc" },
    ],
  });

  // Step 4: Group students by Class → Section
  const classMap = new Map();

  for (const enrollment of studentClasses) {
    const classId = enrollment.classId;
    const sectionId = enrollment.sectionId;

    // Verify this class/section is in teacher's assignments (defense-in-depth)
    const isAuthorized = classSectionCombos.some(
      (combo) => combo.classId === classId && combo.sectionId === sectionId
    );
    if (!isAuthorized) continue;

    // Initialize class entry if not exists
    if (!classMap.has(classId)) {
      classMap.set(classId, {
        classId: classId,
        className: enrollment.class.name,
        displayOrder: enrollment.class.displayOrder,
        sections: new Map(),
      });
    }

    const classEntry = classMap.get(classId);

    // Initialize section entry if not exists
    if (!classEntry.sections.has(sectionId)) {
      classEntry.sections.set(sectionId, {
        sectionId: sectionId,
        sectionName: enrollment.section.name,
        students: [],
      });
    }

    // Add student to section
    classEntry.sections.get(sectionId).students.push({
      studentId: enrollment.student.id,
      rollNumber: enrollment.rollNumber,
      firstName: enrollment.student.user.firstName,
      lastName: enrollment.student.user.lastName,
      fullName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
      email: enrollment.student.user.email,
      admissionNumber: enrollment.student.admissionNumber,
      avatarUrl: enrollment.student.user.avatarUrl,
    });
  }

  // Step 5: Convert Maps to arrays and sort
  const result = Array.from(classMap.values())
    .map((classEntry) => ({
      classId: classEntry.classId,
      className: classEntry.className,
      displayOrder: classEntry.displayOrder,
      sections: Array.from(classEntry.sections.values()).sort((a, b) =>
        a.sectionName.localeCompare(b.sectionName)
      ),
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Calculate summary
  const summary = {
    totalClasses: result.length,
    totalSections: result.reduce((acc, c) => acc + c.sections.length, 0),
    totalStudents: result.reduce(
      (acc, c) =>
        acc + c.sections.reduce((sAcc, s) => sAcc + s.students.length, 0),
      0
    ),
  };

  ApiResponse.success(res, { summary, classes: result });
});

module.exports = {
  getTeachers,
  getTeacher,
  // createTeacher, // Removed
  updateTeacher,
  getMyStudents,
};
