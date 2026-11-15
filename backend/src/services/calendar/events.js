/**
 * School calendar events and holidays: create, edit, delete, list.
 *
 * Admins manage everything. A teacher may add class events for classes they
 * teach this year (TEACHER_CATEGORIES only, never a holiday) and change or
 * delete only their own. schoolId always comes from the signed-in user.
 */
const prisma = require("../../config/database");
const { dialect } = require("../../database");
const { ApiError } = require("../../utils");
const { parseDateOnly, toIsoDate } = require("../../utils/calendar/dateValidation");
const { adToBs } = require("../../utils/calendar/bsDateAdapter");
const { readEventInput } = require("../../utils/calendar/eventInput");
const { HOLIDAY_CATEGORIES, TEACHER_CATEGORIES, isHolidayCategory } = require("../../utils/calendar/calendarRules");
const { isAdminUser, viewerScope, visibleEventsWhere } = require("./audience");

const EVENT_INCLUDE = {
  audiences: {
    select: {
      id: true,
      roleId: true,
      classId: true,
      sectionId: true,
      role: { select: { name: true } },
      class: { select: { name: true } },
      section: { select: { name: true } },
    },
    orderBy: { id: "asc" },
  },
  createdBy: { select: { id: true, firstName: true, middleName: true, lastName: true } },
};

/** An event row as the API returns it: dates as AD "YYYY-MM-DD", with their BS parts. */
const formatEvent = (event) => {
  const startDate = toIsoDate(event.startDate);
  const endDate = toIsoDate(event.endDate);
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    isHoliday: isHolidayCategory(event.category),
    startDate,
    endDate,
    startDateBs: adToBs(startDate),
    endDateBs: adToBs(endDate),
    isAllDay: event.isAllDay,
    startTime: event.startTime,
    endTime: event.endTime,
    recurrence: event.recurrence,
    recurrenceUntil: toIsoDate(event.recurrenceUntil),
    audienceType: event.audienceType,
    roles: (event.audiences || []).filter((a) => a.roleId).map((a) => a.role?.name).filter(Boolean),
    classTargets: (event.audiences || [])
      .filter((a) => a.classId)
      .map((a) => ({ classId: a.classId, className: a.class?.name ?? null, sectionId: a.sectionId, sectionName: a.section?.name ?? null })),
    status: event.status,
    isActive: event.isActive,
    source: event.source,
    sourceDocument: event.sourceDocument,
    sourcePublishedDate: event.sourcePublishedDate,
    applicability: event.applicability,
    importId: event.importId,
    academicYearId: event.academicYearId,
    createdBy: event.createdBy ?? null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
};

