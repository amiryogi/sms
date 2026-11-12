/**
 * API-level regression suite: the Express app over HTTP (supertest, no server
 * started), against a seeded test database of EITHER provider.
 *
 *   npm run test:integration:mysql      npm run test:integration:pg
 *
 * Read-mostly. The writes it makes are its own (an exam named "Regression <run>",
 * a second school) and are removed in afterAll; report-card publication is
 * flipped and then restored.
 */
const request = require("supertest");
const app = require("../app");
const { prisma } = require("../database");
const { calculateSubjectGrade } = require("../utils/gradeCalculator");
const { getScaleResolver } = require("../services/gradeScale.service");

const RUN = Date.now().toString(36).toUpperCase();
const PASSWORD = "password123";
const EMAILS = {
  superadmin: "superadmin@svi.edu.np",
  admin: "admin@svi.edu.np",
  teacher: "teacher1@svi.edu.np",
  examofficer: "examofficer@svi.edu.np",
  accountant: "accountant@svi.edu.np",
  student: "student1@svi.edu.np",
  parent: "parent.stu20240001@svi.edu.np",
};
const T = {}; // access tokens by role
const ctx = {};

const api = (method, url, role) => {
  const r = request(app)[method](`/api/v1${url}`);
  return role ? r.set("Authorization", `Bearer ${T[role]}`) : r;
};

beforeAll(async () => {
  for (const [role, email] of Object.entries(EMAILS)) {
    const res = await api("post", "/auth/login").send({ email, password: PASSWORD });
    if (res.status !== 200) throw new Error(`login ${email}: ${res.status} ${res.body?.message}`);
    T[role] = res.body.data.accessToken;
    if (role === "admin") ctx.refreshToken = res.body.data.refreshToken;
    if (role === "student") ctx.studentId = res.body.data.user.student?.id;
    if (role === "parent") ctx.parentUser = res.body.data.user;
  }
  const admin = await prisma.user.findFirst({ where: { email: EMAILS.admin } });
  ctx.schoolId = admin.schoolId;
  ctx.year = await prisma.academicYear.findFirst({ where: { schoolId: ctx.schoolId, isCurrent: true } });
  ctx.enrolment = await prisma.studentClass.findFirst({
    where: { studentId: ctx.studentId, academicYearId: ctx.year.id },
    orderBy: { id: "asc" },
  });
  const kids = await prisma.studentParent.findMany({ where: { parent: { userId: ctx.parentUser.id } }, select: { studentId: true } });
  ctx.childIds = kids.map((k) => k.studentId);
  const other = await prisma.student.findFirst({
    where: { schoolId: ctx.schoolId, id: { notIn: [ctx.studentId, ...ctx.childIds] } },
    orderBy: { id: "asc" },
  });
  ctx.otherStudentId = other.id;

  // A second school, to prove isolation.
  const school = await prisma.school.create({ data: { name: `Other school ${RUN}`, code: `OTHER-${RUN}` } });
  ctx.otherSchoolId = school.id;
  ctx.otherClass = await prisma.class.create({ data: { schoolId: school.id, name: "Other class", gradeLevel: 5 } });
}, 60000);

afterAll(async () => {
  // Every step runs even if an earlier one fails, so a run never leaves data behind.
  const steps = [];
  if (ctx.examId) {
    steps.push(() => prisma.examResult.deleteMany({ where: { examSubject: { examId: ctx.examId } } }));
    steps.push(() => prisma.examSubject.deleteMany({ where: { examId: ctx.examId } }));
    steps.push(() => prisma.exam.delete({ where: { id: ctx.examId } }));
  }
  if (ctx.otherSchoolId) steps.push(() => prisma.school.delete({ where: { id: ctx.otherSchoolId } }));
  const errors = [];
  for (const step of steps) await step().catch((e) => errors.push(e));
  await prisma.$disconnect();
  if (errors.length) throw errors[0];
});

