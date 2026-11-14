import type { RoleArea } from "@/utils/roles";

/**
 * What a push carries in `data` (backend/src/services/push/index.js). Only ids:
 * the screen it opens loads everything through the API, which checks access.
 */
export type PushData =
  | { type: "notice"; id: number }
  | { type: "assignment" | "graded"; id: number; studentId?: number }
  | { type: "result"; examId: number; studentId?: number }
  | { type: "attendance"; studentId?: number };

const id = (value: unknown): number | null => {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
};

/** Read a notification's data defensively: it arrives from outside the app. */
export const parsePushData = (data: unknown): PushData | null => {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const studentId = id(d.studentId) ?? undefined;
  switch (d.type) {
    case "notice": {
      const noticeId = id(d.id);
      return noticeId ? { type: "notice", id: noticeId } : null;
    }
    case "assignment":
    case "graded": {
      const assignmentId = id(d.id);
      return assignmentId ? { type: d.type, id: assignmentId, studentId } : null;
    }
    case "result": {
      const examId = id(d.examId);
      return examId ? { type: "result", examId, studentId } : null;
    }
    case "attendance":
      return { type: "attendance", studentId };
    default:
      return null;
  }
};

/**
 * The screen a tapped notification opens, for the areas this user can use.
 * Null when nothing fits (the app then just opens where it was).
 */
export const hrefForPush = (push: PushData, areas: RoleArea[]): string | null => {
  const isParent = areas.includes("parent");
  const isStudent = areas.includes("student");
  switch (push.type) {
    case "notice":
      return `/shared/notice/${push.id}`;
    case "assignment":
    case "graded":
      if (!isParent && !isStudent) return null;
      return `/shared/assignment/${push.id}${push.studentId ? `?studentId=${push.studentId}` : ""}`;
    case "result":
      if (!push.studentId || (!isParent && !isStudent)) return null;
      return `/shared/report-card/${push.studentId}/${push.examId}`;
    case "attendance":
      if (isParent) return "/parent/attendance";
      return isStudent ? "/student/attendance" : null;
  }
};
