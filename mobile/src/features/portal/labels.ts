import type { Tone } from "@/components/ui";
import type { AttendanceStatus, FeeYearStatus, NoticePriority, PaymentMethod } from "@/types/api";

/** Display words for values the API returns. Meaning stays the server's. */

export const ATTENDANCE_LABEL: Record<AttendanceStatus, { label: string; short: string; tone: Tone }> = {
  present: { label: "Present", short: "P", tone: "success" },
  late: { label: "Late", short: "L", tone: "warning" },
  absent: { label: "Absent", short: "A", tone: "danger" },
  excused: { label: "Excused", short: "E", tone: "info" },
};

export const FEE_STATUS: Record<FeeYearStatus, { label: string; tone: Tone }> = {
  paid: { label: "Paid", tone: "success" },
  partial: { label: "Partly paid", tone: "warning" },
  pending: { label: "Due", tone: "neutral" },
  overdue: { label: "Overdue", tone: "danger" },
  none: { label: "No fees", tone: "neutral" },
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  cheque: "Cheque",
  bank_transfer: "Bank transfer",
  wallet: "Mobile wallet",
  card: "Card",
};

export const PRIORITY: Record<NoticePriority, { label: string; tone: Tone }> = {
  low: { label: "Low", tone: "neutral" },
  normal: { label: "Normal", tone: "neutral" },
  high: { label: "Important", tone: "warning" },
  urgent: { label: "Urgent", tone: "danger" },
};

export const SUBMISSION_LABEL: Record<string, { label: string; tone: Tone }> = {
  submitted: { label: "Submitted", tone: "success" },
  late: { label: "Submitted late", tone: "warning" },
  graded: { label: "Graded", tone: "brand" },
};
