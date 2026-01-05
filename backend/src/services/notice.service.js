/**
 * Notice Service
 *
 * Business logic for the Notice feature with strict RBAC enforcement.
 *
 * RESPONSIBILITIES:
 * 1. Create notices (ADMIN: any, TEACHER: own classes only)
 * 2. Update notices (owner or ADMIN)
 * 3. Publish notices (transition DRAFT → PUBLISHED)
 * 4. Archive notices (transition PUBLISHED → ARCHIVED)
 * 5. Fetch notices with role-based visibility filtering
 * 6. Delete notices (only DRAFT, by owner or ADMIN)
 *
 * SECURITY RULES:
 * - schoolId derived from req.user, never from request body
 * - Teachers can only target classes they are assigned to
 * - Students and Parents CANNOT create notices
 * - DRAFT notices visible only to creator and ADMIN
 * - Cross-school access prevented at query level
 */

const prisma = require("../config/database");
const { ApiError, parsePagination } = require("../utils");

// =============================================================================
// CONSTANTS
// =============================================================================

const ALLOWED_CREATOR_ROLES = ["ADMIN", "SUPER_ADMIN", "TEACHER"];
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

// =============================================================================
// HELPER: Get current academic year for the school
// =============================================================================

const getCurrentAcademicYear = async (schoolId) => {
  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
    select: { id: true },
  });

  if (!academicYear) {
    throw ApiError.badRequest("No current academic year set for this school");
  }

  return academicYear.id;
};

// =============================================================================
// HELPER: Get user's role names
// =============================================================================

const getUserRoles = async (userId) => {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { name: true, id: true } } },
  });
  return userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name }));
};

// =============================================================================
// HELPER: Check if user has any of the specified roles
// =============================================================================

const hasRole = (userRoles, roleNames) => {
  return userRoles.some((r) => roleNames.includes(r.name));
};

// =============================================================================
// HELPER: Get classes assigned to a teacher
// =============================================================================

const getTeacherAssignedClasses = async (userId, academicYearId) => {
  const assignments = await prisma.teacherSubject.findMany({
    where: {
      userId,
      academicYearId,
    },
    select: {
      classSubject: {
        select: {
          classId: true,
        },
      },
      sectionId: true,
    },
  });

  // Unique class-section pairs
  const classMap = new Map();
  for (const a of assignments) {
    const classId = a.classSubject.classId;
    if (!classMap.has(classId)) {
      classMap.set(classId, new Set());
    }
    if (a.sectionId) {
      classMap.get(classId).add(a.sectionId);
    }
  }

  return classMap; // Map<classId, Set<sectionId>>
};

// =============================================================================
// HELPER: Validate class targets for teacher
// =============================================================================

const validateTeacherClassTargets = async (
  userId,
  classTargets,
  academicYearId
) => {
  const teacherClasses = await getTeacherAssignedClasses(
    userId,
    academicYearId
  );

  for (const target of classTargets) {
    const classId = parseInt(target.classId, 10);
    const sectionId = target.sectionId ? parseInt(target.sectionId, 10) : null;

    if (!teacherClasses.has(classId)) {
      throw ApiError.forbidden(
        `You are not assigned to class ID ${classId}. Teachers can only create notices for their assigned classes.`
      );
    }

    // If teacher specifies a section, verify they teach that section
    if (sectionId) {
      const assignedSections = teacherClasses.get(classId);
      // If teacher has no specific sections (teaches whole class), allow any section
      // If teacher has specific sections, verify this section is in their list
      if (assignedSections.size > 0 && !assignedSections.has(sectionId)) {
        throw ApiError.forbidden(
          `You are not assigned to section ID ${sectionId} in class ID ${classId}.`
        );
      }
    }
  }
};

// =============================================================================
// HELPER: Format notice for response
// =============================================================================

