# Configurable NEB Report Card

## Context

The report card is the one artefact a school hands to parents, and it is the part of this
project reworked most often (`5c572c7`, `33adbd6`, `6a99737`) without ever settling. The
reason is now clear: **there is no single correct format.** This product serves multiple
Nepali schools and each prints a different sheet.

Four real Siddhartha Vanasthali Institute sheets were supplied (`marksheetformat1-4.jpeg`).
Together they disprove the assumption the current code rests on — one hardcoded layout and
one hardcoded grade scale.

### What the four samples show

| | fmt1 | fmt2 | fmt3 | fmt4 |
|---|---|---|---|---|
| Class / exam | 9, First Term | 10, PRE-SEE | 10, 2nd Class Test | 10, 2nd Class Test |
| Theory + Practical sub-columns | yes | yes | **no** | **no** |
| Attendance row | **yes** (61/70) | no | no | no |
| Watermark | no | yes | yes | no |
| Numeric marks anywhere | **no** | **no** | **no** | **no** |

Constant across all four: title `Performance Report`, dual-calendar year `2083 (2026)`,
`Name [studentCode]`, `Class Nine [9]`, `Sec`, `Roll No.`, exam name in a bordered box, a
**grades-only** table (`SUBJECTS | OBTAINED GRADE | FINAL GRADE | GRADE POINT | REMARK`),
`GRADE POINT AVERAGE (GPA)`, Seal, Class Teacher + Principal signatures, `Date of Issue` in
BS, guardian acknowledgement footer. No total marks, no percentage, no class rank.

### Two findings that drive the design

**1. GPA is an unweighted mean of grade points** — verified arithmetically on all four sheets:

| sheet | grade points | sum | ÷ n | printed |
|---|---|---|---|---|
| fmt1 | 3.2 2.4 2.4 2.0 2.8 1.6 3.6 1.6 | 19.6 | 2.4500 | 2.45 |
| fmt2 | 3.2 2.8 2.8 2.4 2.8 3.6 2.8 | 20.4 | 2.9143 | 2.91 |
| fmt3 | 2.4 2.8 2.8 2.4 2.0 1.2 1.2 | 14.8 | 2.1143 | 2.11 |
| fmt4 | 3.6 3.6 4.0 3.2 4.0 4.0 4.0 | 26.4 | 3.7714 | 3.77 |

This **confirms** the unweighted GPA the codebase was left with after the Grade 11–12 removal.

**2. SVI uses a 9-band scale the code does not have.** fmt1 prints `D+ = 1.6`; fmt3 prints
`D = 1.2` — the legacy SLC scale (A+ 4.0 … D+ 1.6, D 1.2, E 0.8). The code has the current
official 8-band NEB scale (… D = 1.6, NG below 35). **SVI's own report cards would print the
wrong grade points today.** Research confirms published sources genuinely disagree on whether
1.6 is `D` or `D+`, whether the bottom band is `E` or `NG`, and whether GPA is credit-weighted.
Only board exams must follow the official scale; schools set their own for internal exams.

## What exploration found

**There are three different grade scales in the codebase, and two are wrong.**

1. `gradeCalculator.js:17-32` — the correct 8-band NEB table.
2. `result.controller.js:273-283` — an inline if-chain `>=90 A+ … >=40 C, else "F"`. It
   **omits the D band entirely** and emits `"F"`, which is not an NEB grade. This is what
   writes `ExamResult.grade` on every marks save. A live correctness bug, violating CLAUDE.md
   invariant #8. Its own comment reads *"can be customized per school"*.
3. `student/Results.jsx:72-79` — another chain that **skips C+**, mislabels 40–49 as `D`, and
   returns `"F"`. Violates invariants #8 and #9.

**The scale is not just a table — it is five hardcoded things.** The 35% pass floor is a bare
literal twice (`gradeCalculator.js:168, 174`) and does not read the table. The `"NG"` string
is a sentinel in 7 places; `isPassed: threshold.grade !== "NG"` (`:59`) means a school whose
lowest band is `E` would have **every student marked as passed**. `"AB"` and `getGradeColor`'s
letter map are two more copies.

