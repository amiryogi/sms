/**
 * The app's pages as the server knows them, for the assistant's page context.
 *
 * The browser sends the path it is on ("/teacher/attendance"). The server never trusts it:
 * `resolveContext` keeps it only if it matches a page below AND one of the user's roles
 * (from the access token) may open that page. Anything else gives no context at all, so a
 * forged path cannot steer the assistant towards another role's pages.
 *
 * This list mirrors frontend/src/App.jsx; a unit test fails when the two drift apart.
 */

const ALL = ["SUPER_ADMIN", "ADMIN", "TEACHER", "EXAM_OFFICER", "ACCOUNTANT", "STUDENT", "PARENT"];
const ADMIN = ["ADMIN"];
const FINANCE = ["ACCOUNTANT", "ADMIN"];

/** [pattern, module, title, roles] */
const ROUTES = [
  ["/dashboard", "dashboard", "Dashboard", ALL],
  ["/account/password", "account", "Change password", ALL],

  ["/admin/dashboard", "dashboard", "Dashboard", ADMIN],
  ["/admin/academic-years", "academics", "Academic Years", ADMIN],
  ["/admin/classes", "academics", "Classes", ADMIN],
  ["/admin/sections", "academics", "Sections", ADMIN],
  ["/admin/subjects", "subjects", "Subjects", ADMIN],
  ["/admin/class-subjects", "subjects", "Class Subjects", ADMIN],
  ["/admin/teacher-assignment", "teachers", "Teacher Assignment", ADMIN],
  ["/admin/students", "students", "Students", ADMIN],
  ["/admin/login-slips", "students", "Class logins", ADMIN],
  ["/admin/teachers", "teachers", "Teachers & Staff", ADMIN],
  ["/admin/parents", "parents", "Parents", ADMIN],
  ["/admin/promotions", "students", "Promotions", ADMIN],
  ["/admin/exams", "examinations", "Exams", ADMIN],
  ["/admin/exam-admin/*", "examinations", "Exam Admin (pilot)", ADMIN],
  ["/admin/report-cards", "report-cards", "Report Cards", ADMIN],
  ["/admin/notices", "notices", "Notices", ADMIN],
  ["/admin/school-settings", "settings", "School Settings", ADMIN],
  ["/admin/fee-types", "fees", "Fee Types", ADMIN],
  ["/admin/fee-structures", "fees", "Fee Structures", ADMIN],

  ["/teacher/dashboard", "dashboard", "Dashboard", ["TEACHER"]],
  ["/teacher/attendance", "attendance", "Attendance", ["TEACHER"]],
  ["/teacher/assignments", "assignments", "Assignments", ["TEACHER"]],
  ["/teacher/students", "students", "My Students", ["TEACHER"]],
  ["/teacher/marks", "marks", "Marks Entry", ["TEACHER", "EXAM_OFFICER", "ADMIN"]],
  ["/teacher/notices", "notices", "Notices", ["TEACHER", "EXAM_OFFICER", "ADMIN"]],

  ["/staff/students", "students", "Students", ["EXAM_OFFICER", "ACCOUNTANT"]],

  ["/finance/dashboard", "finance", "Finance Overview", FINANCE],
  ["/finance/reports", "finance", "Reports", FINANCE],
  ["/finance/collect", "finance", "Collect Fees", FINANCE],
  ["/finance/accounts", "finance", "Student Accounts", FINANCE],
  ["/finance/accounts/:studentId", "finance", "Student Account", FINANCE],
  ["/finance/accounts/:studentId/statement", "finance", "Statement", FINANCE],
  ["/finance/accounts/:studentId/bill", "finance", "Fee bill", FINANCE],
  ["/finance/transactions", "finance", "Transactions", FINANCE],
  ["/finance/discounts", "finance", "Discounts", FINANCE],
  ["/finance/receipts/:id", "finance", "Receipt", FINANCE],
  ["/finance/bills", "finance", "Fee bills", FINANCE],
  ["/finance/daybook", "finance", "Day book", FINANCE],
  ["/accountant/fee-types", "fees", "Fee Types", FINANCE],
  ["/accountant/fee-structures", "fees", "Fee Structures", FINANCE],
  ["/accountant/notices", "notices", "Notices", FINANCE],

  ["/student/dashboard", "dashboard", "Dashboard", ["STUDENT"]],
  ["/student/attendance", "attendance", "Attendance", ["STUDENT"]],
  ["/student/assignments", "assignments", "Assignments", ["STUDENT"]],
  ["/student/results", "results", "Results", ["STUDENT"]],
  ["/student/report-card", "report-cards", "Report Card", ["STUDENT"]],
  ["/student/fees", "fees", "Fees", ["STUDENT"]],
  ["/student/fees/statement", "fees", "Fee statement", ["STUDENT"]],
  ["/student/fees/bill", "fees", "Fee bill", ["STUDENT"]],
  ["/student/receipts/:id", "fees", "Receipt", ["STUDENT"]],
  ["/student/notices", "notices", "Notices", ["STUDENT"]],
  ["/student/profile", "profile", "My Profile", ["STUDENT"]],

  ["/parent/dashboard", "dashboard", "Dashboard", ["PARENT"]],
  ["/parent/attendance", "attendance", "Attendance", ["PARENT"]],
  ["/parent/assignments", "assignments", "Assignments", ["PARENT"]],
  ["/parent/results", "results", "Results", ["PARENT"]],
  ["/parent/report-card", "report-cards", "Report Card", ["PARENT"]],
  ["/parent/fees", "fees", "Fees", ["PARENT"]],
  ["/parent/fees/statement", "fees", "Fee statement", ["PARENT"]],
  ["/parent/fees/bill", "fees", "Fee bill", ["PARENT"]],
  ["/parent/receipts/:id", "fees", "Receipt", ["PARENT"]],
  ["/parent/notices", "notices", "Notices", ["PARENT"]],
  ["/parent/profile", "profile", "Child's Profile", ["PARENT"]],

  ["/calendar", "calendar", "Calendar", ALL],
  ["/calendar/exams", "calendar", "Exam Schedule", ALL],
  ["/calendar/academic", "calendar", "Academic Calendar", ALL],
  ["/calendar/print/:kind", "calendar", "Calendar printout", ALL],
  ["/calendar/events", "calendar", "Events", ["ADMIN", "TEACHER"]],
  ["/calendar/holidays", "holidays", "Holidays", ADMIN],
  ["/calendar/settings", "calendar", "Calendar Settings", ADMIN],
].map(([pattern, module, title, roles]) => ({ pattern, module, title, roles, regex: toRegex(pattern) }));