/** The academic year a day falls in, or null. */
const academicYearFor = async (schoolId, isoDay) => {
  const day = parseDateOnly(isoDay);
  const year = await prisma.academicYear.findFirst({
    where: { schoolId, startDate: { lte: day }, endDate: { gte: day } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return year?.id ?? null;
};

/**
 * Turns the checked input into audience rows, making sure every role, class
 * and section exists (classes and sections in this school) and that a teacher
 * only addresses classes they teach.
 */
const resolveAudiences = async (user, data) => {
  if (data.audienceType === "ROLE") {
    const roles = await prisma.role.findMany({ where: { name: { in: data.roles } }, select: { id: true, name: true }, orderBy: { id: "asc" } });
    const missing = data.roles.filter((name) => !roles.some((r) => r.name === name));
    if (missing.length) throw ApiError.badRequest(`Unknown role: ${missing.join(", ")}`);
    return roles.map((r) => ({ roleId: r.id }));
  }
  if (data.audienceType !== "CLASS") return [];

  const { schoolId } = user;
  const classIds = [...new Set(data.classTargets.map((t) => t.classId))];
  const sectionIds = [...new Set(data.classTargets.map((t) => t.sectionId).filter(Boolean))];
  const [classes, sections] = await Promise.all([
    prisma.class.findMany({ where: { schoolId, id: { in: classIds } }, select: { id: true }, orderBy: { id: "asc" } }),
    sectionIds.length
      ? prisma.section.findMany({ where: { schoolId, id: { in: sectionIds } }, select: { id: true }, orderBy: { id: "asc" } })
      : [],
  ]);
  if (classes.length !== classIds.length) throw ApiError.badRequest("A chosen class does not belong to your school");
  if (sections.length !== sectionIds.length) throw ApiError.badRequest("A chosen section does not belong to your school");

  if (!isAdminUser(user)) {
    const scope = await viewerScope(prisma, user);
    const taught = scope.classPairs;
    for (const t of data.classTargets) {
      const ok = t.sectionId
        ? taught.some((p) => p.classId === t.classId && p.sectionId === t.sectionId)
        : false; // a teacher names the section: "the whole class" is the admin's to address
      if (!ok) throw ApiError.forbidden("You can only add events for the class sections you teach");
    }
  }
  return data.classTargets.map((t) => ({ classId: t.classId, sectionId: t.sectionId }));
};

/** What a non-admin (a teacher) is allowed to send. */
const assertTeacherMayWrite = (user, data) => {
  if (isAdminUser(user)) return;
  if (!(user.roles || []).includes("TEACHER")) throw ApiError.forbidden("Only administrators and teachers can add calendar events");
  if (!TEACHER_CATEGORIES.includes(data.category)) {
    throw ApiError.forbidden("Teachers can add class activities, meetings and deadlines, not holidays or school-wide notices of other kinds");
  }
  if (data.audienceType !== "CLASS") throw ApiError.forbidden("Teachers can only add events for their own classes");
};

const columnsOf = (data) => ({
  title: data.title,
  description: data.description,
  category: data.category,
  startDate: parseDateOnly(data.startDate),
  endDate: parseDateOnly(data.endDate),
  isAllDay: data.isAllDay,
  startTime: data.startTime,
  endTime: data.endTime,
  recurrence: data.recurrence,
  recurrenceUntil: data.recurrenceUntil ? parseDateOnly(data.recurrenceUntil) : null,
  audienceType: data.audienceType,
  status: data.status,
  isActive: data.isActive,
  source: data.source,
  sourceDocument: data.sourceDocument,
  sourcePublishedDate: data.sourcePublishedDate,
  applicability: data.applicability,
});

const readInput = (body) => {
  const { errors, data } = readEventInput(body);
  if (errors.length) throw ApiError.badRequest("Please correct the highlighted fields", errors);
  return data;
};

const createEvent = async (user, body) => {
  const data = readInput(body);
  assertTeacherMayWrite(user, data);
  const audiences = await resolveAudiences(user, data);
  const academicYearId = await academicYearFor(user.schoolId, data.startDate);

  const event = await prisma.calendarEvent.create({
    data: {
      ...columnsOf(data),
      schoolId: user.schoolId,
      academicYearId,
      createdById: user.id,
      audiences: { create: audiences },
    },
    include: EVENT_INCLUDE,
  });
  return formatEvent(event);
};

/** The event, if it is in the user's school and theirs to change. */
const loadWritable = async (user, id) => {
  const event = await prisma.calendarEvent.findFirst({ where: { id, schoolId: user.schoolId }, include: EVENT_INCLUDE });
  if (!event) throw ApiError.notFound("Calendar event not found");
  if (!isAdminUser(user) && event.createdById !== user.id) {
    throw ApiError.forbidden("You can only change events you added");
  }
  return event;
};

const updateEvent = async (user, id, body) => {
  const existing = await loadWritable(user, id);
  const data = readInput(body);
  assertTeacherMayWrite(user, data);
  const audiences = await resolveAudiences(user, data);
  const academicYearId = await academicYearFor(user.schoolId, data.startDate);

  const [, , event] = await prisma.$transaction([
    prisma.calendarEventAudience.deleteMany({ where: { eventId: existing.id } }),
    prisma.calendarEventAudience.createMany({ data: audiences.map((a) => ({ ...a, eventId: existing.id })) }),
    prisma.calendarEvent.update({
      where: { id: existing.id },
      data: { ...columnsOf(data), academicYearId, updatedById: user.id },
      include: EVENT_INCLUDE,
    }),
  ]);
  return { event: formatEvent(event), wasPublished: existing.status === "PUBLISHED" };
};

const deleteEvent = async (user, id) => {
  const existing = await loadWritable(user, id);
  await prisma.calendarEvent.delete({ where: { id: existing.id } });
};

const getEvent = async (user, id) => {
  const scope = await viewerScope(prisma, user);
  const event = await prisma.calendarEvent.findFirst({
    where: { AND: [{ id, schoolId: user.schoolId }, visibleEventsWhere(scope)] },
    include: EVENT_INCLUDE,
  });
  if (!event) throw ApiError.notFound("Calendar event not found");
  return formatEvent(event);
};

/**
 * The management list: admins see every event of the school, a teacher sees
 * the ones they added. Filters: kind (holiday | event), category, from, to
 * (AD days), search, status. Newest start date first.
 */
const listEvents = async (user, query, { skip, limit }) => {
  const and = [{ schoolId: user.schoolId }];
  if (!isAdminUser(user)) and.push({ createdById: user.id });

  if (query.kind === "holiday") and.push({ category: { in: HOLIDAY_CATEGORIES } });
  else if (query.kind === "event") and.push({ category: { notIn: HOLIDAY_CATEGORIES } });
  if (query.category) and.push({ category: String(query.category) });
  if (query.status) and.push({ status: String(query.status) });

  const from = query.from ? parseDateOnly(query.from) : null;
  const to = query.to ? parseDateOnly(query.to) : null;
  if (query.from && !from) throw ApiError.badRequest("from must be a date (YYYY-MM-DD)");
  if (query.to && !to) throw ApiError.badRequest("to must be a date (YYYY-MM-DD)");
  if (from) and.push({ endDate: { gte: from } });
  if (to) and.push({ startDate: { lte: to } });
  if (query.search) and.push({ title: dialect.text.search(String(query.search)) });

  const where = { AND: and };
  const [rows, total] = await Promise.all([
    prisma.calendarEvent.findMany({
      where,
      include: EVENT_INCLUDE,
      orderBy: [{ startDate: query.order === "asc" ? "asc" : "desc" }, { id: "asc" }],
      skip,
      take: limit,
    }),
    prisma.calendarEvent.count({ where }),
  ]);
  return { data: rows.map(formatEvent), total };
};

module.exports = { EVENT_INCLUDE, formatEvent, academicYearFor, createEvent, updateEvent, deleteEvent, getEvent, listEvents };