**The marksheet exists twice.** `NepalReportCard.jsx:176-251` and the private `SingleReportCard`
in `BulkReportCardPrint.jsx:911-1003` are near-identical copies with two colliding **global**
`<style>` blocks, a duplicated `getRemarkText` that diverges from the server's wording, and
different credit-hour sums (`NepalReportCard.jsx:62-64` vs `BulkReportCardPrint.jsx:864`).
Configuring one would make it print differently from the other.

**A single template contract already exists.** `getReportCard` and `getBulkReportCards` emit a
byte-identical 8-key object (`school, examination, student, subjects, summary, remarks, meta,
gradeReference`). `getReportCards` is a table feed. `getReportCardPdfData` is **dead code**
called by nothing, and diverges (class/section as objects).

**`gradeReference` is already shipped on three endpoints and rendered nowhere** — the delivery
channel for a per-school scale is built and unused. The auth login payload also embeds a
`school` object read app-wide as `user.school.*`, which is the natural place for layout config.

**Attendance is a phantom.** `NepalReportCard.jsx:259` reads `summary.attendancePresent` /
`attendanceTotal`, which no endpoint produces — every card has shipped printing `— / —`.

**Live bug:** `getReportCard`'s Prisma select (`:436-446`) fetches 6 school fields but the
builder (`:501-505`) reads `tagline`, `website`, `landlineNumber`, `principalName`,
`establishedYear` — always `undefined`. Bulk selects them correctly.

No PDF engine exists; "Download PDF" is `window.print()`. Keep it that way.

## Approach

1. **Marks vs grades** — one component, per-school mode: `grades` (default), `marks`, `both`.
2. **Grade scale** — `GradeScale` / `GradeBand` tables seeded with both presets.
3. **Layout** — a single template driven by a config JSON. No template language.
4. **Attendance** — computed in the backend, printed behind a flag.

## Implementation

### Phase 0 — Delete the two rogue scales (do first; these are live bugs)

- `result.controller.js:273-283` → call `gradeCalculator.calculateGradeFromMarks`. Note it
  currently divides by `examSubject.fullMarks` rather than theory+practical totals; fix that
  with it. Existing `ExamResult.grade` rows written by the old chain (any `"F"`, any 35–39
  score graded wrongly) need a one-off backfill script.
- `student/Results.jsx:72-79` → delete; render `subject.finalGrade` from the API.
- Consolidate the duplicated `getRemarkText` (two copies) and `getGpaColor` (three copies:
  `admin/ReportCards.jsx:272`, `student/ReportCard.jsx:75`, `parent/ReportCard.jsx:130`) into
  a new `frontend/src/utils/grades.js` — note `frontend/src` has **no `utils/` directory yet**.
  Drive them off the `gradeReference` payload rather than hardcoded maps.
- `index.css:1376-1411` hardcodes `.grade-a`, `.grade-f` … with no `.grade-c\+` and no
  `.grade-ng`, so those pills render unstyled today. Replace with a data attribute plus
  CSS variables so unknown letters from a custom scale still render.

### Phase 1 — Unify the two print components (no behaviour change)

Nothing else is safe until the marksheet exists once. Extract
`frontend/src/components/common/reportcard/ReportSheet.jsx`, taking the `getBulkReportCards`
element shape as its only contract.

- `NepalReportCard.jsx` becomes a thin wrapper (overlay, action bar, `window.print()`).
- `BulkReportCardPrint.jsx` keeps the page loop, compact-mode logic and `@page` rules.
- One CSS block, **scoped** with a prefix — the two global blocks currently collide.
- Keep bulk's page-break rules (`.subject-group { page-break-inside: avoid }`, `thead` as
  `table-header-group`); the single card has none and splits TH/IN pairs across pages.
- Fix the `getReportCard` school-select bug here so both paths get identical data.
- Delete `getReportCardPdfData` and its dead service method rather than maintain a third shape.

### Phase 2 — Per-school grade scale

> **Status (2026-11-07): done and verified** (API, browser and print). See
> `docs/STATUS.md`. Deviations from the sketch below: `GradeBand` also has
> `@@unique([gradeScaleId, grade])`; `ReportCard.gradeScale` is `onDelete:
> Restrict`; the `passMarks` 40-vs-35 contradiction was documented as an open
> decision rather than changed.

