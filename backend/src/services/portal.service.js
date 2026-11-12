/**
 * Student portal overview (docs/plans/finance-and-portals.md, Phase 6).
 *
 * One read for a student's dashboard, used by students (themselves) and, in
 * Phase 7, parents (their linked children). Access is checked by the route
 * (isOwnStudent). Every visibility rule matches the dedicated endpoints:
 *   - results come only from PUBLISHED report cards (CLAUDE.md §4.7);
 *   - exams shown are PUBLISHED or LOCKED, never DRAFT;
 *   - assignments are published ones for the student's own class and section;
 *   - attendance % follows the school's late-counts-as-present rule.
 */
const prisma = require("../config/database");
const { ApiError } = require("../utils");
const { normalizeLayout } = require("../utils/reportCardLayout");
const { tally, rateOf } = require("../utils/attendanceRate");
const { kathmanduToday, dateOnly } = require("../utils/fiscalYear");
const { convertADToBS } = require("../utils/dateConverter");
const obligations = require("./finance/obligation.service");

const { fullName: name } = require("../utils/names");

const overview = async ({ schoolId, studentId }) => {
  const student = await prisma.student.findFirst({
    where: { id: Number(studentId), schoolId },
    include: { user: { select: { firstName: true, middleName: true, lastName: true, email: true, phone: true, avatarUrl: true } } },
  });
  if (!student) throw ApiError.notFound("Student not found");

  const today = kathmanduToday();
  const enrolment = await prisma.studentClass.findFirst({
    where: { studentId: student.id, schoolId, academicYear: { isCurrent: true } },
    include: {
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      academicYear: { select: { id: true, name: true, startDate: true, endDate: true } },
    },
  });

  const profile = {
    id: student.id,
    name: name(student.user),
    firstName: student.user.firstName,
    middleName: student.user.middleName ?? null,
    email: student.user.email,
    phone: student.user.phone,
    avatarUrl: student.user.avatarUrl,
    admissionNumber: student.admissionNumber,
    admissionDate: student.admissionDate,
    dateOfBirth: student.dateOfBirth,
    dateOfBirthBs: convertADToBS(student.dateOfBirth)?.formatted || null,
    gender: student.gender,
    bloodGroup: student.bloodGroup,
    address: student.address,
    emergencyContact: student.emergencyContact,
  };

  if (!enrolment) {
    return { student: profile, enrolment: null, subjects: [], attendance: null, latestResult: null, upcomingExams: [], assignments: [], fees: null };
  }

  const yearId = enrolment.academicYearId;
  const [classSubjects, attendanceRows, school, reportCard, exams, assignments, statement] = await Promise.all([
    prisma.classSubject.findMany({
      where: { classId: enrolment.classId, academicYearId: yearId },
      include: {
        subject: { select: { id: true, name: true, code: true, isOptional: true } },
        teacherSubjects: { where: { sectionId: enrolment.sectionId, academicYearId: yearId }, include: { user: { select: { firstName: true, middleName: true, lastName: true } } } },
      },
      orderBy: { subject: { name: "asc" } },
    }),
    prisma.attendance.findMany({ where: { studentId: student.id, studentClassId: enrolment.id }, select: { status: true, attendanceDate: true }, orderBy: { attendanceDate: "desc" } }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { reportCardConfig: true } }),
    prisma.reportCard.findFirst({
      where: { studentId: student.id, isPublished: true, exam: { schoolId } },
      orderBy: [{ exam: { endDate: "desc" } }, { id: "desc" }],
      include: { exam: { select: { id: true, name: true, examType: true, endDate: true } } },
    }),
    prisma.exam.findMany({
      where: {
        schoolId,
        academicYearId: yearId,
        status: { in: ["PUBLISHED", "LOCKED"] },
        OR: [{ endDate: { gte: dateOnly(today) } }, { endDate: null }],
        examSubjects: { some: { classSubject: { classId: enrolment.classId } } },
      },
      select: { id: true, name: true, examType: true, startDate: true, endDate: true, status: true },
      orderBy: [{ startDate: { sort: "asc", nulls: "first" } }, { id: "asc" }],
      take: 5,
    }),
    prisma.assignment.findMany({
      where: {
        isPublished: true,
        dueDate: { gte: dateOnly(today) },
        teacherSubject: { sectionId: enrolment.sectionId, academicYearId: yearId, classSubject: { classId: enrolment.classId } },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        totalMarks: true,
        teacherSubject: { select: { classSubject: { select: { subject: { select: { name: true } } } } } },
        submissions: { where: { studentId: student.id }, select: { id: true, status: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    obligations.statement({ schoolId, studentId: student.id, academicYearId: yearId }),
  ]);

  const rule = { countLateAsPresent: normalizeLayout(school?.reportCardConfig).countLateAsPresent !== false };
  const counts = tally(attendanceRows);
  const year = statement.years[0];
  const nextDue = year
    ? year.fees
        .filter((f) => !f.cancelled)
        .flatMap((f) => f.installments.filter((i) => i.balance > 0).map((i) => ({ ...i, feeType: f.feeType.name })))
        .sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")))[0] || null
    : null;

  return {
    student: profile,
    enrolment: {
      studentClassId: enrolment.id,
      class: enrolment.class,
      section: enrolment.section,
      rollNumber: enrolment.rollNumber,
      academicYear: enrolment.academicYear,
      classTeacher: name(classSubjects.flatMap((cs) => cs.teacherSubjects).find((t) => t.isClassTeacher)?.user) || null,
    },
    subjects: classSubjects.map((cs) => ({
      id: cs.id,
      name: cs.subject.name,
      code: cs.subject.code,
      isOptional: cs.subject.isOptional,
      hasPractical: cs.hasPractical,
      fullMarks: cs.fullMarks,
      passMarks: cs.passMarks,
      teacher: name(cs.teacherSubjects[0]?.user) || null,
    })),
    attendance: {
      ...counts,
      ...rateOf(counts, rule),
      countLateAsPresent: rule.countLateAsPresent,
      lastMarked: attendanceRows[0]?.attendanceDate || null,
      lastStatus: attendanceRows[0]?.status || null,
    },
    latestResult: reportCard
      ? {
          examId: reportCard.exam.id,
          examName: reportCard.exam.name,
          percentage: reportCard.percentage !== null ? Number(reportCard.percentage) : null,
          overallGrade: reportCard.overallGrade,
          classRank: reportCard.classRank,
        }
      : null,
    upcomingExams: exams,
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      dueDate: a.dueDate,
      totalMarks: a.totalMarks,
      subject: a.teacherSubject.classSubject.subject.name,
      submitted: a.submissions.length > 0,
    })),
    fees: year ? { ...year.totals, status: year.status, nextDue } : null,
  };
};

module.exports = { overview };