const formatNotice = (notice) => {
  return {
    id: notice.id,
    title: notice.title,
    content: notice.content,
    targetType: notice.targetType,
    priority: notice.priority,
    status: notice.status,
    publishFrom: notice.publishFrom,
    publishTo: notice.publishTo,
    publishedAt: notice.publishedAt,
    archivedAt: notice.archivedAt,
    createdAt: notice.createdAt,
    updatedAt: notice.updatedAt,
    createdBy: notice.createdBy
      ? {
          id: notice.createdBy.id,
          firstName: notice.createdBy.firstName,
          lastName: notice.createdBy.lastName,
        }
      : null,
    roleTargets: (notice.roleTargets || []).map((rt) => ({
      roleId: rt.roleId,
      roleName: rt.role?.name,
    })),
    classTargets: (notice.classTargets || []).map((ct) => ({
      classId: ct.classId,
      className: ct.class?.name,
      sectionId: ct.sectionId,
      sectionName: ct.section?.name,
      academicYearId: ct.academicYearId,
    })),
    attachments: (notice.attachments || []).map((a) => ({
      id: a.id,
      fileName: a.fileName,
      filePath: a.filePath,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
    })),
  };
};

// =============================================================================
// CREATE NOTICE
// =============================================================================

/**
 * Create a new notice.
 *
 * RULES:
 * - Only ADMIN/SUPER_ADMIN/TEACHER can create
 * - TEACHER can only use targetType: CLASS_SPECIFIC with their assigned classes
 * - TEACHER cannot create GLOBAL notices
 * - schoolId taken from authenticated user, not request body
 *
 * @param {Object} user - Authenticated user from req.user
 * @param {Object} data - Notice data
 */
