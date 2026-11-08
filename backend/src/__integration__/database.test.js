/**
 * Database-level behaviour the app relies on, run against a real test database
 * of EITHER provider (docs/database/testing-plan.md):
 *
 *   npm run test:integration:mysql
 *   npm run test:integration:pg
 *
 * Each run creates its own school (code DUALDB-<run>) and deletes it at the
 * end; everything else cascades from the school.
 */
const { prisma, Prisma, dialect, engine } = require("../database");
const m = require("../utils/money");

const RUN = Date.now().toString(36).toUpperCase();
const ctx = {};

beforeAll(async () => {
  const school = await prisma.school.create({ data: { name: `Dual DB test ${RUN}`, code: `DUALDB-${RUN}` } });
  ctx.schoolId = school.id;
});

afterAll(async () => {
  if (ctx.schoolId) await prisma.school.delete({ where: { id: ctx.schoolId } });
  await prisma.$disconnect();
});

describe(`connection (${engine})`, () => {
  test("raw query round trip", async () => {
    const [row] = await prisma.$queryRaw`SELECT 1 AS one`;
    expect(Number(row.one)).toBe(1);
  });
});

describe("types round-trip unchanged", () => {
  test("@db.Date stays the same calendar day, including the Shrawan 1 fiscal-year boundary", async () => {
    const year = await prisma.academicYear.create({
      data: { schoolId: ctx.schoolId, name: `FY-${RUN}`, startDate: new Date("2026-07-17"), endDate: new Date("2027-07-16") },
    });
    const back = await prisma.academicYear.findUnique({ where: { id: year.id } });
    expect(back.startDate.toISOString()).toBe("2026-07-17T00:00:00.000Z");
    expect(back.endDate.toISOString()).toBe("2027-07-16T00:00:00.000Z");
  });

  test("DateTime keeps milliseconds and UTC", async () => {
    const year = await prisma.academicYear.findFirst({ where: { schoolId: ctx.schoolId } });
    const at = new Date("2026-11-08T05:45:30.123Z");
    await prisma.academicYear.update({ where: { id: year.id }, data: { createdAt: at } });
    const back = await prisma.academicYear.findUnique({ where: { id: year.id } });
    expect(back.createdAt.toISOString()).toBe(at.toISOString());
  });

  test("Decimal columns are exact at their precision limits", async () => {
    const scale = await prisma.gradeScale.create({
      data: {
        schoolId: ctx.schoolId,
        name: `Scale ${RUN}`,
        bands: { create: [{ minPercent: "99.99", maxPercent: "100.00", grade: "A+", gradePoint: "4.00", description: "x" }] },
      },
      include: { bands: true },
    });
    const band = scale.bands[0];
    // Each generated client has its own Decimal class; money.js must accept it.
    expect(m.Decimal.isDecimal(band.minPercent)).toBe(true);
    expect(m.dec(band.minPercent)).toBeInstanceOf(m.Decimal);
    expect(band.minPercent.toFixed(2)).toBe("99.99");
    expect(band.gradePoint.toFixed(2)).toBe("4.00");
    // money.js works on values read back from the database
    expect(m.add(band.minPercent, "0.01").toFixed(2)).toBe("100.00");
  });

  test("Json keeps the value; DbNull resets it to NULL", async () => {
    const config = { template: "performanceReport", signatures: ["Class Teacher", "Principal"], countLateAsPresent: true };
    await prisma.school.update({ where: { id: ctx.schoolId }, data: { reportCardConfig: config } });
    expect((await prisma.school.findUnique({ where: { id: ctx.schoolId } })).reportCardConfig).toEqual(config);
    await prisma.school.update({ where: { id: ctx.schoolId }, data: { reportCardConfig: Prisma.DbNull } });
    expect((await prisma.school.findUnique({ where: { id: ctx.schoolId } })).reportCardConfig).toBeNull();
  });

  test("Boolean and NULL survive a round trip", async () => {
    const cls = await prisma.class.create({ data: { schoolId: ctx.schoolId, name: `Bool ${RUN}`, gradeLevel: 1, description: null } });
    expect(cls.description).toBeNull();
    const subject = await prisma.subject.create({ data: { schoolId: ctx.schoolId, name: "Optional", code: `OPT${RUN}`.slice(0, 20), isOptional: true } });
    expect((await prisma.subject.findUnique({ where: { id: subject.id } })).isOptional).toBe(true);
    await prisma.subject.delete({ where: { id: subject.id } });
  });
});