```prisma
model GradeScale {
  id         Int      @id @default(autoincrement())
  schoolId   Int      @map("school_id")
  name       String   @db.VarChar(100)   // "NEB 2078 (8-band)" | "Legacy SLC (9-band)"
  isDefault  Boolean  @default(false) @map("is_default")
  bands      GradeBand[]
  school     School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  @@unique([schoolId, name])
  @@map("grade_scales")
}

model GradeBand {
  id           Int     @id @default(autoincrement())
  gradeScaleId Int     @map("grade_scale_id")
  minPercent   Decimal @map("min_percent") @db.Decimal(5,2)
  maxPercent   Decimal @map("max_percent") @db.Decimal(5,2)
  grade        String  @db.VarChar(5)
  gradePoint   Decimal @map("grade_point") @db.Decimal(3,2)
  description  String? @db.VarChar(100)
  isPassing    Boolean @default(true) @map("is_passing")   // replaces the "NG" string test
  gradeScale   GradeScale @relation(fields: [gradeScaleId], references: [id], onDelete: Cascade)
  @@map("grade_bands")
}
```

Also add `GradeScale.passPercent Decimal` to replace the two bare `35` literals at
`gradeCalculator.js:168, 174`. Resolve the existing contradiction while here:
`ClassSubject.passMarks` defaults to **40** while the grade calculator enforces **35**.

`gradeCalculator.js` keeps its exported signatures and takes an **optional** `scale` argument,
defaulting to the current constant — so all ~12 call sites and the 244-test suite keep working.
Every production grade computation funnels through `buildSubjectResults`
(`reportCard.controller.js:15-73`) and `calculateOverallGPA`, so threading the scale down
touches one controller; those handlers already query `prisma.school.findUnique`.

**Carry over the contiguity rule:** each band's `max` must equal the next band's `min`, and the
save validator must reject gaps or overlaps — the 0.01-wide holes that printed `NG` for passing
students must not be reintroducible through the admin UI.

**Version the scale.** `ReportCard.overallGrade`/`percentage` and `ExamResult.grade` are
persisted strings; changing a school's scale would silently rewrite history. Follow the
`ExamSubject` snapshot precedent (invariant #5): store `gradeScaleId` on `ReportCard` at
generation time.

Seed both presets in `prisma/seed.js`; admin UI is a new section in `SchoolSettings.jsx`
following its existing `fieldErrors` pattern.

### Phase 3 — Layout configuration

> **Status (2026-11-07): done and verified.** See `docs/STATUS.md`. Deviations
> from the sketch below: a `template` key picks between `nebGradeSheet` and a
> new `performanceReport` sheet (the SVI layout is a different table, not a set
> of switches on the NEB one); the preset is `performanceReport`, not
> `sviPerformanceReport`; the layout reaches the frontend inside each
> report-card payload (`layout`) rather than the login payload, so it is never
> stale; `showSeal` / `showWatermark` use the school logo (no `watermarkUrl`);
> `countLateAsPresent` moves to Phase 4.

One JSON column rather than twenty booleans:
`School.reportCardConfig Json? @map("report_card_config")`.

```js
{
  title: "Performance Report",
  mode: "grades",                       // grades | marks | both
  theoryPracticalSplit: "auto",         // always | never | auto (auto = any subject hasPractical)
  showAttendance: false, showRank: false, showPercentage: false,
  showSubjectCode: false, showCreditHours: false, showRemarksColumn: true,
  showGradeLegend: false, showSummaryGrid: false,
  countLateAsPresent: true,
  signatures: ["Class Teacher", "Principal"],
  showSeal: true, watermarkUrl: null,
  footerText: "Dear Guardian, Please acknowledge the receipt…",
  studentCodeField: "admissionNumber",
  classNameStyle: "wordAndNumeral"      // "Nine [9]"
}
```

`theoryPracticalSplit: "auto"` is what makes one config cover all four samples — fmt3/4 are the
same school as fmt1/2, just an exam with no practicals.

A `REPORT_CARD_PRESETS` constant supplies `sviPerformanceReport` and `nebGradeSheet`; choosing
a preset fills the JSON, which the admin can then tweak. `ReportSheet.jsx` defaults to today's
behaviour when the column is null, so existing schools are unaffected. Add the column to
`school.controller.js`'s two explicit `select` lists and the login payload.

### Phase 4 — Attendance

One grouped query per section in `getReportCard` / `getBulkReportCards`:

```js
prisma.attendance.groupBy({
  by: ['studentId', 'status'],
  where: { studentId: { in: ids }, schoolId: req.user.schoolId,
           attendanceDate: { gte: yearStart, lte: exam.endDate ?? yearEnd } },
  _count: true,
})
```

Expose `summary.attendancePresent` / `attendanceTotal`, honouring `countLateAsPresent`.

**Decide during this phase:** total *working days* is not derivable from `Attendance` — an
unmarked day is indistinguishable from a holiday, and fmt1's `61/70` is almost certainly
working days. Cleanest fix is an admin-entered working-day count per exam, snapshotted as
`daysPresent`/`totalWorkingDays` on `ReportCard` at generation, consistent with how
`totalMarks`/`percentage`/`classRank` are already frozen (`reportCard.controller.js:345-370`).

### Known issues to note, not fix here

- Credit hours are **not** snapshotted on `ExamSubject`, so editing `ClassSubject.creditHours`
  retroactively changes printed report cards — against invariant #5's spirit.
- Three different credit-hour defaults: `|| 4` (`reportCard.controller.js:19`), `|| 3`
  (`gradeCalculator.js:249`), `3.0` (schema).
- `summary.percentage` (an unweighted mean of per-subject percentages) and
  `summary.totalMarks/totalFullMarks` are computed two different ways and disagree whenever
  subjects have different full marks.
- `theoryCreditHours`/`practicalCreditHours` have no validation rule.
- CLAUDE.md §2 still says "There is no test suite" — stale; update it.

### Out of scope

Symbol / Registration / IEMIS numbers and the "Personal Evaluation" grid — both need new schema
and appear in none of the four samples. Delete or archive
`REPORT_CARD_IMPLEMENTATION_PLAN.md` and `template_HTML.html`: the template is a Grade XI NEB
sheet removed from scope by CLAUDE.md §7, and the plan's checkboxes are stale (phases 2, 3 and 6
are done; its credit-hour claim at line 110 is wrong).

