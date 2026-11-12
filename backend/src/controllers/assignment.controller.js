const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

/**
 * Build the role-based visibility filter for assignments (default deny).
 *  - ADMIN / SUPER_ADMIN: every assignment in the school
 *  - TEACHER: assignments on their own TeacherSubject rows
 *  - STUDENT: published assignments for their current-year class + section
 *  - PARENT: published assignments for their linked children's current-year
 *    class + section
 *  - anyone else: 403
 * Returns a Prisma `where` fragment (possibly empty) to AND with the query.
 */
const buildAssignmentScope = async (req) => {
  const roles = req.user.roles || [];
  const schoolId = req.user.schoolId;

  if (roles.some((r) => ADMIN_ROLES.includes(r))) return {};

  if (roles.includes("TEACHER")) {
    return { teacherSubject: { userId: req.user.id } };
  }

  let studentIds = null;
  if (roles.includes("STUDENT")) {
    const student = await prisma.student.findFirst({
      where: { userId: req.user.id, schoolId },
      select: { id: true },
    });
    if (!student) throw ApiError.forbidden("Student profile not found");
    studentIds = [student.id];
  } else if (roles.includes("PARENT")) {
    const parent = await prisma.parent.findFirst({
      where: { userId: req.user.id, schoolId },
      include: { studentParents: { select: { studentId: true } } },
    });
    if (!parent) throw ApiError.forbidden("Parent profile not found");
    studentIds = parent.studentParents.map((sp) => sp.studentId);
    // ?studentId= narrows a parent's view to one linked child and returns that
    // child's submissions too (the parent portal's per-child page).
    if (req.query.studentId !== undefined) {
      const wanted = Number.parseInt(req.query.studentId, 10);
      if (!Number.isInteger(wanted) || !studentIds.includes(wanted)) {
        throw ApiError.forbidden("You can only view your own children's assignments");
      }
      studentIds = [wanted];
      req.scopedStudentId = wanted;
    }
  } else {
    throw ApiError.forbidden("You are not allowed to view assignments");
  }

  const enrollments = studentIds.length
    ? await prisma.studentClass.findMany({
        where: {
          studentId: { in: studentIds },
          schoolId,
          academicYear: { isCurrent: true, schoolId },
        },
        select: { classId: true, sectionId: true, academicYearId: true },
      })
    : [];

  if (enrollments.length === 0) {
    // No current enrollment -> nothing to see (matches no rows)
    return { id: -1 };
  }

  return {
    isPublished: true,
    OR: enrollments.map((e) => ({
      teacherSubject: {
        sectionId: e.sectionId,
        academicYearId: e.academicYearId,
        classSubject: { classId: e.classId },
      },
    })),
  };
};

/**
 * @desc    Get all assignments for a teacher or student
 * @route   GET /api/v1/assignments
 * @access  Private (Admin all, Teacher own, Student/Parent published for class)
 */
const getAssignments = asyncHandler(async (req, res) => {
  const { teacherSubjectId, classId, sectionId, academicYearId } = req.query;

  const conditions = [
    {
      teacherSubject: {
        // School-level isolation: ensure assignment belongs to user's school
        classSubject: { class: { schoolId: req.user.schoolId } },
      },
    },
    await buildAssignmentScope(req),
  ];

  // Optional filters (only narrow further; never widen the role scope)
  if (teacherSubjectId) {
    conditions.push({ teacherSubjectId: parseInt(teacherSubjectId) });
  }
  if (sectionId) {
    conditions.push({ teacherSubject: { sectionId: parseInt(sectionId) } });
  }
  if (classId) {
    conditions.push({
      teacherSubject: { classSubject: { classId: parseInt(classId) } },
    });
  }
  if (academicYearId) {
    conditions.push({
      teacherSubject: {
        classSubject: { academicYearId: parseInt(academicYearId) },
      },
    });
  }

  const where = { AND: conditions };

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      teacherSubject: {
        include: {
          classSubject: { include: { class: true, subject: true } },
          section: true,
          user: { select: { firstName: true, middleName: true, lastName: true } },
        },
      },
      assignmentFiles: true,
      _count: { select: { submissions: true } },
      // A student's own submission, or the chosen child's for a parent (?studentId=)
      submissions: req.user.roles.includes("STUDENT") || req.scopedStudentId
        ? {
            where: req.user.roles.includes("STUDENT") ? { student: { userId: req.user.id } } : { studentId: req.scopedStudentId },
            select: {
              id: true,
              status: true,
              submittedAt: true,
              marksObtained: true,
              feedback: true,
            },
          }
        : undefined,
    },
    orderBy: { createdAt: "desc" },
  });

  ApiResponse.success(res, assignments);
});

/**
 * @desc    Get single assignment details
 * @route   GET /api/v1/assignments/:id
 * @access  Private (same visibility rules as the list)
 */
const getAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const assignment = await prisma.assignment.findFirst({
    where: {
      AND: [
        {
          id: parseInt(id),
          teacherSubject: {
            classSubject: {
              class: {
                schoolId: req.user.schoolId, // School-level isolation
              },
            },
          },
        },
        await buildAssignmentScope(req),
      ],
    },
    include: {
      teacherSubject: {
        include: {
          classSubject: { include: { class: true, subject: true } },
          section: true,
          user: { select: { firstName: true, middleName: true, lastName: true } },
        },
      },
      assignmentFiles: true,
      submissions: req.user.roles.includes("STUDENT")
        ? {
            where: { student: { userId: req.user.id } },
            include: { submissionFiles: true },
          }
        : false,
    },
  });

  if (!assignment)
    throw ApiError.notFound(
      "Assignment not found or does not belong to your school"
    );

  ApiResponse.success(res, assignment);
});

