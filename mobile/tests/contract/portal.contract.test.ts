/**
 * Student and parent portal endpoints against the real backend (test
 * database), through the app's services: shapes the screens rely on, and the
 * ownership rules (a student sees only themself, a parent only linked children,
 * and only published report cards).
 */
import type { ApiFailure } from "@/api/errors";
import { http, tokenStore } from "@/api/http";
import { assignmentService } from "@/api/services/assignments";
import { attendanceService } from "@/api/services/attendance";
import { feeService } from "@/api/services/fees";
import { noticeService } from "@/api/services/notices";
import { portalService } from "@/api/services/portal";
import { reportCardService } from "@/api/services/reportCards";
import { ACCOUNTS, signInAs } from "./session";

const refused = async (p: Promise<unknown>) => {
  const err = (await p.then(
    () => null,
    (e: unknown) => e,
  )) as ApiFailure | null;
  expect(err).not.toBeNull();
  expect([403, 404]).toContain(err!.status);
};

let ownId: number;
let otherStudentId: number;
let allExamIds: number[];

beforeAll(async () => {
  // Another student of the school, and every exam id, as the admin sees them.
  await signInAs(ACCOUNTS.admin);
  const students = await http.get("/students", { params: { limit: 50 } });
  const stu = await signInAs(ACCOUNTS.student);
  ownId = stu.student!.id;
  otherStudentId = (students.data.data as { id: number }[]).map((s) => s.id).find((id) => id !== ownId)!;
  await signInAs(ACCOUNTS.admin);
  const exams = await http.get("/exams");
  allExamIds = (exams.data.data as { id: number }[]).map((e) => e.id);
  await tokenStore.clear();
});

describe("student", () => {
  beforeAll(async () => {
    await signInAs(ACCOUNTS.student);
  });

  it("reads their own overview, register, results, assignments, fees and notices", async () => {
    const o = await portalService.overview(ownId);
    expect(o.student.id).toBe(ownId);
    expect(o.student.name).toEqual(expect.any(String));
    expect(Array.isArray(o.assignments)).toBe(true);
    if (o.enrolment) expect(o.enrolment.class.name).toEqual(expect.any(String));

    const att = await attendanceService.studentSummary(ownId);
    expect(att.summary).toEqual(expect.objectContaining({ total: expect.any(Number), percentage: expect.any(String) }));
    for (const a of att.attendances.slice(0, 5)) expect(a.bsDate).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);

    const exams = await reportCardService.publishedExams(ownId);
    for (const e of exams) {
      const card = await reportCardService.get(ownId, e.examId);
      expect(card.meta.isPublished).toBe(true);
      expect(["nebGradeSheet", "performanceReport"]).toContain(card.layout.template);
      expect(Array.isArray(card.subjects)).toBe(true);
      expect(Array.isArray(card.gradeReference)).toBe(true);
    }

    const list = await assignmentService.list();
    for (const a of list) expect(a.isPublished).toBe(true);

    const fees = await feeService.statement(ownId);
    expect(fees.student.id).toBe(ownId);
    for (const t of fees.transactions) expect(Number(t.amount)).toBeGreaterThan(0);

    const page = await noticeService.list({ page: 1 });
    for (const n of page.rows) expect(n.status).toBe("PUBLISHED");
  });

  it("is refused another student's data", async () => {
    await refused(portalService.overview(otherStudentId));
    await refused(attendanceService.studentSummary(otherStudentId));
    await refused(feeService.statement(otherStudentId));
    await refused(reportCardService.publishedExams(otherStudentId));
  });

  it("never gets a report card that is not published", async () => {
    const published = new Set((await reportCardService.publishedExams(ownId)).map((e) => e.examId));
    const others = allExamIds.filter((id) => !published.has(id));
    // The seed always has exams without a published card for this student (a
    // DRAFT one at least), so this never passes by checking nothing.
    expect(others.length).toBeGreaterThan(0);
    for (const examId of others) await refused(reportCardService.get(ownId, examId));
  });

  it("sends the app's hand-in request (multipart) and gets the server's answer", async () => {
    // An assignment that doesn't exist: proves the request format without
    // creating a submission (submissions can't be deleted afterwards).
    await expect(assignmentService.submit({ assignmentId: 999999, content: "contract test", files: [] })).rejects.toMatchObject({
      status: 404,
      message: "Assignment not available",
    });
  });
});

describe("parent", () => {
  beforeAll(async () => {
    await signInAs(ACCOUNTS.parent);
  });

  it("lists linked children and reads a child's portal", async () => {
    const children = await portalService.myChildren();
    const ids = children.map((c) => c.studentId);
    expect(ids).toContain(ownId);
    const o = await portalService.overview(ownId);
    expect(o.student.id).toBe(ownId);
    const list = await assignmentService.list({ studentId: ownId });
    expect(Array.isArray(list)).toBe(true);
    await feeService.statement(ownId);
    await attendanceService.studentSummary(ownId);
  });

  it("is refused a student who is not their child", async () => {
    const ids = (await portalService.myChildren()).map((c) => c.studentId);
    const stranger = otherStudentId !== undefined && !ids.includes(otherStudentId) ? otherStudentId : null;
    expect(stranger).not.toBeNull();
    await refused(portalService.overview(stranger!));
    await refused(feeService.statement(stranger!));
    await refused(assignmentService.list({ studentId: stranger! }));
    await refused(reportCardService.publishedExams(stranger!));
  });

  it("cannot hand in work (students only)", async () => {
    await expect(assignmentService.submit({ assignmentId: 1, content: "x", files: [] })).rejects.toMatchObject({ status: 403 });
  });
});
