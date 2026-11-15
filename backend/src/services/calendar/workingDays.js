/**
 * Is a day a working day for the school, or for one class?
 *
 * A day is not a working day when it is one of the school's weekly holidays
 * (School.calendarConfig.weeklyHolidayDays) or is covered by an active,
 * published holiday event that applies to the class. The rule itself is in
 * utils/calendar/calendarRules.js; this file loads what it needs.
 */
const prisma = require("../../config/database");
const { normalizeConfig } = require("../../utils/calendar/calendarConfig");
const { HOLIDAY_CATEGORIES, nonWorkingReason } = require("../../utils/calendar/calendarRules");
const { expandOccurrences } = require("../../utils/calendar/recurrence");
const { parseDateOnly, toIsoDate } = require("../../utils/calendar/dateValidation");

const loadConfig = async (schoolId) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { calendarConfig: true } });
  return normalizeConfig(school?.calendarConfig);
};

/**
 * Holiday events with at least one occurrence touching [from, to] (AD days):
 * [{ id, title, category, audienceType, audiences, occurrences: [{ startDate, endDate }] }].
 */
const loadHolidays = async (schoolId, from, to) => {
  const rows = await prisma.calendarEvent.findMany({
    where: {
      schoolId,
      isActive: true,
      status: "PUBLISHED",
      category: { in: HOLIDAY_CATEGORIES },
      startDate: { lte: parseDateOnly(to) },
      OR: [{ recurrence: { not: "NONE" } }, { endDate: { gte: parseDateOnly(from) } }],
    },
    select: {
      id: true,
      title: true,
      category: true,
      startDate: true,
      endDate: true,
      recurrence: true,
      recurrenceUntil: true,
      audienceType: true,
      audiences: { select: { classId: true, sectionId: true, roleId: true }, orderBy: { id: "asc" } },
    },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
  });

  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      audienceType: row.audienceType,
      audiences: row.audiences,
      occurrences: expandOccurrences(
        {
          startDate: toIsoDate(row.startDate),
          endDate: toIsoDate(row.endDate),
          recurrence: row.recurrence,
          recurrenceUntil: toIsoDate(row.recurrenceUntil),
        },
        from,
        to,
      ),
    }))
    .filter((h) => h.occurrences.length);
};

/**
 * { isWorkingDay, type, reason } for one AD day. With classId (and sectionId),
 * class-specific holidays count too.
 */
const checkWorkingDay = async (schoolId, isoDay, { classId = null, sectionId = null } = {}) => {
  const [config, holidays] = await Promise.all([loadConfig(schoolId), loadHolidays(schoolId, isoDay, isoDay)]);
  const result = nonWorkingReason(isoDay, config, holidays, { classId, sectionId });
  return {
    date: isoDay,
    isWorkingDay: !result,
    type: result?.type ?? null,
    reason: result?.reason ?? null,
    blocksAttendance: Boolean(result) && config.blockAttendanceOnNonWorkingDays,
  };
};

module.exports = { loadConfig, loadHolidays, checkWorkingDay };
