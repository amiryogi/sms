# Where this project is

Updated 2026-11-08. Keep this current when you stop work — it is the handover
between machines and between sessions.

New machine? Start with [SETUP-NEW-MACHINE.md](SETUP-NEW-MACHINE.md).

**All four phases of [plans/configurable-report-card.md](plans/configurable-report-card.md)
are done** and on `main`.

---

## Report card redesign, React-admin pilot, Playwright — in progress

Brief pasted 2026-11-11. Audit and proposals: [ui-ux/](ui-ux/), [react-admin/](react-admin/),
[testing/](testing/). Decisions (owner, 2026-11-11): React-admin **pilot** only (exam list + a
results table); exam lists filtered in the browser; verification shows derived facts only (no
schema change); keep the existing marks-entry grid; bulk print adopts the individual design;
a font setting that defaults to today's Inter.

| Phase | Scope | State |
|---|---|---|
| 1–2 | Audit, proposals, decisions | **Done** (2026-11-11) |
| 3 | One report-card template for individual and bulk | **Done** (2026-11-11) |
| 4 | Design settings (fonts, sizes, margins) + admin page | **Done** (2026-11-11) |
| 5 | React-admin pilot for examinations | **Done** (2026-11-11); keep / extend / remove is the owner's call |
| 6 | Playwright: report cards, visual baselines, exam flows | **Done** (2026-11-12) |
| 7 | Regression and documentation | — |

**Phase 3:**
- **Code:** `ReportSheet` has one option set and one stylesheet (`reportcard/nebSheetStyles.js`).
  The bulk variant and its 730-line stylesheet are gone; `BulkReportCardPrint` renders the same
  sheet once per page. Screen spacing now equals print spacing. `useFitToPage` keeps any card
  on one page.
- **Verified in a browser on the test database:**
  - bulk and individual report identical computed font sizes;
  - PDFs: NEB and Performance individual 1 page, bulk 5 pages for 5 students, student page 1;
  - a card with 21 subject rows shrinks to 1 page; a normal card is not shrunk;
  - the settings preview still renders; no console errors.
- **Not covered:** phones (the fit step is skipped below 800px width); long school and
  student names (Playwright fixtures in Phase 6).

**Phase 4:**
- **What was added:** 37 design settings in 7 groups (page, school header, title, student
  information, grade sheet, summary, signatures and footer), stored as
  `School.reportCardConfig.design`. No migration.
- **Backend:** `utils/reportCardDesign.js` holds the spec, defaults (the sheet's previous fixed
  values) and ranges; validation rejects unknown settings and out-of-range values;
  `normalizeLayout` always returns a complete design.
- **Frontend:** School Settings → Report Card has a Design section with sliders, per-group and
  full reset, and the existing live preview; `RangeField` joined the `ui/` kit.
- **Verified:**
  - 466 unit tests pass (13 new);
  - in a browser on the test database: the default design gives unchanged sizes and 1-page
    PDFs; a custom design (28pt extra-bold Times name, logo right, larger table, wider
    margins) applies identically to individual, bulk and student pages and still prints
    1 / 5 / 1 pages; invalid values get 400 and a teacher gets 403; the live preview follows
    the sliders; "Restore default design" and Save work.
- **Limits:** the design applies to the NEB grade sheet only, not the Performance Report;
  landscape is not offered; column widths other than the subject column are fixed.

**Phase 5 (pilot):**
- **Where:** `frontend/src/examAdmin/`, at `/admin/exam-admin` (menu "Exam Admin (pilot)", admins
  only).
- **Screens:**
  - Examinations: search, status / year / type filters, sorting, paging, lifecycle buttons
    (publish, lock, unlock) calling the existing endpoints;
  - an exam's subject snapshot;
  - Results per exam + class + section: totals, %, GPA, grade, pass/fail, rank, report-card
    status, with result and card filters.
- **Integration:** React-admin 5.15 is mounted inside the existing router with a bare layout;
  the Data Provider wraps `apiClient`; the Auth Provider adapts `AuthContext`; the MUI theme
  follows the app tokens and the brand colour. No backend change.
- **Cost:** new dependencies `react-admin`, `@mui/material`, `@mui/icons-material`, Emotion and
  `@tanstack/react-query` (90 packages). The pilot chunk is about 691 kB (221 kB gzip), loaded
  only on its route; the main bundle grew from 445 kB to about 504 kB.
