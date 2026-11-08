# MySQL ↔ PostgreSQL compatibility

Every difference found in the [audit](dual-database-audit.md) that matters for this codebase.
Each entry gives:
1. the current MySQL behaviour;
2. the PostgreSQL equivalent;
3. the schema change;
4. the code change;
5. the integrity risk;
6. the test that proves it.

**Rule for every fix:** controllers and services stay shared. Provider-specific behaviour
lives only in `src/database/dialect.js`, as small helpers. There is no
`if (provider === ...)` anywhere else.

---

## C1. Receipt-number sequence: `INSERT IGNORE`

1. **MySQL today:** `ledger.service.js` `nextReceiptNumber` runs
   `INSERT IGNORE INTO receipt_sequences (...) VALUES (..., 1)`. This creates the counter row
   for a school, series and fiscal year if it is missing. Then it runs `SELECT ... FOR UPDATE`
   and `UPDATE ... next_number + 1`.
2. **PostgreSQL:** `INSERT IGNORE` is a syntax error. The equivalent is
   `INSERT ... ON CONFLICT DO NOTHING`.
3. **Schema:** none.
4. **Code:** replace the raw insert with
   `tx.receiptSequence.createMany({ data: [...], skipDuplicates: true })`. Prisma emits
   `INSERT IGNORE` on MySQL and `ON CONFLICT DO NOTHING` on PostgreSQL. The lock and the
   increment stay raw SQL; that is standard SQL and valid on both.
5. **Risk:** receipt numbers must be unique and gap-free per school, series and fiscal year.
   The row lock (`FOR UPDATE`) is what guarantees this, and it behaves the same under READ
   COMMITTED on both engines.
6. **Test:** the existing integration tests "receipt numbers unique and gap-free under
   parallel load" and "first receipt of a new fiscal year starts at 00001", run on both
   providers.

## C2. Case-insensitive text search

1. **MySQL today:** `contains` compiles to `LIKE '%x%'` under `utf8mb4_unicode_ci`, so it
   ignores case. There are 12 call sites (audit §4): the directory search
   (`utils/queryHelpers.buildSearchQuery`), the ledger, fee-account and notice searches.
2. **PostgreSQL:** `LIKE` is case-sensitive. Prisma's `mode: "insensitive"` compiles to
   `ILIKE`.
3. **Schema:** none.
4. **Code:** add `dialect.text.search(value)`:
   - it returns `{ contains: value, mode: "insensitive" }` on PostgreSQL;
   - it returns `{ contains: value }` on MySQL, because Prisma rejects `mode` there.

   The 12 call sites use the helper.
5. **Risk:** none to data; only search results. Without the fix, searching "rajan" would miss
   "Rajan" on PostgreSQL.
6. **Test:** a new integration test (both providers) searching a mixed-case name, admission
   number and receipt number in lower case.

## C3. Case-insensitive equality and uniqueness

1. **MySQL today:** `school.findUnique({ where: { code } })` (the public login-page lookup)
   and the subject-code duplicate checks (`subject.controller.js:55, 97`) ignore case.
   Unique keys such as `(school_id, code)` also treat `MATH` and `math` as the same.
2. **PostgreSQL:** equality and unique indexes are case-sensitive. Making them insensitive
   needs either the `citext` extension or a unique index on `lower(code)`. Prisma 5.22 cannot
   express the latter, and the former is PostgreSQL-only.
3. **Schema:** none. Keeping one shared model body (see the architecture proposal) rules out
   PostgreSQL-only column types.
4. **Code:**
   - `dialect.text.equals(value)` gives insensitive equality for these lookups and duplicate
     checks; `findUnique` by code becomes `findFirst` with it.
   - Emails are already lowercased by `normalizeEmail()` in every validator, so login and
     duplicate-email checks behave the same on both.
