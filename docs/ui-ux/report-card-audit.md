# Report card audit (Phase 1, read-only)

Date: 2026-11-11. No source code was changed. Companion:
[report-card-design-proposal.md](report-card-design-proposal.md).

## Summary

- The brief assumes two independent implementations. That is half true: individual and bulk
  print **already render the same React component** (`reportcard/ReportSheet.jsx`), but with
  two different sets of layout flags and **two separate stylesheets**. That is why they look
  different.
- The second template, the Performance Report, is already fully shared: one component and one
  stylesheet for single, bulk, student, parent and the settings preview.
- A per-school layout setting already exists (`School.reportCardConfig`, School Settings →
  Report Card, with live preview). It controls **what is shown** (title, signatures, footer,
  columns, toggles). It does not control **how it looks** (font sizes, logo size, row height,
  margins). That is the gap the brief's Parts 3–4 describe.

## Files

| File | Lines | Role |
|---|---|---|
| `frontend/src/components/common/NepalReportCard.jsx` | 608 | Individual card: modal overlay, Print / Download / Close, and a 534-line `<style>` block for `.report-card-a4` |
| `frontend/src/components/common/BulkReportCardPrint.jsx` | 860 | Bulk print: one `.report-card-page` per student, and a 730-line `<style>` block for `.report-a4`, incl. a "compact mode" for more than 10 subjects |
| `frontend/src/components/common/reportcard/ReportSheet.jsx` | 442 | The NEB grade sheet markup, shared by both, switched by a `variant` prop |
| `frontend/src/components/common/reportcard/variants.js` | 79 | The `SINGLE` and `BULK` flag sets, and `layoutOptions` (school layout → flags) |
| `frontend/src/components/common/reportcard/PerformanceSheet.jsx` | 518 | The Performance Report template, with its own single stylesheet |
| `frontend/src/components/common/reportcard/GradeLegend.jsx` | 66 | Grade legend used by both templates |
| `frontend/src/components/common/reportcard/usePrintIsolation.js` | 19 | Hides the page behind an open card when printing |
| `frontend/src/components/portal/ReportCardView.jsx` | – | Student / parent inline card (`.rc-embedded`) |
| `frontend/src/components/admin/ReportCardLayoutSettings.jsx` | 348 | Admin settings card with live preview |
| `backend/src/utils/reportCardLayout.js` | 350 | Layout presets, `validateLayout`, `normalizeLayout` (unit-tested) |
| `backend/src/controllers/reportCard.controller.js` | 1016 | Report-card payloads; every payload carries `layout` |

## Why individual and bulk differ (NEB grade sheet)

1. **Different flags** (`variants.js`):

   | Flag | Individual (`SINGLE`) | Bulk (`BULK`) |
   |---|---|---|
   | Root class | `report-card-a4` | `report-a4` |
   | Header | detailed: logo, emblem, 3 columns | compact, stacked, no emblem |
   | Report title | shown | hidden |
   | Admission number | shown | hidden |
   | Subject rows | TH and IN as separate rows | grouped |
   | Attendance strip, summary grid, remarks | shown | hidden; a one-line result strip instead |

2. **Different stylesheets.** Each wrapper file carries its own unlayered `<style>` block
   with its own class names, sizes and spacing. Examples: the school name is 22pt in the
   individual card and 16pt in bulk; the individual sheet is `min-height: 297mm`, the bulk
   sheet a fixed `height: 297mm`.
3. **Different overflow strategy.** Bulk has a "compact mode" (smaller fonts when a student
   has more than 10 subjects) to guarantee one page per student. The individual card has no
   such mode and relies on its content fitting.
4. **The school's layout setting reaches them unequally.** For bulk, `layoutOptions` passes
   only signatures, footer text and the grade legend; the title, attendance, summary and
   remarks settings are ignored "so they cannot overflow the page".

The Performance Report has none of these differences.

## Data and rules (unchanged by any redesign)

- **Payloads:** `GET /report-cards/student/:studentId/exam/:examId` (single) and
  `GET /report-cards/bulk/:examId/:classId/:sectionId` (bulk) return the same per-student
  shape: `school`, `student`, `exam`, `subjects[]`, `summary`, `attendance`, `layout`, `meta`.
- **Grades:** every figure comes from `backend/src/utils/gradeCalculator.js` on the scale the
  card was generated with. The frontend only prints them.
- **Publication:** students and parents get a card only when `ReportCard.isPublished`.
- **Print mechanics:**
  - `@page { size: A4 }` in each stylesheet;
  - bulk uses `page-break-after: always` per student;
  - `body.report-print-isolate > #root { display: none }` prints only the open card.
- **Verified page counts** (Phase 8 of the previous plan and later): single 1 page, bulk 1
  page per student (5 for the 5-student test class), student page 1, for both templates.

## Existing configuration (`School.reportCardConfig`)

- A JSON column on `School`; `null` means the original NEB sheet. No extra table.
- API: `GET / PUT / DELETE /api/v1/report-card-layout` (admin only for writes), with
  validation in `validateLayout` and safe fallback in `normalizeLayout`.
- Settings today: template, title, mark/grade mode, theory/practical split, remarks column,
  student code field, class-name style, signatures (up to 4), footer text, and toggles for
  attendance, summary grid, teacher remarks, grade legend, late-as-present.
- **Not configurable today:** any font size or weight, logo size or position, row height,
  column widths, border thickness, margins, signature area height, orientation.

## Risks found

- **Two stylesheets drift.** Any visual change to the NEB sheet has to be made twice.
- **Global class names in unlayered CSS** (`.report-header`, `.student-info`, `.btn`). They
  beat every Tailwind layer, which already forced `!important` overrides in `app.css`.
- **The individual NEB card has no overflow guard.** A long school name or many subjects can
  push it to a second page; this is untested today.
- **Font:** the NEB sheet asks for Times New Roman but prints in Inter, because `app.css` sets
  the app font on `*` (known issue, kept deliberately so far).
- **No automated print tests.** Page counts were checked by ad-hoc scripts outside the repo.
