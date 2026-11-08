/**
 * Guards for the two-provider setup that need no database:
 *  - the generated provider schemas match prisma/schema/models.prisma;
 *  - both carry the identical model body and only differ in their headers;
 *  - nothing requires @prisma/client directly (it would bypass DATABASE_PROVIDER).
 */
const fs = require("fs");
const path = require("path");
const { build, PROVIDERS, MODELS } = require("../../../prisma/build-schemas");

const BACKEND = path.join(__dirname, "../../..");
const read = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

describe("provider schemas", () => {
  test.each(Object.keys(PROVIDERS))("%s schema file is up to date (run `npm run db:schemas`)", (provider) => {
    expect(read(PROVIDERS[provider].file)).toBe(build(provider));
  });

  test("both providers share the same model body", () => {
    const models = read(MODELS).trimEnd();
    for (const provider of Object.keys(PROVIDERS)) {
      expect(read(PROVIDERS[provider].file).endsWith(`${models}\n`)).toBe(true);
    }
  });

  test("headers: provider, URL variables and separate client outputs", () => {
    const mysql = read(PROVIDERS.mysql.file);
    const pg = read(PROVIDERS.postgresql.file);
    expect(mysql).toMatch(/provider = "mysql"/);
    expect(mysql).toMatch(/url {6}= env\("MYSQL_DATABASE_URL"\)/);
    expect(mysql).toMatch(/output {3}= "..\/..\/node_modules\/.prisma-clients\/mysql"/);
    expect(pg).toMatch(/provider {2}= "postgresql"/);
    expect(pg).toMatch(/url {7}= env\("SUPABASE_DATABASE_URL"\)/);
    expect(pg).toMatch(/directUrl = env\("SUPABASE_DIRECT_URL"\)/);
    expect(pg).toMatch(/output {3}= "..\/..\/node_modules\/.prisma-clients\/postgresql"/);
  });

  test("the shared model file has no datasource or generator block", () => {
    expect(read(MODELS)).not.toMatch(/^\s*(datasource|generator)\s+\w+\s*\{/m);
  });

  test("each provider keeps its own migration history", () => {
    const lock = read(path.join(BACKEND, "prisma/mysql/migrations/migration_lock.toml"));
    expect(lock).toMatch(/provider = "mysql"/);
    expect(fs.existsSync(path.join(BACKEND, "prisma/mysql/migrations/0_init/migration.sql"))).toBe(true);
    expect(fs.existsSync(path.join(BACKEND, "prisma/migrations"))).toBe(false);
  });
});

describe("database access goes through src/database", () => {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "node_modules") walk(p);
      } else if (p.endsWith(".js")) files.push(p);
    }
  };
  for (const dir of ["src", "prisma", "scripts"]) walk(path.join(BACKEND, dir));

  test("no file requires @prisma/client directly (only its shared runtime)", () => {
    const offenders = files.filter((f) => /require\(\s*["']@prisma\/client["']\s*\)/.test(fs.readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(BACKEND, f))).toEqual([]);
  });

  test("only the database layer constructs a PrismaClient", () => {
    const offenders = files.filter((f) => /new PrismaClient\(/.test(fs.readFileSync(f, "utf8")) && !f.endsWith(path.join("src", "database", "index.js")));
    expect(offenders.map((f) => path.relative(BACKEND, f))).toEqual([]);
  });
});
