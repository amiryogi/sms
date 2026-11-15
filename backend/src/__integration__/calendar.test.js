/**
 * School calendar over HTTP (supertest), against a seeded test database of
 * either provider:
 *
 *   npm run test:integration:mysql      npm run test:integration:pg
 *
 * Everything this suite writes is its own (events titled "Cal <run> ...", an
 * exam, a second school) and is removed in afterAll; the school's calendar
 * settings are put back as they were. Dates are in 2031-2032 so nothing here
 * meets seeded attendance or fee data.
 */
const request = require("supertest");
const app = require("../app");
const { prisma, Prisma } = require("../database");
const { adToBs, bsToAd, weekdayOf, addDays } = require("../utils/calendar/bsDateAdapter");

const RUN = Date.now().toString(36).toUpperCase();
const TAG = `Cal ${RUN}`;
const PASSWORD = "password123";
const EMAILS = {
  admin: "admin@demo.edu.np",
  teacher: "teacher1@demo.edu.np",
  accountant: "accountant@demo.edu.np",
  student: "student1@demo.edu.np",
  parent: "parent.stu20240001@demo.edu.np",
};
const T = {};
const ctx = { eventIds: [] };

const api = (method, url, role) => {
  const r = request(app)[method](`/api/v1${url}`);
  return role ? r.set("Authorization", `Bearer ${T[role]}`) : r;
};

const feedOf = async (role, from, to, sources) => {
  const res = await api("get", `/calendar/feed?from=${from}&to=${to}${sources ? `&sources=${sources}` : ""}`, role);
  expect(res.status).toBe(200);
  return res.body.data.items;
};

const newEvent = async (role, body) => {
  const res = await api("post", "/calendar/events", role).send({ category: "SCHOOL_EVENT", ...body, title: `${TAG} ${body.title}` });
  if (res.status === 201) ctx.eventIds.push(res.body.data.id);
  return res;
};

/** The first day on or after `iso` that falls on `weekday`. */
const nextWeekday = (iso, weekday) => {
  let day = iso;
  while (weekdayOf(day) !== weekday) day = addDays(day, 1);
  return day;
};

beforeAll(async () => {
  for (const [role, email] of Object.entries(EMAILS)) {
    const res = await api("post", "/auth/login").send({ email, password: PASSWORD });
    if (res.status !== 200) throw new Error(`login ${email}: ${res.status} ${res.body?.message}`);
    T[role] = res.body.data.accessToken;
    if (role === "admin") ctx.adminLogin = res.body.data.user;
    if (role === "student") ctx.studentId = res.body.data.user.student?.id;
    if (role === "teacher") ctx.teacherId = res.body.data.user.id;
  }
  const admin = await prisma.user.findFirst({ where: { email: EMAILS.admin } });
  ctx.adminId = admin.id;
  ctx.schoolId = admin.schoolId;
  ctx.originalConfig = (await prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { calendarConfig: true } })).calendarConfig;
  await prisma.school.update({ where: { id: ctx.schoolId }, data: { calendarConfig: Prisma.DbNull } });

  ctx.year = await prisma.academicYear.findFirst({ where: { schoolId: ctx.schoolId, isCurrent: true } });
  ctx.enrolment = await prisma.studentClass.findFirst({
    where: { studentId: ctx.studentId, academicYearId: ctx.year.id, status: "active" },
    orderBy: { id: "asc" },
  });
  ctx.otherClass = await prisma.class.findFirst({
    where: { schoolId: ctx.schoolId, id: { not: ctx.enrolment.classId } },
    orderBy: { id: "desc" },
  });
  const taught = await prisma.teacherSubject.findMany({
    where: { userId: ctx.teacherId, academicYearId: ctx.year.id },
    select: { sectionId: true, classSubject: { select: { classId: true } } },
    orderBy: { id: "asc" },
  });
  ctx.taught = { classId: taught[0].classSubject.classId, sectionId: taught[0].sectionId };
  const taughtClassIds = taught.map((t) => t.classSubject.classId);
  ctx.untaughtClass = await prisma.class.findFirst({ where: { schoolId: ctx.schoolId, id: { notIn: taughtClassIds } }, orderBy: { id: "asc" } });
  ctx.anySection = await prisma.section.findFirst({ where: { schoolId: ctx.schoolId }, orderBy: { id: "asc" } });

  const school = await prisma.school.create({ data: { name: `Other school ${RUN}`, code: `CAL-${RUN}` } });
  ctx.otherSchoolId = school.id;
  const stranger = await prisma.user.create({
    data: { schoolId: school.id, username: `cal${RUN.toLowerCase()}`, passwordHash: "x", firstName: "Other", lastName: "Admin" },
  });
  ctx.otherEvent = await prisma.calendarEvent.create({
    data: {
      schoolId: school.id,
      title: `${TAG} other school`,
      category: "SCHOOL_HOLIDAY",
      startDate: new Date("2031-05-05T00:00:00.000Z"),
      endDate: new Date("2031-05-05T00:00:00.000Z"),
      createdById: stranger.id,
    },
  });
}, 60000);

