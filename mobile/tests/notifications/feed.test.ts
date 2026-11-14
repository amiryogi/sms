import { childItems, isUnread, markSeen, mergeFeed, noticeItems, type FeedItem, type SeenState } from "@/features/notifications/feed";
import type { Assignment, Notice } from "@/types/api";

const notice = (id: number, publishedAt: string): Notice => ({
  id,
  title: `Notice ${id}`,
  content: "Body",
  targetType: "GLOBAL",
  priority: "normal",
  status: "PUBLISHED",
  publishFrom: null,
  publishTo: null,
  publishedAt,
  createdAt: publishedAt,
  createdBy: null,
});

const assignment = (id: number, createdAt: string, marks: string | null = null): Assignment => ({
  id,
  title: `Work ${id}`,
  description: null,
  dueDate: null,
  totalMarks: 10,
  isPublished: true,
  createdAt,
  teacherSubject: { id: 1, classSubject: { class: { id: 5, name: "Grade 5" }, subject: { id: 2, name: "Maths" } }, section: { id: 1, name: "A" } },
  assignmentFiles: [],
  submissions: marks === null ? [] : [{ id: 90 + id, status: "graded", submittedAt: createdAt, marksObtained: marks, feedback: null }],
});

describe("feed items", () => {
  it("turns notices, assignments, grades, published cards and overdue fees into items", () => {
    const items = mergeFeed(
      noticeItems([notice(1, "2026-11-10T05:00:00.000Z")]),
      childItems({
        studentId: 7,
        name: "Asha",
        assignments: [assignment(3, "2026-11-11T05:00:00.000Z", "8.00")],
        publishedExams: [{ examId: 2, examName: "First Terminal", examType: null, academicYear: "2083", className: "", sectionName: "", overallGrade: "A", percentage: null, classRank: null, generatedAt: "2026-11-12T05:00:00.000Z" }],
        overview: { fees: { overdue: 2500 } } as never,
        feesHref: "/parent/fees",
      }),
    );
    expect(items.map((i) => i.id)).toEqual(["fees:7:2500", "result:2:7", "assignment:3:7", "graded:93", "notice:1"]);
    expect(items.find((i) => i.kind === "graded")?.body).toBe("Work 3: 8 / 10");
    expect(items.find((i) => i.kind === "result")?.title).toBe("Asha: Report card published");
    expect(items.find((i) => i.kind === "fees")).toMatchObject({ body: "Rs. 2,500 is overdue.", href: "/parent/fees" });
  });

  it("has no fees item when nothing is overdue, and dedupes", () => {
    const a = childItems({ studentId: 7, overview: { fees: { overdue: 0 } } as never });
    expect(a).toEqual([]);
    const n = noticeItems([notice(1, "2026-11-10T05:00:00.000Z")]);
    expect(mergeFeed(n, n)).toHaveLength(1);
  });
});

describe("unread", () => {
  const item = (id: string, date: string, kind: FeedItem["kind"] = "notice"): FeedItem => ({ id, kind, title: "", body: "", date, href: "" });
  const seen: SeenState = { since: "2026-11-10T00:00:00.000Z", ids: ["notice:5"] };

  it("counts only what arrived after the feed was first opened and was not opened since", () => {
    expect(isUnread(item("notice:1", "2026-11-09T00:00:00.000Z"), seen)).toBe(false); // older than first use
    expect(isUnread(item("notice:2", "2026-11-11T00:00:00.000Z"), seen)).toBe(true);
    expect(isUnread(item("notice:5", "2026-11-11T00:00:00.000Z"), seen)).toBe(false); // opened
    expect(isUnread(item("fees:7:2500", "2026-01-01T00:00:00.000Z", "fees"), seen)).toBe(true); // fees are "now"
    expect(isUnread(item("notice:2", "2026-11-11T00:00:00.000Z"), null)).toBe(false); // state not loaded yet
  });

  it("marks items read and keeps the list bounded", () => {
    const next = markSeen(seen, ["notice:2"]);
    expect(next.ids).toEqual(["notice:2", "notice:5"]);
    const many = markSeen(seen, Array.from({ length: 600 }, (_, i) => `x:${i}`));
    expect(many.ids).toHaveLength(500);
  });
});
