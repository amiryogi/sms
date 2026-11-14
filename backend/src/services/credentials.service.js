/**
 * Class logins: give the students of a class (and, if asked, their parents)
 * temporary passwords in one go, for printed login slips.
 *
 * Each account gets a generated password and must choose its own at the next
 * sign-in; its sessions end. By default anyone who has already signed in is
 * skipped, so families using the app are not locked out. With `dryRun` nothing
 * changes and only the counts come back (for the confirm dialog).
 *
 * The plain passwords are returned once, to print, and never stored or logged.
 */
const bcrypt = require("bcryptjs");
const prisma = require("../config/database");
const { ApiError } = require("../utils");
const { fullName } = require("../utils/names");
const { generateTemporaryPassword } = require("../utils/passwords");
const { BCRYPT_ROUNDS, logPasswordSet } = require("./account.service");

const classLogins = async ({ actor, schoolId, classId, sectionId, academicYearId, includeParents = false, onlyNeverSignedIn = true, dryRun = false }) => {
  const year = academicYearId
    ? await prisma.academicYear.findFirst({ where: { id: Number(academicYearId), schoolId } })
    : await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
  if (!year) throw ApiError.notFound("Academic year not found");
  const cls = await prisma.class.findFirst({ where: { id: Number(classId), schoolId }, select: { id: true } });
  if (!cls) throw ApiError.notFound("Class not found");

  const enrolments = await prisma.studentClass.findMany({
    where: { schoolId, academicYearId: year.id, classId: cls.id, ...(sectionId ? { sectionId: Number(sectionId) } : {}), status: "active" },
    orderBy: [{ section: { name: "asc" } }, { rollNumber: { sort: "asc", nulls: "first" } }, { id: "asc" }],
    select: {
      rollNumber: true,
      class: { select: { name: true } },
      section: { select: { name: true } },
      student: {
        select: {
          admissionNumber: true,
          user: { select: { id: true, username: true, firstName: true, middleName: true, lastName: true, status: true, lastLogin: true } },
          studentParents: {
            orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
            select: {
              relationship: true,
              parent: { select: { user: { select: { id: true, username: true, firstName: true, middleName: true, lastName: true, status: true, lastLogin: true } } } },
            },
          },
        },
      },
    },
  });

  // Who gets a new password, in print order: each student, then their parents.
  const wanted = (u) => u.status === "active" && (!onlyNeverSignedIn || !u.lastLogin);
  const accounts = [];
  const skipped = { signedIn: 0, inactive: 0 };
  const seenParents = new Map(); // a parent of two children in the class gets one slip
  const count = (u) => {
    if (u.status !== "active") skipped.inactive += 1;
    else if (onlyNeverSignedIn && u.lastLogin) skipped.signedIn += 1;
  };

  for (const e of enrolments) {
    const su = e.student.user;
    const place = { class: e.class.name, section: e.section.name, rollNumber: e.rollNumber };
    if (wanted(su)) accounts.push({ user: su, role: "STUDENT", ...place, admissionNumber: e.student.admissionNumber });
    else count(su);
    if (!includeParents) continue;
    for (const sp of e.student.studentParents) {
      const pu = sp.parent.user;
      if (seenParents.has(pu.id)) {
        seenParents.get(pu.id).children.push(fullName(su));
        continue;
      }
      if (!wanted(pu)) {
        count(pu);
        seenParents.set(pu.id, { children: [] });
        continue;
      }
      const entry = { user: pu, role: "PARENT", ...place, relationship: sp.relationship, children: [fullName(su)] };
      seenParents.set(pu.id, entry);
      accounts.push(entry);
    }
  }

  const summary = { academicYear: { id: year.id, name: year.name }, students: accounts.filter((a) => a.role === "STUDENT").length, parents: accounts.filter((a) => a.role === "PARENT").length, skipped };
  if (dryRun) return { ...summary, credentials: [] };

  // Hash outside the transaction (bcrypt is slow); write everything at once.
  const withPasswords = await Promise.all(
    accounts.map(async (a) => {
      const temporaryPassword = generateTemporaryPassword();
      return { ...a, temporaryPassword, passwordHash: await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS) };
    }),
  );
  await prisma.$transaction(async (tx) => {
    for (const a of withPasswords) {
      await tx.user.update({ where: { id: a.user.id }, data: { passwordHash: a.passwordHash, mustChangePassword: true } });
    }
    await tx.refreshToken.deleteMany({ where: { userId: { in: withPasswords.map((a) => a.user.id) } } });
    await tx.deviceToken.deleteMany({ where: { userId: { in: withPasswords.map((a) => a.user.id) } } });
  });
  for (const a of withPasswords) logPasswordSet(actor, a.user, "class login slip");

  return {
    ...summary,
    credentials: withPasswords.map((a) => ({
      userId: a.user.id,
      role: a.role,
      name: fullName(a.user),
      username: a.user.username,
      temporaryPassword: a.temporaryPassword,
      class: a.class,
      section: a.section,
      rollNumber: a.rollNumber,
      admissionNumber: a.admissionNumber || null,
      relationship: a.relationship || null,
      children: a.children || null,
    })),
  };
};

module.exports = { classLogins };
