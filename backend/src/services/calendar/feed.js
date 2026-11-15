/**
 * The calendar feed: everything dated in [from, to] that the signed-in person
 * may see, as one list.
 *
 * Only school events and holidays are stored by the calendar. Exams,
 * assignment due dates, fee due dates, notices and the academic year are read
 * from their own tables each time, so there is never a second copy to keep in
 * step. Each source follows the visibility rule of its own module:
 *   exams        admins see every exam; everyone else only PUBLISHED and LOCKED;
 *                students and parents only exams that include their class
 *   assignments  admin all; teacher own; student/parent published, own section
 *   fees         fee staff see the due dates set on fee structures;
 *                students and parents see their own installments
 *   notices      whatever GET /notices shows the person
 *
 * An item: { key, source, sourceId, title, category, startDate, endDate,
 *            isAllDay, startTime, endTime, isHoliday, detail, status }
 * with AD "YYYY-MM-DD" dates. A fee item never carries an amount.
 */
const prisma = require("../../config/database");
const noticeService = require("../notice.service");
const { parseDateOnly, toIsoDate } = require("../../utils/calendar/dateValidation");
const { todayAd, adToBs, addDays, weekdayOf, bsMonthRange } = require("../../utils/calendar/bsDateAdapter");
const { formatBs, weekdayName, bsMonthName } = require("../../utils/calendar/dateFormatter");
const { expandOccurrences } = require("../../utils/calendar/recurrence");
const { isHolidayCategory, nonWorkingReason } = require("../../utils/calendar/calendarRules");
const { viewerScope, visibleEventsWhere } = require("./audience");
const { loadConfig } = require("./workingDays");

const SOURCES = ["event", "exam", "assignment", "fee", "notice", "academicYear"];
const MAX_FEED_DAYS = 400;
const FEE_ROLES = ["ADMIN", "SUPER_ADMIN", "ACCOUNTANT"];
const VISIBLE_EXAM_STATUSES = ["PUBLISHED", "LOCKED"];

const overlaps = (start, end, from, to) => start <= to && end >= from;
const timeOf = (value) => (value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(11, 16) : null);
const classLabel = (className, sectionName) => [className, sectionName].filter(Boolean).join(" - ");

/* ---------------------------------------------------------------- events */

