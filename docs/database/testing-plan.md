# Testing plan: proving both providers

PostgreSQL support is claimed **only** when the PostgreSQL integration run is green.
Generating a client or passing `prisma validate` is not evidence.

## Layers

| Layer | Runs on | Command | Status today |
|---|---|---|---|
| Unit | no database | `npm test` | 410 tests, 13 suites. **Unchanged**: no test is removed or weakened |
| Schema | no database | `npm run db:schemas:check && npm run db:validate` | new |
| Integration: database | MySQL test DB / Supabase test project | `npm run test:integration:mysql` / `:pg` | 33 fee-ledger tests (MySQL only) → extended, both |
| Integration: API (supertest) | same | same commands | new |
| Browser sweep | a server on each provider | `uisweep.mjs` (all roles, all pages) | exists (MySQL); run against PostgreSQL in Phase 6 |

## Test databases

- **MySQL:** `MYSQL_TEST_DATABASE_URL`. By default `sms_test` on the local MySQL, as today.
- **PostgreSQL:** a separate free Supabase project, used only for tests.
  - Connection: `SUPABASE_TEST_DATABASE_URL` (pooled) and `SUPABASE_TEST_DIRECT_URL`
    (migrations).
  - The developer creates it and keeps both URLs in `backend/.env`; they are never committed or
    printed.
  - The project pauses after about a week idle: resume it in the dashboard before a run.
  - Runs go over the internet, so integration tests use `--runInBand` and a longer Jest timeout
    (30 s).
- `scripts/with-test-db.js --provider mysql|pg <command>` points a command at the right test
  database:
  - it sets `DATABASE_PROVIDER` and the URL variables;
  - it refuses any URL equal to a configured app URL.
- Each suite creates its own fixtures (its own school, exam or fee type) and removes them in
  `afterAll`. `seed --clean` resets a test database when needed (allowed there).

## The shared integration suite

The same test files run on both providers. Database-specific expectations live in the helpers,
not in the tests.

**Database level** (`src/__integration__/db/*.test.js`):
- connection, `$queryRaw` round trip, graceful disconnect;
- CRUD on a representative model per area (School, User, Student, StudentClass, Exam,
  ExamResult, FeeTransaction);
- relations and nested writes; `include` / `select` shapes are identical;
- unique violations → P2002 (`isUniqueViolationOn` on both target shapes); FK violations →
  P2003; `onDelete: Restrict` refusals (fee rows block enrolment deletion);
- transactions: commit and rollback; READ COMMITTED; `FOR UPDATE` blocking (two parallel
  payments on one installment: one succeeds, one 409);
- decimals at precision limits: `Decimal(12,2)` 9,999,999,999.99, `Decimal(3,2)` GPA 4.00;
  no float drift through `money.js`;
- dates: `@db.Date` round trip at the Shrawan 1 fiscal-year boundary; `DateTime` UTC;
  `@db.Time`;
- NULL handling and NULL ordering where the code relies on it;
- pagination: `skip` / `take` and the counts match; ordering of the main lists is asserted;
- case-insensitive search and code lookups (C2/C3).

**Existing ledger suite**, now run on both:
- payments: first, partial, settling, several fees on one receipt; overpayment refused;
- duplicate submission with the same idempotency key gives one row;
- racing payments;
- receipt numbering: unique, gap-free, per fiscal year;
- reversals: request, wrong approver refused, approve, double reversal refused;
- discounts: approve, revoke, cap;
- obligation cancellation;
- reconciliation clean; the dashboard KPI accuracy test.

**API level** (supertest against `app.js`, `src/__integration__/api/*.test.js`):
- **auth:** login, wrong password, refresh, logout, rate-limit headers present;
- **RBAC:** each role's allowed and forbidden routes (the existing probe matrix, ported);
  super admin ⊇ admin; inactive user refused;
- **school isolation:** an id from another school gives 404 or 403;
- **CRUD:** students (with StudentClass), teachers (with TeacherSubject), parents (with
  StudentParent links); academic years (current-year switch);
- **attendance:** mark a day; summary with the late rule;
- **exams:** DRAFT → PUBLISHED → marks entry → LOCKED; marks refused when not PUBLISHED; a
  teacher sees only PUBLISHED exams;
- **results and report cards:**
  - generate and publish; student and parent see nothing before publication;
  - grades come from `gradeCalculator` with the school's scale;
- **fees:** structures, generation, payment, receipt, reversal, statement totals;
- **promotions:** promote a class and undo; undo refused when fee transactions exist.

## CI (`.github/workflows/ci.yml`, new)

```
jobs:
  checks:       node 20 · npm ci (backend, frontend)
                db:schemas:check · db:validate · db:generate (both clients)
                backend lint · npm test (unit) · frontend lint · frontend build
  mysql:        service mysql:8.0      → db:migrate:deploy · drift check · test:integration:mysql
  postgresql:   service postgres:16    → db:migrate:deploy · drift check · test:integration:pg
```

- The two integration jobs run in parallel and report separately, so a failure names its
  provider.
- CI uses throwaway containers, never Supabase.
- The Supabase test project is for local runs: it checks the real pooler, SSL and Supavisor
  behaviour before a release.

## Acceptance for each phase

- **Phase 3 (MySQL preserved):**
  - unit tests 410/410;
  - `test:integration:mysql` green, including the new database-level and API suites;
  - `db:status` up to date on dev and test;
  - the browser sweep shows 0 findings.
- **Phase 4–5 (PostgreSQL added, dialect fixes):** everything above still green on MySQL, plus
  `migrate deploy` and the drift check on the Supabase test project.
- **Phase 6 (both proven):**
  - `test:integration:pg` green with the same test files;
  - the browser sweep on a PostgreSQL-backed server shows 0 findings;
  - the report card prints on 1 page;
  - `reconcile.js` OK on both.
- **Results:** every run's counts are recorded in `docs/STATUS.md`, with any provider-specific
  failure listed as an open issue instead of being worked around in the tests.