5. **Risk** (accepted, documented): on PostgreSQL the database itself would accept `MATH` and
   `math` as two subject codes if a row were inserted outside the API. Through the API, the
   duplicate check prevents it.
6. **Test:** creating subject `math` after `MATH` is refused on both providers; the login
   lookup `?school=demo001` finds `DEMO001` on both.

## C4. Seed reset: `SET FOREIGN_KEY_CHECKS` and backtick `TRUNCATE`

1. **MySQL today:** `seed.js` disables foreign-key checks, truncates every table (which resets
   `AUTO_INCREMENT`), then re-enables them. It does this on **every** run.
2. **PostgreSQL:** `TRUNCATE t1, t2, ... RESTART IDENTITY CASCADE`. There is no session
   variable, and identifiers take double quotes, not backticks.
3. **Schema:** none.
4. **Code:**
   - `dialect.resetTables(names)` runs the right statement for each engine;
   - the seed wipes only when called with `--reset` (and `--yes-really` against a non-test
     URL);
   - without `--reset` it runs idempotent upserts and refuses to touch a database that
     already has demo data;
   - `prisma/seeds/comprehensiveSeed.js` is deleted.
5. **Risk:** wiping a real database by accident. The new guard is stricter than today's
   behaviour.
6. **Test:**
   - on both providers, `seed --reset` against the test database gives the same row counts
     per table;
   - a second plain `seed` changes nothing;
   - `seed` against a URL that is not a test URL, without the flags, refuses.

## C5. Row order without `orderBy`

1. **MySQL today:** InnoDB usually returns rows in primary-key order, which some lists rely on
   without saying so (83 candidate `findMany` calls, audit §5).
2. **PostgreSQL:** without `ORDER BY` the order is undefined, and it can change after updates
   or a `VACUUM`.
3. **Schema:** none.
4. **Code:** add an explicit `orderBy` (`id`, or the natural key such as `sequence`, `name`,
   `rollNumber`) wherever order is visible or matters. Leave lookups, sets and aggregations
   alone. The classification is recorded per call site in Phase 5.
5. **Risk:** lists that reorder (the UI only). The money paths do not depend on it:
   - installment allocation is sorted in JavaScript (`utils/feeAllocation.js`);
   - locks are taken `ORDER BY id`.
6. **Test:** API-level tests assert the order of the main lists:
   - class and section lists, students by roll number, subjects, installments by sequence,
     ledger by date and id;
   - run on both providers.

## C6. NULL ordering

1. **MySQL today:** in ascending order NULLs come first; in descending order, last.
2. **PostgreSQL:** the reverse: NULLs come last in ascending order and first in descending
   order.
3. **Schema:** none.
4. **Code:** where a nullable key is sorted and the position of NULLs is visible (e.g.
   students without a roll number), use Prisma's `{ sort: "asc", nulls: "first" }`. Prisma 5
   documents it for relational providers; confirm it on MySQL 8 in Phase 5. If MySQL rejects
   it, sort in JavaScript after the query instead. Apply it to the call sites identified in
   Phase 5.
5. **Risk:** display order only.
6. **Test:** a class with one student missing a roll number lists that student in the same
   place on both providers.

## C7. Deadlocks and write conflicts

1. **MySQL today:** `balances.withTransaction` retries on `P2034` or a "deadlock" / "lock wait
   timeout" message.
2. **PostgreSQL:** deadlocks (`40P01`) and serialization failures (`40001`) surface as Prisma
   `P2034`. A lock wait has no timeout by default; the transaction's `timeout: 20000` bounds it.
3. **Schema:** none.
4. **Code:** none. Optionally set a session `lock_timeout` on PostgreSQL through the dialect if
   the tests show long waits.
5. **Risk:** double-spending a balance under concurrency. It is prevented by the row locks, not
   by the retry.
6. **Test:** the existing "two parallel payments on one installment: one succeeds, one 409,
   totals consistent" on both providers.

## C8. Unique-violation metadata (`P2002.meta.target`)

