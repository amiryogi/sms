/**
 * Push notifications to the mobile app.
 *
 * A controller calls one of the `notify.*` functions after its own write has
 * succeeded. Each one:
 *  - runs after the response, so a push never slows down or fails the request
 *    (an error is one log line);
 *  - resolves who may see the thing (recipients.js);
 *  - sends a title and one short line, with no marks or amounts, and
 *    `data: { type, ... }` for the app to open the right screen. The app then
 *    reads the details through the normal API, which checks access again.
 *
 * Delivery is Expo's push service (expoPush.js). Tokens Expo reports as gone
 * are deleted. Switch everything off with PUSH_ENABLED=false.
 */
const prisma = require("../../config/database");
const { sendExpoPush } = require("./expoPush");
const { sectionAudience, studentAudience, noticeAudience } = require("./recipients");

const IN_LIST = 1000; // user ids per query

let transport = null; // tests replace the sender
const setTransport = (fn) => {
  transport = fn;
};

/** Off in the test environment unless a test installed a transport, and when PUSH_ENABLED=false. */
const isEnabled = () => process.env.PUSH_ENABLED !== "false" && (process.env.NODE_ENV !== "test" || transport !== null);

const pending = new Set();
/** Run `work` after the current request; never throws. */
const dispatch = (label, work) => {
  if (!isEnabled()) return;
  const job = new Promise((resolve) => setImmediate(resolve))
    .then(work)
    .catch((error) => console.error(`[push] ${label} failed: ${error.message}`))
    .finally(() => pending.delete(job));
  pending.add(job);
};
/** Wait for everything dispatched so far (tests). */
const flush = async () => {
  while (pending.size) await Promise.all([...pending]);
};

/**
 * Send one message per device of each recipient row.
 * @param {(row: object) => { title: string, body: string, data: object }} build
 */
const deliver = async (schoolId, rows, build, db = prisma) => {
  if (!rows.length) return { sent: 0, failed: 0, invalidTokens: [] };
  const byUser = new Map();
  for (const row of rows) {
    if (!byUser.has(row.userId)) byUser.set(row.userId, []);
    byUser.get(row.userId).push(row);
  }
  const userIds = [...byUser.keys()];
  const messages = [];
  for (let i = 0; i < userIds.length; i += IN_LIST) {
    const devices = await db.deviceToken.findMany({
      where: { schoolId, userId: { in: userIds.slice(i, i + IN_LIST) }, user: { status: "active" } },
      select: { token: true, userId: true },
      orderBy: { id: "asc" },
    });
    for (const device of devices) {
      for (const row of byUser.get(device.userId) ?? []) messages.push({ to: device.token, ...build(row) });
    }
  }
  if (!messages.length) return { sent: 0, failed: 0, invalidTokens: [] };
  const result = await (transport ?? sendExpoPush)(messages);
  if (result?.invalidTokens?.length) {
    await db.deviceToken.deleteMany({ where: { token: { in: result.invalidTokens } } });
  }
  return result;
};

/** Today's date in Nepal ("2026-11-14"): absences are only announced for today. */
const kathmanduToday = (now = new Date()) => new Date(now.getTime() + (5 * 60 + 45) * 60 * 1000).toISOString().slice(0, 10);