function toRegex(pattern) {
  const body = pattern
    .split("/")
    .map((part) => (part === "*" ? ".*" : part.startsWith(":") ? "[^/]+" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${body.replace(/\/\.\*$/, "(?:/.*)?")}$`);
}

/** A super admin may open every admin page. */
const canOpen = (route, roles) => {
  const set = new Set(roles || []);
  if (set.has("SUPER_ADMIN")) set.add("ADMIN");
  return route.roles.some((r) => set.has(r));
};

/** Path only, no query or hash, no trailing slash; null when it is not a plausible app path. */
function cleanPath(value) {
  if (typeof value !== "string") return null;
  const path = value.split(/[?#]/)[0].trim().replace(/\/+$/, "") || "/";
  if (path.length > 200 || !/^\/[A-Za-z0-9/_-]*$/.test(path)) return null;
  return path;
}

/**
 * @param {unknown} route   what the browser sent
 * @param {string[]} roles  req.user.roles
 * @returns {{ path: string, pattern: string, module: string, title: string } | null}
 */
function resolveContext(route, roles) {
  const path = cleanPath(route);
  if (!path) return null;
  const match = ROUTES.find((r) => r.regex.test(path));
  if (!match || !canOpen(match, roles)) return null;
  // Ids in the path are not needed and are not kept.
  return { path: match.pattern, pattern: match.pattern, module: match.module, title: match.title };
}

/** Paths a role may open, for checking documents and walkthroughs. */
const routesFor = (roles) => ROUTES.filter((r) => canOpen(r, roles)).map((r) => r.pattern);

module.exports = { ROUTES, resolveContext, routesFor, cleanPath };
