/**
 * Response shapes the app reads, taken from the backend controllers and
 * services (see docs/API_MAPPING.md). Only the fields the app uses are listed.
 * Prisma Decimal values arrive as strings, hence `Money`.
 */

export type Money = number | string;
export type IsoDate = string;

export type Named = { id: number; name: string };

/* ----------------------------------------------------------- portal overview */

export type AttendanceCounts = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
};

export type OverviewAttendance = AttendanceCounts & {
  attended?: number;
  percentage: number | string | null;
  countLateAsPresent: boolean;
  lastMarked: IsoDate | null;
  lastStatus: AttendanceStatus | null;
};

export type FeeTotals = { amount: number; discount: number; paid: number; balance: number; overdue: number };

export type FeeYearStatus = "paid" | "partial" | "pending" | "overdue" | "none";

export type Installment = {
  id: number;
  sequence: number;
  label: string;
  dueDate: IsoDate | null;
  amount: number;
  discount: number;
  paid: number;
  balance: number;
  status: string;
  overdue: boolean;
};

export type StudentOverview = {
  student: {
    id: number;
    name: string;
    firstName: string;
    middleName: string | null;
    username: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    admissionNumber: string | null;
    admissionDate: IsoDate | null;
    dateOfBirth: IsoDate | null;
    dateOfBirthBs: string | null;
    gender: string | null;
    bloodGroup: string | null;
    address: string | null;
    emergencyContact: string | null;
  };
  enrolment: {
    studentClassId: number;
    class: Named;
    section: Named;
    rollNumber: number | null;
    academicYear: { id: number; name: string; startDate: IsoDate; endDate: IsoDate };
    classTeacher: string | null;
  } | null;
  subjects: {
    id: number;
    name: string;
    code: string | null;
    isOptional: boolean;
    hasPractical: boolean;
    fullMarks: number | null;
    passMarks: number | null;
    teacher: string | null;
  }[];
  attendance: OverviewAttendance | null;
  latestResult: { examId: number; examName: string; percentage: number | null; overallGrade: string | null; classRank: number | null } | null;
  upcomingExams: { id: number; name: string; examType: string | null; startDate: IsoDate | null; endDate: IsoDate | null; status: ExamStatus }[];
  assignments: { id: number; title: string; dueDate: IsoDate | null; totalMarks: number | null; subject: string; submitted: boolean }[];
  fees: (FeeTotals & { status: FeeYearStatus; nextDue: (Installment & { feeType: string }) | null }) | null;
};

/* -------------------------------------------------------------------- parent */

export type Child = {
  id: number;
  studentId: number;
  fullName: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  admissionNumber: string | null;
  avatarUrl?: string | null;
  user?: { avatarUrl: string | null };
  rollNumber: number | null;
  currentEnrollment: {
    id: number;
    rollNumber: number | null;
    class: { id: number; name: string; gradeLevel: number | null };
    section: Named;
    academicYear: { id: number; name: string; isCurrent: boolean };
  } | null;
  relationship: string | null;
  isPrimary: boolean | null;
};

/* ---------------------------------------------------------------- attendance */

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type StudentAttendance = {
  summary: AttendanceCounts & { attended: number; percentage: string; countLateAsPresent: boolean };
  byMonth: (AttendanceCounts & { year: number; month: number; label: string; percentage?: number | string })[];
  attendances: { id: number; attendanceDate: IsoDate; status: AttendanceStatus; remarks: string | null; bsDate: string | null }[];
};

/* --------------------------------------------------------------- report card */

export type ExamStatus = "DRAFT" | "PUBLISHED" | "LOCKED";

export type PublishedExam = {
  examId: number;
  examName: string;
  examType: string | null;
  academicYear: string;
  className: string;
  sectionName: string;
  overallGrade: string | null;
  percentage: Money | null;
  classRank: number | null;
  generatedAt: IsoDate | null;
};

export type GradeBand = { grade: string; min: number; max: number; gpa: number; description?: string | null; isPassing?: boolean };

export type SubjectResult = {
  subjectId: number;
  subjectName: string;
  subjectCode: string | null;
  creditHours: number;
  theoryCreditHours: number;
  internalCreditHours: number;
  hasTheory: boolean;
  hasPractical: boolean;
  theoryMarks: number | null;
  theoryFullMarks: number | null;
  theoryGrade: string | null;
  theoryGpa: number | null;
  practicalMarks: number | null;
  practicalFullMarks: number | null;
  practicalGrade: string | null;
  practicalGpa: number | null;
  totalMarks: number | null;
  totalFullMarks: number | null;
  finalPercentage: number | null;
  finalGrade: string | null;
  finalGpa: number | null;
  isPassed: boolean;
  isAbsent: boolean;
  remark: string | null;
};

/** Layout as normalised by backend/src/utils/reportCardLayout.js. */
export type ReportCardLayout = {
  template: "nebGradeSheet" | "performanceReport";
  title: string;
  mode: "grades" | "marks" | "both";
  theoryPracticalSplit: "auto" | "always" | "never";
  showSubjectCode: boolean;
  showCreditHours: boolean;
  remarkColumn: "description" | "blank" | "hidden";
  showAttendance: boolean;
  countLateAsPresent: boolean;
  showPercentage: boolean;
  showRank: boolean;
  showResult: boolean;
  showSummaryGrid: boolean;
  showGradeLegend: boolean;
  showTeacherRemarks: boolean;
  signatures: string[];
  showPrincipalName: boolean;
  showSeal: boolean;
  showWatermark: boolean;
  footerText: string;
  studentCodeField: "admissionNumber" | "none" | string;
  classNameStyle: "name" | "wordAndNumeral";
  minTableRows: number;
  design?: Record<string, unknown> | null;
};