1. **MySQL today:** `target` is the index name. The idempotency replay check
   (`ledger.service.js:157`) looks for `"idempotency"` in `String(target)`. The error
   middleware formats both forms.
2. **PostgreSQL:** `target` is the list of column names.
3. **Schema:** none.
4. **Code:** none needed (`String(["school_id", "idempotency_key"])` contains
   `idempotency`). Move the check into a small `isUniqueViolationOn(error, "idempotency_key")`
   helper so the intent is explicit.
5. **Risk:** a replayed payment shown as an error instead of the original receipt.
6. **Test:** the existing "same idempotency key twice returns one row", on both providers.

## C9. JSON columns

1. **MySQL today:** `JSON`. The code reads and writes whole values; `Prisma.DbNull` resets
   `School.reportCardConfig` to `NULL`.
2. **PostgreSQL:** `JSONB`. Key order and whitespace are not preserved, which doesn't matter
   because the code never compares JSON as text.
3. **Schema:** none (`Json` maps to both).
4. **Code:** `Prisma.DbNull` must come from the active client's namespace, which the database
   layer exports.
5. **Risk:** none found.
6. **Test:** saving, reading and resetting the report-card layout on both providers.

## C10. Dates, times and decimals

- **Dates and times:**
  - `DateTime` → `DATETIME(3)` / `TIMESTAMP(3)` without time zone. Prisma writes and reads
    UTC on both, so the values match.
  - `@db.Date` columns come back as midnight UTC on both. The ledger's fiscal-year and BS
    conversions work on those dates (`utils/fiscalYear.js`, `dateConverter`).
  - `@db.Time` → `TIME` / `TIME(6)`; Prisma returns a `Date` on 1970-01-01 on both.
- **Decimals:** `@db.Decimal(p,s)` is exact on both. Prisma returns `Decimal` objects on both,
  and `utils/money.js` does all the maths.
- **Code:**
  - `money.js` takes `Decimal` from `@prisma/client/runtime/library`, which both generated
    clients share. It stays usable in unit tests without a database.
- **Test:**
  - a round trip of each column type (date, time, datetime, decimal at its precision limit);
  - the fee KPI integration test, on both providers.

## C11. Migration history

1. **MySQL today:** 8 migrations in `prisma/migrations/`, including the `fee_ledger`
   backfill.
2. **PostgreSQL:** none of them can run; they are MySQL DDL.
3. **Schema:** see [migration-plan.md](migration-plan.md):
   - the MySQL history moves to `prisma/mysql/migrations/` unchanged;
   - a PostgreSQL `0_init` baseline is generated from the shared models.
4. **Code:** none.
5. **Risk:** pointing a migration at the wrong engine. The `scripts/db.js` wrapper checks the
   URL scheme against `DATABASE_PROVIDER` and refuses a mismatch.
6. **Test:** in CI, `migrate deploy` into empty MySQL and empty PostgreSQL databases, then
   `migrate diff` against the schema must report no drift.

## C12. Connections (Supabase specifics)

- **Two connection strings:**
  - **pooled** (Supavisor, port 6543, transaction mode) for the running app, with
    `?pgbouncer=true&sslmode=require`;
  - **direct** (port 5432) for migrations.
- **Pooled-URL settings:**
  - `pgbouncer=true` turns off prepared statements, which the transaction-mode pooler cannot
    keep;
  - interactive transactions (the ledger's `$transaction(async tx => ...)`) still work,
    because each one runs in a single pooled transaction.
- **Prisma configuration:** `datasource db { url = env("SUPABASE_DATABASE_URL")
  directUrl = env("SUPABASE_DIRECT_URL") }`.
- **Connection limit:** set `connection_limit` in the URL for the host (1 on serverless,
  higher on a long-running server).
- **Test:** the PostgreSQL integration suite runs through the pooled URL, so it exercises
  this path.
