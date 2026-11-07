# Where this project is

Updated 2026-11-06. Keep this current when you stop work — it is the handover
between machines and between sessions.

New machine? Start with [SETUP-NEW-MACHINE.md](SETUP-NEW-MACHINE.md).

---

## Do this next

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

Still for a human: hold a real printout against `marksheetformat*.jpeg` — the
layout is the generic NEB sheet until Phase 3. Attendance prints `— / —` until
Phase 4.

**1. Apply the migration and reseed** (on any new machine). No `GRANT` needed —
`migrate deploy` uses no shadow database. The seed now stores a grade on each
seeded exam result; databases seeded before that have `grade = NULL` there
(`node scripts/audit-exam-grades.js --apply` fills them in).

```
cd backend
npx prisma migrate deploy     # applies 20261106120000_grade_scales
npx prisma generate
npm run seed -- --clean       # seeds both grade-scale presets, NEB 8-band as default
```

**2. Print check — done** (see above). Phase 3 is unblocked.

**3. Optional: click through Phase 2 yourself.**

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

**4. Then Phase 3** of [plans/configurable-report-card.md](plans/configurable-report-card.md)
— layout configuration.

---

## What is done

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
| **`ClassSubject.passMarks` vs the scale** | `passMarks` (default 40) is only displayed; it has never decided pass/fail. The grade scale's pass % (35 on NEB) does. Left as it is. Either drop `passMarks` from the UI, or derive it from the scale. |
| **Stored `ExamResult.grade` after a scale change** | Report cards recompute from marks, but the per-subject grade stored at marks entry keeps the old scale's letter until the marks are saved again. `node scripts/audit-exam-grades.js --apply` regrades them on the current default. |

## Known issues, not yet fixed

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