export type ReportCard = {
  school: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logoUrl: string | null;
    bannerUrl?: string | null;
    tagline: string | null;
    landlineNumber?: string | null;
    principalName?: string | null;
  };
  examination: {
    name: string;
    type: string | null;
    academicYear: string;
    academicYearBS: string | null;
    yearAD: string | null;
    yearBS: string | null;
    startDate: IsoDate | null;
    endDate: IsoDate | null;
  };
  student: {
    id: number;
    name: string;
    rollNumber: number | null;
    class: string;
    section: string;
    gradeLevel: number | null;
    classWithNumeral: string | null;
    admissionNumber: string | null;
    dobBS: string | null;
    dobAD: string | null;
    gender: string | null;
  };
  subjects: SubjectResult[];
  summary: {
    totalMarks: number;
    totalFullMarks: number;
    percentage: number | null;
    gpa: number | null;
    grade: string | null;
    classRank: number | null;
    isPassed: boolean;
    resultStatus: string | null;
    totalSubjects: number;
    passedSubjects: number;
    failedSubjects: number;
    attendancePresent: number | null;
    attendanceTotal: number | null;
  };
  remarks: { teacher: string | null; principal: string | null };
  meta: { reportCardId: number; isPublished: boolean; generatedAt: IsoDate | null; issueDateBS: string | null; gradeScale: string };
  gradeReference: GradeBand[];
  layout: ReportCardLayout;
};

/* --------------------------------------------------------------- assignments */

export type FileRef = { id: number; fileName: string; fileUrl: string; fileType: string | null; fileSize: number | null };

export type SubmissionSummary = {
  id: number;
  status: "submitted" | "late" | "graded" | string;
  submittedAt: IsoDate | null;
  marksObtained: Money | null;
  feedback: string | null;
};

export type Assignment = {
  id: number;
  title: string;
  description: string | null;
  dueDate: IsoDate | null;
  totalMarks: number | null;
  isPublished: boolean;
  createdAt: IsoDate;
  teacherSubject: {
    id: number;
    classSubject: { class: Named; subject: Named & { code?: string | null } };
    section: Named;
    user?: { firstName: string; middleName: string | null; lastName: string };
  };
  assignmentFiles: FileRef[];
  _count?: { submissions: number };
  submissions?: SubmissionSummary[];
};

/* ------------------------------------------------------------------- notices */

export type NoticePriority = "low" | "normal" | "high" | "urgent";

export type Notice = {
  id: number;
  title: string;
  content: string;
  targetType: "GLOBAL" | "ROLE_SPECIFIC" | "CLASS_SPECIFIC";
  priority: NoticePriority;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishFrom: IsoDate | null;
  publishTo: IsoDate | null;
  publishedAt: IsoDate | null;
  createdAt: IsoDate;
  createdBy: { id: number; firstName: string; middleName: string | null; lastName: string } | null;
};

/* ---------------------------------------------------------------------- fees */

export type PaymentMethod = "cash" | "cheque" | "bank_transfer" | "wallet" | "card";

export type FeeTransaction = {
  id: number;
  type: "PAYMENT" | "REVERSAL";
  receiptNumber: string;
  amount: Money;
  method: PaymentMethod;
  reference: string | null;
  remarks: string | null;
  paidOn: IsoDate;
  createdAt: IsoDate;
  student?: { id: number; admissionNumber: string | null; user: { firstName: string; middleName: string | null; lastName: string } };
  studentClass?: { rollNumber: number | null; class: { name: string }; section: { name: string } } | null;
  academicYear?: Named | null;
  recordedBy?: { id: number; firstName: string; middleName: string | null; lastName: string } | null;
  reverses?: { id: number; receiptNumber: string; paidOn: IsoDate; amount: Money } | null;
  reversedBy?: { id: number; receiptNumber: string; paidOn: IsoDate; reversalReason: string | null; reversalCategory: string | null } | null;
  allocations?: {
    amount: Money;
    installment: { id: number; label: string; sequence: number; dueDate: IsoDate | null; obligation: { id: number; feeStructure: { feeType: Named } } };
  }[];
};

export type FeeDiscount = {
  id: number;
  academicYearId: number;
  name: string;
  kind: "PERCENT" | "AMOUNT" | string;
  value: Money;
  category: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED" | string;
  appliedAmount: number;
};

export type FeeStatementYear = {
  studentClassId: number;
  academicYear: { id: number; name: string; isCurrent: boolean };
  class: Named;
  section: Named;
  rollNumber: number | null;
  fees: {
    id: number;
    feeType: Named;
    amount: number;
    discount: number;
    paid: number;
    balance: number;
    status: string;
    cancelled: boolean;
    cancelReason: string | null;
    overdue: boolean;
    installments: Installment[];
  }[];
  totals: FeeTotals;
  status: FeeYearStatus;
};

export type FeeStatement = {
  student: { id: number; admissionNumber: string | null; name: string };
  years: FeeStatementYear[];
  discounts: FeeDiscount[];
  transactions: FeeTransaction[];
};
