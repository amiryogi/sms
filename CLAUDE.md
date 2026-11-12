# CLAUDE.md — K‑10 School Management System (Nepal)

Guidance for Claude Code working in this repo. Read this first, then
`backend/prisma/schema/models.prisma` before touching any data logic.

> **Resuming work, or on a new machine?**
> - [docs/STATUS.md](docs/STATUS.md) — what is done, what to do next, open decisions.
>   Update it when you stop work; it is the handover between machines and sessions.
> - [docs/SETUP-NEW-MACHINE.md](docs/SETUP-NEW-MACHINE.md) — clone to running in ~10 minutes.
>   The database does not travel between machines; it is rebuilt from the committed
>   migration plus `npm run seed`.
> - [docs/plans/](docs/plans/) — approved implementation plans in progress.

---

## 1. What this project is

A single-school management system for a Nepali school covering **Kindergarten
through Grade 10**. The architecture is multi-school *ready* (every core table
has `school_id`) but only one school is seeded and used.

| Layer    | Stack                                                                  |
| -------- | ---------------------------------------------------------------------- |
| Backend  | Node.js ≥18, Express 4, Prisma 5.22, JWT (access + refresh). Database: **MySQL 8 or Supabase PostgreSQL**, one per deployment (`DATABASE_PROVIDER`; see §4.12 and `docs/database/`) |
| Frontend | React 19 + Vite 7, React Router 7, Axios, react-hook-form, lucide-react |
| Styling  | **Tailwind CSS 4** (`@tailwindcss/vite`), tokens in `frontend/src/styles/app.css`, kit in `src/components/ui/`. No CSS-in-JS. shadcn/ui pieces in `src/components/shadcn/` (see §9). Charts: `recharts`, colours in `components/finance/charts/chartTheme.js` |
| Dates    | AD stored in DB; BS (Bikram Sambat) rendered via `backend/src/utils/dateConverter.js` |

Repo layout:

```
backend/            Express API + Prisma
  prisma/schema/models.prisma  ~1200 lines, 45 models — the source of truth (edit only this)
  prisma/{mysql,postgresql}/  generated schema.prisma + that provider's migrations
  prisma/build-schemas.js   models.prisma -> both provider schemas
  prisma/seed.js            roles, permissions, demo school, classes, students
  prisma/seeds/             demo fee data (demoFinance.js)
  scripts/db.js             provider-aware Prisma commands (npm run db:*)
  src/database/             provider config, client loading, dialect helpers
  src/{routes,controllers,services,middleware,validators,utils,config}
frontend/src/{api,pages,components,layouts,context}
e2e/                        Playwright browser tests (own package.json)
.github/                    feature specs written before implementation (read these)
database/schema.sql         raw SQL mirror of the Prisma schema
```

---

## 2. Commands

```bash
# backend/  (port 5000)
npm run dev              # nodemon
npm run db:schemas       # after editing prisma/schema/models.prisma: rebuild both provider schemas
npm run db:generate      # generate BOTH Prisma clients (also on npm install; stop the dev server first on Windows: EPERM)
npm run db:migrate:deploy  # apply committed migrations for DATABASE_PROVIDER — how schema changes travel
npm run db:status        # migrate status for DATABASE_PROVIDER
npm run db:studio        # DB browser
npm run seed             # node prisma/seed.js — idempotent upserts of the demo data
npm run seed -- --clean  # wipe first; refused outside a test database unless --yes-really is added
npm run lint

# frontend/  (port 5173)
npm run dev
npm run build
npm run lint
```

Health check: `GET http://localhost:5000/health`. API root: `GET /api/v1`.
Frontend reads `VITE_API_URL` (`frontend/.env`), default `http://localhost:5000/api/v1`.

Demo logins (after seed, password `password123`):
`superadmin@svi.edu.np`, `admin@svi.edu.np`, `admin@demo-school.edu.np`, `teacher@demo-school.edu.np`,
`student@demo-school.edu.np`, `parent@demo-school.edu.np`. School code `DEMO001`.

