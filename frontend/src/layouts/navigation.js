import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarRange,
  CalendarCheck,
  Layers,
  Library,
  BookOpenCheck,
  ClipboardList,
  PenLine,
  Award,
  UserCog,
  UsersRound,
  GraduationCap,
  Contact,
  Megaphone,
  Tags,
  ReceiptText,
  Wallet,
  ArrowUpRight,
  Building2,
  NotebookPen,
  FileBarChart,
} from "lucide-react";

/*
 * Sidebar navigation per role, in sections. A user holding several roles gets
 * every section; a link that appears twice is kept once. Paths must exist in
 * App.jsx with matching ProtectedRoute roles.
 */

const ADMIN = [
  { label: "Overview", items: [{ title: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" }] },
  {
    label: "Academics",
    items: [
      { title: "Academic Years", icon: CalendarRange, path: "/admin/academic-years" },
      { title: "Classes", icon: BookOpen, path: "/admin/classes" },
      { title: "Sections", icon: Layers, path: "/admin/sections" },
      { title: "Subjects", icon: Library, path: "/admin/subjects" },
      { title: "Class Subjects", icon: BookOpenCheck, path: "/admin/class-subjects" },
      { title: "Teacher Assignment", icon: UserCog, path: "/admin/teacher-assignment" },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Students", icon: GraduationCap, path: "/admin/students" },
      { title: "Teachers & Staff", icon: UsersRound, path: "/admin/teachers" },
      { title: "Parents", icon: Contact, path: "/admin/parents" },
      { title: "Promotions", icon: ArrowUpRight, path: "/admin/promotions" },
    ],
  },
  {
    label: "Exams & Results",
    items: [
      { title: "Exams", icon: ClipboardList, path: "/admin/exams" },
      { title: "Marks Entry", icon: PenLine, path: "/teacher/marks" },
      { title: "Report Cards", icon: Award, path: "/admin/report-cards" },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Fee Payments", icon: Wallet, path: "/admin/fee-payments" },
      { title: "Fee Structures", icon: ReceiptText, path: "/admin/fee-structures" },
      { title: "Fee Types", icon: Tags, path: "/admin/fee-types" },
    ],
  },
  { label: "Communication", items: [{ title: "Notices", icon: Megaphone, path: "/admin/notices" }] },
  { label: "Settings", items: [{ title: "School Settings", icon: Building2, path: "/admin/school-settings" }] },
];

const TEACHER = [
  {
    label: "Teaching",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/teacher/dashboard" },
      { title: "My Students", icon: GraduationCap, path: "/teacher/students" },
      { title: "Attendance", icon: CalendarCheck, path: "/teacher/attendance" },
      { title: "Assignments", icon: NotebookPen, path: "/teacher/assignments" },
      { title: "Marks Entry", icon: PenLine, path: "/teacher/marks" },
      { title: "Notices", icon: Megaphone, path: "/teacher/notices" },
    ],
  },
];

const EXAM_OFFICER = [
  {
    label: "Exams",
    items: [
      { title: "Marks Entry", icon: PenLine, path: "/teacher/marks" },
      { title: "Students", icon: GraduationCap, path: "/staff/students" },
      { title: "Notices", icon: Megaphone, path: "/teacher/notices" },
    ],
  },
];

const ACCOUNTANT = [
  {
    label: "Finance",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/accountant/dashboard" },
      { title: "Fee Payments", icon: Wallet, path: "/accountant/fee-payments" },
      { title: "Fee Structures", icon: ReceiptText, path: "/accountant/fee-structures" },
      { title: "Fee Types", icon: Tags, path: "/accountant/fee-types" },
      { title: "Students", icon: GraduationCap, path: "/staff/students" },
      { title: "Notices", icon: Megaphone, path: "/accountant/notices" },
    ],
  },
];

const STUDENT = [
  {
    label: "My school",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/student/dashboard" },
      { title: "Assignments", icon: NotebookPen, path: "/student/assignments" },
      { title: "Results", icon: FileBarChart, path: "/student/results" },
      { title: "Report Card", icon: Award, path: "/student/report-card" },
      { title: "Fees", icon: Wallet, path: "/student/fees" },
      { title: "Notices", icon: Megaphone, path: "/student/notices" },
    ],
  },
];

const PARENT = [
  {
    label: "My children",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/parent/dashboard" },
      { title: "Attendance", icon: CalendarCheck, path: "/parent/attendance" },
      { title: "Results", icon: FileBarChart, path: "/parent/results" },
      { title: "Report Card", icon: Award, path: "/parent/report-card" },
      { title: "Fees", icon: Wallet, path: "/parent/fees" },
      { title: "Notices", icon: Megaphone, path: "/parent/notices" },
    ],
  },
];

/** Sections for this user. `hasRole("ADMIN")` is also true for SUPER_ADMIN. */
export const getNavSections = (hasRole) => {
  const sections = [];
  if (hasRole("ADMIN")) sections.push(...ADMIN);
  if (hasRole("TEACHER")) sections.push(...TEACHER);
  if (hasRole("EXAM_OFFICER") && !hasRole("TEACHER") && !hasRole("ADMIN")) sections.push(...EXAM_OFFICER);
  if (hasRole("ACCOUNTANT") && !hasRole("ADMIN")) sections.push(...ACCOUNTANT);
  if (hasRole("STUDENT")) sections.push(...STUDENT);
  if (hasRole("PARENT")) sections.push(...PARENT);

  const seen = new Set();
  return sections
    .map((s) => ({
      ...s,
      items: s.items.filter((item) => {
        if (seen.has(item.path)) return false;
        seen.add(item.path);
        return true;
      }),
    }))
    .filter((s) => s.items.length > 0);
};

const ALL = [ADMIN, TEACHER, EXAM_OFFICER, ACCOUNTANT, STUDENT, PARENT].flat();

/** Page title for a path, for breadcrumbs and the document title. */
export const titleForPath = (pathname) => {
  for (const section of ALL) {
    const hit = section.items.find((i) => i.path === pathname);
    if (hit) return { title: hit.title, section: section.label };
  }
  const last = pathname.split("/").filter(Boolean).pop() || "dashboard";
  return {
    title: last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    section: null,
  };
};

// "EXAM_OFFICER" -> "Exam Officer"
export const formatRoleName = (role) =>
  String(role || "")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