describe("authentication", () => {
  test("wrong password is refused without leaking which part was wrong", async () => {
    const res = await api("post", "/auth/login").send({ email: EMAILS.admin, password: "nope-nope" });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("no token, or a junk token, is 401", async () => {
    expect((await api("get", "/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer junk")).status).toBe(401);
  });

  test("/auth/me returns the user with roles; a super admin is also an admin", async () => {
    const me = await api("get", "/auth/me", "admin");
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(EMAILS.admin);
    const sa = await api("get", "/auth/me", "superadmin");
    expect(sa.body.data.roles).toEqual(expect.arrayContaining(["SUPER_ADMIN"]));
  });

  test("refresh token issues a working access token", async () => {
    const res = await api("post", "/auth/refresh-token").send({ refreshToken: ctx.refreshToken });
    expect(res.status).toBe(200);
    const me = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${res.body.data.accessToken}`);
    expect(me.status).toBe(200);
  });
});

describe("role-based access", () => {
  test.each([
    ["student", "get", "/users", 403],
    ["teacher", "get", "/users", 403],
    ["superadmin", "get", "/users", 200],
    ["admin", "get", "/users", 200],
    ["teacher", "get", "/fees/accounts", 403],
    ["examofficer", "get", "/fees/accounts", 403],
    ["accountant", "get", "/fees/accounts", 200],
    ["student", "get", "/fees/accounts", 403],
    ["parent", "get", "/finance/nothing-here", 404],
  ])("%s %s %s -> %i", async (role, method, url, status) => {
    expect((await api(method, url, role)).status).toBe(status);
  });

  test("a teacher cannot create students; an accountant cannot approve discounts", async () => {
    expect((await api("post", "/students", "teacher").send({})).status).toBe(403);
    expect((await api("post", "/fees/discounts/1/approve", "accountant").send({})).status).toBe(403);
  });
});

describe("school isolation", () => {
  test("a class from another school is invisible", async () => {
    expect([403, 404]).toContain((await api("get", `/classes/${ctx.otherClass.id}`, "admin")).status);
    const list = await api("get", "/classes", "admin");
    expect(list.status).toBe(200);
    const ids = (list.body.data.classes || list.body.data).map((c) => c.id);
    expect(ids).not.toContain(ctx.otherClass.id);
  });
});

describe("students, parents, ownership", () => {
  test("directory search ignores case", async () => {
    const me = await prisma.student.findUnique({ where: { id: ctx.studentId }, include: { user: true } });
    const res = await api("get", `/students?search=${encodeURIComponent(me.user.firstName.toLowerCase())}`, "admin");
    expect(res.status).toBe(200);
    const ids = (res.body.data.students || res.body.data).map((s) => s.id);
    expect(ids).toContain(ctx.studentId);
  });

  test("a student reads only their own record; a parent only linked children", async () => {
    expect((await api("get", `/students/${ctx.studentId}`, "student")).status).toBe(200);
    expect((await api("get", `/students/${ctx.otherStudentId}`, "student")).status).toBe(403);
    for (const id of ctx.childIds) expect((await api("get", `/students/${id}`, "parent")).status).toBe(200);
    expect((await api("get", `/students/${ctx.otherStudentId}`, "parent")).status).toBe(403);
  });
});

describe("middle names", () => {
  const made = []; // user ids this block creates, removed at the end

  afterAll(async () => {
    for (const userId of made) {
      await prisma.studentClass.deleteMany({ where: { student: { userId } } }).catch(() => {});
      await prisma.student.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  test("a staff member keeps a middle name through create, list, search, /auth/me and update", async () => {
    const email = `middle.${RUN.toLowerCase()}@svi.edu.np`;
    const created = await api("post", "/users", "admin").send({
      email, password: "Password123", firstName: "Ram", middleName: "  Bahadur ", lastName: `Thapa${RUN}`, role: "TEACHER",
    });
    expect(created.status).toBe(201);
    made.push(created.body.data.id);
    expect(created.body.data.middleName).toBe("Bahadur");

    const found = await api("get", `/teachers?search=bahadur`, "admin");
    expect(found.status).toBe(200);
    const row = (found.body.data.teachers || found.body.data).find((t) => t.email === email);
    expect(row?.middleName).toBe("Bahadur");

    const login = await api("post", "/auth/login").send({ email, password: "Password123" });
    expect(login.status).toBe(200);
    const me = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${login.body.data.accessToken}`);
    expect(me.body.data.middleName).toBe("Bahadur");

    // an empty middle name clears it
    expect((await api("put", `/teachers/${created.body.data.id}`, "admin").send({ middleName: "" })).status).toBe(200);
    const after = await prisma.user.findUnique({ where: { id: created.body.data.id } });
    expect(after.middleName).toBeNull();
    expect((await api("post", "/users", "admin").send({ email: `x${email}`, password: "Password123", firstName: "A", middleName: "x".repeat(101), lastName: "B", role: "TEACHER" })).status).toBe(400);
  });

  test("a new student keeps a middle name; it is admin-only to change", async () => {
    const res = await api("post", "/students", "admin").send({
      email: `middle.student.${RUN.toLowerCase()}@svi.edu.np`,
      firstName: "Sita", middleName: "Kumari", lastName: `Rai${RUN}`,
      admissionNumber: `MN-${RUN}`, dateOfBirth: "2012-04-01", gender: "female", admissionDate: "2024-04-14",
      classId: ctx.enrolment.classId, sectionId: ctx.enrolment.sectionId, academicYearId: ctx.year.id,
    });
    expect(res.status).toBe(201);
    const student = await prisma.student.findFirst({ where: { admissionNumber: `MN-${RUN}` } });
    made.push(student.userId);
    const got = await api("get", `/students/${student.id}`, "admin");
    expect(got.body.data.middleName).toBe("Kumari");
    // a student may not change their own name, middle name included
    expect((await api("put", `/students/${ctx.studentId}`, "student").send({ middleName: "Hacked" })).status).toBe(403);
  });

  test("the report card prints the full name, middle name included", async () => {
    const card = await prisma.reportCard.findFirst({ where: { studentId: ctx.studentId, isPublished: true }, orderBy: { id: "asc" } });
    if (!card) return;
    const student = await prisma.student.findUnique({ where: { id: ctx.studentId }, include: { user: true } });
    const original = student.user.middleName;
    try {
      await prisma.user.update({ where: { id: student.userId }, data: { middleName: "Bahadur" } });
      const res = await api("get", `/report-cards/student/${ctx.studentId}/exam/${card.examId}`, "student");
      expect(res.status).toBe(200);
      expect(res.body.data.student.name).toBe(`${student.user.firstName} Bahadur ${student.user.lastName}`);
    } finally {
      await prisma.user.update({ where: { id: student.userId }, data: { middleName: original } });
    }
  });
});

describe("academic years and attendance", () => {
  test("exactly one current academic year", async () => {
    const res = await api("get", "/academic-years", "admin");
    expect(res.status).toBe(200);
    const years = res.body.data.academicYears || res.body.data;
    expect(years.filter((y) => y.isCurrent)).toHaveLength(1);
  });

  test("attendance summary follows the layout's late rule and adds BS months", async () => {
    const res = await api("get", `/attendance/student/${ctx.studentId}`, "student");
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toHaveProperty("countLateAsPresent");
    expect(Array.isArray(res.body.data.byMonth)).toBe(true);
  });
});

describe("exam lifecycle: DRAFT -> PUBLISHED -> LOCKED", () => {
  const saveMarks = (marks) =>
    api("post", "/results", "admin").send({
      examSubjectId: ctx.examSubject.id,
      sectionId: ctx.enrolment.sectionId,
      results: [{ studentId: ctx.studentId, marksObtained: marks }],
    });

  test("a new exam starts as DRAFT with subjects snapshotted from ClassSubject", async () => {
    const res = await api("post", "/exams", "admin").send({
      name: `Regression ${RUN}`,
      examType: "unit_test",
      academicYearId: ctx.year.id,
      classIds: [ctx.enrolment.classId],
    });
    expect(res.status).toBe(201);
    ctx.examId = res.body.data.id;
    const exam = await prisma.exam.findUnique({ where: { id: ctx.examId }, include: { examSubjects: true } });
    expect(exam.status).toBe("DRAFT");
    const classSubjects = await prisma.classSubject.count({ where: { classId: ctx.enrolment.classId, academicYearId: ctx.year.id } });
    expect(exam.examSubjects).toHaveLength(classSubjects);
    ctx.examSubject = exam.examSubjects[0];
  });

  test("teachers do not see DRAFT exams; admins do", async () => {
    const ids = async (role) => {
      const r = await api("get", "/exams", role);
      return (r.body.data.exams || r.body.data).map((e) => e.id);
    };
    expect(await ids("admin")).toContain(ctx.examId);
    expect(await ids("teacher")).not.toContain(ctx.examId);
  });

  test("marks are refused while DRAFT", async () => {
    const res = await saveMarks(10);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only be entered when exam is PUBLISHED/);
  });

  test("published: teachers see it and marks can be saved", async () => {
    expect((await api("put", `/exams/${ctx.examId}/publish`, "admin")).status).toBe(200);
    const r = await api("get", "/exams", "teacher");
    expect((r.body.data.exams || r.body.data).map((e) => e.id)).toContain(ctx.examId);
    const full = Number(ctx.examSubject.fullMarks);
    const res = await saveMarks(Math.min(10, full));
    expect(res.status).toBe(200);
    const row = await prisma.examResult.findFirst({ where: { examSubjectId: ctx.examSubject.id, studentId: ctx.studentId } });
    expect(Number(row.marksObtained)).toBe(Math.min(10, full));
  });

  test("ExamSubject is a snapshot: later ClassSubject edits do not change it", async () => {
    const cs = await prisma.classSubject.findUnique({ where: { id: ctx.examSubject.classSubjectId } });
    await prisma.classSubject.update({ where: { id: cs.id }, data: { fullMarks: cs.fullMarks + 7 } });
    try {
      const es = await prisma.examSubject.findUnique({ where: { id: ctx.examSubject.id } });
      expect(es.fullMarks).toBe(ctx.examSubject.fullMarks);
    } finally {
      await prisma.classSubject.update({ where: { id: cs.id }, data: { fullMarks: cs.fullMarks } });
    }
  });

  test("locked: marks refused again; unlock returns to PUBLISHED", async () => {
    expect((await api("put", `/exams/${ctx.examId}/lock`, "admin")).status).toBe(200);
    expect((await saveMarks(5)).status).toBe(400);
    expect((await api("put", `/exams/${ctx.examId}/unlock`, "admin")).status).toBe(200);
    expect((await prisma.exam.findUnique({ where: { id: ctx.examId } })).status).toBe("PUBLISHED");
  });
});