- **Verified in a browser (23 checks):**
  - rows match the API; filters, search and sort work;
  - DRAFT → PUBLISHED → LOCKED → unlock happens through the UI, with the database agreeing;
  - the subject snapshot count and the results figures equal the API's;
  - other pages are unchanged after visiting; a teacher is redirected and still refused by
    the API; the console is clean.
- **Limits:**
  - lists are filtered and paged in the browser (the exam endpoints have no list parameters);
  - there is no class filter on the exam list (the list payload has no classes);
  - nothing is created or edited here;
  - marks entry stays on its own page;
  - no verification status exists (no schema change).

**Phase 6:**
- **Setup:** `e2e/` (Playwright 1.65, its own `package.json`). Global setup signs in all 7 roles
  through the API and makes sure the seeded class has published report cards. Playwright
  starts the API on the MySQL test database and a Vite server itself.
- **Tests (48, plus 1 intended skip):**
  - report cards (17): real PDF page counts and A4 size, roll order, nothing clipped, grades
    equal the API, long names, 5/12/16 subjects, missing remarks, fail grade, bulk identical
    to individual, student access, 2 visual baselines;
  - examinations (12): pilot list / search / filters / snapshot / results against the API,
    DRAFT → PUBLISHED → LOCKED → unlock, who may publish, marks refused outside PUBLISHED,
    invalid marks, real marks entry through the grid;
  - general (19): sign-in, wrong password, silent token refresh, the pages of each role and
    a refused page, a receipt on one page, student and accountant see the same balance.
- **Guard:** every test fails on an unexpected console error or uncaught exception.
- **CI:** a new `e2e` job runs everything except the two visual baselines, which are Windows +
  Chrome screenshots (fonts differ on Linux).
- **Not covered yet:** student, teacher and attendance CRUD flows; fee collection end to end;
  the Performance Report template; phone-size layouts.

## Client demo on Vercel — ready to deploy

Guide: [deploy-vercel.md](deploy-vercel.md).
- **Layout:** one Vercel project holds the static site and the Express API as one function in
  sin1, next to the Supabase **test** project. Uploads go to Cloudinary. The address is the
  free `*.vercel.app` for now; `sms.nevanhandicraft.com.np` comes later as a CNAME in Nest
  Nepal's DNS.
- **Code changes:**
  - `vercel.json`, `api/index.js`, `.vercelignore`;
  - the upload middleware no longer creates `uploads/` at startup, which would crash on a
    read-only filesystem;
  - Cloudinary uploads now go memory → magic-byte check → `upload_stream` (before, they
    skipped the check);
  - with no storage configured on Vercel, uploads get 503;
  - the PostgreSQL client also builds Vercel's engine (`rhel-openssl-3.0.x`);
  - `multer-storage-cloudinary` is removed.
- **Verified locally:** 452 unit tests and MySQL integration 80/80; a local stand-in of the
  Vercel layout against Supabase (smoke test plus page rendering, see the guide).
- **To do (you):** create a Cloudinary account (enable PDF delivery), create the Vercel project
  and set its environment variables, deploy. Then I check the live site, including uploads.

## Dual database support (MySQL 8 + Supabase PostgreSQL) — done

Brief pasted 2026-11-08. Docs: [database/](database/). One codebase; the provider is chosen
per deployment with `DATABASE_PROVIDER`.

| Phase | Scope | State |
|---|---|---|
| 1 | Read-only audit + 5 docs | **Done** (2026-11-08) |
| 2 | Architecture approval | **Approved** (2026-11-08) |
| 3 | MySQL preserved on the new layer: `src/database`, shared `models.prisma` → two schemas, migrations moved, `db:*` scripts, regression tests | **Done** (2026-11-08) |
| 4 | PostgreSQL baseline migration, client, seed on a Supabase test project | **Done** (2026-11-08) |
| 5 | Dialect fixes (receipt sequence, text search/equality, ordering) | **Done** (2026-11-08) |
| 6 | Both integration runs + browser sweep on PostgreSQL | **Done** (2026-11-08) |
| 7 | Deployment docs ([database/supabase-deployment.md](database/supabase-deployment.md)) + CI | **Done** (2026-11-08) |

**Phase 3 verified (MySQL):**
- **Unit tests:** 439 pass: the 410 existing ones, unchanged, plus 29 for the database layer
  (config, dialect, schema sync, no direct `@prisma/client`).
- **Integration tests:** 79 pass: the 33 ledger tests, plus 16 database-level and 30 API-level
  tests (auth, RBAC, isolation, the exam lifecycle and snapshot, publication gating, fees,
  promotions).
