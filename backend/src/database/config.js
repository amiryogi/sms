/**
 * Database provider configuration, read once at startup.
 *
 *   DATABASE_PROVIDER=mysql     MYSQL_DATABASE_URL=mysql://...
 *   DATABASE_PROVIDER=supabase  SUPABASE_DATABASE_URL=postgresql://...  (pooler)
 *                               SUPABASE_DIRECT_URL=postgresql://...    (migrations)
 *
 * Fails fast on a missing or unknown provider, a missing URL, or a URL whose
 * scheme does not match the provider. It never falls back to another database.
 * Pure: takes the environment as an argument, so it is unit-tested without one.
 */

const PROVIDERS = {
  mysql: {
    engine: "mysql",
    urlVar: "MYSQL_DATABASE_URL",
    directVar: null,
    schemes: ["mysql:"],
  },
  supabase: {
    engine: "postgresql",
    urlVar: "SUPABASE_DATABASE_URL",
    directVar: "SUPABASE_DIRECT_URL",
    schemes: ["postgresql:", "postgres:"],
  },
};

class DatabaseConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

/** "host:port/db" for logs. Never includes the user name or password. */
const describeUrl = (url) => {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
  } catch {
    return "(unparseable URL)";
  }
};

const checkUrl = (name, value, schemes) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new DatabaseConfigError(`${name} is not a valid URL.`);
  }
  if (!schemes.includes(parsed.protocol)) {
    throw new DatabaseConfigError(
      `${name} must start with ${schemes.map((s) => `${s}//`).join(" or ")} (got ${parsed.protocol}//).`
    );
  }
};

/**
 * @param {Record<string,string|undefined>} env  usually process.env
 * @returns {{ provider, engine, url, directUrl, label, warnings: string[] }}
 */
const resolveDatabaseConfig = (env) => {
  const raw = (env.DATABASE_PROVIDER || "").trim().toLowerCase();
  if (!raw) {
    throw new DatabaseConfigError(
      `DATABASE_PROVIDER is not set. Use one of: ${Object.keys(PROVIDERS).join(", ")}. ` +
        "Existing MySQL installs: add DATABASE_PROVIDER=mysql and rename DATABASE_URL to MYSQL_DATABASE_URL."
    );
  }
  const spec = PROVIDERS[raw];
  if (!spec) {
    throw new DatabaseConfigError(
      `DATABASE_PROVIDER="${env.DATABASE_PROVIDER}" is not supported. Use one of: ${Object.keys(PROVIDERS).join(", ")}.`
    );
  }

  const url = (env[spec.urlVar] || "").trim();
  if (!url) {
    const hint = raw === "mysql" && env.DATABASE_URL ? " (DATABASE_URL is set: rename it to MYSQL_DATABASE_URL)" : "";
    throw new DatabaseConfigError(`${spec.urlVar} is required when DATABASE_PROVIDER=${raw}${hint}.`);
  }
  checkUrl(spec.urlVar, url, spec.schemes);

  let directUrl = null;
  if (spec.directVar) {
    directUrl = (env[spec.directVar] || "").trim() || null;
    if (directUrl) checkUrl(spec.directVar, directUrl, spec.schemes);
  }

  const warnings = [];
  for (const [name, other] of Object.entries(PROVIDERS)) {
    if (name === raw) continue;
    if (env[other.urlVar]) warnings.push(`${other.urlVar} is set but DATABASE_PROVIDER=${raw}; it is ignored.`);
  }
  if (env.DATABASE_URL) warnings.push("DATABASE_URL is no longer read; it is ignored.");

  return {
    provider: raw,
    engine: spec.engine,
    url,
    directUrl,
    urlVar: spec.urlVar,
    directVar: spec.directVar,
    label: `${raw} ${describeUrl(url)}`,
    warnings,
  };
};

module.exports = { resolveDatabaseConfig, describeUrl, DatabaseConfigError, PROVIDERS };
