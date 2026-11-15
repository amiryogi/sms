import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignmentService, type AssignmentInput } from "@/api/services/assignments";
import { attendanceService, type MarkAttendanceInput } from "@/api/services/attendance";
import { marksService } from "@/api/services/marks";
import { teacherService } from "@/api/services/teachers";
import type { PickedFile } from "@/api/upload";
import { useUser } from "@/contexts/AuthContext";
import { draftKey, readJson, removeKey, writeJson } from "@/lib/storage";
import type { Money } from "@/types/api";
import type { SaveMarksInput } from "@/types/teacher";

export const teacherKeys = {
  assignments: ["teacher", "assignments"] as const,
  students: ["teacher", "students"] as const,
  sectionDay: (classId: number, sectionId: number, date: string) => ["attendance", "section", classId, sectionId, date] as const,
  marksExams: ["marks", "exams"] as const,
  marksStudents: (examSubjectId: number, sectionId: number) => ["marks", "students", examSubjectId, sectionId] as const,
  ownAssignments: ["teacher", "own-assignments"] as const,
  submissions: (assignmentId: number) => ["teacher", "submissions", assignmentId] as const,
};

export const useTeacherAssignments = () =>
  useQuery({ queryKey: teacherKeys.assignments, queryFn: ({ signal }) => teacherService.myAssignments(signal), meta: { persist: true } });

export const useMyStudents = () =>
  useQuery({ queryKey: teacherKeys.students, queryFn: ({ signal }) => teacherService.myStudents(signal), meta: { persist: true } });

/** A section's register for one day, always fresh from the server (never persisted). */
export const useSectionDay = (classId: number | null, sectionId: number | null, date: string) =>
  useQuery({
    queryKey: teacherKeys.sectionDay(classId ?? 0, sectionId ?? 0, date),
    queryFn: ({ signal }) => attendanceService.forSection({ classId: classId!, sectionId: sectionId!, date }, signal),
    enabled: !!classId && !!sectionId,
    staleTime: 0,
  });

export const useMarkAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkAttendanceInput) => attendanceService.mark(input),
    onSettled: (_d, _e, input) => {
      qc.invalidateQueries({ queryKey: teacherKeys.sectionDay(input.classId, input.sectionId, input.date) });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
};

export const useMarksExams = () =>
  useQuery({ queryKey: teacherKeys.marksExams, queryFn: ({ signal }) => marksService.exams(signal), staleTime: 30_000 });

/** Students and existing marks: always fresh (never persisted). */
export const useMarksStudents = (examSubjectId: number | null, sectionId: number | null) =>
  useQuery({
    queryKey: teacherKeys.marksStudents(examSubjectId ?? 0, sectionId ?? 0),
    queryFn: ({ signal }) => marksService.students(examSubjectId!, sectionId!, signal),
    enabled: !!examSubjectId && !!sectionId,
    staleTime: 0,
  });

export const useSaveMarks = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveMarksInput) => marksService.save(input),
    onSettled: (_d, _e, input) => qc.invalidateQueries({ queryKey: teacherKeys.marksStudents(input.examSubjectId, input.sectionId) }),
  });
};

export const useOwnAssignments = () =>
  useQuery({ queryKey: teacherKeys.ownAssignments, queryFn: ({ signal }) => assignmentService.list({}, signal), meta: { persist: true } });

export const useCreateAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignmentInput & { teacherSubjectId: number; files: PickedFile[] }) => assignmentService.create(input),
    onSettled: () => qc.invalidateQueries({ queryKey: teacherKeys.ownAssignments }),
  });
};

export const useUpdateAssignment = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<AssignmentInput>) => assignmentService.update(id, input),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: teacherKeys.ownAssignments });
      qc.invalidateQueries({ queryKey: ["assignment", id] });
    },
  });
};

export const useDeleteAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => assignmentService.remove(id),
    onSettled: () => qc.invalidateQueries({ queryKey: teacherKeys.ownAssignments }),
  });
};

export const useSubmissions = (assignmentId: number) =>
  useQuery({ queryKey: teacherKeys.submissions(assignmentId), queryFn: ({ signal }) => assignmentService.submissions(assignmentId, signal) });

export const useGrade = (assignmentId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, ...input }: { submissionId: number; marksObtained: Money; feedback?: string }) =>
      assignmentService.grade(submissionId, input),
    onSettled: () => qc.invalidateQueries({ queryKey: teacherKeys.submissions(assignmentId) }),
  });
};

/**
 * Unsent entries (attendance, marks) kept on this phone until the server
 * confirms them. Per user and screen; deleted at sign-out; never sent by
 * itself. Read through a query so screens derive from it without effects.
 */
export const useDraft = <T,>(name: string) => {
  const user = useUser();
  const qc = useQueryClient();
  const key = draftKey(user.id, name);
  const query = useQuery({
    queryKey: ["draft", key],
    queryFn: () => readJson<T | null>(key, null),
    staleTime: Infinity,
    gcTime: 0,
    networkMode: "always",
  });
  const save = useCallback(
    (value: T) => {
      qc.setQueryData(["draft", key], value);
      writeJson(key, value);
    },
    [qc, key],
  );
  const clear = useCallback(() => {
    qc.setQueryData(["draft", key], null);
    removeKey(key);
  }, [qc, key]);
  return { draft: query.data ?? null, loaded: query.isSuccess, save, clear };
};