const eventItems = async (scope, from, to) => {
  const rows = await prisma.calendarEvent.findMany({
    where: {
      AND: [
        { schoolId: scope.schoolId, startDate: { lte: parseDateOnly(to) } },
        { OR: [{ recurrence: { not: "NONE" } }, { endDate: { gte: parseDateOnly(from) } }] },
        scope.isAdmin ? { isActive: true } : visibleEventsWhere(scope),
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      startDate: true,
      endDate: true,
      isAllDay: true,
      startTime: true,
      endTime: true,
      recurrence: true,
      recurrenceUntil: true,
      audienceType: true,
      status: true,
      isActive: true,
      applicability: true,
      audiences: {
        select: { classId: true, sectionId: true, roleId: true, class: { select: { name: true } }, section: { select: { name: true } }, role: { select: { name: true } } },
        orderBy: { id: "asc" },
      },
    },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
  });

  const items = [];
  for (const row of rows) {
    if (!row.isActive) continue;
    const occurrences = expandOccurrences(
      { startDate: toIsoDate(row.startDate), endDate: toIsoDate(row.endDate), recurrence: row.recurrence, recurrenceUntil: toIsoDate(row.recurrenceUntil) },
      from,
      to,
    );
    const audience =
      row.audienceType === "ALL"
        ? "Everyone"
        : row.audienceType === "ROLE"
          ? row.audiences.map((a) => a.role?.name).filter(Boolean).join(", ")
          : row.audiences.map((a) => classLabel(a.class?.name, a.section?.name)).filter(Boolean).join(", ");
    for (const o of occurrences) {
      items.push({
        key: `event-${row.id}-${o.startDate}`,
        source: "event",
        sourceId: row.id,
        title: row.title,
        category: row.category,
        startDate: o.startDate,
        endDate: o.endDate,
        isAllDay: row.isAllDay,
        startTime: row.startTime,
        endTime: row.endTime,
        isHoliday: isHolidayCategory(row.category),
        detail: row.description,
        audience,
        audienceType: row.audienceType,
        audiences: row.audiences.map((a) => ({ classId: a.classId, sectionId: a.sectionId, roleId: a.roleId })),
        applicability: row.applicability,
        recurrence: row.recurrence,
        status: row.status,
      });
    }
  }
  return items;
};

/* ----------------------------------------------------------------- exams */

const examItems = async (scope, from, to) => {
  const classIds = [...new Set(scope.enrolments.map((e) => e.classId))];
  const isFamily = scope.roles.includes("STUDENT") || scope.roles.includes("PARENT");
  const familyOnly = isFamily && !scope.isAdmin && !scope.teaches;
  if (familyOnly && !classIds.length) return [];

  const fromDay = parseDateOnly(from);
  const toDay = parseDateOnly(to);
  const where = {
    schoolId: scope.schoolId,
    ...(scope.isAdmin ? {} : { status: { in: VISIBLE_EXAM_STATUSES } }),
    ...(familyOnly ? { examSubjects: { some: { classSubject: { classId: { in: classIds } } } } } : {}),
    OR: [
      { startDate: { lte: toDay }, endDate: { gte: fromDay } },
      { startDate: { gte: fromDay, lte: toDay }, endDate: null },
      { examSubjects: { some: { examDate: { gte: fromDay, lte: toDay } } } },
    ],
  };

  const exams = await prisma.exam.findMany({
    where,
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      examSubjects: {
        where: {
          examDate: { gte: fromDay, lte: toDay },
          ...(familyOnly ? { classSubject: { classId: { in: classIds } } } : {}),
        },
        select: {
          id: true,
          examDate: true,
          startTime: true,
          endTime: true,
          classSubject: { select: { class: { select: { name: true } }, subject: { select: { name: true } } } },
        },
        orderBy: [{ examDate: "asc" }, { id: "asc" }],
      },
    },
    orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { id: "asc" }],
  });

  const items = [];
  for (const exam of exams) {
    const start = toIsoDate(exam.startDate);
    const end = toIsoDate(exam.endDate) || start;
    if (start && overlaps(start, end, from, to)) {
      items.push({
        key: `exam-${exam.id}`,
        source: "exam",
        sourceId: exam.id,
        title: exam.name,
        category: "EXAMINATION",
        startDate: start,
        endDate: end,
        isAllDay: true,
        startTime: null,
        endTime: null,
        isHoliday: false,
        detail: null,
        status: exam.status,
      });
    }
    for (const subject of exam.examSubjects) {
      const day = toIsoDate(subject.examDate);
      if (!day) continue;
      const startTime = timeOf(subject.startTime);
      items.push({
        key: `examSubject-${subject.id}`,
        source: "examSubject",
        sourceId: exam.id,
        title: `${exam.name}: ${subject.classSubject.subject.name}`,
        category: "EXAMINATION",
        startDate: day,
        endDate: day,
        isAllDay: !startTime,
        startTime,
        endTime: timeOf(subject.endTime),
        isHoliday: false,
        detail: subject.classSubject.class.name,
        status: exam.status,
      });
    }
  }
  return items;
};

/* ----------------------------------------------------------- assignments */

const assignmentItems = async (scope, from, to) => {
  let roleWhere;
  if (scope.isAdmin) roleWhere = {};
  else if (scope.teaches) roleWhere = { teacherSubject: { userId: scope.userId } };
  else if (scope.enrolments.length) {
    roleWhere = {
      isPublished: true,
      OR: scope.enrolments.map((e) => ({
        teacherSubject: { sectionId: e.sectionId, academicYearId: e.academicYearId, classSubject: { classId: e.classId } },
      })),
    };
  } else return [];

  const rows = await prisma.assignment.findMany({
    where: {
      AND: [
        { teacherSubject: { classSubject: { class: { schoolId: scope.schoolId } } } },
        { dueDate: { gte: parseDateOnly(from), lte: parseDateOnly(to) } },
        roleWhere,
      ],
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      isPublished: true,
      teacherSubject: {
        select: { section: { select: { name: true } }, classSubject: { select: { class: { select: { name: true } }, subject: { select: { name: true } } } } },
      },
    },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
  });

  return rows.map((a) => {
    const day = toIsoDate(a.dueDate);
    const ts = a.teacherSubject;
    return {
      key: `assignment-${a.id}`,
      source: "assignment",
      sourceId: a.id,
      title: `Due: ${a.title}`,
      category: "ASSIGNMENT_DEADLINE",
      startDate: day,
      endDate: day,
      isAllDay: true,
      startTime: null,
      endTime: null,
      isHoliday: false,
      detail: `${ts.classSubject.subject.name}, ${classLabel(ts.classSubject.class.name, ts.section?.name)}`,
      status: a.isPublished ? "PUBLISHED" : "DRAFT",
    };
  });
};