- **Migrations:** `db:status` is "up to date" on the dev and test databases after moving the
  migrations to `prisma/mysql/migrations`.
- **Other checks:** `reconcile` is OK on both databases; the browser sweep of 7 roles shows no
  console errors or failed calls.

**Phase 4 verified (Supabase test project, PostgreSQL 17, collation en_US.UTF-8):**
- **Baseline:** `prisma/postgresql/migrations/0_init` (45 tables, 21 enum types) applied; the
  drift check finds no difference; `db:status` is up to date.
- **Receipt numbering:** the ledger's MySQL-only `INSERT IGNORE` is now Prisma
  `createMany({ skipDuplicates })` (compatibility C1). It still passes 79/79 on MySQL.
- **Seed:** `npm run seed` completes on PostgreSQL, including the demo fee data through the
  ledger. `reconcile` is OK.
- **Connection:** the direct host is IPv6-only and this PC has no IPv6, so
  `SUPABASE_TEST_DIRECT_URL` uses the **session pooler** (port 5432 on the pooler host).
  Migrations work through it.
- **Speed:** the seed takes about 16 minutes over the internet (hundreds of sequential round
  trips to ap-southeast-1); locally it takes seconds.

**Phase 5 (shared code, no provider `if`s outside `src/database/dialect.js`):**
- **Case-insensitive text:** 12 search filters and `buildSearchQuery` use `dialect.text.search`; the
  school-code and subject-code lookups use `dialect.text.equals`.
- **Unique-key check:** the idempotency replay check uses `dialect.isUniqueViolationOn`.
- **Explicit order:**
  - 24 queries whose order users see, or which decide an outcome, got `orderBy: { id: "asc" }`,
    which is MySQL's order today;
  - the other 35 unordered queries are lookups, sets or sums.
- **NULL order:** 8 roll-number sorts and the portal's "upcoming exams" pin NULLs first, matching
  MySQL.

**Phase 6 verified:**
- **MySQL:** 442 unit and 80 integration tests pass.
- **PostgreSQL (Supabase test project):** all 80 integration tests pass. In one run, 10
  database-level tests failed with `P1017` (the free pooler dropped connections while a
  browser sweep and a server shared it); the suite then passed 17/17 on its own.
- **Browser:** the sweep of all 7 roles against a PostgreSQL-backed server shows no console
  errors or failed API calls.
- **Reconcile:** OK on both.

**Phase 7:**
- `docs/database/supabase-deployment.md` covers project setup, connection strings (IPv6 note),
  migrate, seed, upgrades, backups and performance.
- `.github/workflows/ci.yml` runs schemas, unit tests, lint and build, plus migrations, a drift
  check, the seed, integration tests and reconcile on MySQL 8 and PostgreSQL 16 containers.

**Upgrade note for any existing MySQL install:** add `DATABASE_PROVIDER=mysql` and rename
`DATABASE_URL` to `MYSQL_DATABASE_URL`. The database needs no change.

**Found in Phase 3:**
- Each generated client carries its own copy of Prisma's `Decimal` class; `money.js` converts
  on entry.
- The seed wipes only with `--clean`, and that flag is now refused outside a test database
  unless `--yes-really` is added.

## Finance ledger and portals — done

Plan: [plans/finance-and-portals.md](plans/finance-and-portals.md) (approved 2026-11-08).
Business rules decided:
- discounts are requested by an accountant or admin and approved by a different admin;
- reversals are admin only;
- overpayment is rejected;
- receipt numbers run per Nepali fiscal year.

| Phase | Scope | State |
|---|---|---|
| 3 | Ledger data model, migration + backfill, payment / reversal / discount / installment services and endpoints, reconcile, cascade-delete fixes, attendance-% rule | **Done** (2026-11-08) |
| 4 | Accountant + admin fee management UI | **Done** (2026-11-08) |
| 5 | Dashboard KPIs, charts, reports, CSV / print | **Done** (2026-11-08) |
| 6 | Student portal | **Done** (2026-11-08) |
| 7 | Parent portal | **Done** (2026-11-08) |
| 8 | QA, drop old fee columns and alias routes, UI wave 6 cleanup, docs | **Done** (2026-11-08) |

Phase 8 verified:
- **Backend:** 410 unit tests and 33 ledger integration tests pass; `reconcile` is clean on the
  dev and test databases; lint 0 errors (the two old ones are fixed).