/**
 * @desc    Create assignment with multiple files
 * @route   POST /api/v1/assignments
 * @access  Private/Teacher
 */
const createAssignment = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    dueDate,
    teacherSubjectId,
    totalMarks,
    isPublished,
  } = req.body;
  const files = req.files; // Handled by multer

  // Verify teacher subject ownership and school-level isolation
  const ts = await prisma.teacherSubject.findFirst({
    where: {
      id: parseInt(teacherSubjectId),
      userId: req.user.id,
      classSubject: {
        class: {
          schoolId: req.user.schoolId, // School-level isolation
        },
      },
    },
    include: {
      classSubject: {
        include: {
          class: true,
          academicYear: true, // Include academic year for validation
        },
      },
      academicYear: true,
    },
  });

  if (!ts && !req.user.roles.some((r) => ADMIN_ROLES.includes(r))) {
    throw ApiError.forbidden(
      "You are not authorized to create assignments for this subject or it does not belong to your school"
    );
  }

  // Fix Issue #8: Validate that the academic year is current
  if (ts && !ts.academicYear.isCurrent) {
    throw ApiError.badRequest(
      "Cannot create assignments for past academic years. Please select a current academic year."
    );
  }

  // Additional check for admin: ensure teacherSubject belongs to school
  if (req.user.roles.some((r) => ADMIN_ROLES.includes(r)) && !ts) {
    const adminCheck = await prisma.teacherSubject.findFirst({
      where: {
        id: parseInt(teacherSubjectId),
        classSubject: {
          class: {
            schoolId: req.user.schoolId,
          },
        },
      },
      include: {
        academicYear: true,
      },
    });
    if (!adminCheck) {
      throw ApiError.forbidden(
        "Teacher subject does not belong to your school"
      );
    }
  }

  const assignment = await prisma.assignment.create({
    data: {
      teacherSubjectId: parseInt(teacherSubjectId),
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      totalMarks: totalMarks ? parseInt(totalMarks) : 100,
      isPublished: isPublished === "true" || isPublished === true,
      assignmentFiles: {
        create: files
          ? files.map((file) => {
              // Normalize path for local storage (use forward slashes)
              let fileUrl = file.path;
              if (file.path && !file.path.startsWith("http")) {
                fileUrl = `uploads/${file.filename}`;
              } else if (file.secure_url) {
                fileUrl = file.secure_url;
              }
              return {
                fileName: file.originalname,
                fileUrl: fileUrl,
                fileType: file.mimetype,
                fileSize: file.size,
              };
            })
          : [],
      },
    },
    include: { assignmentFiles: true },
  });

  ApiResponse.created(res, assignment, "Assignment created successfully");
});

/**
 * @desc    Update assignment
 * @route   PUT /api/v1/assignments/:id
 * @access  Private/Teacher
 */
const updateAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate, totalMarks, isPublished } = req.body;

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: parseInt(id),
      teacherSubject: {
        classSubject: {
          class: {
            schoolId: req.user.schoolId, // School-level isolation
          },
        },
      },
    },
    include: {
      teacherSubject: {
        include: {
          classSubject: {
            include: {
              class: true,
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    throw ApiError.notFound(
      "Assignment not found or does not belong to your school"
    );
  }

  if (
    assignment.teacherSubject.userId !== req.user.id &&
    !req.user.roles.some((r) => ADMIN_ROLES.includes(r))
  ) {
    throw ApiError.forbidden("Unauthorized");
  }

  const updated = await prisma.assignment.update({
    where: { id: parseInt(id) },
    data: {
      title: title || assignment.title,
      description: description || assignment.description,
      dueDate: dueDate ? new Date(dueDate) : assignment.dueDate,
      totalMarks: totalMarks ? parseInt(totalMarks) : assignment.totalMarks,
      isPublished:
        isPublished !== undefined
          ? isPublished === "true" || isPublished === true
          : assignment.isPublished,
      assignmentFiles: {
        create: req.files
          ? req.files.map((file) => {
              // Normalize path for local storage (use forward slashes)
              let fileUrl = file.path;
              if (file.path && !file.path.startsWith("http")) {
                fileUrl = `uploads/${file.filename}`;
              } else if (file.secure_url) {
                fileUrl = file.secure_url;
              }
              return {
                fileName: file.originalname,
                fileUrl: fileUrl,
                fileType: file.mimetype,
                fileSize: file.size,
              };
            })
          : [],
      },
    },
    include: { assignmentFiles: true },
  });

  ApiResponse.success(res, updated, "Assignment updated successfully");
});

/**
 * @desc    Delete assignment
 * @route   DELETE /api/v1/assignments/:id
 * @access  Private/Teacher
 */
const deleteAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: parseInt(id),
      teacherSubject: {
        classSubject: {
          class: {
            schoolId: req.user.schoolId, // School-level isolation
          },
        },
      },
    },
    include: {
      teacherSubject: {
        include: {
          classSubject: {
            include: {
              class: true,
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    throw ApiError.notFound(
      "Assignment not found or does not belong to your school"
    );
  }

  if (
    assignment.teacherSubject.userId !== req.user.id &&
    !req.user.roles.some((r) => ADMIN_ROLES.includes(r))
  ) {
    throw ApiError.forbidden("Unauthorized");
  }

  // Check for submissions
  const subCount = await prisma.submission.count({
    where: { assignmentId: parseInt(id) },
  });
  if (subCount > 0) {
    throw ApiError.badRequest(
      "Cannot delete assignment - students have already submitted work"
    );
  }

  await prisma.assignment.delete({ where: { id: parseInt(id) } });

  ApiResponse.success(res, null, "Assignment deleted successfully");
});

module.exports = {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};
