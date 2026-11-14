/** Shapes of the admin, exam-office and finance endpoints the app reads (docs/API_MAPPING.md). */
import type { ExamStatus, FeeTransaction, IsoDate, Named } from "./api";

export type AcademicYear = { id: number; name: string; startDate: IsoDate; endDate: IsoDate; isCurrent: boolean };
export type SchoolClass = { id: number; name: string; gradeLevel: number | null; displayOrder?: number | null };
export type SchoolSection = { id: number; name: string };

/** GET /students row. */
export type StudentRow = {
  id: number;
  userId: number;
  username: string | null;
  email: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string | null;
  admissionNumber: string | null;
  dateOfBirth: IsoDate | null;
  gender: string | null;
  rollNumber: number | null;
  class: string | null;
  section: string | null;
  status: string;
  avatarUrl: string | null;
};

/** GET /users row. */
export type StaffRow = {
  id: number;
  username: string | null;
  email: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  roles: string[];
};

/** GET /exams row. */
export type ExamRow = {
  id: number;
  name: string;
  examType: string | null;
  status: ExamStatus;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  workingDays?: number | null;
  academicYear: { id: number; name: string } | null;
  _count?: { examSubjects: number };
};

/** GET /report-cards?examId&classId&sectionId (admin). */
export type SectionReportCards = {
  summary: {
    examName: string;
    totalStudents: number;
    reportCardsGenerated: number;
    published: number;
    passed: number;
    failed: number;
  };
  students: {
    studentId: number;
    rollNumber: number | null;
    firstName: string;
    middleName: string | null;
    lastName: string;
    percentage: number | null;
    gpa: number | null;
    overallGrade: string | null;
    isPassed: boolean;
    reportCard: { id: number; overallGrade: string | null; classRank: number | null; isPublished: boolean; generatedAt: IsoDate | null } | null;
  }[];
};

/** GET /fees/accounts row. */
export type AccountRow = {
  studentId: number;
  studentClassId: number;
  name: string;
  avatarUrl: string | null;
  admissionNumber: string | null;
  rollNumber: number | null;
  class: Named;
  section: Named;
  amount: number;
  discount: number;
  paid: number;
  balance: number;
  overdue: number;
  status: "paid" | "partial" | "pending" | "overdue" | "none";
};

export type Breakdown = { key: number | string; label: string; expected: number; collected: number; outstanding: number; students: number };

/** GET /fees/dashboard (utils/financeReports.js). */
export type FinanceDashboard = {
  academicYear: { id: number; name: string; startDate: IsoDate; endDate: IsoDate; isCurrent: boolean };
  kpis: {
    expectedGross: number;
    discounts: number;
    expectedNet: number;
    collected: number;
    outstanding: number;
    collectionRate: number;
    today: number;
    thisMonth: { label: string; from: string; to: string; amount: number };
    pending: { installments: number; amount: number };
    overdue: { installments: number; amount: number; students: number };
  };
  series: {
    daily: { date: string; amount: number }[];
    monthly: { key: string; label: string; amount: number }[];
    byClass: Breakdown[];
    byFeeType: Breakdown[];
  };
  overdueStudents: (AccountRow & { overdue: number })[];
  recentTransactions: FeeTransaction[];
};

export type ReportName = "collections" | "outstanding" | "discounts" | "reversals";

/** GET /fees/reports/:report */
export type FinanceReport = {
  title: string;
  subtitle?: string | null;
  columns: { key: string; label: string; type?: "text" | "money" | "number" | "date" | "percent" | string }[];
  rows: Record<string, unknown>[];
  totals?: Record<string, unknown> | null;
};
