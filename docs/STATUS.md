# Where this project is

Updated 2026-11-06. Keep this current when you stop work — it is the handover
between machines and between sessions.

New machine? Start with [SETUP-NEW-MACHINE.md](SETUP-NEW-MACHINE.md).

---

## Do this next

**1. Visually check the report card.** This is the one open loop, and it blocks
the next phase of work. The single-card and bulk-print marksheets were merged
into one component (`frontend/src/components/common/reportcard/ReportSheet.jsx`).
The output *should* be unchanged — the markup emits the same class names both
stylesheets already targeted — but that is reasoning, not observation, and
nobody has looked at a printed page since the merge.

```
Admin → Report Cards → pick an exam, Grade 10, section A → Generate
  → View (single card)      — check header, marks table, summary, signatures
  → Print All (bulk)        — check one page per student, no split TH/IN pairs,
                              no trailing blank page
```

If it looks right, Phase 2 can start. If not, the cause is almost certainly in
`ReportSheet.jsx`'s variant flags, not in the stylesheets, which were left
untouched.

**2. Run the `GRANT`** from section 3 of the setup guide if you have not. Phase 2
adds tables, and `prisma migrate dev` fails with P3014 without it.

**3. Then: Phase 2 of** [plans/configurable-report-card.md](plans/configurable-report-card.md)
— the per-school grade scale. That plan is approved and phases 0 and 1 of it are
already done.

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
- 244 unit tests (`npm test` in `backend/`), no database needed.
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