const clip = (text, max = 120) => {
  const s = String(text ?? "").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

/* ------------------------------------------------------------- messages */

const messages = {
  notice: (notice) => () => ({ title: "New notice", body: clip(notice.title), data: { type: "notice", id: notice.id } }),
  assignment: (assignment, subject) => (row) => ({
    title: row.childName ? `New assignment for ${row.childName}` : "New assignment",
    body: clip(`${subject}: ${assignment.title}`),
    data: { type: "assignment", id: assignment.id, studentId: row.studentId },
  }),
  graded: (assignment) => (row) => ({
    title: row.childName ? `${row.childName}'s work was checked` : "Your work was checked",
    body: clip(assignment.title),
    data: { type: "graded", id: assignment.id, studentId: row.studentId },
  }),
  reportCard: (exam) => (row) => ({
    title: "Report card published",
    body: clip(row.childName ? `${row.childName}'s ${exam.name} report card is ready.` : `Your ${exam.name} report card is ready.`),
    data: { type: "result", examId: exam.id, studentId: row.studentId },
  }),
  absent: () => (row) => ({
    title: "Absent today",
    body: `${row.childName ?? "Your child"} was marked absent today.`,
    data: { type: "attendance", studentId: row.studentId },
  }),
};

/* ------------------------------------------------------------- triggers */

const notify = {
  /** A notice went DRAFT -> PUBLISHED. */
  noticePublished: (schoolId, noticeId) =>
    dispatch("notice", async () => {
      const notice = await prisma.notice.findFirst({
        where: { id: noticeId, schoolId },
        include: { roleTargets: { select: { roleId: true } }, classTargets: { select: { classId: true, sectionId: true, academicYearId: true } } },
      });
      if (!notice) return;
      const year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true } });
      const rows = await noticeAudience(prisma, notice, { currentAcademicYearId: year?.id ?? null });
      await deliver(schoolId, rows, messages.notice(notice));
    }),

  /** An assignment became visible to its section (created published, or published later). */
  assignmentPublished: (schoolId, assignmentId) =>
    dispatch("assignment", async () => {
      const assignment = await prisma.assignment.findFirst({
        where: { id: assignmentId, isPublished: true, teacherSubject: { classSubject: { class: { schoolId } } } },
        select: {
          id: true,
          title: true,
          teacherSubject: { select: { sectionId: true, academicYearId: true, classSubject: { select: { classId: true, subject: { select: { name: true } } } } } },
        },
      });
      if (!assignment) return;
      const ts = assignment.teacherSubject;
      const rows = await sectionAudience(prisma, { schoolId, classId: ts.classSubject.classId, sectionId: ts.sectionId, academicYearId: ts.academicYearId });
      await deliver(schoolId, rows, messages.assignment(assignment, ts.classSubject.subject.name));
    }),

  /** A teacher graded a submission. */
  submissionGraded: (schoolId, submissionId) =>
    dispatch("graded", async () => {
      const submission = await prisma.submission.findFirst({
        where: { id: submissionId, schoolId, status: "graded" },
        select: { studentId: true, assignment: { select: { id: true, title: true } } },
      });
      if (!submission) return;
      const rows = await studentAudience(prisma, { schoolId, studentIds: [submission.studentId] });
      await deliver(schoolId, rows, messages.graded(submission.assignment));
    }),

  /** Report cards of a class section were published for an exam. */
  reportCardsPublished: (schoolId, { examId, classId, sectionId }) =>
    dispatch("report cards", async () => {
      const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId }, select: { id: true, name: true } });
      if (!exam) return;
      const cards = await prisma.reportCard.findMany({
        where: { examId, isPublished: true, studentClass: { classId, sectionId, schoolId } },
        select: { studentId: true },
        orderBy: { id: "asc" },
      });
      const rows = await studentAudience(prisma, { schoolId, studentIds: [...new Set(cards.map((c) => c.studentId))] });
      await deliver(schoolId, rows, messages.reportCard(exam));
    }),

  /**
   * Students newly marked absent. Parents only, and only for today's register:
   * correcting an old day must not alarm anyone.
   * @param {string} date  the register's day, "YYYY-MM-DD"
   */
  absencesMarked: (schoolId, { studentIds, date }) => {
    if (!studentIds?.length || String(date).slice(0, 10) !== kathmanduToday()) return;
    dispatch("absences", async () => {
      const rows = await studentAudience(prisma, { schoolId, studentIds }, { toStudents: false });
      await deliver(schoolId, rows, messages.absent());
    });
  },
};

module.exports = { notify, deliver, flush, setTransport, isEnabled, messages, kathmanduToday };