afterAll(async () => {
  const steps = [
    () => prisma.calendarEvent.deleteMany({ where: { schoolId: ctx.schoolId, title: { startsWith: TAG } } }),
    () => prisma.calendarEvent.deleteMany({ where: { schoolId: ctx.schoolId, importId: { in: ctx.importIds || [] } } }),
    () => prisma.calendarImport.deleteMany({ where: { id: { in: ctx.importIds || [] } } }),
    () => (ctx.examId ? prisma.exam.delete({ where: { id: ctx.examId } }) : null),
    () => (ctx.otherSchoolId ? prisma.calendarEvent.deleteMany({ where: { schoolId: ctx.otherSchoolId } }) : null),
    () => (ctx.otherSchoolId ? prisma.user.deleteMany({ where: { schoolId: ctx.otherSchoolId } }) : null),
    () => (ctx.otherSchoolId ? prisma.school.delete({ where: { id: ctx.otherSchoolId } }) : null),
    () =>
      prisma.school.update({
        where: { id: ctx.schoolId },
        data: { calendarConfig: ctx.originalConfig === null ? Prisma.DbNull : ctx.originalConfig },
      }),
  ];
  const errors = [];
  for (const step of steps) await Promise.resolve(step()).catch((e) => errors.push(e));
  await prisma.$disconnect();
  if (errors.length) throw errors[0];
});

describe("settings", () => {
  test("the defaults are BS with Saturday off, and reach the client at sign-in", async () => {
    const res = await api("get", "/calendar/settings", "student");
    expect(res.status).toBe(200);
    expect(res.body.data.config).toMatchObject({ defaultCalendar: "bs", weeklyHolidayDays: [6], blockAttendanceOnNonWorkingDays: true, timezone: "Asia/Kathmandu" });
    expect(ctx.adminLogin.school.calendar.defaultCalendar).toBe("bs");
    const me = await api("get", "/auth/me", "admin");
    expect(me.body.data.school.calendar.weeklyHolidayDays).toEqual([6]);
  });

  test("only an admin may change them, and bad values are refused", async () => {
    for (const role of ["teacher", "student", "parent", "accountant"]) {
      expect((await api("put", "/calendar/settings", role).send({ config: { defaultCalendar: "ad" } })).status).toBe(403);
    }
    const bad = await api("put", "/calendar/settings", "admin").send({ config: { weeklyHolidayDays: [0, 1, 2, 3, 4, 5, 6], defaultCalendar: "x" } });
    expect(bad.status).toBe(400);
    expect(bad.body.errors.map((e) => e.field).sort()).toEqual(["defaultCalendar", "weeklyHolidayDays"]);
    expect((await api("put", "/calendar/settings")).status).toBe(401);
  });

  test("the weekly holiday is whatever the school sets", async () => {
    const saturday = nextWeekday("2031-06-01", 6);
    const friday = addDays(saturday, -1);
    let res = await api("get", `/calendar/working-day?date=${saturday}`, "teacher");
    expect(res.body.data).toMatchObject({ isWorkingDay: false, type: "WEEKLY_HOLIDAY", blocksAttendance: true });

    const saved = await api("put", "/calendar/settings", "admin").send({ config: { weeklyHolidayDays: [5], defaultCalendar: "both" } });
    expect(saved.status).toBe(200);
    expect(saved.body.data.config).toMatchObject({ weeklyHolidayDays: [5], defaultCalendar: "both" });
    res = await api("get", `/calendar/working-day?date=${saturday}`, "teacher");
    expect(res.body.data.isWorkingDay).toBe(true);
    res = await api("get", `/calendar/working-day?date=${friday}`, "teacher");
    expect(res.body.data.type).toBe("WEEKLY_HOLIDAY");

    const reset = await api("delete", "/calendar/settings", "admin");
    expect(reset.body.data).toMatchObject({ isCustom: false, config: { weeklyHolidayDays: [6] } });
    expect((await api("get", "/calendar/working-day?date=2031-06-01", "student")).status).toBe(403);
  });
});