- **API probes against the test database:** RBAC (39), super admin (30), finance (incl. the
  removed `/fees/payments*` routes now 404), student portal, parent portal (18) and Phase 8
  (moved generate endpoints, 403/404/409 paths). The RBAC probe's "marks hidden before
  publication" check was rerun with exam 1 briefly unpublished, then republished.
- **Styles:** every page for admin, teacher, student, parent and accountant, plus every
  report-card print path (NEB and Performance; single, bulk, settings preview, student page),
  was snapshotted element by element (computed styles, screen and print) before and after
  deleting the old stylesheets, then diffed. All intended differences were reviewed (list in
  `plans/finance-and-portals.md`). PDF page counts are unchanged: single 1, bulk 5, embedded 1.
- **Browser:** super admin and exam officer pages load with no console errors or failed calls;
  the session-retry screen renders and recovers.

**After pulling Phase 3 on another machine:**
1. Stop the backend.
2. Run `npx prisma migrate deploy`, then `npx prisma generate`.
3. Optionally run `node scripts/reconcile.js` to check the fee balances.
4. To run the integration tests, set up the test database once (see CLAUDE.md §2).

**Behaviour changes to know about:**
- **Attendance %** in `/attendance/student/:id` now counts late days as present when the
  report-card layout says so (the default). The demo student moved from 88.4% to 92.8%.
- **Fee rows can no longer be deleted** by deleting an enrolment, a fee structure or a user.
  - Promotion undo refuses once money or discounts exist for the new class.
  - Deleting a user refuses while they have fee records; deactivate them instead.

## UI redesign on Tailwind CSS 4 — in progress

Plan: [plans/ui-redesign-tailwind.md](plans/ui-redesign-tailwind.md). Phased waves,
each tested in the browser and committed separately.

| Wave | Scope | State |
|---|---|---|
| 1 | Tailwind, tokens, legacy layer + bridge, `ui/` kit, shared components, shell, login, error pages, per-school brand colour | **Done** (2026-11-08) |
| 2 | All 18 admin pages | **Done** (2026-11-08) |
| 3 | Teacher + exam officer | **Done** (2026-11-08) |
| 4 | Student, parent, accountant (real accountant dashboard) | **Done** as finance Phases 4–7 |
| 5 | Charts + `/dashboard/*` summary endpoints | Partly: finance dashboard charts (Phase 5). Admin and teacher charts not built |
| 6 | Delete `index.css` / `bridge.css`, final docs | **Done** (2026-11-08, finance Phase 8) |

Wave 1 verified: build and lint clean; all 47 pages across 7 roles load with no
console errors or failed calls; screenshots at 1440 and 390 px (shell, drawer,
login, tables); print regression — NEB single/bulk, Performance Report
single/bulk/student and the all-options card render as before with the same
page counts; brand colour API (hex validation, admin only, reaches the session
and the public login endpoint, reset) and live preview with the light-colour
contrast fallback.

Wave 2 verified: build and lint clean; every page across 7 roles loads with no
console errors or failed calls, including each School Settings tab
(`?tab=branding|grading|report-card`); screenshots at 1440 and 390 px;
generating, publishing and printing from the new Report Cards page; print
regression unchanged (NEB and Performance Report single/student 1 page, bulk 5).
Notes:
- School Settings is now tabbed: profile, branding (logo, banner, brand colour),
  grading (grade scales), report card (layout). Links can open a tab with `?tab=`.
- Promotions takes the suggested next class and year from the API
  (`suggestedNextClassId`, `suggestedAcademicYearId` on
  `GET /promotions/eligible`) instead of guessing `gradeLevel + 1` in the browser.
- `DELETE /exams/:id/subjects/:examSubjectId` is now used by the exam details dialog.
- Subject Excel import accepts any grade that exists as a class (it was 11/12 only).

Wave 3 verified: lint and build clean; every page across 7 roles loads with no
console errors or failed calls; teacher and exam-officer flows driven in the
browser (attendance, marks entry with keyboard moves, range errors, discard and
a real save that was then deleted again, the exam-officer cascade, my students,
notices); screenshots at 1440 and 390 px. Fixed on the way:
- Attendance loaded students without a page size, so a section with more than
  10 students showed only the first 10 (the API default). It now asks for 100.
- Assignments: class and section were two separate dropdowns, so a teacher
  could pick a pair they don't teach; it is now one list of their own
  class-section-subjects. Editing sent `maxMarks`, which the API ignores; it
  now sends `totalMarks` (and can add attachments). Grading shows feedback.
- `/teacher/attendance?class=<classId>-<sectionId>` opens a class directly
  (used by the dashboard and My Students).

