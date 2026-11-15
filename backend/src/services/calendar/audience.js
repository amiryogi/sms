/**
 * Who sees which calendar events.
 *
 *  - Admins see everything in their school, drafts included.
 *  - Everyone else sees a PUBLISHED, active event when it is for ALL, for one of
 *    their roles, or for a class they belong to:
 *      teacher  -> the class-sections they teach in the current academic year
 *      student  -> their active enrolment in the current academic year
 *      parent   -> their linked children's enrolments
 *    plus anything they wrote themselves (a teacher's own draft).
 *
 * Fail closed: a student or parent whose profile cannot be found gets no class
 * events. Every query carries schoolId. The Prisma client is passed in so the
 * rules can be tested against a fake.
 */

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

const isAdminUser = (user) => (user.roles || []).some((r) => ADMIN_ROLES.includes(r));

const uniquePairs = (pairs) => {
  const seen = new Set();
  return pairs.filter((p) => {
    const key = `${p.classId}:${p.sectionId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * What the calendar needs to know about the person asking:
 * { isAdmin, userId, schoolId, roles, roleIds, classPairs, studentIds, enrolments, teaches }.
 *  - classPairs: [{ classId, sectionId }] the user belongs to (teaches or is enrolled in)
 *  - enrolments: [{ studentId, classId, sectionId, academicYearId }] for students and parents
 *  - teaches:    true for a teacher (their own assignments are theirs to see)
 */
const viewerScope = async (db, user) => {
  const { schoolId, id: userId } = user;
  const roles = user.roles || [];
  const scope = {
    isAdmin: isAdminUser(user),
    userId,
    schoolId,
    roles,
    roleIds: [],
    classPairs: [],
    studentIds: [],
    enrolments: [],
    teaches: roles.includes("TEACHER"),
  };

  const roleRows = roles.length
    ? await db.role.findMany({ where: { name: { in: roles } }, select: { id: true }, orderBy: { id: "asc" } })
    : [];
  scope.roleIds = roleRows.map((r) => r.id);
  if (scope.isAdmin) return scope;

  const pairs = [];

  if (scope.teaches) {
    const taught = await db.teacherSubject.findMany({
      where: { userId, academicYear: { isCurrent: true, schoolId } },
      select: { sectionId: true, classSubject: { select: { classId: true } } },
      orderBy: { id: "asc" },
    });
    for (const t of taught) pairs.push({ classId: t.classSubject.classId, sectionId: t.sectionId });
  }

  let studentIds = [];
  if (roles.includes("STUDENT") && user.studentId) studentIds.push(user.studentId);
  if (roles.includes("PARENT") && user.parentId) {
    const links = await db.studentParent.findMany({
      where: { parentId: user.parentId, schoolId },
      select: { studentId: true },
      orderBy: { id: "asc" },
    });
    studentIds.push(...links.map((l) => l.studentId));
  }
  studentIds = [...new Set(studentIds)];

  if (studentIds.length) {
    const enrolments = await db.studentClass.findMany({
      where: { schoolId, studentId: { in: studentIds }, status: "active", academicYear: { isCurrent: true, schoolId } },
      select: { studentId: true, classId: true, sectionId: true, academicYearId: true },
      orderBy: { id: "asc" },
    });
    scope.studentIds = studentIds;
    scope.enrolments = enrolments;
    for (const e of enrolments) pairs.push({ classId: e.classId, sectionId: e.sectionId });
  }

  scope.classPairs = uniquePairs(pairs);
  return scope;
};

/** Prisma `where` (to AND with schoolId) for the events a viewer may see. */
const visibleEventsWhere = (scope) => {
  if (scope.isAdmin) return {};

  const audience = [{ audienceType: "ALL" }];
  if (scope.roleIds.length) {
    audience.push({ audienceType: "ROLE", audiences: { some: { roleId: { in: scope.roleIds } } } });
  }
  if (scope.classPairs.length) {
    audience.push({
      audienceType: "CLASS",
      audiences: {
        some: {
          OR: scope.classPairs.map((p) => ({ classId: p.classId, OR: [{ sectionId: null }, { sectionId: p.sectionId }] })),
        },
      },
    });
  }
  return {
    OR: [{ createdById: scope.userId }, { status: "PUBLISHED", isActive: true, OR: audience }],
  };
};

module.exports = { ADMIN_ROLES, isAdminUser, viewerScope, visibleEventsWhere };
