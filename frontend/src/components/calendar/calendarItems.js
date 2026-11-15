import { formatTime, formatByPrefs, formatSecondary } from "../../lib/calendar/dateFormatter";

/* How a calendar feed item is described and where it leads. Plain functions, no JSX. */

/** "10:00 AM - 3:30 PM", "All day". */
export const itemTimeText = (item, numerals = "en") => {
  if (item.isAllDay || !item.startTime) return "All day";
  const start = formatTime(item.startTime, numerals);
  return item.endTime ? `${start} - ${formatTime(item.endTime, numerals)}` : start;
};

/** "1 Kartik 2083" or "31 Asoj 2083 to 6 Kartik 2083". */
export const itemDateText = (item, prefs, options) =>
  item.startDate === item.endDate
    ? formatByPrefs(item.startDate, prefs, options)
    : `${formatByPrefs(item.startDate, prefs, options)} to ${formatByPrefs(item.endDate, prefs, options)}`;

/** The same range in the other calendar, for a second line. */
export const itemSecondaryDateText = (item, prefs) =>
  item.startDate === item.endDate
    ? formatSecondary(item.startDate, prefs)
    : `${formatSecondary(item.startDate, prefs)} to ${formatSecondary(item.endDate, prefs)}`;

/**
 * Where a feed item's own page is, for this person. Items that come from
 * another module (exam, assignment, fee, notice) link to that module, which is
 * where they are edited; a school event has no page of its own.
 */
export const itemLink = (item, hasRole) => {
  const admin = hasRole("ADMIN");
  switch (item.source) {
    case "exam":
    case "examSubject":
      return admin ? "/admin/exams" : null;
    case "assignment":
      if (hasRole("TEACHER")) return "/teacher/assignments";
      if (hasRole("STUDENT")) return "/student/assignments";
      if (hasRole("PARENT")) return item.studentId ? `/parent/assignments?child=${item.studentId}` : "/parent/assignments";
      return null;
    case "fee":
      if (admin) return "/admin/fee-structures";
      if (hasRole("ACCOUNTANT")) return "/finance/accounts";
      if (hasRole("STUDENT")) return "/student/fees";
      if (hasRole("PARENT")) return item.studentId ? `/parent/fees?child=${item.studentId}` : "/parent/fees";
      return null;
    case "notice":
      if (admin) return "/admin/notices";
      if (hasRole("TEACHER") || hasRole("EXAM_OFFICER")) return "/teacher/notices";
      if (hasRole("ACCOUNTANT")) return "/accountant/notices";
      if (hasRole("STUDENT")) return "/student/notices";
      if (hasRole("PARENT")) return "/parent/notices";
      return null;
    case "academicYear":
      return admin ? "/admin/academic-years" : null;
    default:
      return null;
  }
};
