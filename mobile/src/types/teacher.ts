/** Shapes of the teacher, marks-entry and grading endpoints (see docs/API_MAPPING.md). */
import type { ExamStatus, FileRef, IsoDate, Money, Named } from "./api";

/** GET /teacher-subjects row. */
export type TeacherSubject = {
  id: number;
  userId: number;
  classSubjectId: number;
  sectionId: number;
  academicYearId: number;
  isClassTeacher?: boolean;
  classSubject: {
    id: number;
    classId: number;
    class: Named & { displayOrder?: number | null; gradeLevel?: number | null };
    subject: Named & { code?: string | null };
    academicYear: { id: number; name: string; isCurrent: boolean } | null;
  };
  section: Named;
};

/** GET /teachers/my-students */
export type MyStudents = {
  summary: { totalClasses: number; totalSections: number; totalStudents: number };
  classes: {
    classId: number;
    className: string;
    sections: {
      sectionId: number;
      sectionName: string;
      students: {
        studentId: number;
        rollNumber: number | null;
        fullName: string;
        admissionNumber: string | null;
        avatarUrl: string | null;
      }[];
    }[];
  }[];
};

/** ExamSubject: the snapshot of a ClassSubject when the exam was created (CLAUDE.md §4.5). */
export type ExamSubjectSnapshot = {
  id: number;
  examId: number;
  classSubjectId: number;
  examDate: IsoDate | null;
  hasTheory: boolean;
  hasPractical: boolean;
  fullMarks: number;
  passMarks: number;
  theoryFullMarks: number | null;
  practicalFullMarks: number | null;
  classSubject: { id: number; classId: number; class: Named; subject: Named & { code?: string | null } };
};

/** GET /exam-results/exams row (PUBLISHED exams only). */
export type MarksEntryExam = {
  id: number;
  name: string;
  examType: string | null;
  status: ExamStatus;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  academicYear: { id: number; name: string } | null;
  examSubjects: (ExamSubjectSnapshot & {
    /** Teacher: their sections. Exam officer / admin: every section with students. */
    assignedSectionIds: number[];
    sections?: Named[];
  })[];
};

export type ExistingResult = {
  id: number;
  marksObtained: Money | null;
  practicalMarks: Money | null;
  isAbsent: boolean;
  remarks: string | null;
};

/** GET /exam-results/students */
export type MarksEntryStudents = {
  examSubject: ExamSubjectSnapshot & { exam: { id: number; name: string; status: ExamStatus } };
  students: {
    studentId: number;
    studentClassId: number;
    rollNumber: number | null;
    firstName: string;
    middleName: string | null;
    lastName: string;
    existingResult: ExistingResult | null;
  }[];
};

export type SaveMarksInput = {
  examSubjectId: number;
  sectionId: number;
  results: { studentId: number; marksObtained: number; practicalMarks: number; isAbsent: boolean; remarks: string }[];
};

/** GET /submissions/assignment/:id row. */
export type SubmissionDetail = {
  id: number;
  assignmentId: number;
  studentId: number;
  content: string | null;
  status: "submitted" | "late" | "graded" | string;
  submittedAt: IsoDate | null;
  marksObtained: Money | null;
  feedback: string | null;
  student: { id: number; admissionNumber: string | null; user: { firstName: string; middleName: string | null; lastName: string; avatarUrl: string | null } };
  submissionFiles: FileRef[];
};
