/**
 * Calendar rules with no database: event categories, which of them close the
 * school, who an event is for, and whether a day is a working day.
 */
const { weekdayOf, isIsoDate } = require("./bsDateAdapter");
const { weekdayName } = require("./dateFormatter");

const CATEGORIES = [
  "PUBLIC_HOLIDAY",
  "LOCAL_HOLIDAY",
  "SCHOOL_HOLIDAY",
  "EXAMINATION",
  "PARENT_TEACHER_MEETING",
  "SCHOOL_EVENT",
  "SPORTS_EVENT",
  "ADMISSION_DEADLINE",
  "FEE_DEADLINE",
  "ASSIGNMENT_DEADLINE",
  "ACADEMIC_ACTIVITY",
  "STAFF_MEETING",
  "OTHER",
];

/** The school is closed on a day covered by one of these. */
const HOLIDAY_CATEGORIES = ["PUBLIC_HOLIDAY", "LOCAL_HOLIDAY", "SCHOOL_HOLIDAY"];

/** What a teacher may create for their own classes. */
const TEACHER_CATEGORIES = ["ACADEMIC_ACTIVITY", "ASSIGNMENT_DEADLINE", "PARENT_TEACHER_MEETING", "SCHOOL_EVENT", "SPORTS_EVENT", "OTHER"];

const AUDIENCE_TYPES = ["ALL", "ROLE", "CLASS"];
const STATUSES = ["DRAFT", "PUBLISHED"];

const isHolidayCategory = (category) => HOLIDAY_CATEGORIES.includes(category);

/**
 * True when an event with the given audience reaches a class-section.
 * `audiences` is [{ classId, sectionId }]; a row with no section covers the
 * whole class. An ALL event reaches every class. A ROLE event is addressed to
 * people, not classes, so it never closes a class.
 */
const audienceCoversClass = (audienceType, audiences, classId, sectionId) => {
  if (audienceType === "ALL") return true;
  if (audienceType !== "CLASS") return false;
  return (audiences || []).some(
    (a) => a.classId === classId && (a.sectionId === null || a.sectionId === undefined || a.sectionId === sectionId),
  );
};

/**
 * Why a day is not a working day for a class, or null when it is one.
 *
 * `holidays` are the holiday occurrences that cover the day:
 * [{ title, audienceType, audiences }]. With no classId, only school-wide
 * holidays count.
 * Returns { type: "WEEKLY_HOLIDAY" | "HOLIDAY", reason }.
 */
const nonWorkingReason = (iso, config, holidays = [], { classId = null, sectionId = null } = {}) => {
  if (!isIsoDate(iso)) return null;
  const weekday = weekdayOf(iso);
  if ((config?.weeklyHolidayDays || []).includes(weekday)) {
    return { type: "WEEKLY_HOLIDAY", reason: `${weekdayName(weekday)} is a weekly holiday` };
  }
  const holiday = holidays.find((h) =>
    classId ? audienceCoversClass(h.audienceType, h.audiences, classId, sectionId) : h.audienceType === "ALL",
  );
  return holiday ? { type: "HOLIDAY", reason: `Holiday: ${holiday.title}` } : null;
};

module.exports = {
  CATEGORIES,
  HOLIDAY_CATEGORIES,
  TEACHER_CATEGORIES,
  AUDIENCE_TYPES,
  STATUSES,
  isHolidayCategory,
  audienceCoversClass,
  nonWorkingReason,
};
