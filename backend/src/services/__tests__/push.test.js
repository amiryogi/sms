/**
 * Push notifications: sending through Expo, and who receives what.
 * No database and no network: Prisma is a hand-written fake and fetch a stub.
 */
jest.mock("../../config/database", () => ({}));

const { sendExpoPush, isExpoPushToken, EXPO_PUSH_URL } = require("../push/expoPush");
const { sectionAudience, studentAudience, noticeAudience } = require("../push/recipients");
const { messages, kathmanduToday } = require("../push");

const token = (n) => `ExponentPushToken[${String(n).padStart(22, "x")}]`;
const quiet = { warn: jest.fn() };

describe("isExpoPushToken", () => {
  it("accepts Expo tokens and nothing else", () => {
    expect(isExpoPushToken(token(1))).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abcdefghij1234567890]")).toBe(true);
    expect(isExpoPushToken("fcm:abc")).toBe(false);
    expect(isExpoPushToken("ExponentPushToken[]")).toBe(false);
    expect(isExpoPushToken(null)).toBe(false);
  });
});

describe("sendExpoPush", () => {
  const okFetch = (tickets) =>
    jest.fn(async (url, init) => ({
      ok: true,
      status: 200,
      json: async () => ({ data: tickets ?? JSON.parse(init.body).map(() => ({ status: "ok", id: "t" })) }),
    }));
  const msg = (n) => ({ to: token(n), title: "T", body: "B", data: { type: "notice", id: n } });

  it("posts batches of at most 100 to Expo", async () => {
    const fetchImpl = okFetch();
    const result = await sendExpoPush(Array.from({ length: 230 }, (_, i) => msg(i)), { fetchImpl, accessToken: "", logger: quiet });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.map(([, init]) => JSON.parse(init.body).length)).toEqual([100, 100, 30]);
    expect(fetchImpl.mock.calls[0][0]).toBe(EXPO_PUSH_URL);
    expect(result).toEqual({ sent: 230, failed: 0, invalidTokens: [] });
  });

  it("sends the access token only when one is configured", async () => {
    const withToken = okFetch();
    await sendExpoPush([msg(1)], { fetchImpl: withToken, accessToken: "secret", logger: quiet });
    expect(withToken.mock.calls[0][1].headers.Authorization).toBe("Bearer secret");
    const without = okFetch();
    await sendExpoPush([msg(1)], { fetchImpl: without, accessToken: "", logger: quiet });
    expect(without.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("reports tokens Expo says are gone, and only those", async () => {
    const fetchImpl = okFetch([
      { status: "ok", id: "a" },
      { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } },
      { status: "error", message: "busy", details: { error: "MessageRateExceeded" } },
    ]);
    const result = await sendExpoPush([msg(1), msg(2), msg(3)], { fetchImpl, accessToken: "", logger: quiet });
    expect(result).toEqual({ sent: 1, failed: 2, invalidTokens: [token(2)] });
  });

  it("drops malformed tokens without calling Expo", async () => {
    const fetchImpl = okFetch();
    const result = await sendExpoPush([{ ...msg(1), to: "not-a-token" }], { fetchImpl, accessToken: "", logger: quiet });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0, failed: 1, invalidTokens: [] });
  });

  it("never throws: a network error or a refused batch counts as failed", async () => {
    const down = jest.fn(async () => {
      throw new Error("ECONNRESET");
    });
    expect(await sendExpoPush([msg(1)], { fetchImpl: down, accessToken: "", logger: quiet })).toEqual({ sent: 0, failed: 1, invalidTokens: [] });
    const refused = jest.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }));
    expect(await sendExpoPush([msg(1), msg(2)], { fetchImpl: refused, accessToken: "", logger: quiet })).toEqual({ sent: 0, failed: 2, invalidTokens: [] });
  });
});

/* ------------------------------------------------------------ recipients */

// Two students in Grade 5 A (class 1, section 1), one in 5 B. Asha (student 10) has two
// parents; Bikash (11) shares one of them. Chandra (12, section B) has her own.
const STUDENTS = [
  { id: 10, userId: 110, user: { firstName: "Asha" }, enrol: { classId: 1, sectionId: 1, academicYearId: 7 }, parents: [210, 211] },
  { id: 11, userId: 111, user: { firstName: "Bikash" }, enrol: { classId: 1, sectionId: 1, academicYearId: 7 }, parents: [211] },
  { id: 12, userId: 112, user: { firstName: "Chandra" }, enrol: { classId: 1, sectionId: 2, academicYearId: 7 }, parents: [212] },
];

