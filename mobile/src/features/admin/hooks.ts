import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { academicService } from "@/api/services/academic";
import { examService } from "@/api/services/exams";
import { financeService, type RecordPaymentInput } from "@/api/services/finance";
import { schoolService } from "@/api/services/school";
import { studentService } from "@/api/services/students";
import { userService, type StaffRole } from "@/api/services/users";
import type { Page } from "@/api/types";
import type { PaymentMethod } from "@/types/api";
import type { ReportName } from "@/types/admin";

const nextPage = <T,>(last: Page<T>) => (last.pagination.hasNextPage ? last.pagination.page + 1 : undefined);

export const useStudentsDirectory = (search: string) =>
  useInfiniteQuery({
    queryKey: ["directory", "students", search],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => studentService.list({ search: search || undefined, page: pageParam }, signal),
    getNextPageParam: nextPage,
  });

export const useStaffDirectory = (role: StaffRole, search: string) =>
  useInfiniteQuery({
    queryKey: ["directory", "staff", role, search],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => userService.list({ role, search: search || undefined, page: pageParam }, signal),
    getNextPageParam: nextPage,
  });

/** Total of a list, read from pagination with one row (the API has no count endpoint). */
export const useCount = (key: string, fetchPage: (signal?: AbortSignal) => Promise<Page<unknown>>) =>
  useQuery({ queryKey: ["count", key], queryFn: async ({ signal }) => (await fetchPage(signal)).pagination.total, meta: { persist: true } });

export const useCurrentYear = () =>
  useQuery({ queryKey: ["academic", "current-year"], queryFn: ({ signal }) => academicService.currentYear(signal), meta: { persist: true }, staleTime: 60 * 60 * 1000 });
export const useClasses = () =>
  useQuery({ queryKey: ["academic", "classes"], queryFn: ({ signal }) => academicService.classes(signal), meta: { persist: true }, staleTime: 60 * 60 * 1000 });
export const useSections = () =>
  useQuery({ queryKey: ["academic", "sections"], queryFn: ({ signal }) => academicService.sections(signal), meta: { persist: true }, staleTime: 60 * 60 * 1000 });
export const useSchool = () => useQuery({ queryKey: ["school"], queryFn: ({ signal }) => schoolService.mine(signal), meta: { persist: true } });

export const useExams = () => useQuery({ queryKey: ["exams"], queryFn: ({ signal }) => examService.list(signal), meta: { persist: true } });

export const useSectionReportCards = (params: { examId: number; classId: number; sectionId: number } | null) =>
  useQuery({
    queryKey: ["report-cards", "section", params?.examId, params?.classId, params?.sectionId],
    queryFn: ({ signal }) => examService.sectionReportCards(params!, signal),
    enabled: !!params,
  });

/* --------------------------------------------------------------- finance */

export const useFinanceDashboard = () =>
  useQuery({ queryKey: ["finance", "dashboard"], queryFn: ({ signal }) => financeService.dashboard(signal), meta: { persist: true } });

export const useAccounts = (search: string, status: string) =>
  useInfiniteQuery({
    queryKey: ["finance", "accounts", search, status],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => financeService.accounts({ search: search || undefined, status: status || undefined, page: pageParam }, signal),
    getNextPageParam: nextPage,
  });

export const useTransactions = (filters: { type?: "PAYMENT" | "REVERSAL"; method?: PaymentMethod; from?: string; to?: string }) =>
  useInfiniteQuery({
    queryKey: ["finance", "transactions", filters],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => financeService.transactions({ ...filters, page: pageParam }, signal),
    getNextPageParam: nextPage,
  });

export const useReport = (name: ReportName, query: Record<string, string | number | undefined>) =>
  useQuery({ queryKey: ["finance", "report", name, query], queryFn: ({ signal }) => financeService.report(name, query, signal) });

/** A payment is never retried automatically; the idempotency key makes a manual retry safe. */
export const useRecordPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPaymentInput) => financeService.recordPayment(input),
    onSettled: (_d, _e, input) => {
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["portal", input.studentId] });
    },
  });
};