describe("events", () => {
  test("an admin creates, reads, edits and deletes an event; dates come back as the same calendar day", async () => {
    const created = await newEvent("admin", {
      title: "sports day",
      category: "SPORTS_EVENT",
      startDate: "2031-04-14",
      endDate: "2031-04-15",
      isAllDay: false,
      startTime: "10:00",
      endTime: "15:30",
      description: "Annual sports",
    });
    expect(created.status).toBe(201);
    const event = created.body.data;
    expect(event).toMatchObject({ startDate: "2031-04-14", endDate: "2031-04-15", startTime: "10:00", endTime: "15:30", isAllDay: false, audienceType: "ALL", status: "PUBLISHED" });
    expect(event.startDateBs).toEqual(adToBs("2031-04-14"));

    const row = await prisma.calendarEvent.findUnique({ where: { id: event.id } });
    expect(row.startDate.toISOString()).toBe("2031-04-14T00:00:00.000Z");
    expect(row.endDate.toISOString()).toBe("2031-04-15T00:00:00.000Z");
    expect(row.schoolId).toBe(ctx.schoolId);
    expect(row.createdById).toBe(ctx.adminId);

    const updated = await api("put", `/calendar/events/${event.id}`, "admin").send({
      title: `${TAG} sports day moved`,
      category: "SPORTS_EVENT",
      startDate: "2031-04-16T00:00:00.000Z", // a full timestamp still means that day
      schoolId: ctx.otherSchoolId, // ignored: the school comes from the token
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ startDate: "2031-04-16", endDate: "2031-04-16", isAllDay: true, startTime: null });
    expect((await prisma.calendarEvent.findUnique({ where: { id: event.id } })).schoolId).toBe(ctx.schoolId);

    const list = await api("get", `/calendar/events?search=${encodeURIComponent(TAG.toLowerCase())}&kind=event`, "admin");
    expect(list.status).toBe(200);
    expect(list.body.data.some((e) => e.id === event.id)).toBe(true);

    expect((await api("delete", `/calendar/events/${event.id}`, "admin")).status).toBe(200);
    expect((await api("get", `/calendar/events/${event.id}`, "admin")).status).toBe(404);
  });

  test("bad input is refused with the field named", async () => {
    const cases = [
      [{ title: "x", startDate: "2031-02-30" }, "startDate"],
      [{ title: "x", startDate: "2031-04-14", endDate: "2031-04-13" }, "endDate"],
      [{ title: "x", startDate: "2031-04-14", category: "PARTY" }, "category"],
      [{ title: "x", startDate: "2031-04-14", isAllDay: false }, "startTime"],
      [{ title: "x", startDate: "2031-04-14", audienceType: "CLASS", classTargets: [] }, "classTargets"],
      [{ title: "x", startDate: "2031-04-14", audienceType: "ROLE", roles: [] }, "roles"],
      [{ title: "x", startDate: "2050-01-01" }, "startDate"],
      [{ title: "x", startDate: "2031-04-14", recurrence: "DAILY" }, "recurrence"],
    ];
    for (const [body, field] of cases) {
      const res = await newEvent("admin", body);
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e) => e.field)).toContain(field);
    }
    const noTitle = await api("post", "/calendar/events", "admin").send({ category: "OTHER", startDate: "2031-04-14" });
    expect(noTitle.body.errors.map((e) => e.field)).toContain("title");
    const foreignClass = await newEvent("admin", { title: "x", startDate: "2031-04-14", audienceType: "CLASS", classTargets: [{ classId: 99999999 }] });
    expect(foreignClass.status).toBe(400);
    const unknownRole = await newEvent("admin", { title: "x", startDate: "2031-04-14", audienceType: "ROLE", roles: ["WIZARD"] });
    expect(unknownRole.status).toBe(400);
  });

  test("students, parents and accountants cannot write; a teacher only for sections they teach", async () => {
    const body = { title: "nope", startDate: "2031-04-20" };
    for (const role of ["student", "parent", "accountant"]) expect((await newEvent(role, body)).status).toBe(403);
    expect((await api("post", "/calendar/events").send(body)).status).toBe(401);

    expect((await newEvent("teacher", { ...body, audienceType: "ALL" })).status).toBe(403);
    expect((await newEvent("teacher", { ...body, category: "SCHOOL_HOLIDAY", audienceType: "CLASS", classTargets: [ctx.taught] })).status).toBe(403);
    expect((await newEvent("teacher", { ...body, audienceType: "CLASS", classTargets: [{ classId: ctx.taught.classId }] })).status).toBe(403);
    if (ctx.untaughtClass) {
      const res = await newEvent("teacher", { ...body, audienceType: "CLASS", classTargets: [{ classId: ctx.untaughtClass.id, sectionId: ctx.anySection.id }] });
      expect(res.status).toBe(403);
    }

    const own = await newEvent("teacher", { title: "class trip", category: "ACADEMIC_ACTIVITY", startDate: "2031-04-20", audienceType: "CLASS", classTargets: [ctx.taught] });
    expect(own.status).toBe(201);
    expect(own.body.data.classTargets).toEqual([expect.objectContaining(ctx.taught)]);

    const admins = await newEvent("admin", { title: "admin only", startDate: "2031-04-21" });
    expect((await api("put", `/calendar/events/${admins.body.data.id}`, "teacher").send({ title: "x", category: "OTHER", startDate: "2031-04-21", audienceType: "CLASS", classTargets: [ctx.taught] })).status).toBe(403);
    expect((await api("delete", `/calendar/events/${admins.body.data.id}`, "teacher")).status).toBe(403);
    expect((await api("delete", `/calendar/events/${own.body.data.id}`, "teacher")).status).toBe(200);

    const teacherList = await api("get", "/calendar/events?limit=100", "teacher");
    expect(teacherList.body.data.every((e) => e.createdBy.id === ctx.teacherId)).toBe(true);
  });
});