**Tests:** `npm test` (Jest) runs 466 unit tests over the pure utilities in
`backend/src/utils/__tests__/` — grade calculation, grade scales, report-card
layouts and attendance, BS date conversion, pagination, the response helpers and the fee
maths (`finance.test.js`: money, allocation, discounts, fiscal year, attendance rate) — plus the grade-scale service
in `backend/src/services/__tests__/` and the auth/ownership middleware in
`backend/src/middleware/__tests__/` (Prisma mocked; uploads with Cloudinary mocked) and the database layer in
`backend/src/database/__tests__/` (provider config, dialect helpers, schema sync,
no direct `@prisma/client` imports). They need no database, so they run
anywhere. None are marked `test.failing` now (the six grade-calculator bugs it pinned
were fixed on 2026-11-11). If you pin a new known bug that way, do not delete the marker
to silence it: fix the source.

`npm run test:integration:mysql` (alias `test:integration`) and `npm run test:integration:pg`
run the same suites in `src/__integration__/` against a **test database** of each
provider:
- the fee ledger: payments, duplicates, racing payments, receipt numbering, reversals,
  discounts, cancellation, reconciliation, dashboard KPIs;
- the database layer (`database.test.js`): types, constraints, transactions, ordering,
  case-insensitive search;
- the HTTP API through supertest (`api.test.js`): auth, RBAC, school isolation, ownership,
  the exam lifecycle and snapshot rule, result and report-card publication gating, fees,
  promotions.

`scripts/with-test-db.js --provider mysql|pg` points any command at the test database and
refuses one the app is configured to use:
- MySQL: `MYSQL_TEST_DATABASE_URL`, default `sms_test`;
- PostgreSQL: `SUPABASE_TEST_DATABASE_URL` / `SUPABASE_TEST_DIRECT_URL`, a Supabase
  project for tests only.

Set one up with `node scripts/with-test-db.js [--provider pg] npm run db:migrate:deploy`, then
the same with `npm run seed`.
`node scripts/reconcile.js` checks every cached fee balance against the ledger.

**Browser tests** live in `e2e/` (Playwright; see `e2e/README.md`):
- 48 tests over report-card printing (real PDFs), the exam lifecycle and marks entry, the
  exam pilot, the pages of every role, and fees.
- They start their own servers on the MySQL test database (ports 5012 / 5184).
- Run with `cd e2e && PW_CHANNEL=chrome npm test`.
- A test fails on any unexpected console error.
- Never edit seeded data in a test: create and remove your own, or rewrite the API response.

---

## 3. Request flow and non-negotiable patterns

```
Route -> authenticate -> requireRole/authorize -> ownership middleware -> validate -> controller -> prisma
```

**The backend is the only security boundary.** Frontend role checks are UX only.

### Controller

```js
const listThings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const where = { schoolId: req.user.schoolId, academicYearId };  // ALWAYS both
  const [data, total] = await Promise.all([
    prisma.thing.findMany({ where, skip, take: limit }),
    prisma.thing.count({ where }),
  ]);
  return ApiResponse.paginated(res, data, { page, limit, total });
});
```

- Errors: `throw ApiError.notFound('Student not found')` / `.badRequest` / `.forbidden` / `.unauthorized`. Never hand-roll `res.status(...).json(...)`.
- Responses: `ApiResponse.success | created | paginated | noContent | error`. Success shape is always `{ success, message, data }`.
- Wrap every async controller in `asyncHandler` — the global error middleware depends on it.
- Validation: `express-validator` rule arrays in `backend/src/validators/`, applied before the controller via the `validate` middleware.

### Route

```js
router.get('/', authenticate, requireRole('ADMIN', 'TEACHER'), controller.list);
router.get('/:id', authenticate, idParamRule, validate, isOwnStudent, controller.get);
router.post('/', authenticate, isAdmin, studentRules, validate, controller.create);
```

Register new routers in `backend/src/routes/index.js` under the `/v1` prefix.

### Frontend service

