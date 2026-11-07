# Where this project is

Updated 2026-11-07. Keep this current when you stop work — it is the handover
between machines and between sessions.

New machine? Start with [SETUP-NEW-MACHINE.md](SETUP-NEW-MACHINE.md).

**All four phases of [plans/configurable-report-card.md](plans/configurable-report-card.md)
are done** and on `main`.

---

## UI redesign on Tailwind CSS 4 — in progress

Plan: [plans/ui-redesign-tailwind.md](plans/ui-redesign-tailwind.md). Phased waves,
each tested in the browser and committed separately.

| Wave | Scope | State |
|---|---|---|
| 1 | Tailwind, tokens, legacy layer + bridge, `ui/` kit, shared components, shell, login, error pages, per-school brand colour | **Done** (2026-11-08) |
| 2 | All 18 admin pages | Next |
| 3 | Teacher + exam officer | — |
| 4 | Student, parent, accountant (real accountant dashboard) | — |
| 5 | Charts + `/dashboard/*` summary endpoints | — |
| 6 | Delete `index.css` / `bridge.css`, final docs | — |

Wave 1 verified: build and lint clean; all 47 pages across 7 roles load with no
console errors or failed calls; screenshots at 1440 and 390 px (shell, drawer,
login, tables); print regression — NEB single/bulk, Performance Report
single/bulk/student and the all-options card render as before with the same
page counts; brand colour API (hex validation, admin only, reaches the session
and the public login endpoint, reset) and live preview with the light-colour
contrast fallback.

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
| **Personal data in the public repo** | `smsfromscl.sql`, `almostfinaldbfromhome.sql` and `dbfileaftersclsetting.sql` are tracked and pushed, and contain real email addresses and **23 bcrypt password hashes** between them. The repository is public. `git rm --cached` the six root `*.sql` files, then decide whether to rewrite history. New root dumps are now gitignored. |
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

- The NEB grade sheet asks for Times New Roman but prints in Inter: `index.css`
  sets Inter on `*`, which beats inheritance. The Performance Report overrides
  it; the NEB sheet was left alone so its look doesn't change unasked. Its
  "Date of Issue" also prints only the BS year (`2082`), not a date —
  `meta.issueDateBS` now exists if you want it.

- 2 backend lint errors: a duplicated `description` key in a Prisma `create()`
  (`subject.controller.js:68`) and a `const` inside an unbraced `case`
  (`error.middleware.js:28`).
- 41 frontend lint findings (19 errors, 22 warnings) — dead locals and
  `useEffect` dependency gaps.
- 6 `test.failing` markers pin real unfixed bugs in `gradeCalculator`: `NaN`
  leaking into `percentage`, 150/100 accepted and printed as "150%",
  `fullMarks: 0` silently becoming 100, the absent-student branch concatenating
  `'75' + '25'` into `'7525'`. Do not delete a marker to silence it.
- Credit hours are not snapshotted onto `ExamSubject`, so editing
  `ClassSubject.creditHours` retroactively changes already-printed report cards.
- No integration tests — nothing exercises a controller, route or the database.