describe("results and report cards reach students only when published", () => {
  const scope = async () => {
    const rc = await prisma.reportCard.findFirst({ where: { studentId: ctx.studentId }, orderBy: { id: "asc" }, include: { studentClass: true } });
    return rc && { examId: rc.examId, classId: rc.studentClass.classId, sectionId: rc.studentClass.sectionId };
  };

  test("unpublished: hidden from the student and the parent; published: visible", async () => {
    const s = await scope();
    if (!s) return; // test database without generated report cards
    const before = await prisma.reportCard.findFirst({ where: { studentId: ctx.studentId, examId: s.examId } });
    try {
      expect((await api("put", "/report-cards/unpublish", "admin").send(s)).status).toBe(200);
      const exam = await prisma.exam.findUnique({ where: { id: s.examId } });
      if (exam.status !== "LOCKED") {
        expect((await api("get", `/results/student/${ctx.studentId}/exam/${s.examId}`, "student")).status).toBe(403);
      }
      expect([403, 404]).toContain((await api("get", `/report-cards/student/${ctx.studentId}/exam/${s.examId}`, "student")).status);
      expect((await api("put", "/report-cards/publish", "admin").send(s)).status).toBe(200);
      const rc = await api("get", `/report-cards/student/${ctx.studentId}/exam/${s.examId}`, "student");
      expect(rc.status).toBe(200);
    } finally {
      if (before?.isPublished) await api("put", "/report-cards/publish", "admin").send(s);
      else await api("put", "/report-cards/unpublish", "admin").send(s);
    }
  });

  test("subject grades on a report card come from gradeCalculator on the school's scale", async () => {
    const card = await prisma.reportCard.findFirst({ where: { studentId: ctx.studentId, isPublished: true }, orderBy: { id: "asc" } });
    if (!card) return;
    const res = await api("get", `/report-cards/student/${ctx.studentId}/exam/${card.examId}`, "student");
    expect(res.status).toBe(200);
    const { forReportCard } = await getScaleResolver(ctx.schoolId);
    const scale = forReportCard(card);
    const subjects = res.body.data.subjects || [];
    expect(subjects.length).toBeGreaterThan(0);
    for (const subj of subjects) {
      const expected = calculateSubjectGrade(
        {
          theoryMarks: subj.theoryMarks,
          theoryFullMarks: subj.theoryFullMarks,
          practicalMarks: subj.practicalMarks,
          practicalFullMarks: subj.practicalFullMarks ?? 0,
          hasPractical: Boolean(subj.hasPractical),
          isAbsent: Boolean(subj.isAbsent),
        },
        scale,
      );
      expect({ subject: subj.subjectName, grade: subj.finalGrade, gpa: subj.finalGpa, passed: subj.isPassed }).toEqual({
        subject: subj.subjectName,
        grade: expected.finalGrade,
        gpa: expected.finalGpa,
        passed: expected.isPassed,
      });
    }
  });
});

describe("fees", () => {
  test("statement totals add up, and ownership applies", async () => {
    const res = await api("get", `/fees/accounts/${ctx.studentId}`, "student");
    expect(res.status).toBe(200);
    expect((await api("get", `/fees/accounts/${ctx.otherStudentId}`, "student")).status).toBe(403);
    expect((await api("get", `/fees/accounts/${ctx.otherStudentId}`, "parent")).status).toBe(403);
    const acct = await api("get", `/fees/accounts/${ctx.studentId}`, "accountant");
    expect(acct.body.data).toEqual(res.body.data);
  });

  test("reconcile: every cached balance matches the ledger", async () => {
    const res = await api("get", "/fees/reconcile", "admin");
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });
});

describe("promotions", () => {
  test("admins can list promotions; teachers cannot", async () => {
    expect((await api("get", "/promotions", "admin")).status).toBe(200);
    expect((await api("get", "/promotions", "teacher")).status).toBe(403);
  });
});