Every call goes through `frontend/src/api/apiClient.js` (JWT attach + 401
refresh-and-retry). One service file per domain:

```js
export const studentService = {
  getAll: (params) => apiClient.get('/students', { params }),
  getById: (id) => apiClient.get(`/students/${id}`),
};
```

No `fetch`, no bare `axios`, no business logic in components, no API calls from
a component without going through a service.

---

## 4. Hard invariants

1. **`schoolId` on every query.** Omitting it is a cross-school data leak. Use `req.user.schoolId`, never a client-supplied value.
2. **`academicYearId` scopes almost everything.** `ClassSubject`, `StudentClass`, `TeacherSubject`, `Exam`, `FeeStructure` and `Promotion` are all year-scoped. A query without it will mix years.
3. **Students link to classes only via `StudentClass`** (`studentId + classId + sectionId + academicYearId`). Teachers link only via `TeacherSubject` (`userId + classSubjectId + sectionId + academicYearId`).
4. **Subjects are class-wide (K–10).** `ClassSubject` *is* the enrollment. Do not introduce per-student subject rows for these grades.
5. **`ExamSubject` is a snapshot.** `hasTheory`, `hasPractical`, `fullMarks`, `passMarks`, `theoryFullMarks`, `practicalFullMarks` are copied from `ClassSubject` when the exam is created. Later `ClassSubject` edits must **not** retroactively change an existing exam — that would rewrite the basis of already-entered marks.
6. **Exam lifecycle:** `DRAFT -> PUBLISHED -> LOCKED`. Marks may only be entered or edited while `PUBLISHED`; teachers only see `PUBLISHED` exams; unlock moves `LOCKED -> PUBLISHED`.
7. **Results reach students/parents only when published.** `ReportCard.isPublished` gates report cards; exam status gates raw marks.
8. **Grades come from `backend/src/utils/gradeCalculator.js`, on the school's grade scale.** Scales are per school (`GradeScale` / `GradeBand`; presets NEB 8-band and legacy SLC 9-band in `utils/gradeScale.js`). Load one with `services/gradeScale.service.js` and pass it to the calculator; with no scale argument it uses NEB 8-band (A+ 90 / 4.0 … D 35 / 1.6, NG below 35). A `ReportCard` keeps the `gradeScaleId` it was generated with, and a scale in use cannot be edited. Never reimplement a grade table, and never test for the string `"NG"` — use `isPassed` / `band.isPassing`.
9. **Never trust names, only flags.** No `className.includes('10')`, no grade-level string parsing in the frontend. The backend decides academic rules and returns booleans; the frontend renders them.
10. **MySQL reserved words:** `rank` is mapped as `classRank` -> `class_rank`. Watch for similar collisions when adding columns.
11. **Money goes through the ledger only** (`services/finance/*`, plan `docs/plans/finance-and-portals.md`). `FeeTransaction` rows are never updated or deleted; a mistake is undone by a REVERSAL (admin only, never self-approved). Payments never exceed what is owed. `FeeObligation` (table `fee_payments`) and `FeeInstallment` totals are caches rewritten in the same DB transaction (READ COMMITTED, rows locked `FOR UPDATE`). Do maths with `utils/money.js` (Prisma Decimal), never `parseFloat`. Do not write `prisma.feeObligation.update({ amountPaid })` or similar by hand.
12. **Two database providers, one codebase** (`docs/database/`; Supabase setup in
    `docs/database/supabase-deployment.md`).
    - **Models:** they live only in `prisma/schema/models.prisma`. `npm run db:schemas`
      writes `prisma/mysql/schema.prisma` and `prisma/postgresql/schema.prisma`, so never
      edit those, and use only types and `@db` attributes valid on both engines.
    - **Migrations:** every schema change ships one migration per provider.
    - **Database access:** code reaches the database only through `src/database`, via
      `config/database.js` for `prisma` and `require("../database")` for `Prisma` and
      `dialect`. Never `require("@prisma/client")` (a unit test enforces it).
    - **Provider differences** (case-insensitive search and equality, table resets, unique-key
      checks) go through `dialect` helpers. Never `if (provider === ...)` in controllers.
    - **Text matching:** search with `dialect.text.search(v)` (or pass it to
      `buildSearchQuery`), and look up codes with `dialect.text.equals(v)`. A bare
      `contains` / `equals` is case-sensitive on PostgreSQL.
    - **Order is never implicit:**
      - every list shown to users, or processed in order, gets an explicit `orderBy` (at least
        `{ id: "asc" }`), because PostgreSQL has no default row order;
      - a nullable sort key says where NULLs go (`{ rollNumber: { sort: "asc", nulls: "first" } }`),
        because the engines disagree.
    - **No database-specific SQL in raw queries.** Use Prisma for inserts
      (`createMany({ skipDuplicates })` instead of `INSERT IGNORE`). Plain `SELECT ... FOR UPDATE`
      on snake_case table names is portable.