## Verification

1. `cd backend && npx jest` — 244 tests stay green through Phase 2; the optional-argument
   default is what keeps them passing. Add band tests: contiguity, both presets' boundaries,
   and that the 9-band scale yields `D+ = 1.6` and `D = 1.2`.
2. `npx prisma validate && npx prisma migrate dev --name report_card_config` (needs the
   shadow-DB grant, else the documented baseline workaround).
3. `npm run seed -- --clean`, start both servers.
4. **Reproduce fmt4 exactly** — SVI on the 9-band scale and the `sviPerformanceReport` preset,
   Grade 10 section A, a class-test exam with no practicals. Compare the print preview against
   `marksheetformat4.jpeg`: header, boxed exam name, single OBTAINED GRADE column, GPA to 2dp,
   signatures, BS issue date, guardian footer.
5. **Reproduce fmt1** — an exam with practicals and attendance on: TH/PR sub-columns and the
   attendance row appear, GPA still the unweighted mean.
6. Flip to `nebGradeSheet` + 8-band and confirm the current CH/GP layout still renders — proof
   the config did not just swap one hardcoded format for another.
7. Bulk-print 5 students: one page each, no split TH/IN pairs, no trailing blank page.
8. Regression: a passing student never prints `NG`; no grade anywhere renders as `F`.

## Sources

- [Academic grading in Nepal — Wikipedia](https://en.wikipedia.org/wiki/Academic_grading_in_Nepal)
- [Secondary Education Examination (Nepal) — Wikipedia](https://en.wikipedia.org/wiki/Secondary_Education_Examination_(Nepal))
- [NEB Grading System in Nepal 2083](https://nebgpacalculator.com/neb-grading-system-in-nepal/)
- [SEE Grading System in Nepal (2026)](https://nebgpacalculator.com/see-grading-system-nepal)
- [Nepal Grading System: Division, CGPA — LearnViaHub](https://www.learnviahub.com/nepal-gpa-conversion/)
- [Grading System at SEE in Nepal — NepJOL](https://www.nepjol.info/index.php/jdl/article/download/57104/42710)
- [New Grading System in SEE Examination — CollegeNP](https://www.collegenp.com/news/new-grading-system-in-see-examination-must-have-secured-35-marks)