const createNotice = async (user, data) => {
  const { schoolId, id: userId } = user;
  const userRoles = await getUserRoles(userId);

  // RULE: Only allowed roles can create notices
  if (!hasRole(userRoles, ALLOWED_CREATOR_ROLES)) {
    throw ApiError.forbidden("You do not have permission to create notices");
  }

  const isAdmin = hasRole(userRoles, ADMIN_ROLES);
  const isTeacher = hasRole(userRoles, ["TEACHER"]);

  const {
    title,
    content,
    targetType = "GLOBAL",
    priority = "normal",
    publishFrom = null,
    publishTo = null,
    roleTargets = [], // Array of roleIds for ROLE_SPECIFIC
    classTargets = [], // Array of { classId, sectionId? } for CLASS_SPECIFIC
  } = data;

  // Validation: title and content required
  if (!title || !title.trim()) {
    throw ApiError.badRequest("Title is required");
  }
  if (!content || !content.trim()) {
    throw ApiError.badRequest("Content is required");
  }

  // Validation: publishTo must be after publishFrom
  if (
    publishFrom &&
    publishTo &&
    new Date(publishTo) <= new Date(publishFrom)
  ) {
    throw ApiError.badRequest("publishTo must be after publishFrom");
  }

  // RULE: Teachers cannot create GLOBAL notices
  if (isTeacher && !isAdmin && targetType === "GLOBAL") {
    throw ApiError.forbidden(
      "Teachers cannot create school-wide (GLOBAL) notices. Use CLASS_SPECIFIC instead."
    );
  }

  // RULE: Teachers cannot create ROLE_SPECIFIC notices (that's admin territory)
  if (isTeacher && !isAdmin && targetType === "ROLE_SPECIFIC") {
    throw ApiError.forbidden("Teachers cannot create ROLE_SPECIFIC notices.");
  }

  // Get current academic year for class targeting
  const academicYearId = await getCurrentAcademicYear(schoolId);

  // RULE: For CLASS_SPECIFIC, validate teacher has access to those classes
  if (targetType === "CLASS_SPECIFIC") {
    if (!classTargets || classTargets.length === 0) {
      throw ApiError.badRequest(
        "CLASS_SPECIFIC notices require at least one classTarget"
      );
    }

    // Teachers must be validated against their assignments
    if (isTeacher && !isAdmin) {
      await validateTeacherClassTargets(userId, classTargets, academicYearId);
    }

    // Admins can target any class, but verify classes exist in this school
    const classIds = classTargets.map((ct) => parseInt(ct.classId, 10));
    const validClasses = await prisma.class.findMany({
      where: { id: { in: classIds }, schoolId },
      select: { id: true },
    });

    if (validClasses.length !== classIds.length) {
      throw ApiError.badRequest(
        "One or more class IDs are invalid or not in this school"
      );
    }

    // Validate sections if provided
    const sectionIds = classTargets
      .filter((ct) => ct.sectionId)
      .map((ct) => parseInt(ct.sectionId, 10));

    if (sectionIds.length > 0) {
      const validSections = await prisma.section.findMany({
        where: { id: { in: sectionIds }, schoolId },
        select: { id: true },
      });

      if (validSections.length !== sectionIds.length) {
        throw ApiError.badRequest(
          "One or more section IDs are invalid or not in this school"
        );
      }
    }
  }

  // RULE: For ROLE_SPECIFIC, validate roleTargets
  if (targetType === "ROLE_SPECIFIC") {
    if (!roleTargets || roleTargets.length === 0) {
      throw ApiError.badRequest(
        "ROLE_SPECIFIC notices require at least one roleTarget"
      );
    }

    const roleIds = roleTargets.map((r) => parseInt(r, 10));
    const validRoles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });

    if (validRoles.length !== roleIds.length) {
      throw ApiError.badRequest("One or more role IDs are invalid");
    }
  }

  // Create notice with targets in a transaction
  const notice = await prisma.$transaction(async (tx) => {
    // Create the notice
    const newNotice = await tx.notice.create({
      data: {
        schoolId,
        createdById: userId,
        title: title.trim(),
        content: content.trim(),
        targetType,
        priority,
        status: "DRAFT", // Always starts as DRAFT
        publishFrom: publishFrom ? new Date(publishFrom) : null,
        publishTo: publishTo ? new Date(publishTo) : null,
      },
    });

    // Create role targets if ROLE_SPECIFIC
    if (targetType === "ROLE_SPECIFIC" && roleTargets.length > 0) {
      await tx.noticeRoleTarget.createMany({
        data: roleTargets.map((roleId) => ({
          noticeId: newNotice.id,
          roleId: parseInt(roleId, 10),
        })),
      });
    }

    // Create class targets if CLASS_SPECIFIC
    if (targetType === "CLASS_SPECIFIC" && classTargets.length > 0) {
      await tx.noticeClassTarget.createMany({
        data: classTargets.map((ct) => ({
          noticeId: newNotice.id,
          classId: parseInt(ct.classId, 10),
          sectionId: ct.sectionId ? parseInt(ct.sectionId, 10) : null,
          academicYearId,
        })),
      });
    }

    // Fetch complete notice with relations
    return tx.notice.findUnique({
      where: { id: newNotice.id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        roleTargets: { include: { role: { select: { name: true } } } },
        classTargets: {
          include: {
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        attachments: true,
      },
    });
  });

  return formatNotice(notice);
};

// =============================================================================
// PUBLISH NOTICE
// =============================================================================

/**
 * Transition notice from DRAFT to PUBLISHED.
 *
 * RULES:
 * - Only DRAFT notices can be published
 * - Only creator or ADMIN can publish
 * - Sets publishedAt timestamp
 */
const publishNotice = async (user, noticeId) => {
  const { schoolId, id: userId } = user;
  const userRoles = await getUserRoles(userId);
  const isAdmin = hasRole(userRoles, ADMIN_ROLES);

  const notice = await prisma.notice.findFirst({
    where: { id: parseInt(noticeId, 10), schoolId },
  });

  if (!notice) {
    throw ApiError.notFound("Notice not found");
  }

  // Only creator or admin can publish
  if (notice.createdById !== userId && !isAdmin) {
    throw ApiError.forbidden("You can only publish your own notices");
  }

  if (notice.status !== "DRAFT") {
    throw ApiError.badRequest(
      `Cannot publish a notice with status "${notice.status}". Only DRAFT notices can be published.`
    );
  }

  const updated = await prisma.notice.update({
    where: { id: notice.id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      roleTargets: { include: { role: { select: { name: true } } } },
      classTargets: {
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
      attachments: true,
    },
  });

  return formatNotice(updated);
};

// =============================================================================
// ARCHIVE NOTICE
// =============================================================================

/**
 * Transition notice from PUBLISHED to ARCHIVED.
 *
 * RULES:
 * - Only PUBLISHED notices can be archived
 * - Only creator or ADMIN can archive
 * - Sets archivedAt timestamp
 */
const archiveNotice = async (user, noticeId) => {
  const { schoolId, id: userId } = user;
  const userRoles = await getUserRoles(userId);
  const isAdmin = hasRole(userRoles, ADMIN_ROLES);

  const notice = await prisma.notice.findFirst({
    where: { id: parseInt(noticeId, 10), schoolId },
  });

  if (!notice) {
    throw ApiError.notFound("Notice not found");
  }

  if (notice.createdById !== userId && !isAdmin) {
    throw ApiError.forbidden("You can only archive your own notices");
  }

  if (notice.status !== "PUBLISHED") {
    throw ApiError.badRequest(
      `Cannot archive a notice with status "${notice.status}". Only PUBLISHED notices can be archived.`
    );
  }

  const updated = await prisma.notice.update({
    where: { id: notice.id },
    data: {
      status: "ARCHIVED",
      archivedAt: new Date(),
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      roleTargets: { include: { role: { select: { name: true } } } },
      classTargets: {
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
      attachments: true,
    },
  });

  return formatNotice(updated);
};

// =============================================================================
// UPDATE NOTICE
// =============================================================================

/**
 * Update a notice.
 *
 * RULES:
 * - Only DRAFT notices can be edited (content-wise)
 * - Only creator or ADMIN can update
 * - Cannot change schoolId
 * - Targets can be updated only for DRAFT notices
 */
const updateNotice = async (user, noticeId, data) => {
  const { schoolId, id: userId } = user;
  const userRoles = await getUserRoles(userId);
  const isAdmin = hasRole(userRoles, ADMIN_ROLES);
  const isTeacher = hasRole(userRoles, ["TEACHER"]);

  const notice = await prisma.notice.findFirst({
    where: { id: parseInt(noticeId, 10), schoolId },
    include: { roleTargets: true, classTargets: true },
  });

  if (!notice) {
    throw ApiError.notFound("Notice not found");
  }

  if (notice.createdById !== userId && !isAdmin) {
    throw ApiError.forbidden("You can only update your own notices");
  }

  // Only DRAFT notices can have content/targets changed
  if (notice.status !== "DRAFT") {
    throw ApiError.badRequest(
      "Only DRAFT notices can be edited. Archive this notice and create a new one if changes are needed."
    );
  }

  const {
    title,
    content,
    targetType,
    priority,
    publishFrom,
    publishTo,
    roleTargets = null,
    classTargets = null,
  } = data;

  // If teacher is changing targetType, validate
  if (targetType && isTeacher && !isAdmin) {
    if (targetType === "GLOBAL") {
      throw ApiError.forbidden("Teachers cannot create GLOBAL notices");
    }
    if (targetType === "ROLE_SPECIFIC") {
      throw ApiError.forbidden("Teachers cannot create ROLE_SPECIFIC notices");
    }
  }

  const academicYearId = await getCurrentAcademicYear(schoolId);

  // Validate new classTargets if provided
  if (
    classTargets !== null &&
    (targetType || notice.targetType) === "CLASS_SPECIFIC"
  ) {
    if (classTargets.length === 0) {
      throw ApiError.badRequest(
        "CLASS_SPECIFIC notices require at least one classTarget"
      );
    }

    if (isTeacher && !isAdmin) {
      await validateTeacherClassTargets(userId, classTargets, academicYearId);
    }
  }

  // Transaction to update notice and targets
  const updated = await prisma.$transaction(async (tx) => {
    // Update notice fields
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (targetType !== undefined) updateData.targetType = targetType;
    if (priority !== undefined) updateData.priority = priority;
    if (publishFrom !== undefined)
      updateData.publishFrom = publishFrom ? new Date(publishFrom) : null;
    if (publishTo !== undefined)
      updateData.publishTo = publishTo ? new Date(publishTo) : null;

    await tx.notice.update({
      where: { id: notice.id },
      data: updateData,
    });

    // Update role targets if provided and targetType is ROLE_SPECIFIC
    const effectiveTargetType = targetType || notice.targetType;

    if (roleTargets !== null) {
      // Delete existing role targets
      await tx.noticeRoleTarget.deleteMany({ where: { noticeId: notice.id } });

      if (effectiveTargetType === "ROLE_SPECIFIC" && roleTargets.length > 0) {
        await tx.noticeRoleTarget.createMany({
          data: roleTargets.map((roleId) => ({
            noticeId: notice.id,
            roleId: parseInt(roleId, 10),
          })),
        });
      }
    }

    // Update class targets if provided and targetType is CLASS_SPECIFIC
    if (classTargets !== null) {
      // Delete existing class targets
      await tx.noticeClassTarget.deleteMany({ where: { noticeId: notice.id } });

      if (effectiveTargetType === "CLASS_SPECIFIC" && classTargets.length > 0) {
        await tx.noticeClassTarget.createMany({
          data: classTargets.map((ct) => ({
            noticeId: notice.id,
            classId: parseInt(ct.classId, 10),
            sectionId: ct.sectionId ? parseInt(ct.sectionId, 10) : null,
            academicYearId,
          })),
        });
      }
    }

    return tx.notice.findUnique({
      where: { id: notice.id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        roleTargets: { include: { role: { select: { name: true } } } },
        classTargets: {
          include: {
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        attachments: true,
      },
    });
  });

  return formatNotice(updated);
};

// =============================================================================
// DELETE NOTICE
// =============================================================================

/**
 * Delete a notice.
 *
 * RULES:
 * - Only DRAFT notices can be deleted (PUBLISHED/ARCHIVED should remain for audit)
 * - Only creator or ADMIN can delete
 */
const deleteNotice = async (user, noticeId) => {
  const { schoolId, id: userId } = user;
  const userRoles = await getUserRoles(userId);
  const isAdmin = hasRole(userRoles, ADMIN_ROLES);

  const notice = await prisma.notice.findFirst({
    where: { id: parseInt(noticeId, 10), schoolId },
  });

  if (!notice) {
    throw ApiError.notFound("Notice not found");
  }

  if (notice.createdById !== userId && !isAdmin) {
    throw ApiError.forbidden("You can only delete your own notices");
  }

  // Only DRAFT notices can be deleted
  if (notice.status !== "DRAFT") {
    throw ApiError.badRequest(
      `Cannot delete a ${notice.status} notice. Published and archived notices are retained for audit purposes.`
    );
  }

  await prisma.notice.delete({ where: { id: notice.id } });

  return { message: "Notice deleted successfully" };
};

// =============================================================================
// GET NOTICE BY ID
// =============================================================================

/**
 * Get a single notice by ID.
 *
 * VISIBILITY RULES:
 * - ADMIN: Can see all notices (including DRAFT, ARCHIVED)
 * - TEACHER: Own drafts + published notices they can see
 * - STUDENT/PARENT: Only PUBLISHED notices they're targeted for
 */
const getNoticeById = async (user, noticeId) => {
  const { schoolId, id: userId } = user;
  const userRoles = await getUserRoles(userId);
  const isAdmin = hasRole(userRoles, ADMIN_ROLES);

  const notice = await prisma.notice.findFirst({
    where: { id: parseInt(noticeId, 10), schoolId },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      roleTargets: { include: { role: { select: { name: true } } } },
      classTargets: {
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
      attachments: true,
    },
  });

  if (!notice) {
    throw ApiError.notFound("Notice not found");
  }

  // Admin can see everything
  if (isAdmin) {
    return formatNotice(notice);
  }

  // Creator can see their own notices (including drafts)
  if (notice.createdById === userId) {
    return formatNotice(notice);
  }

  // Non-admin, non-creator: must be PUBLISHED and within publish window
  if (notice.status !== "PUBLISHED") {
    throw ApiError.notFound("Notice not found");
  }

  const now = new Date();
  if (notice.publishFrom && new Date(notice.publishFrom) > now) {
    throw ApiError.notFound("Notice not found");
  }
  if (notice.publishTo && new Date(notice.publishTo) < now) {
    throw ApiError.notFound("Notice not found");
  }

  // Check targeting
  const canView = await checkNoticeVisibility(user, notice, userRoles);
  if (!canView) {
    throw ApiError.notFound("Notice not found");
  }

  return formatNotice(notice);
};

// =============================================================================
// HELPER: Check if user can view a specific notice
// =============================================================================

const checkNoticeVisibility = async (user, notice, userRoles) => {
  // GLOBAL: everyone can see
  if (notice.targetType === "GLOBAL") {
    return true;
  }

  // ROLE_SPECIFIC: check if user has any of the target roles
  if (notice.targetType === "ROLE_SPECIFIC") {
    const targetRoleIds = notice.roleTargets.map((rt) => rt.roleId);
    const userRoleIds = userRoles.map((r) => r.id);
    return targetRoleIds.some((rid) => userRoleIds.includes(rid));
  }

  // CLASS_SPECIFIC: check based on user's role
  if (notice.targetType === "CLASS_SPECIFIC") {
    const roleNames = userRoles.map((r) => r.name);

    // Teachers: check if any of their assigned classes match
    if (roleNames.includes("TEACHER")) {
      const academicYearId = await getCurrentAcademicYear(user.schoolId);
      const teacherClasses = await getTeacherAssignedClasses(
        user.id,
        academicYearId
      );

      for (const target of notice.classTargets) {
        if (teacherClasses.has(target.classId)) {
          // If target has no specific section, or teacher teaches that section
          if (!target.sectionId) return true;
          const sections = teacherClasses.get(target.classId);
          if (sections.size === 0 || sections.has(target.sectionId))
            return true;
        }
      }
    }

    // Students: check if their current enrollment matches
    if (roleNames.includes("STUDENT")) {
      const student = await prisma.student.findFirst({
        where: { userId: user.id },
        include: {
          studentClasses: {
            where: { status: "active" },
            orderBy: { academicYear: { startDate: "desc" } },
            take: 1,
          },
        },
      });

      if (student && student.studentClasses[0]) {
        const enrollment = student.studentClasses[0];
        for (const target of notice.classTargets) {
          if (
            target.classId === enrollment.classId &&
            target.academicYearId === enrollment.academicYearId
          ) {
            if (
              !target.sectionId ||
              target.sectionId === enrollment.sectionId
            ) {
              return true;
            }
          }
        }
      }
    }

    // Parents: check if any of their children's enrollments match
    if (roleNames.includes("PARENT")) {
      const parent = await prisma.parent.findFirst({
        where: { userId: user.id },
        include: {
          studentParents: {
            include: {
              student: {
                include: {
                  studentClasses: {
                    where: { status: "active" },
                    orderBy: { academicYear: { startDate: "desc" } },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      if (parent) {
        for (const sp of parent.studentParents) {
          const enrollment = sp.student.studentClasses[0];
          if (enrollment) {
            for (const target of notice.classTargets) {
              if (
                target.classId === enrollment.classId &&
                target.academicYearId === enrollment.academicYearId
              ) {
                if (
                  !target.sectionId ||
                  target.sectionId === enrollment.sectionId
                ) {
                  return true;
                }
              }
            }
          }
        }
      }
    }

    return false;
  }

  return false;
};

// =============================================================================
// LIST NOTICES (with role-based filtering)
// =============================================================================

/**
 * Get notices with role-based visibility.
 *
 * FILTERING LOGIC BY ROLE:
 *
 * ADMIN:
 *   - Can see all notices in the school
 *   - Can filter by status (DRAFT, PUBLISHED, ARCHIVED)
 *   - Can filter by createdById to see specific user's notices
 *
 * TEACHER:
 *   - Own drafts (any status)
 *   - PUBLISHED notices where:
 *     - targetType = GLOBAL, OR
 *     - targetType = ROLE_SPECIFIC and TEACHER role is targeted, OR
 *     - targetType = CLASS_SPECIFIC and teacher's assigned classes match
 *
 * STUDENT:
 *   - PUBLISHED notices where:
 *     - targetType = GLOBAL, OR
 *     - targetType = ROLE_SPECIFIC and STUDENT role is targeted, OR
 *     - targetType = CLASS_SPECIFIC and student's class/section matches
 *
 * PARENT:
 *   - PUBLISHED notices where:
 *     - targetType = GLOBAL, OR
 *     - targetType = ROLE_SPECIFIC and PARENT role is targeted, OR
 *     - targetType = CLASS_SPECIFIC and any child's class/section matches
 */
const listNotices = async (user, query = {}) => {
  const { schoolId, id: userId } = user;
  const userRoles = await getUserRoles(userId);
  const roleNames = userRoles.map((r) => r.name);
  const isAdmin = hasRole(userRoles, ADMIN_ROLES);

  const { page, limit, skip } = parsePagination(query);
  const { status, priority, search, createdById, includeArchived } = query;

  const now = new Date();

  // Base where clause - always filter by school
  const baseWhere = { schoolId };

  // Status filter
  if (status) {
    baseWhere.status = status;
  }

  // Priority filter
  if (priority) {
    baseWhere.priority = priority;
  }

  // Search filter
  if (search) {
    baseWhere.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }

  // Admin: can see everything, optionally filter by creator
  if (isAdmin) {
    if (createdById) {
      baseWhere.createdById = parseInt(createdById, 10);
    }

    // By default, admin sees DRAFT and PUBLISHED unless filtering
    if (!status && !includeArchived) {
      baseWhere.status = { in: ["DRAFT", "PUBLISHED"] };
    }

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where: baseWhere,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          roleTargets: { include: { role: { select: { name: true } } } },
          classTargets: {
            include: {
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
          attachments: true,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.notice.count({ where: baseWhere }),
    ]);

    return {
      data: notices.map(formatNotice),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Non-admin: complex visibility filtering
  // We'll fetch candidates and filter in application code for accuracy
  // This is necessary because Prisma doesn't support the complex OR conditions well

  const academicYearId = await getCurrentAcademicYear(schoolId).catch(
    () => null
  );

  // Get user's role IDs
  const userRoleIds = userRoles.map((r) => r.id);

  // Build visibility conditions
  // 1. Own notices (any status for teachers who can create)
  // 2. Published + in window + (GLOBAL OR role-targeted OR class-targeted)

  const ownNoticesWhere = hasRole(userRoles, ALLOWED_CREATOR_ROLES)
    ? { createdById: userId }
    : null;

  // Fetch all potentially visible notices
  const candidateWhere = {
    schoolId,
    OR: [
      // Own notices
      ...(ownNoticesWhere ? [ownNoticesWhere] : []),
      // Published notices in window
      {
        status: "PUBLISHED",
        AND: [
          { OR: [{ publishFrom: null }, { publishFrom: { lte: now } }] },
          { OR: [{ publishTo: null }, { publishTo: { gte: now } }] },
        ],
      },
    ],
  };

  if (status) {
    candidateWhere.status = status;
  }
  if (priority) {
    candidateWhere.priority = priority;
  }
  if (search) {
    candidateWhere.AND = candidateWhere.AND || [];
    candidateWhere.AND.push({
      OR: [{ title: { contains: search } }, { content: { contains: search } }],
    });
  }

  const candidates = await prisma.notice.findMany({
    where: candidateWhere,
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      roleTargets: { include: { role: { select: { name: true } } } },
      classTargets: {
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
      attachments: true,
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  // Filter candidates based on visibility
  const visibleNotices = [];

  for (const notice of candidates) {
    // Own notice - always visible
    if (notice.createdById === userId) {
      visibleNotices.push(notice);
      continue;
    }

    // Must be published and in window
    if (notice.status !== "PUBLISHED") continue;
    if (notice.publishFrom && new Date(notice.publishFrom) > now) continue;
    if (notice.publishTo && new Date(notice.publishTo) < now) continue;

    // Check targeting
    if (notice.targetType === "GLOBAL") {
      visibleNotices.push(notice);
      continue;
    }

    if (notice.targetType === "ROLE_SPECIFIC") {
      const targetRoleIds = notice.roleTargets.map((rt) => rt.roleId);
      if (targetRoleIds.some((rid) => userRoleIds.includes(rid))) {
        visibleNotices.push(notice);
        continue;
      }
    }

    if (notice.targetType === "CLASS_SPECIFIC") {
      const canView = await checkNoticeVisibility(user, notice, userRoles);
      if (canView) {
        visibleNotices.push(notice);
      }
    }
  }

  // Paginate filtered results
  const total = visibleNotices.length;
  const paginatedNotices = visibleNotices.slice(skip, skip + limit);

  return {
    data: paginatedNotices.map(formatNotice),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  createNotice,
  updateNotice,
  deleteNotice,
  publishNotice,
  archiveNotice,
  getNoticeById,
  listNotices,
};