---

## 5. RBAC

```
User -> UserRole -> Role -> RolePermission -> Permission
```

`req.user` carries `{ id, schoolId, roles: string[], permissions: string[] }`.

| Role           | Scope                                            |
| -------------- | ------------------------------------------------ |
| `SUPER_ADMIN`  | Everything ADMIN can, plus managing admins and super admins; school admins can't edit, deactivate, demote or delete one. Same school only (no cross-school UI) |
| `ADMIN`        | Everything within their school                   |
| `TEACHER`      | Only their `TeacherSubject` assignments          |
| `EXAM_OFFICER` | Marks entry for any subject; read-only student directory; no finance |
| `ACCOUNTANT`   | Fees; read-only student directory                |
| `STUDENT`      | Own records (`isOwnStudent`)                     |
| `PARENT`       | Linked children only (via `StudentParent`)       |

**Roles decide access.** Routes use `requireRole` / `isAdmin` / ownership
middleware. Permissions exist only where a route checks them with
`authorize(...)`: the 11 attendance, result and report-card permissions
(`attendance.mark`, `attendance.view_all|view_class|view_own`,
`result.enter`, `result.view_all|view_own|view_child`,
`report_card.view_all|view_own|view_child`). The 48 that no route checked were
removed (migration `20261107210000_drop_unused_permissions`). Don't add a
permission unless a route checks it; if you do, add it to `seed.js` and the
role mapping in the same change. The seed now removes permissions and grants it
no longer lists, and throws on an unknown permission name instead of silently
skipping it (a typo would deny everyone — the project hit this with
`attendance:view` vs `attendance.view_all`).

Middleware: `authorize(...perms)` (ANY match), `requireRole(...roles)` (ANY
match), `isAdmin`, `isTeacher`, `isStudent`, plus `isOwnStudent`,
`isAssignedTeacher`, `canAccessAttendance`, `canAccessResults`,
`canAccessAssignment` in `ownership.middleware.js`.

Rules the RBAC audit (2026-11-07) established — keep them:

- **A super admin is an admin.** `authenticate` adds `ADMIN` to a super admin's
  roles and the frontend's `hasRole("ADMIN")` is true for one, so every admin
  check passes; only super-admin-only actions test for `SUPER_ADMIN`. The role
  is seeded last (id 7) with every permission.
- **Fail closed.** An ownership check that can't find the profile id
  (`req.user.studentId` / `parentId`) or the row it looks up denies; it never
  calls `next()`. Prisma silently drops `undefined` filters, so always guard
  the id before querying.
- **Teacher scope is the current academic year** (`AcademicYear.isCurrent`) and,
  where the request names one, the section. Last year's `TeacherSubject` rows
  grant nothing.
- `authenticate` refuses users with no role, inactive users and inactive
  schools. `POST /auth/register` is admin-only (no public sign-up; the first
  user of a school is not made ADMIN).
- `POST /users` creates staff only (ADMIN, TEACHER, EXAM_OFFICER, ACCOUNTANT).
  Students and parents are created through `/students` and `/admin/parents`,
  which create their profile rows.
- Students and parents see raw marks only when the exam is LOCKED or their
  report card is published; non-admins never see DRAFT exams; students and
  parents see only published assignments for their own class.
