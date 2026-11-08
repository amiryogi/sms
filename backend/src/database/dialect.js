/**
 * The only provider-specific code in the backend. Controllers and services
 * call these helpers instead of testing the provider themselves.
 * See docs/database/mysql-postgresql-compatibility.md (C2, C3, C4, C8).
 *
 * Pure: `dialectFor(engine)` takes "mysql" or "postgresql", so it is
 * unit-tested without a database.
 */

const TABLE_NAME = /^[a-z_][a-z0-9_]*$/;

const dialectFor = (engine) => {
  if (engine !== "mysql" && engine !== "postgresql") throw new Error(`Unknown database engine "${engine}"`);
  const pg = engine === "postgresql";

  return {
    engine,

    text: {
      /** Case-insensitive substring filter (MySQL's collation already ignores case). */
      search: (value) => (pg ? { contains: value, mode: "insensitive" } : { contains: value }),
      /** Case-insensitive equality, for lookups by code and duplicate checks. */
      equals: (value) => (pg ? { equals: value, mode: "insensitive" } : { equals: value }),
    },

    /** True when `error` is a unique violation (P2002) on a key that includes `column`. */
    isUniqueViolationOn: (error, column) => {
      if (error?.code !== "P2002") return false;
      const target = error.meta?.target;
      // MySQL reports the index name, PostgreSQL the column list.
      const text = Array.isArray(target) ? target.join(",") : String(target || "");
      return text.includes(column);
    },

    /**
     * Empty the given tables and reset their id counters. Destructive: callers
     * must have confirmed the target (see prisma/seed.js --clean).
     * Returns the names of tables that could not be emptied (e.g. missing).
     */
    resetTables: async (prisma, tables) => {
      for (const t of tables) if (!TABLE_NAME.test(t)) throw new Error(`Refusing odd table name "${t}"`);
      const skipped = [];
      if (pg) {
        const existing = await prisma.$queryRawUnsafe(
          "SELECT tablename FROM pg_tables WHERE schemaname = current_schema()"
        );
        const have = new Set(existing.map((r) => r.tablename));
        const present = tables.filter((t) => have.has(t));
        skipped.push(...tables.filter((t) => !have.has(t)));
        if (present.length) {
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${present.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
        }
        return skipped;
      }
      // MySQL: FK checks are per session, so run everything on one connection.
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
        try {
          for (const t of tables) {
            try {
              await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``);
            } catch {
              skipped.push(t);
            }
          }
        } finally {
          await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
        }
      }, { timeout: 120000 });
      return skipped;
    },
  };
};

module.exports = { dialectFor };
