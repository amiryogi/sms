import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignmentService } from "@/api/services/assignments";
import { attendanceService } from "@/api/services/attendance";
import { feeService } from "@/api/services/fees";
import { noticeService } from "@/api/services/notices";
import { portalService } from "@/api/services/portal";
import { reportCardService } from "@/api/services/reportCards";
import type { PickedFile } from "@/api/upload";

/**
 * Query keys: every per-student key carries the student's id, so a parent
 * switching children never sees the previous child's data (CLAUDE.md §6).
 */
export const portalKeys = {
  children: ["parent", "children"] as const,
  overview: (studentId: number) => ["portal", studentId, "overview"] as const,
  attendance: (studentId: number) => ["portal", studentId, "attendance"] as const,
  publishedExams: (studentId: number) => ["portal", studentId, "published-exams"] as const,
  reportCard: (studentId: number, examId: number) => ["portal", studentId, "report-card", examId] as const,
  assignments: (studentId: number | "own") => ["portal", studentId, "assignments"] as const,
  assignment: (id: number) => ["assignment", id] as const,
  fees: (studentId: number) => ["portal", studentId, "fees"] as const,
  receipt: (id: number) => ["receipt", id] as const,
  notices: (search: string) => ["notices", search] as const,
  notice: (id: number) => ["notice", id] as const,
};

// Read-only screens worth opening without a connection (MOBILE_ARCHITECTURE §8).
const persist = { persist: true } as const;

export const useChildrenQuery = (enabled = true) =>
  useQuery({ queryKey: portalKeys.children, queryFn: ({ signal }) => portalService.myChildren(signal), enabled, meta: persist });

export const useOverview = (studentId: number | null) =>
  useQuery({
    queryKey: portalKeys.overview(studentId ?? 0),
    queryFn: ({ signal }) => portalService.overview(studentId!, signal),
    enabled: !!studentId,
    meta: persist,
  });

export const useStudentAttendance = (studentId: number | null) =>
  useQuery({
    queryKey: portalKeys.attendance(studentId ?? 0),
    queryFn: ({ signal }) => attendanceService.studentSummary(studentId!, signal),
    enabled: !!studentId,
    meta: persist,
  });

export const usePublishedExams = (studentId: number | null) =>
  useQuery({
    queryKey: portalKeys.publishedExams(studentId ?? 0),
    queryFn: ({ signal }) => reportCardService.publishedExams(studentId!, signal),
    enabled: !!studentId,
    meta: persist,
  });

export const useReportCard = (studentId: number | null, examId: number | null) =>
  useQuery({
    queryKey: portalKeys.reportCard(studentId ?? 0, examId ?? 0),
    queryFn: ({ signal }) => reportCardService.get(studentId!, examId!, signal),
    enabled: !!studentId && !!examId,
    meta: persist,
    staleTime: 10 * 60 * 1000, // published cards rarely change
  });

/** A student's own list (no id), or a parent's chosen child (?studentId=). */
export const useAssignments = (studentId: number | null, mode: "student" | "parent") =>
  useQuery({
    queryKey: portalKeys.assignments(mode === "student" ? "own" : (studentId ?? 0)),
    queryFn: ({ signal }) => assignmentService.list(mode === "parent" ? { studentId: studentId! } : {}, signal),
    enabled: mode === "student" || !!studentId,
    meta: persist,
  });

export const useAssignment = (id: number) =>
  useQuery({ queryKey: portalKeys.assignment(id), queryFn: ({ signal }) => assignmentService.get(id, signal) });

export const useSubmitAssignment = (assignmentId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { content?: string; files: PickedFile[] }) => assignmentService.submit({ assignmentId, ...input }),
    onSettled: () => {
      // Whatever happened, show what the server now has.
      qc.invalidateQueries({ queryKey: portalKeys.assignment(assignmentId) });
      qc.invalidateQueries({ queryKey: ["portal"] });
    },
  });
};

export const useFeeStatement = (studentId: number | null) =>
  useQuery({
    queryKey: portalKeys.fees(studentId ?? 0),
    queryFn: ({ signal }) => feeService.statement(studentId!, signal),
    enabled: !!studentId,
    meta: persist,
  });

export const useReceipt = (id: number) =>
  useQuery({ queryKey: portalKeys.receipt(id), queryFn: ({ signal }) => feeService.transaction(id, signal), meta: persist });

export const useNotices = (search = "") =>
  useInfiniteQuery({
    queryKey: portalKeys.notices(search),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => noticeService.list({ page: pageParam, search: search || undefined }, signal),
    getNextPageParam: (last) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
    meta: persist,
  });

export const useNotice = (id: number) =>
  useQuery({ queryKey: portalKeys.notice(id), queryFn: ({ signal }) => noticeService.get(id, signal), meta: persist });
