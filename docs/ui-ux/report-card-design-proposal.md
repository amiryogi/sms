# Report card design proposal (for Phase 2 approval)

Based on [report-card-audit.md](report-card-audit.md). Nothing here is implemented yet.

## Goals

1. One template and **one stylesheet** per report-card design; individual and bulk differ only
   in how many sheets are rendered.
2. Appearance controlled by a validated design configuration, stored per school.
3. An admin page to edit it with a live preview that matches print.
4. No change to marks, grades, GPA, remarks or publication rules.

## 1. One shared sheet

```
ReportCardDocument        ← new: takes cards[] (1 for individual, N for bulk) + design
  └─ for each card: <section class="rc-page">   one A4 page, page-break after each
       └─ ReportSheet / PerformanceSheet        existing markup, one variant only
ReportCardViewer          ← new: the overlay chrome (Print, Download, Close, count)
```

- `NepalReportCard` and `BulkReportCardPrint` become thin wrappers around
  `ReportCardViewer` + `ReportCardDocument`. Their two `<style>` blocks are replaced by one
  stylesheet, `reportcard/sheet.css.js`.
- The `SINGLE` / `BULK` flag sets collapse into one. The individual card is the visual
  reference, as the brief asks. Bulk then shows the same header, title, summary and remarks.
- **One-page guarantee:** bulk's "compact mode" becomes a property of the shared sheet. A
  density step (normal → compact → tight) is chosen from the subject count and the configured
  row height, the same way for individual and bulk.
- The Performance Report already works this way; it only moves onto the same design tokens.
- The student/parent inline view and the settings preview render the same
  `ReportCardDocument` with one card.

## 2. Design configuration

Stored inside the existing JSON column, as a new `design` object next to the current layout
flags (`School.reportCardConfig.design`). **No new table and no migration.** `null` or a
missing key means the defaults, which reproduce today's individual card.

The sheet reads the values as CSS custom properties set on `.rc-page`, so screen preview and
print use the same numbers.

The defaults below are indicative. In Phase 3 each default is taken from the current
individual card's stylesheet (confirmed so far: school name 22pt, page margin 8mm), so that
the default design prints the same as today.

| Group | Settings (unit) | Default | Allowed |
|---|---|---|---|
| Page | orientation | portrait | portrait, landscape |
| | margin top / right / bottom / left (mm) | 8 / 8 / 8 / 8 | 5–25 |
| School header | name font size (pt) | 22 | 12–32 |
| | name weight | 700 | 400–900 |
| | name line height | 1.2 | 1.0–1.6 |
| | name alignment | center | left, center, right |
| | logo width / height (mm) | 22 / 22 | 10–40 |
| | logo position | left | left, center, right, hidden |
| | address font size (pt) | 10 | 7–14 |
| | contact font size (pt) | 9 | 7–14 |
| | header bottom spacing (mm) | 4 | 0–12 |
| Title | font size (pt), weight, alignment | 13, 700, center | 9–20 |
| | margin top / bottom (mm) | 3 / 3 | 0–10 |
| Student info | label / value font size (pt) | 9 / 10 | 7–13 |
| | row height (mm) | 6 | 4–10 |
| | columns | 4 | 2, 3, 4 |
| Grade sheet | body / header font size (pt) | 9.5 / 9 | 7–12 |
| | row height (mm) | 7 | 4.5–12 |
| | cell padding (mm) | 1.5 | 0.5–3 |
| | border thickness (pt) | 0.75 | 0.5–1.5 |
| | subject column width (%) | 38 | 25–55 |
| | subject / marks alignment | left / center | left, center, right |
| Summary | GPA font size (pt), show percentage, show result status | 12, yes, yes | 9–16 |
| Signatures | area height (mm) | 16 | 8–30 |
| | alignment | spread | spread, left, center, right |
| Footer | font size (pt), show issue date | 8, yes | 6–11 |

**Validation** (backend, in `utils/reportCardLayout.js`, unit-tested like the existing rules):
- every value is type- and range-checked; unknown keys are rejected on save;
- `normalizeLayout` clamps or replaces anything invalid on read, so a bad row can never stop
  a card printing;
- a **fit check** computes the sheet's height from the settings and the largest subject count
  in the class; the settings page warns before saving a design that cannot fit one page at
  the tightest density.

## 3. Customization page

Extend the existing School Settings → Report Card tab (it already has a live preview), instead
of adding a separate page:
- left: grouped controls (Page, Header, Title, Student info, Grade sheet, Summary, Signatures,
  Footer) using the existing `ui/` kit (`Field`, `TextInput`, `SelectInput`, sliders via a small
  new `RangeField`);
- right: the live preview, rendering the real `ReportCardDocument` at A4 proportions, scaled
  to fit; a toggle shows a sample with many subjects and a long school name;
- Save, and "Restore defaults" (the existing `DELETE /report-card-layout` for everything, plus
  a per-group reset);
- writes stay admin-only (`isAdmin`), scoped to `req.user.schoolId`, through the existing
  `PUT /report-card-layout`. No new endpoint.

## 4. What does not change

- Report-card payloads, grade calculation, publication gating, RBAC.
- The print mechanism (`@page`, print isolation).
- The exception in CLAUDE.md §9: the sheet keeps a local stylesheet for print. It shrinks from
  three stylesheets to one or two (NEB, Performance), driven by tokens.

## Open decisions for approval

1. **Bulk adopts the individual design.** Bulk pages will show more (title, summary, remarks)
   than today's compact bulk sheet. Confirm that is wanted.
2. **Font:** fix the Times New Roman / Inter inconsistency now by adding a "font family"
   setting (Inter, Times New Roman, Noto Sans Devanagari-safe), or keep Inter.
3. **Landscape:** offered in the brief "where appropriate". Proposed: portrait only at first;
   landscape needs its own fit rules.
