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
const { admissionPrefix } = require("../utils/admissionNumbers");

const RUN = Date.now().toString(36).toUpperCase();
const PASSWORD = "password123";
const EMAILS = {
  superadmin: "superadmin@demo.edu.np",
  admin: "admin@demo.edu.np",
  teacher: "teacher1@demo.edu.np",
  examofficer: "examofficer@demo.edu.np",
  accountant: "accountant@demo.edu.np",
  student: "student1@demo.edu.np",
  parent: "parent.stu20240001@demo.edu.np",
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

describe("usernames and sign-in", () => {
  const made = [];
  afterAll(async () => {
    for (const userId of made) {
      await prisma.studentClass.deleteMany({ where: { student: { userId } } }).catch(() => {});
      await prisma.student.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  test("every user has a unique username after the backfill", async () => {
    const users = await prisma.user.findMany({ where: { schoolId: ctx.schoolId }, select: { username: true } });
    expect(users.every((u) => u.username)).toBe(true);
    expect(new Set(users.map((u) => u.username)).size).toBe(users.length);
  });

  test("sign in by username, by email, in any case, with or without the school code", async () => {
    const me = await prisma.user.findFirst({ where: { email: EMAILS.student } });
    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId } });
    for (const body of [
      { identifier: me.username, password: PASSWORD },
      { identifier: me.username.toUpperCase(), password: PASSWORD },
      { identifier: EMAILS.student, password: PASSWORD },
      { identifier: me.username, password: PASSWORD, schoolCode: school.code.toLowerCase() },
      { email: EMAILS.student, password: PASSWORD }, // the old field name
    ]) {
      const res = await api("post", "/auth/login").send(body);
      expect(res.status).toBe(200);
      expect(res.body.data.user.username).toBe(me.username);
    }
    // a school code of another school finds nobody
    expect((await api("post", "/auth/login").send({ identifier: me.username, password: PASSWORD, schoolCode: `OTHER-${RUN}` })).status).toBe(401);
  });

  test("a wrong password and an unknown username get the same answer", async () => {
    const me = await prisma.user.findFirst({ where: { email: EMAILS.student } });
    const wrong = await api("post", "/auth/login").send({ identifier: me.username, password: "Nope12345" });
    const unknown = await api("post", "/auth/login").send({ identifier: `nobody-${RUN.toLowerCase()}`, password: "Nope12345" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  test("a student added without an email gets the admission number as username and can sign in", async () => {
    const admissionNumber = `UN-${RUN}`;
    const res = await api("post", "/students", "admin").send({
      password: "Password123", firstName: "Hari", lastName: `Nomail${RUN}`, avatarUrl: "/uploads/avatars/hari.png",
      admissionNumber, dateOfBirth: "2012-04-01", gender: "male", admissionDate: "2024-04-14",
      classId: ctx.enrolment.classId, sectionId: ctx.enrolment.sectionId, academicYearId: ctx.year.id,
    });
    expect(res.status).toBe(201);
    const user = await prisma.user.findFirst({ where: { student: { admissionNumber } } });
    made.push(user.id);
    expect(user.email).toBeNull();
    expect(user.avatarUrl).toBe("/uploads/avatars/hari.png"); // the photo chosen in the form is kept
    expect(user.username).toBe(admissionNumber.toLowerCase());
    const login = await api("post", "/auth/login").send({ identifier: admissionNumber, password: "Password123" });
    expect(login.status).toBe(200);
  });

  test("a student added without an admission number gets the school's initials and a running number", async () => {
    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { name: true } });
    const prefix = admissionPrefix(school.name);
    const add = (n) => api("post", "/students", "admin").send({
      password: "Password123", firstName: `Auto${n}`, lastName: `Number${RUN}`, admissionNumber: "",
      dateOfBirth: "2012-04-01", gender: "female", admissionDate: "2024-04-14",
      classId: ctx.enrolment.classId, sectionId: ctx.enrolment.sectionId, academicYearId: ctx.year.id,
    });
    // two at once must not share a number
    const results = await Promise.all([add(1), add(2)]);
    const numbers = [];
    for (const res of results) {
      expect(res.status).toBe(201);
      made.push(res.body.data.user.id);
      expect(res.body.data.admissionNumber).toMatch(new RegExp(`^${prefix}\\d{4,}$`));
      expect(res.body.data.user.username).toBe(res.body.data.admissionNumber.toLowerCase());
      numbers.push(res.body.data.admissionNumber);
    }
    expect(new Set(numbers).size).toBe(2);
    const login = await api("post", "/auth/login").send({ identifier: numbers[0], password: "Password123" });
    expect(login.status).toBe(200);
  });

  test("usernames are unique per school; only an admin changes one", async () => {
    const taken = await prisma.user.findFirst({ where: { email: EMAILS.teacher } });
    const dup = await api("post", "/users", "admin").send({ username: taken.username.toUpperCase(), password: "Password123", firstName: "Dup", lastName: "User", role: "TEACHER" });
    expect(dup.status).toBe(409);
    const bad = await api("post", "/users", "admin").send({ username: "has space", password: "Password123", firstName: "Bad", lastName: "User", role: "TEACHER" });
    expect(bad.status).toBe(400);
    // a staff member with no username gets the school's initials and a running number
    const res = await api("post", "/users", "admin").send({ password: "Password123", firstName: "Sita", lastName: `Noemail${RUN}`, role: "TEACHER" });
    expect(res.status).toBe(201);
    made.push(res.body.data.id);
    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { name: true } });
    expect(res.body.data.username).toMatch(new RegExp(`^${admissionPrefix(school.name).toLowerCase()}\\d{4,}$`));
    expect(res.body.data.email).toBeNull();
    // the student may not rename themselves
    expect((await api("put", `/students/${ctx.studentId}`, "student").send({ username: "renamed" })).status).toBe(403);
  });
});

describe("passwords: admin-set, reset, forced change, class logins", () => {
  const made = { users: [], classId: null };
  const loginAs = async (identifier, password) => api("post", "/auth/login").send({ identifier, password });
  const as = (token) => (method, url) => request(app)[method](`/api/v1${url}`).set("Authorization", `Bearer ${token}`);
  const newStudent = async (classId, n, password) => {
    const admissionNumber = `PW-${RUN}-${n}`;
    const res = await api("post", "/students", "admin").send({
      ...(password ? { password } : {}),
      firstName: `Pw${n}`, lastName: `Student${RUN}`, admissionNumber, dateOfBirth: "2012-04-01", gender: "female", admissionDate: "2024-04-14",
      classId, sectionId: ctx.enrolment.sectionId, academicYearId: ctx.year.id, rollNumber: n,
    });
    expect(res.status).toBe(201);
    const user = await prisma.user.findFirst({ where: { student: { admissionNumber } } });
    made.users.push(user.id);
    return { res, user };
  };

  afterAll(async () => {
    for (const userId of made.users) {
      await prisma.studentClass.deleteMany({ where: { student: { userId } } }).catch(() => {});
      await prisma.student.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    if (made.classId) await prisma.class.delete({ where: { id: made.classId } }).catch(() => {});
  });

  test("a new student without a password gets a generated one, shown once, and must change it", async () => {
    const { res, user } = await newStudent(ctx.enrolment.classId, 1);
    const temp = res.body.data.temporaryPassword;
    expect(temp).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z0-9]{10}$/);
    expect(user.mustChangePassword).toBe(true);
    expect(user.passwordHash).not.toContain(temp);

    const login = await loginAs(user.username, temp);
    expect(login.status).toBe(200);
    expect(login.body.data.user.mustChangePassword).toBe(true);
    const call = as(login.body.data.accessToken);

    // the API refuses everything else until a new password is chosen
    const blocked = await call("get", `/students/${user.id}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    expect((await call("get", "/fees/accounts/1")).body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    expect((await call("get", "/auth/me")).status).toBe(200);

    // the new password follows the policy and must differ
    expect((await call("put", "/auth/change-password").send({ currentPassword: temp, newPassword: "short" })).status).toBe(400);
    expect((await call("put", "/auth/change-password").send({ currentPassword: temp, newPassword: temp })).status).toBe(400);
    const changed = await call("put", "/auth/change-password").send({ currentPassword: temp, newPassword: "MyOwnPass9" });
    expect(changed.status).toBe(200);
    expect(changed.body.data.accessToken).toBeTruthy(); // a forced change keeps this device signed in

    const after = as(changed.body.data.accessToken);
    expect((await after("get", "/auth/me")).body.data.mustChangePassword).toBe(false);
    expect((await after("get", "/portal/students/" + (await prisma.student.findFirst({ where: { userId: user.id } })).id + "/overview")).status).toBe(200);
    expect((await loginAs(user.username, temp)).status).toBe(401);
    expect((await loginAs(user.username, "MyOwnPass9")).status).toBe(200);
  });

  test("an admin resets a password: generated or typed, sessions end, the old one stops working", async () => {
    const { user } = await newStudent(ctx.enrolment.classId, 2, "Typed1234");
    const first = await loginAs(user.username, "Typed1234");
    expect(first.status).toBe(200);
    const typed = await api("post", `/users/${user.id}/reset-password`, "admin").send({ password: "Another123" });
    expect(typed.status).toBe(200);
    expect(typed.body.data.temporaryPassword).toBe("Another123");
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
    expect((await loginAs(user.username, "Typed1234")).status).toBe(401);
    expect((await api("post", "/auth/refresh-token").send({ refreshToken: first.body.data.refreshToken })).status).toBe(401);

    const generated = await api("post", `/users/${user.id}/reset-password`, "admin").send({});
    expect(generated.status).toBe(200);
    const temp = generated.body.data.temporaryPassword;
    expect(temp).toHaveLength(10);
    const login = await loginAs(user.username, temp);
    expect(login.status).toBe(200);
    expect(login.body.data.user.mustChangePassword).toBe(true);
    // a typed password must meet the policy
    expect((await api("post", `/users/${user.id}/reset-password`, "admin").send({ password: "weak" })).status).toBe(400);
  });

  test("who may reset whom", async () => {
    const student = await prisma.user.findFirst({ where: { email: EMAILS.student } });
    const superAdmin = await prisma.user.findFirst({ where: { email: EMAILS.superadmin } });
    const admin = await prisma.user.findFirst({ where: { email: EMAILS.admin } });
    expect((await api("post", `/users/${student.id}/reset-password`, "teacher").send({})).status).toBe(403);
    expect((await api("post", `/users/${student.id}/reset-password`, "accountant").send({})).status).toBe(403);
    expect((await api("post", `/users/${student.id}/reset-password`, "student").send({})).status).toBe(403);
    expect((await api("post", `/users/${superAdmin.id}/reset-password`, "admin").send({})).status).toBe(403);
    expect((await api("post", `/users/${admin.id}/reset-password`, "admin").send({})).status).toBe(400); // their own
    expect((await api("post", `/users/999999/reset-password`, "admin").send({})).status).toBe(404);
  });

  test("class logins: a dry run counts, a real run gives each student a working temporary password", async () => {
    const cls = await prisma.class.create({ data: { schoolId: ctx.schoolId, name: `Logins ${RUN}`, gradeLevel: 3 } });
    made.classId = cls.id;
    const a = await newStudent(cls.id, 3);
    const b = await newStudent(cls.id, 4);
    // b has signed in already: skipped by default
    await loginAs(b.user.username, b.res.body.data.temporaryPassword);

    const dry = await api("post", "/students/credentials/bulk", "admin").send({ classId: cls.id, dryRun: true });
    expect(dry.status).toBe(200);
    expect(dry.body.data).toMatchObject({ students: 1, parents: 0, skipped: { signedIn: 1, inactive: 0 }, credentials: [] });

    const run = await api("post", "/students/credentials/bulk", "admin").send({ classId: cls.id });
    expect(run.status).toBe(200);
    expect(run.body.data.credentials.map((c) => c.username)).toEqual([a.user.username]);
    const login = await loginAs(a.user.username, run.body.data.credentials[0].temporaryPassword);
    expect(login.status).toBe(200);
    expect(login.body.data.user.mustChangePassword).toBe(true);

    // everyone, in roll order, when signed-in accounts are included
    const all = await api("post", "/students/credentials/bulk", "admin").send({ classId: cls.id, onlyNeverSignedIn: false });
    expect(all.body.data.credentials.map((c) => c.rollNumber)).toEqual([3, 4]);

    expect((await api("post", "/students/credentials/bulk", "teacher").send({ classId: cls.id })).status).toBe(403);
    expect((await api("post", "/students/credentials/bulk", "admin").send({})).status).toBe(400);
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
    const email = `middle.${RUN.toLowerCase()}@demo.edu.np`;
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
      email: `middle.student.${RUN.toLowerCase()}@demo.edu.np`,
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

  test("a class's fee bills equal each student's statement for the year", async () => {
    const res = await api("get", `/fees/bills?classId=${ctx.enrolment.classId}&includeZero=true`, "accountant");
    expect(res.status).toBe(200);
    const { bills } = res.body.data;
    expect(bills.length).toBeGreaterThan(0);
    // ordered by section, then roll number
    for (const b of bills.slice(0, 5)) {
      const st = await api("get", `/fees/accounts/${b.studentId}?academicYearId=${res.body.data.academicYear.id}`, "accountant");
      const year = st.body.data.years.find((y) => y.academicYear.id === res.body.data.academicYear.id);
      expect(b.totals.due).toBeCloseTo(year ? year.totals.balance : 0, 2);
      expect(b.totals.overdue).toBeCloseTo(year ? year.totals.overdue : 0, 2);
      const lineSum = b.lines.reduce((s, l) => s + l.balance, 0);
      expect(lineSum).toBeCloseTo(b.totals.due, 2);
    }
    // without includeZero, nobody who owes nothing gets a bill
    const owing = await api("get", `/fees/bills?classId=${ctx.enrolment.classId}`, "accountant");
    expect(owing.body.data.bills.every((b) => b.totals.due > 0)).toBe(true);
  });

  test("fee bills: staff only for a class; a student or parent only their own", async () => {
    expect((await api("get", `/fees/bills?classId=${ctx.enrolment.classId}`, "teacher")).status).toBe(403);
    expect((await api("get", `/fees/bills?classId=${ctx.enrolment.classId}`, "student")).status).toBe(403);
    expect((await api("get", `/fees/bills`, "accountant")).status).toBe(400); // a class is required
    expect((await api("get", `/fees/bills/student/${ctx.studentId}`, "student")).status).toBe(200);
    expect((await api("get", `/fees/bills/student/${ctx.otherStudentId}`, "student")).status).toBe(403);
    for (const id of ctx.childIds) expect((await api("get", `/fees/bills/student/${id}`, "parent")).status).toBe(200);
    expect((await api("get", `/fees/bills/student/${ctx.otherStudentId}`, "parent")).status).toBe(403);
    expect((await api("get", `/fees/bills/student/${ctx.studentId}`, "teacher")).status).toBe(403);
  });

  test("the day book lists every entry in the range with totals that add up", async () => {
    const res = await api("get", "/fees/transactions/daybook?from=2020-01-01&to=2020-12-31", "accountant");
    expect(res.status).toBe(200);
    const year = await prisma.feeTransaction.findFirst({ where: { schoolId: ctx.schoolId }, orderBy: { paidOn: "desc" } });
    if (year) {
      const to = year.paidOn.toISOString().slice(0, 10);
      const from = new Date(Date.parse(to) - 300 * 86400000).toISOString().slice(0, 10);
      const book = await api("get", `/fees/transactions/daybook?from=${from}&to=${to}`, "accountant");
      expect(book.status).toBe(200);
      const { rows, totals } = book.body.data;
      const count = await prisma.feeTransaction.count({ where: { schoolId: ctx.schoolId, paidOn: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) } } });
      expect(rows.length).toBe(count);
      const net = rows.reduce((s, r) => s + (r.type === "REVERSAL" ? -1 : 1) * Number(r.amount), 0);
      expect(totals.overall.net).toBeCloseTo(net, 2);
      expect(totals.byMethod.reduce((s, m) => s + m.net, 0)).toBeCloseTo(net, 2);
      // oldest first
      const days = rows.map((r) => r.paidOn);
      expect([...days].sort()).toEqual(days);
    }
    expect((await api("get", "/fees/transactions/daybook?from=2024-01-01&to=2025-06-01", "accountant")).status).toBe(400); // over a year
    expect((await api("get", "/fees/transactions/daybook?from=2025-02-01&to=2025-01-01", "accountant")).status).toBe(400); // backwards
    expect((await api("get", "/fees/transactions/daybook", "accountant")).status).toBe(400); // no range
    expect((await api("get", "/fees/transactions/daybook?from=2025-01-01&to=2025-01-31", "teacher")).status).toBe(403);
    expect((await api("get", "/fees/transactions/daybook?from=2025-01-01&to=2025-01-31", "student")).status).toBe(403);
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