describe("who sees what", () => {
  const from = "2031-07-01";
  const to = "2031-07-31";
  const titles = (items) => items.filter((i) => i.title.startsWith(TAG)).map((i) => i.title.slice(TAG.length + 1));

  beforeAll(async () => {
    const mine = { classId: ctx.enrolment.classId, sectionId: ctx.enrolment.sectionId };
    const results = [
      await newEvent("admin", { title: "for all", startDate: "2031-07-02" }),
      await newEvent("admin", { title: "draft", startDate: "2031-07-03", status: "DRAFT" }),
      await newEvent("admin", { title: "teachers", startDate: "2031-07-04", audienceType: "ROLE", roles: ["TEACHER"], category: "STAFF_MEETING" }),
      await newEvent("admin", { title: "my section", startDate: "2031-07-05", audienceType: "CLASS", classTargets: [mine] }),
      await newEvent("admin", { title: "my whole class", startDate: "2031-07-06", audienceType: "CLASS", classTargets: [{ classId: mine.classId }] }),
      await newEvent("admin", { title: "another class", startDate: "2031-07-07", audienceType: "CLASS", classTargets: [{ classId: ctx.otherClass.id }] }),
      await newEvent("admin", { title: "switched off", startDate: "2031-07-08", isActive: false }),
    ];
    for (const r of results) expect(r.status).toBe(201);
  });

  test("an admin sees everything that is active, drafts included", async () => {
    expect(titles(await feedOf("admin", from, to, "event")).sort()).toEqual(["another class", "draft", "for all", "my section", "my whole class", "teachers"]);
  });

  test("a student sees published events for everyone and for their own class only", async () => {
    expect(titles(await feedOf("student", from, to, "event")).sort()).toEqual(["for all", "my section", "my whole class"]);
  });

  test("a parent sees their child's class events", async () => {
    const seen = titles(await feedOf("parent", from, to, "event"));
    expect(seen).toEqual(expect.arrayContaining(["for all", "my section", "my whole class"]));
    expect(seen).not.toEqual(expect.arrayContaining(["draft"]));
    expect(seen).not.toEqual(expect.arrayContaining(["teachers"]));
    expect(seen).not.toEqual(expect.arrayContaining(["another class"]));
  });

  test("a role event reaches that role only", async () => {
    const teacher = titles(await feedOf("teacher", from, to, "event"));
    expect(teacher).toEqual(expect.arrayContaining(["for all", "teachers"]));
    expect(teacher).not.toContain("draft");
    const accountant = titles(await feedOf("accountant", from, to, "event"));
    expect(accountant).toEqual(["for all"]);
  });

  test("an event of another school is never returned or changed", async () => {
    const items = await feedOf("admin", "2031-05-01", "2031-05-31");
    expect(items.some((i) => i.sourceId === ctx.otherEvent.id && i.source === "event")).toBe(false);
    expect((await api("get", `/calendar/events/${ctx.otherEvent.id}`, "admin")).status).toBe(404);
    expect((await api("put", `/calendar/events/${ctx.otherEvent.id}`, "admin").send({ title: "x", category: "OTHER", startDate: "2031-05-05" })).status).toBe(404);
    expect((await api("delete", `/calendar/events/${ctx.otherEvent.id}`, "admin")).status).toBe(404);
    expect(await prisma.calendarEvent.count({ where: { id: ctx.otherEvent.id } })).toBe(1);
    // A holiday of another school does not close this one.
    const day = await api("get", "/calendar/working-day?date=2031-05-05", "admin");
    expect(day.body.data.type === "HOLIDAY").toBe(false);
  });

  test("a draft or hidden event cannot be opened by id either", async () => {
    const draft = await prisma.calendarEvent.findFirst({ where: { schoolId: ctx.schoolId, title: `${TAG} draft` } });
    expect((await api("get", `/calendar/events/${draft.id}`, "student")).status).toBe(404);
    expect((await api("get", `/calendar/events/${draft.id}`, "admin")).status).toBe(200);
    const other = await prisma.calendarEvent.findFirst({ where: { schoolId: ctx.schoolId, title: `${TAG} another class` } });
    expect((await api("get", `/calendar/events/${other.id}`, "student")).status).toBe(404);
  });

  test("the feed checks its range", async () => {
    expect((await api("get", "/calendar/feed?from=2031-07-01", "admin")).status).toBe(400);
    expect((await api("get", "/calendar/feed?from=2031-07-02&to=2031-07-01", "admin")).status).toBe(400);
    expect((await api("get", "/calendar/feed?from=2030-01-01&to=2031-12-31", "admin")).status).toBe(400);
    expect((await api("get", "/calendar/feed?from=2031-07-01&to=2031-07-31&sources=secrets", "admin")).status).toBe(400);
    expect((await api("get", "/calendar/feed?from=2031-07-01&to=2031-07-31")).status).toBe(401);
  });
});

