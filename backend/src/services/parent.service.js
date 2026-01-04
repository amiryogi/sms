const bcrypt = require("bcryptjs");
const prisma = require("../config/database");
const { ApiError, parsePagination, buildSearchQuery } = require("../utils");

const RELATIONSHIPS = ["father", "mother", "guardian"];

const formatParent = (parent) => {
  const linkedStudents = (parent.studentParents || []).map((sp) => {
    const enrollment = sp.student.studentClasses?.[0];
    return {
      studentParentId: sp.id,
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
    userId: parent.user.id,
    email: parent.user.email,
    firstName: parent.user.firstName,
    lastName: parent.user.lastName,
    phone: parent.user.phone,
    status: parent.user.status,
    occupation: parent.occupation,
    workplace: parent.workplace,
    address: parent.address,
    createdAt: parent.createdAt,
    linkedStudents,
  };
};

const fetchParentWithRelations = async (parentId, schoolId) => {
  const parent = await prisma.parent.findFirst({
    where: { id: parentId, schoolId },
    include: {
      user: true,
      studentParents: {
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
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
  });

  if (!parent) {
    throw ApiError.notFound("Parent not found");
  }

  return formatParent(parent);
};

const ensureParentRole = async (tx) => {
  const parentRole = await tx.role.findUnique({ where: { name: "PARENT" } });
  if (!parentRole)
    throw ApiError.internal("Parent role is missing in the system");
  return parentRole.id;
};

const validateStudents = async (tx, schoolId, studentItems) => {
  const studentIds = [
    ...new Set(studentItems.map((s) => parseInt(s.studentId, 10))),
  ];
  const students = await tx.student.findMany({
    where: { id: { in: studentIds }, user: { schoolId } },
    select: { id: true },
  });

  if (students.length !== studentIds.length) {
    throw ApiError.badRequest(
      "One or more students are invalid or not in this school"
    );
  }

  return studentIds;
};

const createParent = async (schoolId, payload) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phone,
    occupation,
    workplace,
    address,
    students = [],
  } = payload;

  if (!students || students.length === 0) {
    throw ApiError.badRequest("Parent must be linked to at least one student");
  }

  // Unique email per school
  const existing = await prisma.user.findFirst({ where: { email, schoolId } });
  if (existing) {
    throw ApiError.conflict(
      "A user with this email already exists in this school"
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const studentIds = await validateStudents(tx, schoolId, students);
    const roleId = await ensureParentRole(tx);

    const user = await tx.user.create({
      data: {
        schoolId,
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        phone,
        status: "active",
      },
    });

    await tx.userRole.create({ data: { userId: user.id, roleId } });

    const parent = await tx.parent.create({
      data: {
        userId: user.id,
        schoolId,
        occupation,
        workplace,
        address,
      },
    });

    // Normalize student links and ensure a primary
    const links = students.map((s, idx) => ({
      studentId: parseInt(s.studentId, 10),
      relationship: s.relationship,
      isPrimary: Boolean(s.isPrimary),
      order: idx,
    }));

    const hasPrimary = links.some((l) => l.isPrimary);
    if (!hasPrimary) {
      links[0].isPrimary = true;
    }

    await tx.studentParent.createMany({
      data: links.map((link) => ({
        studentId: link.studentId,
        parentId: parent.id,
        schoolId,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
      })),
    });

    return parent.id;
  });

  return fetchParentWithRelations(result, schoolId);
};

const listParents = async (schoolId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const { search, status } = query;

  const userWhere = {
    schoolId,
    parent: { isNot: null },
  };

  if (status) {
    userWhere.status = status;
  }

  if (search) {
    const searchQuery = buildSearchQuery(search, [
      "firstName",
      "lastName",
      "email",
      "phone",
    ]);
    if (searchQuery) userWhere.OR = searchQuery.OR;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        parent: {
          include: {
            studentParents: {
              include: {
                student: {
                  include: {
                    user: {
                      select: {
                        id: true,
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
    }),
    prisma.user.count({ where: userWhere }),
  ]);

  const parents = users
    .filter((u) => u.parent)
    .map((u) =>
      formatParent({
        ...u.parent,
        user: u,
        studentParents: u.parent.studentParents,
      })
    );

  return {
    parents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const updateParent = async (schoolId, parentId, payload) => {
  const parent = await prisma.parent.findFirst({
    where: { id: parentId, schoolId },
    include: { user: true },
  });

  if (!parent) throw ApiError.notFound("Parent not found");

  const updates = {};
  if (
    payload.firstName ||
    payload.lastName ||
    payload.phone ||
    payload.status ||
    payload.email
  ) {
    updates.user = {};
    if (payload.firstName) updates.user.firstName = payload.firstName;
    if (payload.lastName) updates.user.lastName = payload.lastName;
    if (payload.phone !== undefined) updates.user.phone = payload.phone;
    if (payload.status) updates.user.status = payload.status;
    if (payload.email && payload.email !== parent.user.email) {
      const exists = await prisma.user.findFirst({
        where: { email: payload.email, schoolId, NOT: { id: parent.userId } },
      });
      if (exists)
        throw ApiError.conflict("Email already exists in this school");
      updates.user.email = payload.email;
    }
  }

  let passwordHash;
  if (payload.newPassword) {
    passwordHash = await bcrypt.hash(payload.newPassword, 10);
    updates.user = updates.user || {};
    updates.user.passwordHash = passwordHash;
  }

  const parentUpdates = {};
  if (payload.occupation !== undefined)
    parentUpdates.occupation = payload.occupation;
  if (payload.workplace !== undefined)
    parentUpdates.workplace = payload.workplace;
  if (payload.address !== undefined) parentUpdates.address = payload.address;

  await prisma.$transaction(async (tx) => {
    if (updates.user) {
      await tx.user.update({
        where: { id: parent.userId },
        data: updates.user,
      });
    }
    if (Object.keys(parentUpdates).length > 0) {
      await tx.parent.update({ where: { id: parent.id }, data: parentUpdates });
    }
  });

  return fetchParentWithRelations(parentId, schoolId);
};

const linkStudent = async (schoolId, parentId, payload) => {
  const { studentId, relationship, isPrimary = false } = payload;

  const parent = await prisma.parent.findFirst({
    where: { id: parentId, schoolId },
  });
  if (!parent) throw ApiError.notFound("Parent not found");

  const student = await prisma.student.findFirst({
    where: { id: parseInt(studentId, 10), user: { schoolId } },
    include: { studentParents: { where: { parentId } } },
  });
  if (!student) throw ApiError.badRequest("Student not found in this school");

  if (student.studentParents.length > 0) {
    throw ApiError.conflict("Parent is already linked to this student");
  }

  await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.studentParent.updateMany({
        where: { parentId, schoolId },
        data: { isPrimary: false },
      });
    }

    await tx.studentParent.create({
      data: {
        parentId,
        studentId: parseInt(studentId, 10),
        schoolId,
        relationship,
        isPrimary,
      },
    });
  });

  return fetchParentWithRelations(parentId, schoolId);
};

const unlinkStudent = async (schoolId, parentId, studentId) => {
  const linkId = parseInt(studentId, 10);

  await prisma.$transaction(async (tx) => {
    const parent = await tx.parent.findFirst({
      where: { id: parentId, schoolId },
      include: { studentParents: true },
    });
    if (!parent) throw ApiError.notFound("Parent not found");

    const link = parent.studentParents.find((sp) => sp.studentId === linkId);
    if (!link) throw ApiError.notFound("Link not found");

    if (parent.studentParents.length <= 1) {
      throw ApiError.badRequest(
        "Parent must be linked to at least one student"
      );
    }

    await tx.studentParent.delete({ where: { id: link.id } });
  });

  return fetchParentWithRelations(parentId, schoolId);
};

/**
 * Get children for a logged-in parent
 * SECURITY: Uses parent.userId === userId to enforce ownership
 * @param {number} userId - The authenticated user's ID (from req.user.id)
 * @param {number} schoolId - School ID for additional scoping
 * @returns {Array} List of children with enrollment details
 */
const getMyChildren = async (userId, schoolId) => {
  // CRITICAL: Find parent by userId, NOT by parentId
  // This ensures the logged-in user can only access their own parent record
  const parent = await prisma.parent.findFirst({
    where: {
      userId, // parent.userId === req.user.id
      schoolId, // Additional school scoping
    },
    include: {
      studentParents: {
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  avatarUrl: true,
                  status: true,
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
  });

  if (!parent) {
    throw ApiError.notFound("Parent profile not found for this user");
  }

  // Format children data with all required fields
  const children = parent.studentParents.map((sp) => {
    const student = sp.student;
    const enrollment = student.studentClasses?.[0];

    return {
      // Student IDs
      id: student.id,
      studentId: student.id,

      // User info (flattened for frontend convenience)
      user: {
        id: student.user.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        email: student.user.email,
        phone: student.user.phone,
        avatarUrl: student.user.avatarUrl,
        status: student.user.status,
      },

      // Convenience fields (duplicated for easier access)
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      fullName: `${student.user.firstName} ${student.user.lastName}`,
      email: student.user.email,
      phone: student.user.phone,
      status: student.user.status,

      // Student profile fields
      admissionNumber: student.admissionNumber,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      bloodGroup: student.bloodGroup,
      address: student.address,

      // Enrollment info
      rollNumber: enrollment?.rollNumber,
      enrollments: student.studentClasses,
      currentEnrollment: enrollment
        ? {
            id: enrollment.id,
            rollNumber: enrollment.rollNumber,
            status: enrollment.status,
            class: {
              id: enrollment.class.id,
              name: enrollment.class.name,
              gradeLevel: enrollment.class.gradeLevel,
            },
            section: {
              id: enrollment.section.id,
              name: enrollment.section.name,
            },
            academicYear: {
              id: enrollment.academicYear.id,
              name: enrollment.academicYear.name,
              isCurrent: enrollment.academicYear.isCurrent,
            },
          }
        : null,

      // Relationship info
      relationship: sp.relationship,
      isPrimary: sp.isPrimary,
    };
  });

  return children;
};

/**
 * Get specific child by student ID (only if linked to parent)
 * SECURITY: Verifies parent owns this student link
 */
const getChildById = async (userId, schoolId, studentId) => {
  const parsedStudentId = parseInt(studentId, 10);

  // CRITICAL: Join through parent.userId to enforce ownership
  const parent = await prisma.parent.findFirst({
    where: {
      userId,
      schoolId,
    },
    include: {
      studentParents: {
        where: {
          studentId: parsedStudentId,
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
                  phone: true,
                  avatarUrl: true,
                  status: true,
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
  });

  if (!parent) {
    throw ApiError.notFound("Parent profile not found for this user");
  }

  if (parent.studentParents.length === 0) {
    throw ApiError.forbidden("You do not have access to this student");
  }

  const sp = parent.studentParents[0];
  const student = sp.student;
  const enrollment = student.studentClasses?.[0];

  return {
    id: student.id,
    studentId: student.id,
    user: {
      id: student.user.id,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      email: student.user.email,
      phone: student.user.phone,
      avatarUrl: student.user.avatarUrl,
      status: student.user.status,
    },
    firstName: student.user.firstName,
    lastName: student.user.lastName,
    fullName: `${student.user.firstName} ${student.user.lastName}`,
    email: student.user.email,
    phone: student.user.phone,
    status: student.user.status,
    admissionNumber: student.admissionNumber,
    dateOfBirth: student.dateOfBirth,
    gender: student.gender,
    bloodGroup: student.bloodGroup,
    address: student.address,
    rollNumber: enrollment?.rollNumber,
    enrollments: student.studentClasses,
    currentEnrollment: enrollment
      ? {
          id: enrollment.id,
          rollNumber: enrollment.rollNumber,
          status: enrollment.status,
          class: {
            id: enrollment.class.id,
            name: enrollment.class.name,
            gradeLevel: enrollment.class.gradeLevel,
          },
          section: {
            id: enrollment.section.id,
            name: enrollment.section.name,
          },
          academicYear: {
            id: enrollment.academicYear.id,
            name: enrollment.academicYear.name,
            isCurrent: enrollment.academicYear.isCurrent,
          },
        }
      : null,
    relationship: sp.relationship,
    isPrimary: sp.isPrimary,
  };
};

module.exports = {
  createParent,
  listParents,
  updateParent,
  linkStudent,
  unlinkStudent,
  getMyChildren,
  getChildById,
  RELATIONSHIPS,
};
