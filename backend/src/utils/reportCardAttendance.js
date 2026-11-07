/**
 * Attendance on report cards ("ATTENDANCE 61/70").
 *
 * - Total ("70") is entered by the admin per exam: `Exam.workingDays`. It cannot
 *   be derived from the attendance table, where an unmarked day and a holiday
 *   look the same.
 * - Present ("61") counts the student's `present` days, plus `late` days when
 *   the school's layout has `countLateAsPresent`, from the first day of the
 *   academic year to the last day of the exam.
 *
 * Both are frozen on the ReportCard when it is generated (`daysPresent`,
 * `daysLate`, `totalWorkingDays`), like rank and GPA, so a card prints the same
 * numbers until it is regenerated. Late days are stored separately so the
 * late-counts-as-present setting can change without regenerating.
 *
 * Pure: unit-tested in __tests__/reportCardAttendance.test.js.
 */

const MAX_WORKING_DAYS = 366;

/** A valid working-day count, or null to clear it. */
const isValidWorkingDays = (value) =>
  value === null ||
  (Number.isInteger(value) && value >= 1 && value <= MAX_WORKING_DAYS);

/**
 * Dates the present-day count covers: academic year start to exam end. Falls
 * back to the exam start, then the academic year end, when the exam has no
 * end date. Either bound may be null (no limit on that side).
 */
const attendanceWindow = (exam, academicYear) => {
  const to = exam?.endDate || exam?.startDate || academicYear?.endDate || null;
  return {
    from: academicYear?.startDate ? new Date(academicYear.startDate) : null,
    to: to ? new Date(to) : null,
  };
};

/** Prisma `where` for the attendance date range of `attendanceWindow`. */
const attendanceDateFilter = ({ from, to }) => {
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
};

/**
 * Turn `attendance.groupBy({ by: ['studentClassId', 'status'], _count: { _all: true } })`
 * rows into Map(studentClassId -> { present, late }). Absent and excused days
 * are not counted.
 */
const tallyAttendance = (groups = []) => {
  const out = new Map();
  for (const g of groups) {
    const n = typeof g._count === "number" ? g._count : g._count?._all ?? 0;
    const t = out.get(g.studentClassId) || { present: 0, late: 0 };
    if (g.status === "present") t.present += n;
    else if (g.status === "late") t.late += n;
    out.set(g.studentClassId, t);
  }
  return out;
};

/**
 * The two numbers a report card prints. `attendancePresent` is null for cards
 * generated before attendance existed; `attendanceTotal` is null when the exam
 * had no working days set at generation.
 */
const attendanceForCard = (reportCard, layout) => {
  const total = reportCard?.totalWorkingDays ?? null;
  if (!reportCard || reportCard.daysPresent === null || reportCard.daysPresent === undefined) {
    return { attendancePresent: null, attendanceTotal: total };
  }
  const late = layout?.countLateAsPresent === false ? 0 : reportCard.daysLate || 0;
  return { attendancePresent: reportCard.daysPresent + late, attendanceTotal: total };
};

module.exports = {
  MAX_WORKING_DAYS,
  isValidWorkingDays,
  attendanceWindow,
  attendanceDateFilter,
  tallyAttendance,
  attendanceForCard,
};
