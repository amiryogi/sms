/**
 * Checks and tidies a calendar event sent by a form. Pure: whether the classes,
 * sections and roles exist is checked by the service.
 *
 * `readEventInput(body)` returns { errors: [{ field, message }], data }.
 * Dates in `data` are AD "YYYY-MM-DD" strings.
 */
const { toIsoDate, toTimeOfDay } = require("./dateValidation");
const { isSupportedAd, diffDays } = require("./bsDateAdapter");
const { CATEGORIES, AUDIENCE_TYPES, STATUSES, isHolidayCategory } = require("./calendarRules");
const { RECURRENCES } = require("./recurrence");

const MAX_TITLE = 255;
const MAX_DESCRIPTION = 5000;
const MAX_EVENT_DAYS = 366;
const MAX_AUDIENCES = 200;

const text = (value, max) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s ? s.slice(0, max) : null;
};

const positiveInt = (value) => {
  const n = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 && String(value).trim() === String(n) ? n : null;
};

const readEventInput = (body) => {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  const raw = body && typeof body === "object" && !Array.isArray(body) ? body : {};

  const title = text(raw.title, MAX_TITLE + 1);
  if (!title) add("title", "Title is required");
  else if (title.length > MAX_TITLE) add("title", `At most ${MAX_TITLE} characters`);

  const description = text(raw.description, MAX_DESCRIPTION + 1);
  if (description && description.length > MAX_DESCRIPTION) add("description", `At most ${MAX_DESCRIPTION} characters`);

  const category = raw.category;
  if (!CATEGORIES.includes(category)) add("category", "Choose a category");

  const startDate = toIsoDate(raw.startDate);
  const endDate = raw.endDate === undefined || raw.endDate === null || raw.endDate === "" ? startDate : toIsoDate(raw.endDate);
  if (!startDate) add("startDate", "A valid start date is required (YYYY-MM-DD)");
  else if (!isSupportedAd(startDate)) add("startDate", "The date is outside the supported calendar range");
  if (startDate && !endDate) add("endDate", "The end date is not a valid date (YYYY-MM-DD)");
  else if (startDate && endDate) {
    if (!isSupportedAd(endDate)) {
      // A one-day event has already been told about its start date.
      if (endDate !== startDate) add("endDate", "The date is outside the supported calendar range");
    }
    else if (endDate < startDate) add("endDate", "The end date cannot be before the start date");
    else if (diffDays(startDate, endDate) + 1 > MAX_EVENT_DAYS) add("endDate", `An event cannot be longer than ${MAX_EVENT_DAYS} days`);
  }

  const isAllDay = raw.isAllDay === undefined ? true : raw.isAllDay === true || raw.isAllDay === "true";
  let startTime = null;
  let endTime = null;
  if (!isAllDay) {
    startTime = toTimeOfDay(raw.startTime);
    endTime = raw.endTime === undefined || raw.endTime === null || raw.endTime === "" ? null : toTimeOfDay(raw.endTime);
    if (!startTime) add("startTime", "A start time is required (HH:mm) unless the event lasts all day");
    if (raw.endTime && !endTime) add("endTime", "The end time must be written HH:mm");
    if (startTime && endTime && startDate && startDate === endDate && endTime <= startTime) {
      add("endTime", "The end time must be after the start time");
    }
  }

  const recurrence = raw.recurrence === undefined || raw.recurrence === null || raw.recurrence === "" ? "NONE" : raw.recurrence;
  if (!RECURRENCES.includes(recurrence)) add("recurrence", `Must be one of: ${RECURRENCES.join(", ")}`);
  let recurrenceUntil = null;
  if (recurrence !== "NONE" && raw.recurrenceUntil) {
    recurrenceUntil = toIsoDate(raw.recurrenceUntil);
    if (!recurrenceUntil) add("recurrenceUntil", "The repeat end date is not a valid date (YYYY-MM-DD)");
    else if (startDate && recurrenceUntil < startDate) add("recurrenceUntil", "The repeat cannot end before the first day");
  }

  const audienceType = raw.audienceType === undefined || raw.audienceType === null || raw.audienceType === "" ? "ALL" : raw.audienceType;
  if (!AUDIENCE_TYPES.includes(audienceType)) add("audienceType", `Must be one of: ${AUDIENCE_TYPES.join(", ")}`);

  let roles = [];
  let classTargets = [];
  if (audienceType === "ROLE") {
    const list = Array.isArray(raw.roles) ? raw.roles : [];
    roles = [...new Set(list.filter((r) => typeof r === "string" && r.trim()).map((r) => r.trim().toUpperCase()))];
    if (!roles.length) add("roles", "Choose at least one role");
    else if (roles.length > MAX_AUDIENCES) add("roles", "Too many roles");
  }
  if (audienceType === "CLASS") {
    const list = Array.isArray(raw.classTargets) ? raw.classTargets : [];
    const seen = new Set();
    for (const [i, t] of list.entries()) {
      const classId = positiveInt(t?.classId);
      const hasSection = t?.sectionId !== undefined && t?.sectionId !== null && t?.sectionId !== "";
      const sectionId = hasSection ? positiveInt(t.sectionId) : null;
      if (!classId || (hasSection && !sectionId)) {
        add(`classTargets[${i}]`, "Each class needs a valid class (and section, when one is given)");
        continue;
      }
      const key = `${classId}:${sectionId ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        classTargets.push({ classId, sectionId });
      }
    }
    if (!classTargets.length && !errors.some((e) => e.field.startsWith("classTargets"))) add("classTargets", "Choose at least one class");
    else if (classTargets.length > MAX_AUDIENCES) add("classTargets", "Too many classes");
  }

  const status = raw.status === undefined || raw.status === null || raw.status === "" ? "PUBLISHED" : raw.status;
  if (!STATUSES.includes(status)) add("status", `Must be one of: ${STATUSES.join(", ")}`);

  const isActive = raw.isActive === undefined ? true : raw.isActive === true || raw.isActive === "true";

  // Where a holiday came from: kept only for holidays.
  const holiday = isHolidayCategory(category);
  const data = {
    title,
    description,
    category,
    startDate,
    endDate,
    isAllDay,
    startTime: isAllDay ? null : startTime,
    endTime: isAllDay ? null : endTime,
    recurrence,
    recurrenceUntil,
    audienceType,
    roles,
    classTargets,
    status,
    isActive,
    source: holiday ? text(raw.source, 255) : null,
    sourceDocument: holiday ? text(raw.sourceDocument, 500) : null,
    sourcePublishedDate: holiday ? text(raw.sourcePublishedDate, 20) : null,
    applicability: holiday ? text(raw.applicability, 500) : null,
  };

  return { errors, data };
};

module.exports = { readEventInput, MAX_EVENT_DAYS };