describe("repeating events", () => {
  test("a yearly BS event lands on the right AD day each year", async () => {
    const first = bsToAd({ year: 2087, month: 1, day: 1 });
    const res = await newEvent("admin", { title: "new year", category: "SCHOOL_HOLIDAY", startDate: first, recurrence: "YEARLY_BS" });
    expect(res.status).toBe(201);
    for (const year of [2088, 2089]) {
      const day = bsToAd({ year, month: 1, day: 1 });
      const items = await feedOf("student", addDays(day, -3), addDays(day, 3), "event");
      const hit = items.filter((i) => i.sourceId === res.body.data.id);
      expect(hit).toHaveLength(1);
      expect(hit[0]).toMatchObject({ startDate: day, endDate: day, isHoliday: true });
      const working = await api("get", `/calendar/working-day?date=${day}`, "teacher");
      expect(working.body.data.isWorkingDay).toBe(false);
    }
    expect(await prisma.calendarEvent.count({ where: { schoolId: ctx.schoolId, title: `${TAG} new year` } })).toBe(1);
  });

  test("a weekly event stops at its end date", async () => {
    const res = await newEvent("admin", { title: "assembly", startDate: "2031-09-01", recurrence: "WEEKLY", recurrenceUntil: "2031-09-15" });
    const items = (await feedOf("admin", "2031-09-01", "2031-09-30", "event")).filter((i) => i.sourceId === res.body.data.id);
    expect(items.map((i) => i.startDate)).toEqual(["2031-09-01", "2031-09-08", "2031-09-15"]);
  });
});