describe("constraints", () => {
  test("unique violation is P2002 and recognised by the dialect helper", async () => {
    await prisma.section.create({ data: { schoolId: ctx.schoolId, name: "UQ" } });
    const error = await prisma.section.create({ data: { schoolId: ctx.schoolId, name: "UQ" } }).catch((e) => e);
    expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(error.code).toBe("P2002");
    expect(dialect.isUniqueViolationOn(error, "name")).toBe(true);
  });

  test("foreign-key violation is P2003", async () => {
    const error = await prisma.section.create({ data: { schoolId: 2147483000, name: "FK" } }).catch((e) => e);
    expect(error.code).toBe("P2003");
  });

  test("onDelete: Cascade removes children with the parent", async () => {
    const scale = await prisma.gradeScale.create({
      data: { schoolId: ctx.schoolId, name: `Cascade ${RUN}`, bands: { create: [{ minPercent: 0, maxPercent: 100, grade: "A", gradePoint: 4 }] } },
    });
    await prisma.gradeScale.delete({ where: { id: scale.id } });
    expect(await prisma.gradeBand.count({ where: { gradeScaleId: scale.id } })).toBe(0);
  });
});

describe("transactions", () => {
  test("an interactive transaction rolls back on error", async () => {
    const name = `Rollback ${RUN}`;
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.class.create({ data: { schoolId: ctx.schoolId, name, gradeLevel: 2 } });
        throw new Error("abort");
      })
    ).rejects.toThrow("abort");
    expect(await prisma.class.count({ where: { schoolId: ctx.schoolId, name } })).toBe(0);
  });

  test("READ COMMITTED + SELECT ... FOR UPDATE works on this engine", async () => {
    const cls = await prisma.class.create({ data: { schoolId: ctx.schoolId, name: `Lock ${RUN}`, gradeLevel: 3 } });
    const rows = await prisma.$transaction(
      (tx) => tx.$queryRaw`SELECT id FROM classes WHERE id IN (${Prisma.join([cls.id])}) ORDER BY id FOR UPDATE`,
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
    );
    expect(rows.map((r) => Number(r.id))).toEqual([cls.id]);
  });

  test("createMany skipDuplicates ignores an existing row (portable INSERT IGNORE)", async () => {
    const data = [{ schoolId: ctx.schoolId, name: "SD" }];
    expect((await prisma.section.createMany({ data, skipDuplicates: true })).count).toBe(1);
    expect((await prisma.section.createMany({ data, skipDuplicates: true })).count).toBe(0);
  });
});

describe("queries", () => {
  beforeAll(async () => {
    await prisma.subject.createMany({
      data: ["Mathematics", "english", "Science", "Nepali", "Computer"].map((name, i) => ({
        schoolId: ctx.schoolId,
        name,
        code: `${name.slice(0, 3).toUpperCase()}${i}`,
      })),
    });
  });

  test("explicit ordering and pagination", async () => {
    const where = { schoolId: ctx.schoolId };
    const page1 = await prisma.subject.findMany({ where, orderBy: { name: "asc" }, skip: 0, take: 2, select: { name: true } });
    const page2 = await prisma.subject.findMany({ where, orderBy: { name: "asc" }, skip: 2, take: 2, select: { name: true } });
    expect(await prisma.subject.count({ where })).toBe(5);
    // Mixed case on purpose: MySQL's utf8mb4_unicode_ci and PostgreSQL's
    // en_US.UTF-8 (Supabase's default) both sort letters ignoring case. A
    // PostgreSQL database created with the "C" collation would put "Computer"
    // before "english" by byte value and fail here; the app expects linguistic order.
    const names = [...page1, ...page2].map((s) => s.name.toLowerCase());
    expect(names).toEqual(["computer", "english", "mathematics", "nepali"]);
  });

  test("dialect.text.search is case-insensitive", async () => {
    const hits = await prisma.subject.findMany({ where: { schoolId: ctx.schoolId, name: dialect.text.search("MATHEM") } });
    expect(hits.map((s) => s.name)).toEqual(["Mathematics"]);
    const lower = await prisma.subject.findMany({ where: { schoolId: ctx.schoolId, name: dialect.text.search("engl") } });
    expect(lower.map((s) => s.name)).toEqual(["english"]);
  });

  test("dialect.text.equals is case-insensitive", async () => {
    const hit = await prisma.subject.findFirst({ where: { schoolId: ctx.schoolId, code: dialect.text.equals("mat0") } });
    expect(hit?.code).toBe("MAT0");
  });

  test("groupBy and aggregate", async () => {
    const groups = await prisma.subject.groupBy({ by: ["schoolId"], where: { schoolId: ctx.schoolId }, _count: { _all: true } });
    expect(groups).toEqual([{ schoolId: ctx.schoolId, _count: { _all: 5 } }]);
    const agg = await prisma.subject.aggregate({ where: { schoolId: ctx.schoolId }, _max: { code: true } });
    expect(agg._max.code).toBe("SCI2");
  });
});
