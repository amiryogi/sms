#!/usr/bin/env node
/**
 * Builds the two provider schemas from the shared model file:
 *
 *   prisma/schema/models.prisma  ->  prisma/mysql/schema.prisma
 *                                    prisma/postgresql/schema.prisma
 *
 * Only the generator and datasource blocks differ between providers; the
 * models are copied verbatim. Never edit the generated files.
 *
 *   node prisma/build-schemas.js           write both files
 *   node prisma/build-schemas.js --check   exit 1 if either file is stale (CI)
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const MODELS = path.join(ROOT, "schema", "models.prisma");

const PROVIDERS = {
  mysql: {
    file: path.join(ROOT, "mysql", "schema.prisma"),
    header: [
      "generator client {",
      '  provider = "prisma-client-js"',
      '  output   = "../../node_modules/.prisma-clients/mysql"',
      "}",
      "",
      "datasource db {",
      '  provider = "mysql"',
      '  url      = env("MYSQL_DATABASE_URL")',
      "}",
    ],
  },
  postgresql: {
    file: path.join(ROOT, "postgresql", "schema.prisma"),
    header: [
      "generator client {",
      '  provider = "prisma-client-js"',
      '  output   = "../../node_modules/.prisma-clients/postgresql"',
      "}",
      "",
      "// Supabase: the app connects through the pooler (SUPABASE_DATABASE_URL,",
      "// ?pgbouncer=true); migrations use the direct connection.",
      "datasource db {",
      '  provider  = "postgresql"',
      '  url       = env("SUPABASE_DATABASE_URL")',
      '  directUrl = env("SUPABASE_DIRECT_URL")',
      "}",
    ],
  },
};

const banner = (provider) =>
  [
    "// =====================================================",
    `// GENERATED for ${provider} by prisma/build-schemas.js. DO NOT EDIT.`,
    "// Edit prisma/schema/models.prisma, then run `npm run db:schemas`.",
    "// =====================================================",
    "",
    "",
  ].join("\n");

/** The full text of one provider's schema. */
const build = (provider) => {
  const models = fs.readFileSync(MODELS, "utf8").replace(/\r\n/g, "\n").trimEnd();
  if (/^\s*(datasource|generator)\s+\w+\s*\{/m.test(models)) {
    throw new Error("prisma/schema/models.prisma must not contain a datasource or generator block");
  }
  const { header } = PROVIDERS[provider];
  return `${banner(provider)}${header.join("\n")}\n\n${models}\n`;
};

const main = () => {
  const check = process.argv.includes("--check");
  const stale = [];
  for (const provider of Object.keys(PROVIDERS)) {
    const { file } = PROVIDERS[provider];
    const want = build(provider);
    const have = fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : null;
    if (have === want) continue;
    if (check) {
      stale.push(path.relative(process.cwd(), file));
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, want);
      console.log(`wrote ${path.relative(process.cwd(), file)}`);
    }
  }
  if (check) {
    if (stale.length) {
      console.error(`Stale generated schema(s): ${stale.join(", ")}. Run \`npm run db:schemas\`.`);
      process.exit(1);
    }
    console.log("Provider schemas are up to date.");
  }
};

if (require.main === module) main();

module.exports = { build, PROVIDERS, MODELS };