describe("existing records appear without being copied", () => {
  test("an exam shows from its own row, and a DRAFT exam only to admins", async () => {
    const exam = await prisma.exam.create({
      data: {
        schoolId: ctx.schoolId,
        academicYearId: ctx.year.id,
        name: `${TAG} exam`,
        examType: "unit_test",
        status: "DRAFT",
        createdBy: ctx.adminId,
        startDate: new Date("2031-08-10T00:00:00.000Z"),
        endDate: new Date("2031-08-14T00:00:00.000Z"),
      },
    });
    ctx.examId = exam.id;
    const before = await prisma.calendarEvent.count({ where: { schoolId: ctx.schoolId } });

    const admin = (await feedOf("admin", "2031-08-01", "2031-08-31", "exam")).filter((i) => i.sourceId === exam.id);
    expect(admin).toHaveLength(1);
    expect(admin[0]).toMatchObject({ source: "exam", category: "EXAMINATION", startDate: "2031-08-10", endDate: "2031-08-14", status: "DRAFT" });
    for (const role of ["teacher", "student", "parent", "accountant"]) {
      expect((await feedOf(role, "2031-08-01", "2031-08-31", "exam")).some((i) => i.sourceId === exam.id)).toBe(false);
    }

    await prisma.exam.update({ where: { id: exam.id }, data: { status: "PUBLISHED" } });
    expect((await feedOf("teacher", "2031-08-01", "2031-08-31", "exam")).some((i) => i.sourceId === exam.id)).toBe(true);
    // No subjects for the student's class in this exam, so it is not theirs.
    expect((await feedOf("student", "2031-08-01", "2031-08-31", "exam")).some((i) => i.sourceId === exam.id)).toBe(false);
    expect(await prisma.calendarEvent.count({ where: { schoolId: ctx.schoolId } })).toBe(before);
  });

  test("the academic year's first and last day are in the feed", async () => {
    const start = ctx.year.startDate.toISOString().slice(0, 10);
    const items = await feedOf("student", start, start, "academicYear");
    expect(items).toEqual([expect.objectContaining({ source: "academicYear", sourceId: ctx.year.id, startDate: start })]);
  });

  test("assignment and fee items follow their own modules' visibility", async () => {
    const yearStart = ctx.year.startDate.toISOString().slice(0, 10);
    const to = addDays(yearStart, 399);
    const adminItems = await feedOf("admin", yearStart, to, "assignment,fee");
    const assignments = await prisma.assignment.count({
      where: {
        teacherSubject: { classSubject: { class: { schoolId: ctx.schoolId } } },
        dueDate: { gte: new Date(`${yearStart}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) },
      },
    });
    expect(adminItems.filter((i) => i.source === "assignment")).toHaveLength(assignments);

    const studentItems = await feedOf("student", yearStart, to, "assignment,fee");
    expect(studentItems.every((i) => i.source !== "assignment" || i.status === "PUBLISHED")).toBe(true);
    for (const item of studentItems.filter((i) => i.source === "fee")) {
      expect(item.studentId).toBe(ctx.studentId);
      expect(JSON.stringify(item)).not.toMatch(/amount/i);
    }
    // An accountant sees fee structure dates but no class work.
    const accountant = await feedOf("accountant", yearStart, to, "assignment,fee");
    expect(accountant.some((i) => i.source === "assignment")).toBe(false);
  });

  test("the overview gives today in both calendars", async () => {
    const res = await api("get", "/calendar/overview", "parent");
    expect(res.status).toBe(200);
    const { today } = res.body.data;
    expect(today.bs).toEqual(adToBs(today.ad));
    expect(today.weekday).toBe(weekdayOf(today.ad));
    expect(Array.isArray(res.body.data.holidays)).toBe(true);
    expect(typeof res.body.data.isWorkingDay).toBe("boolean");
  });
});

describe("holiday import", () => {
  test("only admins may preview or import", async () => {
    for (const role of ["teacher", "student", "parent", "accountant"]) {
      expect((await api("post", "/calendar/holidays/import/preview", role).send({ bsYear: 2083 })).status).toBe(403);
      expect((await api("post", "/calendar/holidays/import", role).send({ bsYear: 2083, keys: ["x"], confirm: true })).status).toBe(403);
      expect((await api("get", "/calendar/holidays/sources", role)).status).toBe(403);
    }
  });

  test("the preview shows the published BS date with its AD date and writes nothing", async () => {
    const before = await prisma.calendarEvent.count({ where: { schoolId: ctx.schoolId } });
    const sources = await api("get", "/calendar/holidays/sources", "admin");
    expect(sources.body.data.sources.find((s) => s.bsYear === 2083).source).toMatch(/Home Affairs/);

    const res = await api("post", "/calendar/holidays/import/preview", "admin").send({ bsYear: 2083 });
    expect(res.status).toBe(200);
    const rows = res.body.data.rows;
    expect(rows.every((r) => !r.error)).toBe(true);
    const dashain = rows.find((r) => r.key === "moha-2083:dashain");
    expect(dashain).toMatchObject({ bsStart: "2083-06-31", bsEnd: "2083-07-06", startDate: "2026-10-17", endDate: "2026-10-23", category: "PUBLIC_HOLIDAY", recommended: true });
    expect(rows.find((r) => r.key === "moha-2083:teej")).toMatchObject({ recommended: false, applicability: "Women employees only" });
    expect(res.body.data.undated.length).toBeGreaterThan(0);
    expect(await prisma.calendarEvent.count({ where: { schoolId: ctx.schoolId } })).toBe(before);
    ctx.preview = rows;

    expect((await api("post", "/calendar/holidays/import/preview", "admin").send({ bsYear: 2070 })).status).toBe(404);
    expect((await api("post", "/calendar/holidays/import/preview", "admin").send({ bsYear: 1800 })).status).toBe(400);
  });

  test("import needs confirmation, creates only the chosen new rows, and a second run adds nothing", async () => {
    ctx.importIds = [];
    const fresh = ctx.preview.filter((r) => !r.duplicate && r.recommended).slice(0, 4);
    const keys = fresh.map((r) => r.key);
    if (!keys.length) return; // the school already has the whole list

    expect((await api("post", "/calendar/holidays/import", "admin").send({ bsYear: 2083, keys })).status).toBe(400);
    expect((await api("post", "/calendar/holidays/import", "admin").send({ bsYear: 2083, keys: [], confirm: true })).status).toBe(400);

    const first = await api("post", "/calendar/holidays/import", "admin").send({ bsYear: 2083, keys, confirm: true });
    expect(first.status).toBe(201);
    ctx.importIds.push(first.body.data.importId);
    expect(first.body.data.created).toBe(keys.length);

    const stored = await prisma.calendarEvent.findMany({ where: { schoolId: ctx.schoolId, importId: first.body.data.importId }, orderBy: { id: "asc" } });
    expect(stored).toHaveLength(keys.length);
    for (const event of stored) {
      const row = fresh.find((r) => r.key === event.sourceKey);
      expect(event.startDate.toISOString().slice(0, 10)).toBe(row.startDate);
      expect(event.sourcePublishedDate).toBe(row.bsStart);
      expect(event.source).toMatch(/Home Affairs/);
      expect(event.sourceDocument).toMatch(/Gazette/);
    }

    // The admin edits one; importing again must not overwrite or repeat it.
    await prisma.calendarEvent.update({ where: { id: stored[0].id }, data: { title: `${TAG} renamed holiday`, isActive: false } });
    const again = await api("post", "/calendar/holidays/import/preview", "admin").send({ bsYear: 2083 });
    expect(again.body.data.rows.filter((r) => keys.includes(r.key)).every((r) => r.duplicate)).toBe(true);

    const second = await api("post", "/calendar/holidays/import", "admin").send({ bsYear: 2083, keys, confirm: true });
    expect(second.status).toBe(201);
    ctx.importIds.push(second.body.data.importId);
    expect(second.body.data.created).toBe(0);
    expect(second.body.data.skipped).toHaveLength(keys.length);
    expect(await prisma.calendarEvent.count({ where: { schoolId: ctx.schoolId, sourceKey: { in: keys } } })).toBe(keys.length);
    const edited = await prisma.calendarEvent.findUnique({ where: { id: stored[0].id } });
    expect(edited).toMatchObject({ title: `${TAG} renamed holiday`, isActive: false });
  });

  test("a pasted list goes through the same preview, with duplicates and bad dates marked", async () => {
    const body = {
      bsYear: 2088,
      source: "Municipality notice",
      rows: [
        { title: `${TAG} local fair`, bs: "2088-02-10", category: "LOCAL_HOLIDAY", applicability: "Ward 4" },
        { title: `${TAG} local fair`, bs: "२०८८/०२/१०" },
        { title: `${TAG} impossible`, bs: "2088-02-40" },
      ],
    };
    const res = await api("post", "/calendar/holidays/import/preview", "admin").send(body);
    expect(res.status).toBe(200);
    const [a, b, c] = res.body.data.rows;
    expect(a).toMatchObject({ startDate: bsToAd({ year: 2088, month: 2, day: 10 }), category: "LOCAL_HOLIDAY", duplicate: null, error: null });
    expect(b.duplicate.reason).toMatch(/Repeated/);
    expect(c.error).toMatch(/BS date/);
    expect(res.body.data.summary).toEqual({ total: 3, new: 1, duplicates: 1, invalid: 1 });
    expect((await api("post", "/calendar/holidays/import/preview", "admin").send({ ...body, source: "" })).status).toBe(400);

    const done = await api("post", "/calendar/holidays/import", "admin").send({ ...body, keys: res.body.data.rows.map((r) => r.key), confirm: true });
    expect(done.status).toBe(201);
    ctx.importIds.push(done.body.data.importId);
    expect(done.body.data.created).toBe(1);
  });
});

describe("attendance on non-working days", () => {
  const record = () => ({
    classId: ctx.enrolment.classId,
    sectionId: ctx.enrolment.sectionId,
    attendanceRecords: [{ studentId: ctx.studentId, studentClassId: ctx.enrolment.id, status: "present" }],
  });

  test("saving is refused on a weekly holiday and on a holiday, and nothing is written", async () => {
    const saturday = nextWeekday("2031-10-01", 6);
    const holiday = nextWeekday("2031-10-08", 2);
    await newEvent("admin", { title: "founders day", category: "SCHOOL_HOLIDAY", startDate: holiday });

    for (const [date, text] of [[saturday, /Saturday is a weekly holiday/], [holiday, /Holiday: .*founders day/]]) {
      const res = await api("post", "/attendance", "admin").send({ ...record(), date });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(text);
      expect(await prisma.attendance.count({ where: { schoolId: ctx.schoolId, attendanceDate: new Date(`${date}T00:00:00.000Z`) } })).toBe(0);
    }
  });

  test("a holiday for another class does not block this one, and the school can switch the rule off", async () => {
    const day = nextWeekday("2031-10-15", 3);
    await newEvent("admin", { title: "other class holiday", category: "SCHOOL_HOLIDAY", startDate: day, audienceType: "CLASS", classTargets: [{ classId: ctx.otherClass.id }] });
    const mine = await api("get", `/calendar/working-day?date=${day}&classId=${ctx.enrolment.classId}&sectionId=${ctx.enrolment.sectionId}`, "teacher");
    expect(mine.body.data.isWorkingDay).toBe(true);
    const theirs = await api("get", `/calendar/working-day?date=${day}&classId=${ctx.otherClass.id}`, "teacher");
    expect(theirs.body.data).toMatchObject({ isWorkingDay: false, type: "HOLIDAY", blocksAttendance: true });

    await api("put", "/calendar/settings", "admin").send({ config: { blockAttendanceOnNonWorkingDays: false } });
    const off = await api("get", `/calendar/working-day?date=${day}&classId=${ctx.otherClass.id}`, "teacher");
    expect(off.body.data).toMatchObject({ isWorkingDay: false, blocksAttendance: false });
    await api("delete", "/calendar/settings", "admin");
  });
});

describe("date-only fields elsewhere keep their calendar day", () => {
  test("an exam created with plain or full ISO dates stores that day", async () => {
    const res = await api("post", "/exams", "admin").send({
      name: `${TAG} dated exam`,
      examType: "unit_test",
      academicYearId: ctx.year.id,
      classIds: [ctx.enrolment.classId],
      startDate: "2031-11-03",
      endDate: "2031-11-07T00:00:00.000Z",
    });
    expect(res.status).toBe(201);
    const exam = await prisma.exam.findUnique({ where: { id: res.body.data.id } });
    expect(exam.startDate.toISOString()).toBe("2031-11-03T00:00:00.000Z");
    expect(exam.endDate.toISOString()).toBe("2031-11-07T00:00:00.000Z");
    await prisma.examSubject.deleteMany({ where: { examId: exam.id } });
    await prisma.exam.delete({ where: { id: exam.id } });

    const bad = await api("post", "/exams", "admin").send({ name: `${TAG} bad`, examType: "unit_test", academicYearId: ctx.year.id, classIds: [ctx.enrolment.classId], startDate: "2031-02-30" });
    expect(bad.status).toBeGreaterThanOrEqual(400);
    expect(bad.status).toBeLessThan(500);
  });
});
