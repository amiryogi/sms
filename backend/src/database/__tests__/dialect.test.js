const { dialectFor } = require("../dialect");

const mysql = dialectFor("mysql");
const pg = dialectFor("postgresql");

describe("dialectFor", () => {
  test("rejects an unknown engine", () => {
    expect(() => dialectFor("supabase")).toThrow(/Unknown database engine/);
  });

  test("text.search: MySQL relies on its collation, PostgreSQL asks for ILIKE", () => {
    expect(mysql.text.search("raj")).toEqual({ contains: "raj" });
    expect(pg.text.search("raj")).toEqual({ contains: "raj", mode: "insensitive" });
  });

  test("text.equals: insensitive equality on PostgreSQL only", () => {
    expect(mysql.text.equals("MATH")).toEqual({ equals: "MATH" });
    expect(pg.text.equals("MATH")).toEqual({ equals: "MATH", mode: "insensitive" });
  });

  describe("isUniqueViolationOn", () => {
    test("MySQL reports the index name", () => {
      const err = { code: "P2002", meta: { target: "fee_transactions_school_id_idempotency_key_key" } };
      expect(mysql.isUniqueViolationOn(err, "idempotency_key")).toBe(true);
      expect(mysql.isUniqueViolationOn(err, "receipt_number")).toBe(false);
    });

    test("PostgreSQL reports the column list", () => {
      const err = { code: "P2002", meta: { target: ["school_id", "idempotency_key"] } };
      expect(pg.isUniqueViolationOn(err, "idempotency_key")).toBe(true);
      expect(pg.isUniqueViolationOn(err, "receipt_number")).toBe(false);
    });

    test("anything but P2002 is not a unique violation", () => {
      expect(pg.isUniqueViolationOn({ code: "P2003", meta: { target: ["idempotency_key"] } }, "idempotency_key")).toBe(false);
      expect(pg.isUniqueViolationOn(null, "x")).toBe(false);
      expect(pg.isUniqueViolationOn({ code: "P2002" }, "x")).toBe(false);
    });
  });

  describe("resetTables", () => {
    test("refuses table names that are not plain identifiers", async () => {
      const prisma = { $transaction: jest.fn(), $queryRawUnsafe: jest.fn(), $executeRawUnsafe: jest.fn() };
      await expect(mysql.resetTables(prisma, ["users; DROP TABLE x"])).rejects.toThrow(/odd table name/);
      await expect(pg.resetTables(prisma, ['"users"'])).rejects.toThrow(/odd table name/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    test("MySQL: one connection, FK checks off around the truncates, back on even after a failure", async () => {
      const sql = [];
      const tx = {
        $executeRawUnsafe: jest.fn(async (q) => {
          sql.push(q);
          if (q.includes("`missing`")) throw new Error("no such table");
        }),
      };
      const prisma = { $transaction: jest.fn(async (fn) => fn(tx)) };
      const skipped = await mysql.resetTables(prisma, ["exam_results", "missing", "schools"]);
      expect(skipped).toEqual(["missing"]);
      expect(sql).toEqual([
        "SET FOREIGN_KEY_CHECKS = 0",
        "TRUNCATE TABLE `exam_results`",
        "TRUNCATE TABLE `missing`",
        "TRUNCATE TABLE `schools`",
        "SET FOREIGN_KEY_CHECKS = 1",
      ]);
    });

    test("PostgreSQL: one TRUNCATE ... RESTART IDENTITY CASCADE over the tables that exist", async () => {
      const prisma = {
        $queryRawUnsafe: jest.fn(async () => [{ tablename: "exam_results" }, { tablename: "schools" }]),
        $executeRawUnsafe: jest.fn(async () => 0),
      };
      const skipped = await pg.resetTables(prisma, ["exam_results", "missing", "schools"]);
      expect(skipped).toEqual(["missing"]);
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith('TRUNCATE TABLE "exam_results", "schools" RESTART IDENTITY CASCADE');
    });
  });
});
