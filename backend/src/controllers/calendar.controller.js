const { Prisma } = require("../database");
const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler, parsePagination } = require("../utils");
const { notify } = require("../services/push");
const { toIsoDate, rangeError } = require("../utils/calendar/dateValidation");
const { isSupportedAd, MIN_AD, MAX_AD, MIN_BS_YEAR, MAX_BS_YEAR } = require("../utils/calendar/bsDateAdapter");
const { validateConfig, normalizeConfig, CALENDARS, LANGUAGES, NUMERALS } = require("../utils/calendar/calendarConfig");
const { CATEGORIES, HOLIDAY_CATEGORIES, TEACHER_CATEGORIES, AUDIENCE_TYPES, STATUSES } = require("../utils/calendar/calendarRules");
const { RECURRENCES } = require("../utils/calendar/recurrence");
const events = require("../services/calendar/events");
const feed = require("../services/calendar/feed");
const holidays = require("../services/calendar/holidays");
const { checkWorkingDay, loadConfig } = require("../services/calendar/workingDays");

/**
 * School calendar (/api/v1/calendar).
 *
 * The school always comes from req.user. Reading follows the audience rules in
 * services/calendar/audience.js; writing is for admins, plus teachers for
 * their own classes (services/calendar/events.js).
 */

const idParam = (req) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1 || String(id) !== String(req.params.id)) throw ApiError.badRequest("Invalid event id");
  return id;
};

const readDay = (value, name) => {
  const iso = toIsoDate(value);
  if (!iso || !isSupportedAd(iso)) throw ApiError.badRequest(`${name} must be a date (YYYY-MM-DD) between ${MIN_AD} and ${MAX_AD}`);
  return iso;
};

/** GET /calendar/feed?from=&to=&sources=event,exam */
const getFeed = asyncHandler(async (req, res) => {
  const from = readDay(req.query.from, "from");
  const to = readDay(req.query.to, "to");
  const error = rangeError(from, to, { maxDays: feed.MAX_FEED_DAYS });
  if (error) throw ApiError.badRequest(error);
  const sources = typeof req.query.sources === "string" && req.query.sources ? req.query.sources.split(",").map((s) => s.trim()) : null;
  const unknown = (sources || []).filter((s) => !feed.SOURCES.includes(s));
  if (unknown.length) throw ApiError.badRequest(`Unknown source: ${unknown.join(", ")}`);

  const items = await feed.getFeed(req.user, { from, to, sources });
  return ApiResponse.success(res, { from, to, items });
});

/** GET /calendar/overview */
const getOverview = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await feed.getOverview(req.user));
});

/** GET /calendar/meta: the lists the forms need */
const getMeta = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, {
    categories: CATEGORIES,
    holidayCategories: HOLIDAY_CATEGORIES,
    teacherCategories: TEACHER_CATEGORIES,
    audienceTypes: AUDIENCE_TYPES,
    statuses: STATUSES,
    recurrences: RECURRENCES,
    audienceRoles: ["ADMIN", "TEACHER", "EXAM_OFFICER", "ACCOUNTANT", "STUDENT", "PARENT"],
    range: { minAd: MIN_AD, maxAd: MAX_AD, minBsYear: MIN_BS_YEAR, maxBsYear: MAX_BS_YEAR },
    settingsOptions: { calendars: CALENDARS, languages: LANGUAGES, numerals: NUMERALS },
  });
});

/** GET /calendar/events (management list) */
const listEvents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { data, total } = await events.listEvents(req.user, req.query, { skip, limit });
  return ApiResponse.paginated(res, data, { page, limit, total });
});

/** GET /calendar/events/:id */
const getEvent = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await events.getEvent(req.user, idParam(req)));
});

/** POST /calendar/events */
const createEvent = asyncHandler(async (req, res) => {
  const event = await events.createEvent(req.user, req.body);
  if (event.status === "PUBLISHED" && event.isActive && req.body?.notify === true) {
    notify.calendarEventPublished(req.user.schoolId, event.id, req.user.id);
  }
  return ApiResponse.created(res, event, "Calendar event added");
});

