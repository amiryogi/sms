/*
 * Copy and data for the public product site (Home, Features, Portals, Tour, Contact).
 * The pages only render what is here. Describe only what the system really does
 * (CLAUDE.md §6). Screenshots are captured from the real app on demo data by
 * `cd e2e && npm run screenshots` and live in public/screenshots/.
 */
import {
  BadgeCheck,
  BookOpenCheck,
  Briefcase,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Megaphone,
  PenLine,
  Receipt,
  School,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

export const PRODUCT = {
  name: "Vidyalaya SMS",
  tagline: "School management for Nepali schools, KG to Grade 10",
  description:
    "Attendance, exams, NEB report cards, fees and parent access in one system, built around the Bikram Sambat calendar.",
};

// ---- Contact -------------------------------------------------------------

const PHONE_INTL = "9779861158271";

export const CONTACT = {
  phoneDisplay: "+977 986-1158271",
  phoneLocal: "9861158271",
  email: "amirsvi766@gmail.com",
  tel: `tel:+${PHONE_INTL}`,
  whatsapp: `https://wa.me/${PHONE_INTL}`,
  viber: `viber://chat?number=%2B${PHONE_INTL}`,
  mailto: "mailto:amirsvi766@gmail.com",
};

/** wa.me link with a message filled in. */
export const whatsappLink = (text) => `${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;

/** mailto: link with a subject and body filled in. */
export const mailtoLink = (subject, body) =>
  `${CONTACT.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const CREDIT = { name: "Amir Shrestha", url: "https://amirlearner.me" };

// ---- Navigation ----------------------------------------------------------

export const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/features", label: "Features" },
  { to: "/portals", label: "Portals" },
  { to: "/tour", label: "Tour" },
  { to: "/contact", label: "Contact" },
];

// ---- Screenshots ---------------------------------------------------------

const shot = (name, title, caption, area, path) => ({
  name,
  src: `/screenshots/${name}.jpg`,
  width: 1440,
  height: 900,
  title,
  caption,
  area,
  path,
});

export const SHOT_AREAS = ["All", "Administration", "Exams & results", "Finance", "Portals"];

export const SCREENSHOTS = {
  adminDashboard: shot("admin-dashboard", "Admin dashboard", "Students, staff, classes and quick actions for the current academic year.", "Administration", "/admin/dashboard"),
  students: shot("admin-students", "Student directory", "Search by name, username or admission number; enrolment, parents and class logins from one row.", "Administration", "/admin/students"),
  settings: shot("admin-school-settings", "Report card layout", "Each school picks its template, title, signatures and what the printed card shows, with a live preview.", "Administration", "/admin/school-settings"),
  exams: shot("admin-exams", "Exams and their lifecycle", "Draft, publish for marks entry, then lock before report cards are generated.", "Exams & results", "/admin/exams"),
  marks: shot("marks-entry", "Marks entry", "Theory and practical marks per subject, checked against full marks, with keyboard navigation.", "Exams & results", "/teacher/marks"),
  reportCards: shot("admin-report-cards", "Report card generation", "GPA, grade, rank and attendance for a whole section; publish when checked, print all at once.", "Exams & results", "/admin/report-cards"),
  reportCard: shot("student-report-card", "NEB grade sheet", "A print-ready A4 grade sheet on the national grade scale, saved as PDF from the browser.", "Exams & results", "/student/report-card"),
  teacherDashboard: shot("teacher-dashboard", "Teacher dashboard", "A teacher's classes, subjects and exams open for marks.", "Exams & results", "/teacher/dashboard"),
  attendance: shot("teacher-attendance", "Daily attendance register", "Present, absent, late or excused for each student, all present in one click.", "Administration", "/teacher/attendance"),
  financeDashboard: shot("finance-dashboard", "Finance overview", "Collected, owed and overdue at a glance, by day and by Nepali month.", "Finance", "/finance/dashboard"),
  account: shot("finance-account", "Student fee account", "Fees by installment, payments with receipt numbers, discounts and the running balance.", "Finance", "/finance/accounts"),
  transactions: shot("finance-transactions", "Fee ledger", "Every payment and reversal, never edited or deleted. Print the day book for any period.", "Finance", "/finance/transactions"),
  reports: shot("finance-reports", "Financial reports", "Collections, outstanding, discounts and reversals, printable or as a CSV spreadsheet.", "Finance", "/finance/reports"),
  studentDashboard: shot("student-dashboard", "Student dashboard", "Attendance, latest result, fees, assignments, subjects and notices in one view.", "Portals", "/student/dashboard"),
  studentResults: shot("student-results", "Student results", "Marks, grades and GPA from published report cards only.", "Portals", "/student/results"),
  studentAttendance: shot("student-attendance", "Attendance by Nepali month", "The year's register by BS month, with the attendance rate.", "Portals", "/student/attendance"),
  parentDashboard: shot("parent-dashboard", "Parent dashboard", "A parent sees each linked child's attendance, results and fees.", "Portals", "/parent/dashboard"),
  parentFees: shot("parent-fees", "Fees for parents", "What is due, what has been paid, receipts and printable bills.", "Portals", "/parent/fees"),
};

export const MOBILE_SHOT = {
  src: "/screenshots/student-dashboard-mobile.jpg",
  width: 780,
  height: 1688,
  title: "Student dashboard on a phone",
};

/** Every screenshot, in tour order. */
export const TOUR = Object.values(SCREENSHOTS);

// ---- Features ------------------------------------------------------------

export const FEATURES = [
  {
    id: "academics",
    icon: School,
    title: "Academic setup",
    summary: "Years, classes from KG to Grade 10, sections, subjects and who teaches what.",
    points: [
      "Academic years with one marked current; everything is scoped to its year",
      "Classes and sections, subjects with theory and practical parts and credit hours",
      "Teacher assignment per subject and section, and class teachers",
      "Year-end promotions that move whole classes forward",
      "Subject lists imported from Excel",
    ],
    shots: ["adminDashboard", "students"],
  },
  {
    id: "attendance",
    icon: CalendarCheck,
    title: "Attendance",
    summary: "A daily register in a few taps, and a Nepali-month calendar for families.",
    points: [
      "Present, absent, late or excused, with \"all present\" in one click",
      "Teachers see only the classes they teach",
      "Students and parents see the register by Bikram Sambat month",
      "Attendance rate and days present printed on the report card (e.g. 61/70)",
      "The school decides whether late counts as present",
    ],
    shots: ["attendance", "studentAttendance"],
  },
  {
    id: "exams",
    icon: PenLine,
    title: "Exams and marks entry",
    summary: "A clear exam lifecycle so marks are entered once and never change under you.",
    points: [
      "Draft → Published → Locked: marks can be entered only while an exam is published",
      "Full and pass marks are frozen when the exam is created",
      "Theory and practical marks, absent students and remarks",
      "Teachers enter their own subjects; an exam officer can enter any",
      "Out-of-range marks are flagged before saving",
    ],
    shots: ["exams", "marks"],
  },
  {
    id: "report-cards",
    icon: BadgeCheck,
    title: "Report cards",
    summary: "NEB-style grade sheets with GPA, rank and attendance, printed in bulk on A4.",
    points: [
      "Grades on the NEB 8-band scale (A+ to NG), or the school's own scale",
      "GPA, percentage, class rank and pass/fail for every student",
      "Students and parents see results only after the school publishes them",
      "Two templates, with title, signatures, fonts and logo set per school",
      "Print one card or a whole section, one A4 page each",
    ],
    shots: ["reportCards", "reportCard", "settings"],
  },
  {
    id: "fees",
    icon: Wallet,
    title: "Fees and receipts",
    summary: "A proper ledger: every rupee traceable, receipts numbered by fiscal year.",
    points: [
      "Fee types and structures per class, split into installments with due dates",
      "Receipts numbered per Nepali fiscal year (RCP-2083-84-00042)",
      "Mistakes undone by an approved reversal, never by editing a payment",
      "Discounts and scholarships go through admin approval",
      "Fee bills and receipts four to an A4 page, statements and the day book",
      "Dashboard charts and reports downloadable as CSV",
    ],
    shots: ["financeDashboard", "account", "transactions", "reports"],
  },
  {
    id: "portals",
    icon: GraduationCap,
    title: "Student and parent portals",
    summary: "Families see attendance, results, report cards and fees without calling the office.",
    points: [
      "Students: attendance, assignments, results, report card, fees and profile",
      "Parents: every linked child, with a switcher on every page",
      "Receipts, statements and bills printable from home",
      "Works on a phone",
    ],
    shots: ["studentDashboard", "parentFees", "studentResults"],
  },
  {
    id: "communication",
    icon: Megaphone,
    title: "Notices and assignments",
    summary: "Announcements for the whole school, a role or a class, and homework handed in online.",
    points: [
      "Notices for everyone, for one role, or for one class, with priority",
      "Teachers set assignments for their classes, with files",
      "Students hand in text or files; teachers grade them",
      "Parents follow their child's assignments",
    ],
    shots: ["teacherDashboard", "parentDashboard"],
  },
  {
    id: "security",
    icon: ShieldCheck,
    title: "Accounts and security",
    summary: "Each person sees only what their role allows, checked on the server.",
    points: [
      "Seven roles: super admin, admin, teacher, exam officer, accountant, student, parent",
      "Sign in with a username or email; admission numbers work for students",
      "Passwords set by the school must be changed at first sign-in",
      "Class login slips printed four to a page for new students",
      "Every school's data kept apart; uploads checked before they are stored",
    ],
    shots: [],
  },
];

/** The six cards on the home page. */
export const HOME_FEATURES = ["attendance", "exams", "report-cards", "fees", "portals", "communication"].map((id) =>
  FEATURES.find((f) => f.id === id),
);

// ---- Built for Nepal -----------------------------------------------------

export const NEPAL_POINTS = [
  { title: "Bikram Sambat dates", text: "Dates are stored in AD and shown in BS, so registers, receipts and reports read the way your school does." },
  { title: "NEB grading", text: "The national 8-band grade scale with grade points, or the legacy SLC scale, applied the same way on every card." },
  { title: "Nepali fiscal year", text: "Receipts restart each Shrawan and carry the fiscal year in their number: RCP-2083-84-00042." },
  { title: "KG to Grade 10", text: "Class-wide subjects with theory and practical marks, exactly how basic and secondary schools work." },
];

export const FACTS = [
  { value: "KG–10", label: "Every class, one system" },
  { value: "7", label: "Role-based portals" },
  { value: "BS", label: "Bikram Sambat dates" },
  { value: "A4", label: "Print-ready cards & bills" },
];

// ---- Roles ---------------------------------------------------------------

export const ROLES = [
  {
    id: "admin",
    icon: Briefcase,
    title: "Administrator",
    summary: "Runs the school year from start to finish.",
    shot: "adminDashboard",
    can: [
      "Set up academic years, classes, sections and subjects",
      "Enrol students, add teachers, staff and parents",
      "Create, publish and lock exams",
      "Generate, publish and print report cards",
      "Promote classes at year end",
      "Brand the school, choose the grade scale and the report card layout",
      "Approve fee reversals and discounts",
    ],
  },
  {
    id: "teacher",
    icon: Users,
    title: "Teacher",
    summary: "Works only with the classes and subjects assigned to them.",
    shot: "teacherDashboard",
    can: [
      "Take the daily attendance register",
      "Enter theory and practical marks for their subjects",
      "Set assignments and grade what students hand in",
      "See their students and the school's notices",
    ],
  },
  {
    id: "exam-officer",
    icon: ClipboardList,
    title: "Exam officer",
    summary: "Gets marks in on time, for any subject.",
    shot: "marks",
    can: [
      "Enter marks for any subject in a published exam",
      "Look up students in a read-only directory",
      "Read notices",
    ],
  },
  {
    id: "accountant",
    icon: Receipt,
    title: "Accountant",
    summary: "Collects fees and keeps the books straight.",
    shot: "financeDashboard",
    can: [
      "Collect fees and print numbered receipts",
      "Print fee bills, statements and the day book",
      "Request discounts and reversals for admin approval",
      "Run collection, outstanding and discount reports, or download them as CSV",
    ],
  },
  {
    id: "student",
    icon: UserRound,
    title: "Student",
    summary: "Sees their own school life, nobody else's.",
    shot: "studentDashboard",
    can: [
      "Check attendance by Nepali month",
      "Hand in assignments as text or files",
      "See results and print the report card once published",
      "See fees, receipts and discounts",
    ],
  },
  {
    id: "parent",
    icon: BookOpenCheck,
    title: "Parent",
    summary: "Follows every linked child from one account.",
    shot: "parentDashboard",
    can: [
      "Switch between children on every page",
      "Follow attendance, assignments and results",
      "Print report cards, receipts, statements and bills",
      "Read the school's notices",
    ],
  },
];

// ---- Contact page FAQ ----------------------------------------------------

export const FAQ = [
  {
    q: "Which schools is it for?",
    a: "Schools in Nepal teaching Kindergarten to Grade 10. Grade 11–12 (NEB +2) is not covered.",
  },
  {
    q: "Can parents and students use it on a phone?",
    a: "Yes. Every page works in a phone's browser; there is nothing to install.",
  },
  {
    q: "Can we print our own report card format?",
    a: "Each school chooses a template and sets the title, signatures, fonts, logo and what the card shows. Report cards print on A4, one page each.",
  },
  {
    q: "How do students and parents get their logins?",
    a: "The school creates them. Class login slips print four to a page, and everyone sets their own password at first sign-in.",
  },
];