Migration `20261108090000_school_brand_color` adds `schools.brand_color`.

## Do this next

**1. Optional: hold a printed Performance Report against `marksheetformat1.jpeg`.**
School Settings → Report Card Layout → "Performance Report" → Save, then print
from Report Cards. Upload the school logo in School Settings first; the samples
have it top-left. Set the principal's name there too — it prints above
"Principal". To print attendance, tick "Attendance" in the layout and enter
the exam's working days on the Report Cards page, then Regenerate.

**2. Pick the next piece of work** from "Decisions waiting on you" and "Known
issues" below — the report-card plan is finished.

Phase 4 (report-card attendance) — see "What is done" for what was verified.

Phase 3 (report-card layout) is **verified** (2026-11-07):

- API: 18 checks — admin only (401/403 for others), per-field validation errors,
  save normalizes, reset, and the single, bulk and student payloads all carry
  `layout`, `student.classWithNumeral` and `meta.issueDateBS`.
- Browser + print (headless Chrome → PDF, pages inspected): settings card,
  preset switch, live preview, blank-title error, save; Performance Report as
  single card, bulk (5 students → 5 pages), and student page — one A4 page each,
  including with every option on (marks + grades, codes, credit hours, rank,
  percentage, result, summary, grade table, three signatures); NEB sheet with
  custom title, signatures, grade table and footer.

Phase 2 (per-school grade scale) is **verified** (2026-11-07):

- API: a 38-check script against the live API and database — access control,
  CRUD, gap/overlap rejection, marks save, generate, snapshot on default change,
  locking, bulk = single = admin table.
- Browser (headless Chrome): all 41 pages across admin, teacher, student, parent
  and accountant load with no console errors, exceptions or failed API calls;
  the Grade Scales section, generate, view, publish, student and parent views
  were driven by script.
