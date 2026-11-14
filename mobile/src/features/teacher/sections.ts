import type { TeacherSubject } from "@/types/teacher";

export type TeacherSection = {
  key: string;
  classId: number;
  className: string;
  sectionId: number;
  sectionName: string;
  displayOrder: number;
  isClassTeacher: boolean;
  subjects: { teacherSubjectId: number; classSubjectId: number; subjectName: string }[];
};

/**
 * The teacher's class-sections (current year), each with the subjects they
 * teach there, in the school's class order. Built only from
 * /teacher-subjects, so a teacher is never offered a section they don't teach.
 */
export const sectionsFrom = (assignments: TeacherSubject[]): TeacherSection[] => {
  const map = new Map<string, TeacherSection>();
  for (const a of assignments) {
    const key = `${a.classSubject.classId}:${a.sectionId}`;
    let s = map.get(key);
    if (!s) {
      s = {
        key,
        classId: a.classSubject.classId,
        className: a.classSubject.class.name,
        sectionId: a.sectionId,
        sectionName: a.section.name,
        displayOrder: a.classSubject.class.displayOrder ?? a.classSubject.class.gradeLevel ?? 0,
        isClassTeacher: false,
        subjects: [],
      };
      map.set(key, s);
    }
    s.isClassTeacher = s.isClassTeacher || Boolean(a.isClassTeacher);
    s.subjects.push({ teacherSubjectId: a.id, classSubjectId: a.classSubjectId, subjectName: a.classSubject.subject.name });
  }
  return [...map.values()]
    .map((s) => ({ ...s, subjects: s.subjects.sort((x, y) => x.subjectName.localeCompare(y.subjectName)) }))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.className.localeCompare(b.className) || a.sectionName.localeCompare(b.sectionName));
};

export const sectionLabel = (s: Pick<TeacherSection, "className" | "sectionName">) => `${s.className} ${s.sectionName}`;