- Fee data is readable by ADMIN, ACCOUNTANT, and STUDENT/PARENT for their own.
- Uploads are named from a MIME whitelist (never the client's extension),
  checked by magic bytes, and served with `nosniff`; non-images download.
- Only the attendance, result and report-card routes use `authorize`; every
  other route checks roles. That is deliberate (one school, fixed roles).

---

## 6. Feature state

**Working:** auth + refresh tokens; RBAC; academic years / classes / sections /
subjects / class-subjects; student, teacher and parent CRUD; teacher
assignment; attendance; exams with DRAFT/PUBLISHED/LOCKED; marks entry (theory
+ practical); results; report cards including bulk A4 print
(`NepalReportCard.jsx`, `BulkReportCardPrint.jsx`); assignments, submissions
and grading; notices (global / role / class targeting); fees (types,
structures, payments); promotions; school branding settings; subject Excel
import.

**Fee ledger (Phases 3–5 of `docs/plans/finance-and-portals.md`):** backend, the
fee-management UI, the finance dashboard (`/finance/dashboard`, `GET /fees/dashboard`)
and reports (`/finance/reports`, `GET /fees/reports/:report`, `?format=csv`) are done.
KPI and report maths live in `utils/financeReports.js` (unit-tested); the dashboard only
draws what the API returns. `npm run seed` adds demo fee data (plans, payments, a
reversal, discounts) **only when the school has no fee transactions yet**
(`prisma/seeds/demoFinance.js`). Pages live in
`frontend/src/pages/finance/` (Collect, Accounts, AccountDetail, Transactions, Discounts,
Receipt) under `/finance/*`, shared by ADMIN and ACCOUNTANT; reusable pieces (statement,
payment dialog, receipt sheet, student picker, installment plan) in
`src/components/finance/`. The old Fee Payments page is gone; its URLs redirect to
`/finance/accounts`. Endpoints under `/api/v1/fees`: `accounts`, `transactions`
(append-only), `reversal-requests`, `discounts` (request → admin approval),
`obligations/generate/:studentClassId`, `obligations/generate-bulk`,
`obligations/:id/cancel`, `structures/:id/installments`, `reconcile`. Receipt
numbers run per school per Nepali fiscal year (`RCP-2083-84-00042`, reversals
`REV-…`). The old `/fees/payments*` endpoints and the per-row payment columns of
`fee_payments` (`payment_date`, `receipt_number`, `payment_method`, `remarks`,
`recorded_by_user_id`) were removed in Phase 8 (migration
`20261108180000_drop_legacy_fee_columns`): a payment exists only as a
`FeeTransaction`. Attendance % (`/attendance/student/:id`) follows the layout's
`countLateAsPresent`.

**Report card layout is per school** (School Settings → Report Card Layout,
`/api/v1/report-card-layout`). `School.reportCardConfig` (JSON, null = the
original NEB grade sheet) is normalized by `utils/reportCardLayout.js` and sent
in every report-card payload as `layout`. Two templates: `nebGradeSheet`
(`reportcard/ReportSheet.jsx`) and `performanceReport`
(`reportcard/PerformanceSheet.jsx`, matches `marksheetformat1-4.jpeg`). Any
layout change goes through `normalizeLayout`/`validateLayout`; the frontend only
renders the flags. Plan: `docs/plans/configurable-report-card.md`.

**Report card design** (how the NEB sheet looks: fonts, sizes, logo, row height, margins)
is `reportCardConfig.design`, same column and endpoint.
- **Rules:** the spec, defaults and ranges live in `backend/src/utils/reportCardDesign.js`
  (unit-tested). The admin form (`admin/ReportCardDesignFields.jsx`) is generated from the
  spec the API returns.
- **Rendering:** the sheet reads the values as CSS variables (`reportcard/designVars.js` →
  `nebSheetStyles.js`).
- **Adding a setting:** add it to the spec, map it in `designVars.js`, use the variable in the
  stylesheet with the old value as fallback.
- The Performance Report template does not use the design yet.

**Student portal (Phase 6):**
- Dashboard, Attendance (Nepali-month register), Assignments (hand in text or files),
  Results (from published report cards), Report Card (print), Fees (statement, receipts,
  discounts), Profile.
- One read feeds the dashboard and profile: `GET /portal/students/:studentId/overview`
  (`isOwnStudent`; `services/portal.service.js`).
- The views are shared components in `src/components/portal/` that take a `studentId`; the
  parent portal reuses them.

**Parent portal (Phase 7):**
- Pages: Dashboard, Attendance, Assignments (read-only), Results, Report Card, Fees and
  receipts, Child's Profile, Notices.
- `ParentPage` + `useChildren` give every page a child switcher. The choice lives in
  `?child=<studentId>` and is remembered for the browser session, so sidebar links keep it.
- Each view is keyed by the child's id: switching never shows the previous child's data.
- `GET /assignments?studentId=` narrows a parent's list to one linked child (403 otherwise)
  and includes that child's submissions.
- The embedded report card uses the `.rc-embedded` wrapper rule in `styles/app.css`.

**Report-card attendance** ("61/70"): the admin sets `Exam.workingDays` on the
Report Cards page (`PUT /exams/:id/working-days`, any exam status); Generate
counts present (+ late, per the layout's `countLateAsPresent`) days from the
academic-year start to the exam end and freezes them on `ReportCard`
(`daysPresent`, `daysLate`, `totalWorkingDays`). Rules in
`utils/reportCardAttendance.js`.

**Partial or rough:**
- No admin-facing attendance report page (the API exists).
- The admin and teacher dashboards are stat cards; only the finance dashboard has charts.

**Not built:** timetable/routine, library, transport, hostel, SMS/email
notifications, payroll, certificates and transfer certificates, audit-log UI,
multi-school admin UI.

**Divergence from `.github/backend-rules.md`:** that file prescribes
Routes -> Controllers -> **Services** -> Prisma, but only `notice.service.js`
and `parent.service.js` exist; every other controller calls Prisma directly.
Follow the dominant pattern (controller -> Prisma) for small work, and extract a
service when logic is shared or a controller action grows past roughly 150
lines. Don't refactor all 30 controllers to add services unless asked.

---

## 7. Scope: K–10 only — Grade 11–12 (NEB +2) has been removed

The removal planned here was **executed** (owner-confirmed). Grade 11–12 /
NEB "+2" support is gone from the code: the `Program` / `ProgramSubject` /
`StudentProgram` / `StudentSubject` / `SubjectComponent` models and the
`ComponentType` / `StudentSubjectStatus` enums are out of `schema.prisma`; the
`/programs` and `/subject-components` routers, their controllers and validators,
`utils/nebGradeUtils.js` and the `/exam-results/student-subjects` and
`/exam-results/students-by-program` endpoints are deleted; every `isNEBClass`
branch in `reportCard.controller.js` and `examResult.controller.js` was collapsed
to the single K–10 path (class-wide `ClassSubject`, unweighted GPA, no separate
theory/practical subject codes); the NEB pages, components and services are gone
from the frontend, as are the NEB seeders, the `Grade 11` / `Grade 12` seed
classes and the dead NEB specs under `.github/`.

**What was deliberately kept:**

- `ClassSubject.hasTheory/hasPractical/theoryMarks/practicalMarks`,
  `ExamSubject.hasTheory/hasPractical/theoryFullMarks/practicalFullMarks` and
  `ExamResult.practicalMarks`. K–10 subjects legitimately have practical
  components (`Subject.hasPractical`) — they just don't get separate NEB codes.
- `backend/src/utils/gradeCalculator.js`. The name mentions NEB because that is
  the national grade *scale* (A+ 90 / 4.0 … NG below 35) used for K–10 too.
  Its `useCreditWeighting` option now has no callers; K–10 GPA is unweighted.
- `ClassSubject.creditHours/theoryCreditHours/practicalCreditHours` columns and
  the per-subject credit-hour fields in report-card responses.

The database was rebuilt from scratch afterwards, so the dropped tables never
existed there: the committed baseline migration `0_init` already matches the
K–10 schema.

`backend/prisma/seeds/comprehensiveSeed.js` was left in place — it is an
alternative full seeder, not an NEB-import script — but it still writes to the
five dropped tables and will therefore fail after the migration. It is not
wired into any npm script (`npm run seed` uses `prisma/seed.js`). Strip its
11–12 half or delete it.

## 8. Known issues, not yet fixed

Fixed since this list was written: `.env` files are untracked and ignored;
migrations are tracked in git (apply with `npm run db:migrate:deploy`; never
`db push`); JWT secrets are required in production; `/auth/login` and
`/auth/refresh-token` are rate limited. Old secrets were purged from git history
(2026-11-11); treat them as leaked anyway — see `docs/STATUS.md`.

1. **`.env.example` is committed.** Keep placeholders in it (`USER:PASSWORD`); real values go only in the ignored `.env`.
2. *(fixed — see above)*
3. *(fixed 2026-11-11)* The four MySQL dumps with personal data, the old `.env` files and an enrollment report were removed from the repo **and from git history** (history rewritten; commit ids before that date changed). Root `*.sql` is gitignored: never commit a dump. `database/schema.sql` (structure only) remains.
4. *(fixed)*
5. *(fixed)*
6. *(fixed — `apiClient.js` now removes only the auth keys, and token refresh is single-flight)*
7. CORS origins are hardcoded to localhost 3000/5173/5174 plus `FRONTEND_URL`.
8. Uploads: local `uploads/` (served statically) by default; **Cloudinary** when `CLOUDINARY_*` is set (required on Vercel, which has no disk). Both paths keep the MIME whitelist, magic-byte check and MIME-derived extension (`middleware/upload.middleware.js`). Demo deployment: `docs/deploy-vercel.md` (`vercel.json`, `api/index.js`).

---

## 9. Frontend-specific rules

- **Tailwind CSS 4.** Style with utilities in JSX and the kit in `src/components/ui/`
  (`Button`, `Field`/`TextInput`/`SelectInput`, `Card`, `Badge`, `PageHeader`,
  `Dialog`, `Tabs`, `Menu`, `EmptyState`, `Alert`, `Avatar`, `toast` /
  `confirmDialog` instead of `alert()` / `confirm()`). Merge classes with `cn()` from
  `src/lib/cn.js`. Use tokens, never hex: `bg-brand-600`, `text-brand-700`,
  `text-slate-500`. `brand-*` is the school's colour (`School.brandColor`, set in
  School Settings, applied by `src/lib/brand.js`; default indigo).
- **One stylesheet:** `styles/app.css`, layers `theme, base, components, utilities`. The old
  `index.css` / `bridge.css` / `App.css` were deleted in UI wave 6 (Phase 8). The few rules
  the report sheets still need sit in its last `@layer components` block (app font on `*`,
  `.attendance-row`, the `.rc-layout-preview` / `.rc-embedded` overrides, print rules). Don't
  add global class vocabularies (`.card`, `.btn`…) again; write utilities or a kit component.
  `--radius-sm/md/lg` are pinned in `@theme` to 6 / 8 / 14 px (the values the design was built
  with), so `rounded-lg` is 14 px here, not Tailwind's 8 px.
- **Print exception.** The report-card sheets keep local, unlayered CSS for A4 output.
  There is **one sheet and one stylesheet per template**: `reportcard/ReportSheet.jsx` +
  `reportcard/nebSheetStyles.js` (NEB grade sheet) and `reportcard/PerformanceSheet.jsx`.
  `NepalReportCard` (individual) and `BulkReportCardPrint` (one sheet per page) are only
  viewers around them, so never style a sheet inside a viewer. `useFitToPage` zooms a long
  card down to one page for every caller. Unlayered CSS
  beats every Tailwind layer, so to override them from outside you need `!important`
  (see the `.rc-layout-preview` rule in `app.css`). Their `.btn` / `.no-print` class names are
  styled by those blocks, not globally. Check page counts with a print-to-PDF after touching them.
- **shadcn/ui is used selectively, not as a second kit.**
  - `components.json` sets `cssVariables: false`, so the CLI writes components with plain
    slate/white classes and **no global theme tokens**. shadcn's `muted` / `primary` /
    `border` tokens would add a second theme next to `brand-*` (and `--radius` would fight the
    pinned radii).
  - Add a component with `npx shadcn@4.23.0 add <name>` from `frontend/`. It lands in
    `src/components/shadcn/` (alias `@/` = `src/`, set in `vite.config.js` /
    `jsconfig.json`).
  - **Check the generated import:** the CLI writes `import { cn } from "cn"` and installs an
    unrelated npm package called `cn`. Change the import to `@/lib/cn`, then
    `npm uninstall cn`.
  - Restyle the component to our tokens (brand focus rings etc.) and give it a header comment.
  - Behaviour comes from the single `radix-ui` package; animations from `tw-animate-css`
    (imported in `styles/app.css`).
  - In use: Tooltip (`TooltipProvider` wraps the app in `App.jsx`), Accordion (student
    assignments), Progress. The student search combobox uses `cmdk` + Radix Popover in the
    same way.
  - Prefer the existing kit (`components/ui/`) for anything it already covers (buttons,
    dialogs, tabs, menus, fields); reach for shadcn when you need a Radix behaviour the kit
    lacks.
- **React-admin is a pilot, in one place only:** `src/examAdmin/` (route `/admin/exam-admin/*`,
  lazy-loaded). It brings Material UI, used nowhere else: do not import `react-admin` or
  `@mui/*` outside that folder, and do not migrate other screens to it without the owner's
  decision.
  - It is read-only apart from the exam lifecycle buttons, which call `examService`.
  - Its Data Provider wraps `apiClient` and sorts, filters and pages in the browser.
  - Its Auth Provider adapts `AuthContext`.
  - Its layout is bare, so the app shell stays.
  - Its theme mirrors the Tailwind tokens.

  Plan and findings: `docs/react-admin/examination-integration-plan.md`.
- Shared shell: `layouts/DashboardLayout.jsx` (sidebar, mobile drawer, top bar) reads
  its menus from `layouts/navigation.js`. A new page also needs an entry there.
- Table columns are targeted by semantic class (`.col-roll`, `.col-name`, `.col-marks`, `.col-remarks`), **not** `nth-child`.
- Pages are lazy-loaded in `App.jsx` and wrapped in `ProtectedRoute roles={[...]}`. A new page needs three things: the lazy import, a `<Route>` inside the right role block, and a menu entry in `layouts/navigation.js`.
- Use `<Link>` / `<NavLink>` for internal navigation, never `<a href>`, and `useLocation()` rather than `window.location.pathname`.
- **No academic inference in the frontend.** The `gradeLevel >= 11` heuristics that used to live in `admin/Programs.jsx`, `admin/Students.jsx` and `teacher/MarksEntry.jsx` are gone with the section 7 removal. Don't add new ones: the backend returns the flags, the frontend renders them.

---

## 10. Adding a feature

1. Read `prisma/schema/models.prisma` and reuse existing tables. Propose schema changes before writing them — do not redefine `Student`, `Class`, `Section`, `Subject` or `Exam`.
2. Check `.github/` for an existing spec (`exam/`, `fee/`, `subjects/`, `task-playbook.md`). Most modules were specced before being built.
3. Backend first: validator -> controller -> route (with middleware) -> register in `routes/index.js`.
4. Secure it: `schoolId` filter, `academicYearId` scope, role/permission check, and seed the new permission.
5. Frontend last: service in `api/`, page under `pages/{role}/`, route plus sidebar entry; style with utilities and the `ui/` kit (no new global CSS).
6. Verify by running both servers against seeded data, and state plainly what you did and did not verify.

Never ship frontend without the backend behind it. Never bypass RBAC.
