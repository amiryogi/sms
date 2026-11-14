/**
 * The in-app notification feed, built only from data the app already reads
 * (there is no notification API and no push yet: docs/API_GAPS.md #1, #10).
 * Pure functions here; useNotificationFeed.ts gathers the inputs.
 */
import type { Assignment, Notice, PublishedExam, StudentOverview } from "@/types/api";
import { formatMoney } from "@/utils/format";

export type FeedItem = {
  /** Stable across fetches: "<kind>:<id>[:<studentId>]". */
  id: string;
  kind: "notice" | "assignment" | "graded" | "result" | "fees";
  title: string;
  body: string;
  /** ISO date the event happened (or the best the API gives). */
  date: string;
  href: string;
};

type ChildData = {
  studentId: number;
  /** First name, for parents with several children. */
  name?: string;
  assignments?: Assignment[];
  publishedExams?: PublishedExam[];
  overview?: StudentOverview;
  /** Where the fees item leads for this role. */
  feesHref?: string;
};

const who = (name?: string) => (name ? `${name}: ` : "");

export const noticeItems = (notices: Notice[]): FeedItem[] =>
  notices.map((n) => ({
    id: `notice:${n.id}`,
    kind: "notice",
    title: n.title,
    body: n.content.slice(0, 140),
    date: n.publishedAt ?? n.createdAt,
    href: `/shared/notice/${n.id}`,
  }));

export const childItems = (c: ChildData): FeedItem[] => {
  const out: FeedItem[] = [];
  for (const a of c.assignments ?? []) {
    out.push({
      id: `assignment:${a.id}:${c.studentId}`,
      kind: "assignment",
      title: `${who(c.name)}New assignment`,
      body: `${a.title} (${a.teacherSubject.classSubject.subject.name})`,
      date: a.createdAt,
      href: `/shared/assignment/${a.id}?studentId=${c.studentId}`,
    });
    const sub = a.submissions?.[0];
    if (sub && sub.marksObtained !== null && sub.marksObtained !== undefined) {
      out.push({
        id: `graded:${sub.id}`,
        kind: "graded",
        title: `${who(c.name)}Work graded`,
        body: `${a.title}: ${Number(sub.marksObtained)}${a.totalMarks ? ` / ${a.totalMarks}` : ""}`,
        date: sub.submittedAt ?? a.createdAt,
        href: `/shared/assignment/${a.id}?studentId=${c.studentId}`,
      });
    }
  }
  for (const e of c.publishedExams ?? []) {
    out.push({
      id: `result:${e.examId}:${c.studentId}`,
      kind: "result",
      title: `${who(c.name)}Report card published`,
      body: `${e.examName}${e.overallGrade ? `: grade ${e.overallGrade}` : ""}`,
      date: e.generatedAt ?? new Date(0).toISOString(),
      href: `/shared/report-card/${c.studentId}/${e.examId}`,
    });
  }
  const fees = c.overview?.fees;
  if (fees && fees.overdue > 0) {
    // One item per overdue amount: a new payment or a new due date changes the id.
    out.push({
      id: `fees:${c.studentId}:${fees.overdue}`,
      kind: "fees",
      title: `${who(c.name)}Fees overdue`,
      body: `${formatMoney(fees.overdue)} is overdue.`,
      date: new Date().toISOString(),
      href: c.feesHref ?? "",
    });
  }
  return out;
};

/** Newest first, without duplicates. */
export const mergeFeed = (...lists: FeedItem[][]): FeedItem[] => {
  const byId = new Map<string, FeedItem>();
  for (const list of lists) for (const item of list) if (!byId.has(item.id)) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
};

/**
 * "Seen" state, per user on this phone. `since`: when the feed was first
 * opened; anything already there then counts as seen, so a first launch
 * doesn't show a wall of old news.
 */
export type SeenState = { since: string; ids: string[] };

export const isUnread = (item: FeedItem, seen: SeenState | null): boolean => {
  if (!seen) return false;
  if (seen.ids.includes(item.id)) return false;
  // Fee items are "now"; anything else older than `since` was there before.
  return item.kind === "fees" || item.date > seen.since;
};

export const markSeen = (seen: SeenState, ids: string[]): SeenState => ({
  since: seen.since,
  // Keep the list bounded: the newest 500 ids are plenty for a school feed.
  ids: [...new Set([...ids, ...seen.ids])].slice(0, 500),
});