/** PUT /calendar/events/:id */
const updateEvent = asyncHandler(async (req, res) => {
  const { event, wasPublished } = await events.updateEvent(req.user, idParam(req), req.body);
  const nowPublished = event.status === "PUBLISHED" && event.isActive;
  if (nowPublished && req.body?.notify === true && (!wasPublished || req.body?.notifyAgain === true)) {
    notify.calendarEventPublished(req.user.schoolId, event.id, req.user.id);
  }
  return ApiResponse.success(res, event, "Calendar event updated");
});

/** DELETE /calendar/events/:id */
const deleteEvent = asyncHandler(async (req, res) => {
  await events.deleteEvent(req.user, idParam(req));
  return ApiResponse.success(res, null, "Calendar event deleted");
});

const settingsPayload = (raw) => ({
  config: normalizeConfig(raw),
  isCustom: raw !== null && raw !== undefined,
  options: { calendars: CALENDARS, languages: LANGUAGES, numerals: NUMERALS },
});

/** GET /calendar/settings */
const getSettings = asyncHandler(async (req, res) => {
  const school = await prisma.school.findUnique({ where: { id: req.user.schoolId }, select: { calendarConfig: true } });
  return ApiResponse.success(res, settingsPayload(school?.calendarConfig ?? null));
});

/** PUT /calendar/settings { config } */
const updateSettings = asyncHandler(async (req, res) => {
  const raw = req.body?.config;
  const errors = validateConfig(raw);
  if (errors.length) throw ApiError.badRequest("Please correct the highlighted settings", errors);
  const config = normalizeConfig(raw);
  await prisma.school.update({ where: { id: req.user.schoolId }, data: { calendarConfig: config } });
  return ApiResponse.success(res, settingsPayload(config), "Calendar settings saved");
});

/** DELETE /calendar/settings: back to the defaults */
const resetSettings = asyncHandler(async (req, res) => {
  await prisma.school.update({ where: { id: req.user.schoolId }, data: { calendarConfig: Prisma.DbNull } });
  return ApiResponse.success(res, settingsPayload(null), "Calendar settings reset");
});

/** GET /calendar/working-day?date=&classId=&sectionId= */
const getWorkingDay = asyncHandler(async (req, res) => {
  const date = readDay(req.query.date, "date");
  const readId = (value, name) => {
    if (value === undefined || value === "") return null;
    const n = Number.parseInt(value, 10);
    if (!Number.isInteger(n) || n < 1) throw ApiError.badRequest(`${name} must be a number`);
    return n;
  };
  const classId = readId(req.query.classId, "classId");
  const sectionId = readId(req.query.sectionId, "sectionId");
  const [result, config] = await Promise.all([checkWorkingDay(req.user.schoolId, date, { classId, sectionId }), loadConfig(req.user.schoolId)]);
  return ApiResponse.success(res, { ...result, weeklyHolidayDays: config.weeklyHolidayDays });
});

/** GET /calendar/holidays/sources */
const getHolidaySources = asyncHandler(async (req, res) => {
  const [sources, imports] = [holidays.listSources(), await holidays.listImports(req.user.schoolId)];
  return ApiResponse.success(res, { sources, imports });
});

/** POST /calendar/holidays/import/preview { bsYear, rows?, source?, sourceDocument? } */
const previewHolidayImport = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await holidays.preview(req.user, req.body));
});

/** POST /calendar/holidays/import { bsYear, keys, confirm: true, rows?, source?, sourceDocument? } */
const importHolidays = asyncHandler(async (req, res) => {
  const result = await holidays.runImport(req.user, req.body);
  return ApiResponse.created(res, result, `${result.created} holiday${result.created === 1 ? "" : "s"} imported`);
});

module.exports = {
  getFeed,
  getOverview,
  getMeta,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getSettings,
  updateSettings,
  resetSettings,
  getWorkingDay,
  getHolidaySources,
  previewHolidayImport,
  importHolidays,
};