const fakeDb = () => ({
  student: {
    findMany: jest.fn(async ({ where }) => {
      if (where.schoolId !== 1) return [];
      const wanted = where.studentClasses?.some;
      return STUDENTS.filter((s) => !where.id || where.id.in.includes(s.id))
        .filter(
          (s) =>
            !wanted ||
            (s.enrol.classId === wanted.classId &&
              s.enrol.academicYearId === wanted.academicYearId &&
              (wanted.sectionId === undefined || s.enrol.sectionId === wanted.sectionId)),
        )
        .map((s) => ({ id: s.id, userId: s.userId, user: s.user, studentParents: s.parents.map((userId) => ({ parent: { userId } })) }));
    }),
  },
  user: {
    findMany: jest.fn(async ({ where }) => {
      const all = [
        { id: 1, roleIds: [2] }, // admin
        { id: 50, roleIds: [3] }, // teacher
        { id: 110, roleIds: [5] },
        { id: 210, roleIds: [6] },
      ];
      const roleIds = where.userRoles?.some.roleId.in;
      return all.filter((u) => !roleIds || u.roleIds.some((r) => roleIds.includes(r))).map((u) => ({ id: u.id }));
    }),
  },
  teacherSubject: {
    findMany: jest.fn(async ({ where }) => (where.sectionId === 2 ? [] : [{ userId: 50 }, { userId: 50 }])),
  },
});

const ids = (rows) => rows.map((r) => r.userId).sort((a, b) => a - b);

describe("sectionAudience", () => {
  it("is the section's students and their parents, each child named for the parent", async () => {
    const rows = await sectionAudience(fakeDb(), { schoolId: 1, classId: 1, sectionId: 1, academicYearId: 7 });
    expect(ids(rows)).toEqual([110, 111, 210, 211, 211]);
    // The shared parent gets one row per child, so each notification names the right one.
    expect(rows.filter((r) => r.userId === 211).map((r) => r.childName).sort()).toEqual(["Asha", "Bikash"]);
    expect(rows.find((r) => r.userId === 110)).toEqual({ userId: 110, studentId: 10 });
  });

  it("never reaches another section or another school", async () => {
    const rows = await sectionAudience(fakeDb(), { schoolId: 1, classId: 1, sectionId: 1, academicYearId: 7 });
    expect(ids(rows)).not.toContain(112);
    expect(ids(rows)).not.toContain(212);
    expect(await sectionAudience(fakeDb(), { schoolId: 2, classId: 1, sectionId: 1, academicYearId: 7 })).toEqual([]);
  });

  it("returns nobody when a scope is missing, instead of everybody", async () => {
    const db = fakeDb();
    expect(await sectionAudience(db, { schoolId: 1, classId: 1, sectionId: undefined, academicYearId: 7 })).toEqual([]);
    expect(await sectionAudience(db, { schoolId: undefined, classId: 1, sectionId: 1, academicYearId: 7 })).toEqual([]);
    expect(db.student.findMany).not.toHaveBeenCalled();
  });
});

describe("studentAudience", () => {
  it("is that student and their parents", async () => {
    expect(ids(await studentAudience(fakeDb(), { schoolId: 1, studentIds: [10] }))).toEqual([110, 210, 211]);
  });

  it("can leave the student out (an absence is for the parents)", async () => {
    const rows = await studentAudience(fakeDb(), { schoolId: 1, studentIds: [10] }, { toStudents: false });
    expect(ids(rows)).toEqual([210, 211]);
    expect(rows.every((r) => r.childName === "Asha" && r.studentId === 10)).toBe(true);
  });

  it("returns nobody for an empty list", async () => {
    const db = fakeDb();
    expect(await studentAudience(db, { schoolId: 1, studentIds: [] })).toEqual([]);
    expect(db.student.findMany).not.toHaveBeenCalled();
  });
});