/* ------------------------------------------------------------------ fees */

const feeItems = async (scope, from, to) => {
  const range = { gte: parseDateOnly(from), lte: parseDateOnly(to) };

  if (scope.roles.some((r) => FEE_ROLES.includes(r))) {
    const rows = await prisma.feeStructureInstallment.findMany({
      where: { dueDate: range, feeStructure: { schoolId: scope.schoolId } },
      select: {
        id: true,
        label: true,
        dueDate: true,
        feeStructure: { select: { id: true, feeType: { select: { name: true } }, class: { select: { name: true } } } },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    });
    return rows.map((r) => {
      const day = toIsoDate(r.dueDate);
      return {
        key: `feeStructure-${r.id}`,
        source: "fee",
        sourceId: r.feeStructure.id,
        title: `Fee due: ${r.feeStructure.feeType.name} (${r.label})`,
        category: "FEE_DEADLINE",
        startDate: day,
        endDate: day,
        isAllDay: true,
        startTime: null,
        endTime: null,
        isHoliday: false,
        detail: r.feeStructure.class.name,
        status: "PUBLISHED",
      };
    });
  }

  if (!scope.studentIds.length) return [];
  const rows = await prisma.feeInstallment.findMany({
    where: {
      schoolId: scope.schoolId,
      dueDate: range,
      status: { not: "paid" },
      obligation: { schoolId: scope.schoolId, cancelledAt: null, studentClass: { studentId: { in: scope.studentIds } } },
    },
    select: {
      id: true,
      label: true,
      dueDate: true,
      obligation: {
        select: {
          feeStructure: { select: { feeType: { select: { name: true } } } },
          studentClass: { select: { studentId: true, student: { select: { user: { select: { firstName: true } } } } } },
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
  });
  const several = scope.studentIds.length > 1;
  return rows.map((r) => {
    const day = toIsoDate(r.dueDate);
    return {
      key: `fee-${r.id}`,
      source: "fee",
      sourceId: r.id,
      studentId: r.obligation.studentClass.studentId,
      title: `Fee due: ${r.obligation.feeStructure.feeType.name} (${r.label})`,
      category: "FEE_DEADLINE",
      startDate: day,
      endDate: day,
      isAllDay: true,
      startTime: null,
      endTime: null,
      isHoliday: false,
      detail: several ? r.obligation.studentClass.student.user.firstName : null,
      status: "PUBLISHED",
    };
  });
};

/* --------------------------------------------------------------- notices */

const noticeItems = async (user, from, to) => {
  const items = [];
  for (let page = 1; page <= 5; page += 1) {
    const { data, pagination } = await noticeService.listNotices(user, { page, limit: 100 });
    for (const n of data) {
      const stamp = n.publishFrom || n.publishedAt;
      if (!stamp) continue;
      const day = todayAd(new Date(stamp)); // the Nepal calendar day of that moment
      if (day < from || day > to) continue;
      items.push({
        key: `notice-${n.id}`,
        source: "notice",
        sourceId: n.id,
        title: `Notice: ${n.title}`,
        category: "OTHER",
        startDate: day,
        endDate: day,
        isAllDay: true,
        startTime: null,
        endTime: null,
        isHoliday: false,
        detail: null,
        status: n.status,
      });
    }
    if (page >= (pagination?.totalPages ?? 1)) break;
  }
  return items;
};

/* --------------------------------------------------------- academic year */

const academicYearItems = async (scope, from, to) => {
  const years = await prisma.academicYear.findMany({
    where: { schoolId: scope.schoolId, startDate: { lte: parseDateOnly(to) }, endDate: { gte: parseDateOnly(from) } },
    select: { id: true, name: true, startDate: true, endDate: true },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
  });
  const items = [];
  for (const y of years) {
    for (const [edge, label] of [["startDate", "begins"], ["endDate", "ends"]]) {
      const day = toIsoDate(y[edge]);
      if (day < from || day > to) continue;
      items.push({
        key: `academicYear-${y.id}-${edge}`,
        source: "academicYear",
        sourceId: y.id,
        title: `Academic year ${y.name} ${label}`,
        category: "ACADEMIC_ACTIVITY",
        startDate: day,
        endDate: day,
        isAllDay: true,
        startTime: null,
        endTime: null,
        isHoliday: false,
        detail: null,
        status: "PUBLISHED",
      });
    }
  }
  return items;
};

/* ------------------------------------------------------------------ feed */

const byDate = (a, b) =>
  a.startDate.localeCompare(b.startDate) ||
  (a.startTime || "").localeCompare(b.startTime || "") ||
  a.title.localeCompare(b.title) ||
  a.key.localeCompare(b.key);

/** Items in [from, to] for the sources asked for (all when none is named). */
const getFeed = async (user, { from, to, sources }) => {
  const wanted = sources?.length ? SOURCES.filter((s) => sources.includes(s)) : SOURCES;
  const scope = await viewerScope(prisma, user);
  const parts = await Promise.all([
    wanted.includes("event") ? eventItems(scope, from, to) : [],
    wanted.includes("exam") ? examItems(scope, from, to) : [],
    wanted.includes("assignment") ? assignmentItems(scope, from, to) : [],
    wanted.includes("fee") ? feeItems(scope, from, to) : [],
    wanted.includes("notice") ? noticeItems(user, from, to) : [],
    wanted.includes("academicYear") ? academicYearItems(scope, from, to) : [],
  ]);
  return parts.flat().sort(byDate);
};

/** A date as the API describes "today" or any single day. */
const describeDay = (iso) => {
  const bs = adToBs(iso);
  const weekday = weekdayOf(iso);
  return {
    ad: iso,
    bs,
    bsText: formatBs(bs),
    bsTextNe: formatBs(bs, { language: "ne", numerals: "ne" }),
    weekday,
    weekdayName: weekdayName(weekday),
    weekdayNameNe: weekdayName(weekday, "ne"),
    bsMonthName: bs ? bsMonthName(bs.month) : null,
    bsMonthNameNe: bs ? bsMonthName(bs.month, "ne") : null,
    bsMonthRange: bs ? bsMonthRange(bs.year, bs.month) : null,
  };
};

/**
 * The calendar dashboard: today, whether it is a working day, and what is
 * coming in the next `days` days, split the way the page shows it.
 */
const getOverview = async (user, { days = 60, now = new Date() } = {}) => {
  const today = todayAd(now);
  const to = addDays(today, days);
  const [items, config, scope] = await Promise.all([getFeed(user, { from: today, to }), loadConfig(user.schoolId), viewerScope(prisma, user)]);

  const upcoming = (test, limit = 6) => items.filter(test).slice(0, limit);
  const holidaysToday = items.filter((i) => i.isHoliday && i.startDate <= today && i.endDate >= today);
  const nonWorking = nonWorkingReason(
    today,
    config,
    holidaysToday.map((h) => ({ title: h.title, audienceType: h.audienceType, audiences: h.audiences })),
  );

  const recent = await prisma.calendarEvent.findMany({
    where: { AND: [{ schoolId: user.schoolId, isActive: true }, visibleEventsWhere(scope)] },
    select: { id: true, title: true, category: true, startDate: true, endDate: true, status: true, createdAt: true, updatedAt: true },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 5,
  });

  return {
    today: describeDay(today),
    isWorkingDay: !nonWorking,
    nonWorkingReason: nonWorking?.reason ?? null,
    config,
    windowDays: days,
    holidays: upcoming((i) => i.isHoliday),
    exams: upcoming((i) => i.source === "exam" || i.source === "examSubject"),
    events: upcoming((i) => i.source === "event" && !i.isHoliday),
    deadlines: upcoming((i) => i.source === "assignment" || i.source === "fee"),
    recentUpdates: recent.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      startDate: toIsoDate(e.startDate),
      endDate: toIsoDate(e.endDate),
      status: e.status,
      isNew: Math.abs(e.updatedAt.getTime() - e.createdAt.getTime()) < 1000,
      updatedAt: e.updatedAt,
    })),
  };
};

module.exports = { SOURCES, MAX_FEED_DAYS, getFeed, getOverview, describeDay };
