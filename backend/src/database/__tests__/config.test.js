const { resolveDatabaseConfig, describeUrl, DatabaseConfigError } = require("../config");

const MYSQL = "mysql://user:secret@db.example.com:3306/school";
const PG_POOL = "postgresql://postgres.abc:secret@aws-0.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require";
const PG_DIRECT = "postgresql://postgres:secret@db.abc.supabase.co:5432/postgres?sslmode=require";

const fails = (env, pattern) => {
  expect(() => resolveDatabaseConfig(env)).toThrow(DatabaseConfigError);
  expect(() => resolveDatabaseConfig(env)).toThrow(pattern);
};

describe("resolveDatabaseConfig", () => {
  test("mysql: provider, engine and URL", () => {
    const cfg = resolveDatabaseConfig({ DATABASE_PROVIDER: "mysql", MYSQL_DATABASE_URL: MYSQL });
    expect(cfg).toMatchObject({ provider: "mysql", engine: "mysql", url: MYSQL, directUrl: null, warnings: [] });
  });

  test("supabase: PostgreSQL engine, pooled URL and direct URL", () => {
    const cfg = resolveDatabaseConfig({ DATABASE_PROVIDER: "supabase", SUPABASE_DATABASE_URL: PG_POOL, SUPABASE_DIRECT_URL: PG_DIRECT });
    expect(cfg).toMatchObject({ provider: "supabase", engine: "postgresql", url: PG_POOL, directUrl: PG_DIRECT });
  });

  test("provider is case- and space-insensitive", () => {
    expect(resolveDatabaseConfig({ DATABASE_PROVIDER: " MySQL ", MYSQL_DATABASE_URL: MYSQL }).provider).toBe("mysql");
  });

  test("postgres:// is accepted as well as postgresql://", () => {
    const url = PG_POOL.replace("postgresql://", "postgres://");
    expect(resolveDatabaseConfig({ DATABASE_PROVIDER: "supabase", SUPABASE_DATABASE_URL: url }).url).toBe(url);
  });

  test("missing provider fails fast and explains the upgrade", () => {
    fails({ MYSQL_DATABASE_URL: MYSQL }, /DATABASE_PROVIDER is not set/);
    fails({ DATABASE_URL: MYSQL }, /rename DATABASE_URL to MYSQL_DATABASE_URL/);
  });

  test("unknown provider fails; there is no fallback", () => {
    fails({ DATABASE_PROVIDER: "postgres", SUPABASE_DATABASE_URL: PG_POOL }, /not supported/);
    fails({ DATABASE_PROVIDER: "sqlite", MYSQL_DATABASE_URL: MYSQL }, /not supported/);
  });

  test("the provider's URL is required; the old DATABASE_URL is not used", () => {
    fails({ DATABASE_PROVIDER: "mysql" }, /MYSQL_DATABASE_URL is required/);
    fails({ DATABASE_PROVIDER: "mysql", DATABASE_URL: MYSQL }, /rename it to MYSQL_DATABASE_URL/);
    fails({ DATABASE_PROVIDER: "supabase", MYSQL_DATABASE_URL: MYSQL }, /SUPABASE_DATABASE_URL is required/);
  });

  test("a URL for the wrong engine is refused", () => {
    fails({ DATABASE_PROVIDER: "mysql", MYSQL_DATABASE_URL: PG_POOL }, /must start with mysql:\/\//);
    fails({ DATABASE_PROVIDER: "supabase", SUPABASE_DATABASE_URL: MYSQL }, /must start with postgresql:\/\//);
    fails({ DATABASE_PROVIDER: "supabase", SUPABASE_DATABASE_URL: PG_POOL, SUPABASE_DIRECT_URL: MYSQL }, /SUPABASE_DIRECT_URL/);
  });

  test("a malformed URL is refused", () => {
    fails({ DATABASE_PROVIDER: "mysql", MYSQL_DATABASE_URL: "not a url" }, /not a valid URL/);
  });

  test("the direct URL is optional at runtime", () => {
    expect(resolveDatabaseConfig({ DATABASE_PROVIDER: "supabase", SUPABASE_DATABASE_URL: PG_POOL }).directUrl).toBeNull();
  });

  test("unused URLs for the other provider only warn", () => {
    const cfg = resolveDatabaseConfig({ DATABASE_PROVIDER: "mysql", MYSQL_DATABASE_URL: MYSQL, SUPABASE_DATABASE_URL: PG_POOL, DATABASE_URL: MYSQL });
    expect(cfg.warnings).toEqual([
      "SUPABASE_DATABASE_URL is set but DATABASE_PROVIDER=mysql; it is ignored.",
      "DATABASE_URL is no longer read; it is ignored.",
    ]);
  });

  test("the label never contains credentials", () => {
    const cfg = resolveDatabaseConfig({ DATABASE_PROVIDER: "supabase", SUPABASE_DATABASE_URL: PG_POOL });
    expect(cfg.label).toBe("supabase aws-0.pooler.supabase.com:6543/postgres");
    expect(cfg.label).not.toMatch(/secret|postgres\.abc/);
    expect(describeUrl("::")).toBe("(unparseable URL)");
  });
});