- Print (Chrome's print engine to PDF, pages inspected): bulk print is one A4
  page per student; single card, student and parent prints are one page each.

Fixed on the way: printing from a report-card overlay printed the whole page
behind it first (bulk print came out as admin screen + N cards); the single card
spilled its footer onto a second page; the student/parent print kept the
on-screen drop shadow. Overlays are now portalled to `<body>` and
`reportcard/usePrintIsolation.js` hides `#root` while printing.

**On any new machine: apply the migrations and reseed.** No `GRANT` needed —
`migrate deploy` uses no shadow database. Stop the backend before
`prisma generate`, or Windows refuses to replace the engine file (EPERM).

```
cd backend
npx prisma migrate deploy     # grade_scales, report_card_config, report_card_attendance
npx prisma generate
npm run seed -- --clean       # grade-scale presets (NEB default) and first-term attendance
```

**Optional: click through Phase 2 yourself.**

```
Admin → School Settings → Grade Scales (bottom of the page)
  → both presets listed, NEB 8-band marked Default
  → Edit NEB, set A's "To %" to 89 → Save is refused with a "Gap" error on that cell
  → Make "Legacy SLC (9-band)" the default
Admin → Report Cards → Generate again → View
  → a 35% subject prints D+ / 1.6, a 25% one D / 1.2; no NG anywhere
  → School Settings: the legacy scale now shows "Used by N report card(s)",
    Edit is disabled, Duplicate works
```

Also check the school header on the single card now shows tagline, website and
principal (they printed blank before).

---

## What is done

### Roles, not permissions (2026-11-07) — verified
Decided: roles decide access. The 48 seeded permissions no route checked are
removed (migration `20261107210000_drop_unused_permissions`); the 11 that the
attendance, result and report-card routes check remain, with unchanged grants.
The seed now deletes permissions and grants it no longer lists and throws on
an unknown name. Re-verified: 87 API checks across all roles and the 44-page
browser sweep, all unchanged.

### Super admin and staff student directory (2026-11-07) — verified
- `SUPER_ADMIN` is seeded (role id 7, every permission) with the login
  `superadmin@svi.edu.np`. It is an admin everywhere (`authenticate` adds
  `ADMIN`; frontend `hasRole("ADMIN")` is true) and alone can grant, change or
  remove ADMIN/SUPER_ADMIN on others. School admins can't edit, deactivate,
  demote or delete a super admin. Same school only — there is still no
  cross-school UI. Existing databases: the role and login were added without a
  reseed; a fresh `npm run seed` creates them.
- Exam officers and accountants get a read-only student directory
  (`/staff/students`, sidebar "Students"): `GET /students` and
  `GET /students/:id` within their school; edit and enroll stay refused.
- Verified: 30 API checks and a browser pass (super admin landing and menu;
  directory list, view-only details form, no edit controls) for both roles.

### RBAC audit and fixes (2026-11-07) — verified
Four read-only audits (middleware and permissions, every route, controller data
scoping, frontend role handling) found ~40 problems; four fix agents with
disjoint files fixed them. Highlights:
- `POST /auth/register` was public and could make the first user of a school
  ADMIN → now admin-only. Users with no role, inactive users and inactive
  schools are refused by `authenticate`; refresh tokens rotate atomically and
  reuse revokes the session.
- Ownership checks failed **open** for a PARENT/STUDENT without a profile row
  (Prisma drops `undefined` filters) → now fail closed, school-scoped.
- Teachers were scoped by class only, ignoring the academic year and section →
  current year (and section) only. A teacher could read any student's
  attendance → only students they teach.
- Fee payments were readable by teachers and exam officers → admin, accountant,
  and the student/parent themselves only.
- Uploads kept the client's extension and were served inline (stored XSS) →
  MIME whitelist + magic-byte check, `nosniff`, non-images download.
- Students and parents saw raw marks during entry, DRAFT exams, and every
  assignment in the school → gated by publication / own class.
- Students, parents and teachers could change a student's name and DOB →
  admin only; others may edit phone, address, avatar, emergency contact.
- Nested ids (class, section, year, class-subject, teacher) are now checked
  against the school on create/update; `schoolId` is set explicitly.
- Frontend: notices targeted roles by stale hardcoded ids (Parents never
  reachable) → loaded from the server; admins could not create Exam Officer /
  Accountant staff → fixed end to end; random logouts from parallel token
  refreshes → single-flight refresh; `localStorage.clear()` → only auth keys; a
  403 shows a "no permission" notice; accountants no longer see Delete they
  can't use; per-route roles on `/teacher/*`; admin Marks Entry link; real 403
  page.

Verified against the running servers: 39 role-by-role API probes (6 roles), a
browser sweep of all 44 pages across 6 roles with no console errors or refused
calls, and spot checks of the notice roles, accountant buttons and exam-officer
redirect. 377 unit tests (31 new for the middleware).

Not verified: "a teacher is refused for a student they don't teach" against
live data — the seed assigns every teacher to every Grade 8–10 section, so no
such student exists (covered by the middleware unit tests).

### Scope: K–10 only
Grade 11–12 / NEB "+2" support was removed in full — five Prisma models, two
enums, the `/programs` and `/subject-components` routers, `nebGradeUtils.js`,
the NEB frontend pages and seeders. See CLAUDE.md §7. **The migration that drops
those tables has been applied** on a fresh database; there is no pending schema
edit.

### Database rebuilt from scratch
MySQL was reinstalled, so the old data is gone and the schema now has a clean,
committed migration history: one baseline, `0_init`, matching `schema.prisma`
exactly (35 models). `npx prisma migrate status` reports up to date.

### Security
- `backend/.env` and `frontend/.env` untracked; ignore rules fixed; root
  `.gitignore` added.
- JWT secrets rotated; the app now refuses to boot in production without them.
- Rate limiting on `/auth/login` (8 failures / 15 min) and `/auth/refresh-token`
  (100 / 15 min), both skipping successful requests so normal use is unaffected.

### Tests and tooling
- 289 unit tests (`npm test` in `backend/`), no database needed.
- Backend ESLint config added — `npm run lint` works now.
- `backend/scripts/audit-exam-grades.js` finds and repairs `ExamResult.grade`
  rows written by the old grading code.

### Report card work (phases 0 and 1 of the plan)
- **Three grade scales existed; two were wrong.** `result.controller.js` graded
  with its own table that omitted the D band and emitted `"F"` — not an NEB
  grade — and ignored the rule that a failed theory or practical fails the whole
  subject. `student/Results.jsx` had a third table *and* read a field that does
  not exist (`examSubject.maxMarks` instead of `fullMarks`), so that page showed
  0% and `F` for every subject. Both now use the shared calculator.
- **The marksheet existed twice** and had already drifted. Now one component,
  with the differences between single-card and bulk-print expressed as flags in
  `reportcard/variants.js`.
- Five duplicated helpers removed. There are **zero hardcoded grade tables in
  the frontend**.
- Two earlier bugs fixed and guarded by tests: grade bands had 0.01-wide gaps
  that printed `NG` for students who had passed everything, and every Bikram
  Sambat date was one day late.

### Report card work (phase 4: attendance) — verified
Verified 2026-11-07 against the reseeded database: 19 API checks (admin-only
endpoint, validation, generate freezes 58 present + 2 late of 65 — matching the
raw attendance rows exactly — late on/off without regenerating, outdated-card
warning, student sees it once published), the Report Cards working-days box in
the browser, and a printed Performance Report showing `ATTENDANCE 60/65` on one
A4 page.
- Total working days are entered by the admin per exam (`Exam.workingDays`),
  on the Report Cards page, in any exam status (`PUT /exams/:id/working-days`).
- Generate counts each student's `present` and `late` days from the academic
  year start to the exam's last day (one `groupBy` per section) and freezes
  `daysPresent`, `daysLate` and `totalWorkingDays` on the report card.
  Migration `20261107180000_report_card_attendance`.
- Printed present = present + late when the layout's "Late counts as present"
  is on (default), so that setting works without regenerating.
- The Report Cards page shows the BS date range being counted and warns when
  generated cards carry an older working-day number.
- Cards generated before this print `— / —` until regenerated.
- `utils/reportCardAttendance.js`, 25 unit tests.
- The seed now creates attendance for every school day of the first term
  (Saturday off) and sets that exam's working days, so demo cards print real
  numbers. Its old "last 5 days" attendance is still created too, for the
  attendance pages.

### Report card work (phase 3: layout) — verified
- `School.reportCardConfig` (JSON; null = the original NEB sheet, so nothing
  changed for a school until it chooses). Migration
  `20261107120000_report_card_config`.
- `backend/src/utils/reportCardLayout.js`: two presets, `normalizeLayout`
  (never throws; bad stored values fall back to defaults), `validateLayout`
  (per-field errors), `classWithNumeral` ("Nine [9]"), `issueDateBS`
  ("2083-05-06"). 32 unit tests.
- `GET/PUT/DELETE /api/v1/report-card-layout` (admin only). GET also returns a
  sample card graded on the school's default scale, for the preview.
- Every report-card payload carries `layout`, `student.classWithNumeral` and
  `meta.issueDateBS`, so students, parents and bulk print follow the setting
  without re-login. The layout is **not** snapshotted per card — it changes how
  grades are printed, never the grades.
- Templates: **NEB grade sheet** (the existing sheet; title, attendance,
  summary, remarks, grade table, signatures and footer are settable) and
  **Performance Report** (`reportcard/PerformanceSheet.jsx`, built from
  `marksheetformat1-4.jpeg`: one row per subject, Theory/Practical columns only
  when the exam has practicals, empty remark column, seal, BS issue date,
  guardian note). Every setting applies to it: grades / marks / both, codes,
  credit hours, rank, percentage, result, summary, grade table, watermark,
  principal's name, minimum table rows.
- Admin UI: School Settings → Report Card Layout, with a live half-size preview
  using the real report-card component.
- Deviation from the plan sketch: the preset is called `performanceReport`, not
  `sviPerformanceReport`, since any school can use it. `countLateAsPresent` was
  left for Phase 4, where it is used.

### Report card work (phase 2: per-school grade scale) — verified
- New tables `grade_scales` / `grade_bands`; `report_cards.grade_scale_id`
  records which scale a card was generated with. Migration
  `20261106120000_grade_scales`, generated with `prisma migrate diff`.
- Two presets in `backend/src/utils/gradeScale.js`: **NEB 2078 (8-band)** and
  **Legacy SLC (9-band)** (D+ 1.6, D 1.2, E 0.8). The legacy preset has every
  band passing and no component pass mark, because `marksheetformat1.jpeg`
  prints a theory `D` with a final `C`. Its GPAs match fmt1 (2.45) and fmt3 (2.11).
- `gradeCalculator` takes an optional scale; with none it is NEB 8-band, so the
  old 244 tests pass untouched. The bare `35`s are now `scale.passPercent`; the
  `"NG"` checks are now `band.isPassing` and `scale.failGrade`.
- Marks save, report-card list/generate/view/bulk and the audit script all
  grade on the school's scale. Old cards with no scale id stay on NEB 8-band.
- A scale used by any report card cannot be edited or deleted (duplicate it
  instead). Saving rejects gaps, overlaps, duplicate letters, `AB`, and a passing
  band below a failing one.
- Admin UI: School Settings → Grade Scales. API: `/api/v1/grade-scales`
  (admin only).
- Report sheet remarks use the card's own bands; the student Results page shows
  the report card's stored grade instead of computing one.
- Finished two Phase 1 items that had not landed: `getReportCard` now selects
  tagline / website / landline / principal / established year (they printed
  blank), and the dead `getReportCardPdfData` endpoint is deleted.

---

## Decisions waiting on you

| | |
|---|---|
| **Personal data in the public repo** | **Done 2026-11-11.** The four root dumps, `backend/.env`, `frontend/.env` and `backend/subject_enrollment_validation_report.json` were removed from every commit and `main` was force-pushed. A full pre-rewrite backup (bundle + dumps) is in `D:sms2sms-private-backup`: keep it private or delete it. Still to do by the owner: the data was public, so the 23 accounts whose bcrypt hashes were exposed should get new passwords; GitHub may keep the old commits reachable by id until its garbage collection (ask GitHub Support to purge if it matters); any other clone must be re-cloned. |
| **Rotate the MySQL password** | Old credentials are in pushed git history. The user they belonged to is gone with the old install, but do not reuse that password. |
| **`comprehensiveSeed.js`** | 1193-line alternative seeder, wired to no npm script, still writes to the five dropped Grade 11–12 tables. It will throw if anyone runs it. Delete, or strip its 11–12 half? |
| **`POST /auth/register`** | Public and unauthenticated, and grants ADMIN to the first user in a school. Not exploitable on the current seeded data, but it is one `migrate reset` away from being so. Lock it down? |
| **Git history purge** | Old secrets are in pushed commits. Rotation is the real fix and is half done; a `filter-repo` rewrite is optional and only worth doing after rotation. |
| **8 copies of `resolveAssetUrl`** | `utils/assets.js` is now the canonical one; 3 call sites converted. Eight more remain in unrelated pages — left alone to keep the report-card diff focused. |
| **Which grade scale is SVI's default?** | The seed makes NEB 8-band the default so nothing changes until someone chooses. The sample marksheets say SVI uses the legacy 9-band scale for internal exams. If so, switch it in School Settings. That is one click, and already-generated cards are unaffected until regenerated. |
| **Does SVI fail anyone on the legacy scale?** | The preset treats every band, including E (below 20%), as passing, with no component pass mark. That matches the samples and the 2072–2077 letter-grade system, but the samples never show a failing student. If SVI does fail students below some mark, set a pass % and untick "Passing" on the bands below it. |
| **Attendance window for later terms** | Days present are counted from the academic-year start to the exam's end, so a second-term card is cumulative (it matches fmt1, a first-term sheet). If SVI prints per-term attendance on later terms, add an optional "count from" date per exam. Enter working days for the same window. |
| **`ClassSubject.passMarks` vs the scale** | `passMarks` (default 40) is only displayed; it has never decided pass/fail. The grade scale's pass % (35 on NEB) does. Left as it is. Either drop `passMarks` from the UI, or derive it from the scale. |
| **Stored `ExamResult.grade` after a scale change** | Report cards recompute from marks, but the per-subject grade stored at marks entry keeps the old scale's letter until the marks are saved again. `node scripts/audit-exam-grades.js --apply` regrades them on the current default. |

## Known issues, not yet fixed

- The NEB grade sheet asks for Times New Roman but prints in Inter: `styles/app.css`
  sets the app font on `*` (kept from the old stylesheets), which beats inheritance. The Performance Report overrides
  it; the NEB sheet was left alone so its look doesn't change unasked. Its
  "Date of Issue" also prints only the BS year (`2082`), not a date —
  `meta.issueDateBS` now exists if you want it.

- Lint: no errors. Warnings only — backend 7 (unused locals), frontend 5
  (`react-hooks/exhaustive-deps`).
- *(fixed 2026-11-11)* The six `gradeCalculator` bugs once pinned by `test.failing`: non-numeric
  marks now give 0% (not `NaN`); the reported percentage is clamped to 0–100; full marks
  are summed as numbers; an explicit 0 full marks fails as "Invalid full marks" instead of
  being graded out of 100; an ungraded practical reports `null`; `formatGPA` never prints "NaN".
- Dependencies (2026-11-11): `npm audit` is clean except `xlsx` in the backend (no fixed
  release on npm; used only by the admin subject import). Options: SheetJS's own CDN build,
  or another reader and dropping `.xls`.
- Credit hours are not snapshotted onto `ExamSubject`, so editing
  `ClassSubject.creditHours` retroactively changes already-printed report cards.
- No integration tests — nothing exercises a controller, route or the database.
