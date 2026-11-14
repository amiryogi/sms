/**
 * Push notifications over HTTP, against a seeded test database of either provider.
 * Nothing leaves the machine: the sender is replaced by a recorder.
 *
 * Writes are this file's own (device tokens, one notice, one day's attendance row
 * for one student) and are removed or restored in afterAll.
 */
const request = require("supertest");
const app = require("../app");
const { prisma } = require("../database");
const push = require("../services/push");

const RUN = Date.now().toString(36);
const PASSWORD = "password123";
const EMAILS = {
  admin: "admin@demo.edu.np",
  accountant: "accountant@demo.edu.np",
  student: "student1@demo.edu.np",
  parent: "parent.stu20240001@demo.edu.np",
};
const T = {};
const U = {};
const ctx = {};
const token = (name) => `ExponentPushToken[${`${name}${RUN}`.padEnd(22, "0").slice(0, 22)}]`;
const TOKENS = { student: token("stu"), parent: token("par"), accountant: token("acc"), spare: token("spa") };

const api = (method, url, role) => {
  const r = request(app)[method](`/api/v1${url}`);
  return role ? r.set("Authorization", `Bearer ${T[role]}`) : r;
};
const login = async (email) => {
  const res = await api("post", "/auth/login").send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login ${email}: ${res.status} ${res.body?.message}`);
  return res.body.data;
};

let sent = [];
const sentTo = (name) => sent.filter((m) => m.to === TOKENS[name]);

beforeAll(async () => {
  for (const [role, email] of Object.entries(EMAILS)) {
    const session = await login(email);
    T[role] = session.accessToken;
    U[role] = session.user;
  }
  ctx.schoolId = U.admin.schoolId ?? U.admin.school.id;
  ctx.studentId = U.student.student.id;
  ctx.year = await prisma.academicYear.findFirst({ where: { schoolId: ctx.schoolId, isCurrent: true } });
  ctx.enrolment = await prisma.studentClass.findFirst({
    where: { studentId: ctx.studentId, academicYearId: ctx.year.id, status: "active" },
    orderBy: { id: "asc" },
  });
  push.setTransport(async (messages) => {
    sent.push(...messages);
    return { sent: messages.length, failed: 0, invalidTokens: [] };
  });
}, 60000);

beforeEach(() => {
  sent = [];
});

afterAll(async () => {
  push.setTransport(null);
  const steps = [
    () => prisma.deviceToken.deleteMany({ where: { token: { in: Object.values(TOKENS) } } }),
    () => (ctx.noticeId ? prisma.notice.delete({ where: { id: ctx.noticeId } }) : null),
    async () => {
      if (!ctx.attendanceTouched) return;
      const where = { studentId: ctx.studentId, studentClassId: ctx.enrolment.id, attendanceDate: ctx.attendanceDate };
      if (ctx.attendanceBefore) {
        await prisma.attendance.updateMany({ where, data: { status: ctx.attendanceBefore.status, remarks: ctx.attendanceBefore.remarks, markedBy: ctx.attendanceBefore.markedBy } });
      } else {
        await prisma.attendance.deleteMany({ where });
      }
    },
  ];
  const errors = [];
  for (const step of steps) await Promise.resolve(step()).catch((e) => errors.push(e));
  await prisma.$disconnect();
  if (errors.length) throw errors[0];
});

describe("devices", () => {
  test("registering needs a session and a real Expo token", async () => {
    expect((await api("post", "/devices").send({ token: TOKENS.student, platform: "android" })).status).toBe(401);
    expect((await api("post", "/devices", "student").send({ token: "fcm:abc", platform: "android" })).status).toBe(400);
    expect((await api("post", "/devices", "student").send({ token: TOKENS.student, platform: "windows" })).status).toBe(400);
  });

  test("a phone is registered for the signed-in user, in their school, whatever the body says", async () => {
    const res = await api("post", "/devices", "student").send({ token: TOKENS.student, platform: "android", userId: U.admin.id, schoolId: 999 });
    expect(res.status).toBe(200);
    const row = await prisma.deviceToken.findUnique({ where: { token: TOKENS.student } });
    expect(row).toMatchObject({ userId: U.student.id, schoolId: ctx.schoolId, platform: "android" });

    // Registering again refreshes the same row.
    await api("post", "/devices", "student").send({ token: TOKENS.student, platform: "android" });
    expect(await prisma.deviceToken.count({ where: { token: TOKENS.student } })).toBe(1);
  });

  test("a phone that signs in as someone else moves to them", async () => {
    await api("post", "/devices", "accountant").send({ token: TOKENS.spare, platform: "ios" });
    await api("post", "/devices", "parent").send({ token: TOKENS.spare, platform: "ios" });
    const rows = await prisma.deviceToken.findMany({ where: { token: TOKENS.spare } });
    expect(rows.map((r) => r.userId)).toEqual([U.parent.id]);
  });

  test("only the owner can unregister a phone", async () => {
    const path = `/devices/${encodeURIComponent(TOKENS.student)}`;
    expect((await api("delete", path)).status).toBe(401);
    expect((await api("delete", path, "accountant")).status).toBe(204); // no error, and no effect
    expect(await prisma.deviceToken.count({ where: { token: TOKENS.student } })).toBe(1);
    expect((await api("delete", path, "student")).status).toBe(204);
    expect(await prisma.deviceToken.count({ where: { token: TOKENS.student } })).toBe(0);
  });

  test("signing out stops pushes to every phone of that user", async () => {
    const session = await login(EMAILS.accountant);
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    await request(app).post("/api/v1/devices").set(auth).send({ token: TOKENS.accountant, platform: "android" });
    expect(await prisma.deviceToken.count({ where: { userId: U.accountant.id } })).toBeGreaterThan(0);
    expect((await request(app).post("/api/v1/auth/logout").set(auth)).status).toBe(200);
    expect(await prisma.deviceToken.count({ where: { userId: U.accountant.id } })).toBe(0);
    T.accountant = (await login(EMAILS.accountant)).accessToken;
  });
});

describe("what gets pushed, and to whom", () => {
  beforeAll(async () => {
    await api("post", "/devices", "student").send({ token: TOKENS.student, platform: "android" });
    await api("post", "/devices", "parent").send({ token: TOKENS.parent, platform: "ios" });
    await api("post", "/devices", "accountant").send({ token: TOKENS.accountant, platform: "android" });
  });

  test("a class notice reaches that class's students and parents when published, and nobody else", async () => {
    const created = await api("post", "/notices", "admin").send({
      title: `Push test ${RUN}`,
      content: "Created by the push integration test.",
      targetType: "CLASS_SPECIFIC",
      classTargets: [{ classId: ctx.enrolment.classId, sectionId: ctx.enrolment.sectionId }],
    });
    expect(created.status).toBe(201);
    ctx.noticeId = created.body.data.id;

    // A draft is silent.
    await push.flush();
    expect(sent).toEqual([]);

    expect((await api("patch", `/notices/${ctx.noticeId}/publish`, "admin")).status).toBe(200);
    await push.flush();

    expect(sentTo("student")).toHaveLength(1);
    expect(sentTo("parent")).toHaveLength(1);
    expect(sentTo("accountant")).toHaveLength(0);
    expect(sentTo("student")[0]).toMatchObject({ title: "New notice", body: `Push test ${RUN}`, data: { type: "notice", id: ctx.noticeId } });
    // Every message went to a phone of this school.
    const tokens = await prisma.deviceToken.findMany({ where: { token: { in: sent.map((m) => m.to) } }, select: { schoolId: true } });
    expect(tokens.every((t) => t.schoolId === ctx.schoolId)).toBe(true);
  });

  test("an absence today tells the parents once, never the student", async () => {
    const today = push.kathmanduToday();
    ctx.attendanceDate = new Date(`${today}T00:00:00.000Z`);
    ctx.attendanceBefore = await prisma.attendance.findFirst({
      where: { studentId: ctx.studentId, studentClassId: ctx.enrolment.id, attendanceDate: ctx.attendanceDate },
    });
    ctx.attendanceTouched = true;
    const mark = (status) =>
      api("post", "/attendance", "admin").send({
        classId: ctx.enrolment.classId,
        sectionId: ctx.enrolment.sectionId,
        date: today,
        attendanceRecords: [{ studentId: ctx.studentId, studentClassId: ctx.enrolment.id, status }],
      });

    // Start from "present", so the absence below is new whatever the seed holds.
    expect((await mark("present")).status).toBe(200);
    await push.flush();
    sent = [];

    const absent = await mark("absent");
    expect(absent.body.message).toBe("Attendance marked successfully");
    await push.flush();
    expect(sentTo("parent")).toHaveLength(1);
    expect(sentTo("parent")[0]).toMatchObject({ title: "Absent today", data: { type: "attendance", studentId: ctx.studentId } });
    expect(sentTo("student")).toHaveLength(0);

    // Saving the same register again is silent.
    sent = [];
    expect((await mark("absent")).status).toBe(200);
    await push.flush();
    expect(sent).toEqual([]);
  });

  test("an old day's register is silent", async () => {
    const res = await api("post", "/attendance", "admin").send({
      classId: ctx.enrolment.classId,
      sectionId: ctx.enrolment.sectionId,
      date: "2020-01-01",
      attendanceRecords: [],
    });
    expect(res.status).toBe(200);
    await push.flush();
    expect(sent).toEqual([]);
  });

  test("a token Expo reports as gone is deleted", async () => {
    push.setTransport(async (messages) => ({ sent: 0, failed: messages.length, invalidTokens: messages.map((m) => m.to) }));
    const rows = [{ userId: U.parent.id }];
    await push.deliver(ctx.schoolId, rows, () => ({ title: "t", body: "b", data: {} }));
    expect(await prisma.deviceToken.count({ where: { userId: U.parent.id, token: { in: [TOKENS.parent, TOKENS.spare] } } })).toBe(0);
  });
});