describe("noticeAudience", () => {
  const base = { id: 9, schoolId: 1, createdById: 1, status: "PUBLISHED", publishFrom: null, publishTo: null, roleTargets: [], classTargets: [] };

  it("GLOBAL: everyone active in the school except the author", async () => {
    expect(ids(await noticeAudience(fakeDb(), { ...base, targetType: "GLOBAL" }))).toEqual([50, 110, 210]);
  });

  it("ROLE_SPECIFIC: only users holding a targeted role", async () => {
    const rows = await noticeAudience(fakeDb(), { ...base, targetType: "ROLE_SPECIFIC", roleTargets: [{ roleId: 3 }] });
    expect(ids(rows)).toEqual([50]);
    expect(await noticeAudience(fakeDb(), { ...base, targetType: "ROLE_SPECIFIC", roleTargets: [] })).toEqual([]);
  });

  it("CLASS_SPECIFIC: that section's students, their parents and its teachers, once each", async () => {
    const notice = { ...base, targetType: "CLASS_SPECIFIC", classTargets: [{ classId: 1, sectionId: 1, academicYearId: 7 }] };
    expect(ids(await noticeAudience(fakeDb(), notice, { currentAcademicYearId: 7 }))).toEqual([50, 110, 111, 210, 211]);
  });

  it("CLASS_SPECIFIC without a section covers every section of the class", async () => {
    const notice = { ...base, targetType: "CLASS_SPECIFIC", classTargets: [{ classId: 1, sectionId: null, academicYearId: 7 }] };
    expect(ids(await noticeAudience(fakeDb(), notice, { currentAcademicYearId: 7 }))).toEqual([50, 110, 111, 112, 210, 211, 212]);
  });

  it("sends nothing for a draft, or outside the publish window", async () => {
    const now = new Date("2026-11-14T06:00:00Z");
    const g = { ...base, targetType: "GLOBAL" };
    expect(await noticeAudience(fakeDb(), { ...g, status: "DRAFT" }, { now })).toEqual([]);
    expect(await noticeAudience(fakeDb(), { ...g, publishFrom: "2026-11-15T00:00:00Z" }, { now })).toEqual([]);
    expect(await noticeAudience(fakeDb(), { ...g, publishTo: "2026-11-13T00:00:00Z" }, { now })).toEqual([]);
    expect((await noticeAudience(fakeDb(), { ...g, publishFrom: "2026-11-13T00:00:00Z" }, { now })).length).toBe(3);
  });
});

/* --------------------------------------------------------------- content */

describe("messages", () => {
  it("carry what the app needs to open the screen, and no marks or amounts", () => {
    const graded = messages.graded({ id: 4, title: "Essay on rivers" });
    expect(graded({ userId: 110, studentId: 10 })).toEqual({
      title: "Your work was checked",
      body: "Essay on rivers",
      data: { type: "graded", id: 4, studentId: 10 },
    });
    expect(graded({ userId: 210, studentId: 10, childName: "Asha" }).title).toBe("Asha's work was checked");

    expect(messages.reportCard({ id: 3, name: "First Term" })({ userId: 210, studentId: 10, childName: "Asha" })).toEqual({
      title: "Report card published",
      body: "Asha's First Term report card is ready.",
      data: { type: "result", examId: 3, studentId: 10 },
    });
    expect(messages.absent()({ userId: 210, studentId: 10, childName: "Asha" }).body).toBe("Asha was marked absent today.");
    expect(messages.notice({ id: 9, title: "Holiday on Friday" })({ userId: 1 })).toEqual({
      title: "New notice",
      body: "Holiday on Friday",
      data: { type: "notice", id: 9 },
    });
  });

  it("clips a very long title", () => {
    const body = messages.notice({ id: 1, title: "x".repeat(300) })({}).body;
    expect(body.length).toBe(120);
    expect(body.endsWith("…")).toBe(true);
  });
});

describe("kathmanduToday", () => {
  it("is the calendar day in Nepal (UTC+5:45)", () => {
    expect(kathmanduToday(new Date("2026-11-14T18:14:00Z"))).toBe("2026-11-14");
    expect(kathmanduToday(new Date("2026-11-14T18:15:00Z"))).toBe("2026-11-15");
  });
});
