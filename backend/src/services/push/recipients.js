/**
 * Who a push goes to. Each function returns rows of
 *   { userId, studentId?, childName? }
 * (studentId and childName say which child a parent's notification is about).
 *
 * The rules mirror what the read endpoints already show each person, so a push
 * never tells someone about something the app would refuse to show them:
 *  - notices follow checkNoticeVisibility (services/notice.service.js);
 *  - class work, report cards and absences go to the students of a section
 *    (active enrolment that year) and to the parents linked to them.
 *
 * Every query carries schoolId. The Prisma client is passed in, so the unit
 * tests run these against a hand-written fake.
 */

const unique = (rows) => {
  const seen = new Set();
  return rows.filter((r) => {
    const key = `${r.userId}:${r.studentId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Active students matching an enrolment filter, with their linked parents' users. */
const loadStudents = (db, schoolId, enrolmentWhere, studentIds) =>
  db.student.findMany({
    where: {
      schoolId,
      ...(studentIds ? { id: { in: studentIds } } : {}),
      ...(enrolmentWhere ? { studentClasses: { some: { ...enrolmentWhere, schoolId, status: "active" } } } : {}),
    },
    select: {
      id: true,
      userId: true,
      user: { select: { firstName: true } },
      studentParents: { select: { parent: { select: { userId: true } } } },
    },
    orderBy: { id: "asc" },
  });

/** Rows for students and/or their parents. */
const rowsFor = (students, { toStudents = true, toParents = true } = {}) => {
  const rows = [];
  for (const s of students) {
    if (toStudents) rows.push({ userId: s.userId, studentId: s.id });
    if (toParents) {
      for (const link of s.studentParents) rows.push({ userId: link.parent.userId, studentId: s.id, childName: s.user?.firstName ?? null });
    }
  }
  return unique(rows);
};

/** Students of a class section in a year, and their parents. */
const sectionAudience = async (db, { schoolId, classId, sectionId, academicYearId }, options) => {
  if (!schoolId || !classId || !sectionId || !academicYearId) return [];
  const students = await loadStudents(db, schoolId, { classId, sectionId, academicYearId });
  return rowsFor(students, options);
};

/** Named students and/or their parents (a graded submission, an absence). */
const studentAudience = async (db, { schoolId, studentIds }, options) => {
  if (!schoolId || !studentIds?.length) return [];
  const students = await loadStudents(db, schoolId, null, studentIds);
  return rowsFor(students, options);
};

/**
 * The audience of a published notice: `notice` needs targetType, roleTargets
 * ({ roleId }) and classTargets ({ classId, sectionId, academicYearId }).
 * The author is left out, and so is a notice outside its publish window
 * (nobody can open it yet, or any more).
 */
const noticeAudience = async (db, notice, { now = new Date(), currentAcademicYearId = null } = {}) => {
  const schoolId = notice.schoolId;
  if (!schoolId || notice.status !== "PUBLISHED") return [];
  if (notice.publishFrom && new Date(notice.publishFrom) > now) return [];
  if (notice.publishTo && new Date(notice.publishTo) < now) return [];

  let rows = [];
  if (notice.targetType === "GLOBAL") {
    const users = await db.user.findMany({ where: { schoolId, status: "active" }, select: { id: true }, orderBy: { id: "asc" } });
    rows = users.map((u) => ({ userId: u.id }));
  } else if (notice.targetType === "ROLE_SPECIFIC") {
    const roleIds = (notice.roleTargets ?? []).map((t) => t.roleId);
    if (!roleIds.length) return [];
    const users = await db.user.findMany({
      where: { schoolId, status: "active", userRoles: { some: { roleId: { in: roleIds } } } },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    rows = users.map((u) => ({ userId: u.id }));
  } else if (notice.targetType === "CLASS_SPECIFIC") {
    for (const target of notice.classTargets ?? []) {
      const enrolment = { classId: target.classId, academicYearId: target.academicYearId, ...(target.sectionId ? { sectionId: target.sectionId } : {}) };
      const students = await loadStudents(db, schoolId, enrolment);
      // A notice is about the class, not one child: no studentId on these rows.
      rows.push(...rowsFor(students).map((r) => ({ userId: r.userId })));
      // Teachers assigned to that class (and section) in the current year.
      if (currentAcademicYearId) {
        const teachers = await db.teacherSubject.findMany({
          where: {
            academicYearId: currentAcademicYearId,
            classSubject: { classId: target.classId, class: { schoolId } },
            ...(target.sectionId ? { sectionId: target.sectionId } : {}),
          },
          select: { userId: true },
          orderBy: { id: "asc" },
        });
        rows.push(...teachers.map((t) => ({ userId: t.userId })));
      }
    }
  }
  return unique(rows.filter((r) => r.userId !== notice.createdById));
};

module.exports = { sectionAudience, studentAudience, noticeAudience };
