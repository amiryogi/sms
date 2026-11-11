# Playwright automation plan (Phase 1)

Date: 2026-11-11. Nothing is installed yet.

## What exists today

| Layer | Tool | Size | Runs in CI |
|---|---|---|---|
| Unit | Jest | 453 tests | yes |
| Integration (database + HTTP API through supertest) | Jest | 80 tests, on MySQL 8 and PostgreSQL 16 | yes |
| Browser | none in the repo | – | no |

Browser checks so far were ad-hoc scripts kept outside the repository: a page sweep for all
seven roles, print-to-PDF page counts, and a computed-style diff. They are not repeatable by
anyone else and do not run in CI. Playwright (1.65 is current) replaces them.

## Setup

```
e2e/                         (repo root; its own package.json so app installs stay lean)
  playwright.config.js       baseURL, one Chromium project, webServer for API + site
  fixtures/auth.js           logs in through the API once per role, saves storage state
  fixtures/data.js           ids of the seeded exam, class, section, students
  tests/report-cards/*.spec.js
  tests/exams/*.spec.js
  tests/smoke/*.spec.js
  __screenshots__/           approved baselines (committed)
```

- **Database:** the MySQL **test** database, migrated and seeded (`scripts/with-test-db.js`),
  never the development one. Tests that write create their own exam or records and remove
  them, as the Jest integration suites do.
- **Servers:** Playwright's `webServer` starts the API (test database) and the Vite build
  preview; tests never start against a developer's running servers.
- **Browser:** Chromium only at first. Print and PDF output is Chromium's, which is what
  the school uses to print.
- **CI:** a fourth job in `.github/workflows/ci.yml` (MySQL service, seed, build, run), with
  traces and screenshots uploaded on failure.

## Report card tests

| # | Case | How it is checked |
|---|---|---|
| 1 | Individual card | opens from Report Cards; sheet visible; `page.pdf()` has 1 page |
| 2 | Bulk print | `page.pdf()` page count equals the number of students |
| 3 | Multiple students | each page shows a different student name, in roll-number order |
| 4 | Long school name | a fixture school name of ~90 characters; no overflow; still 1 page |
| 5 | Long student name | same, for the student block |
| 6 | School logo | image loaded (`naturalWidth > 0`) and inside the header box |
| 7 | Subject counts | fixture cards with 5, 8, 12 and 16 subjects; 1 page each |
| 8 | Missing remarks | remarks area renders without "undefined" / "null" |
| 9 | Grades and NG | failing subject prints the scale's fail grade; passing ones match the API payload |
| 10 | Signatures | all configured labels present, inside the page, not overlapping the table |
| 11 | A4 size | PDF page box is 595 × 842 pt (portrait) |
| 12 | Page breaks | bulk: one sheet per page, none split |
| 13 | No blank pages | every PDF page has text |
| 14 | No clipped content | no element inside the sheet extends past the sheet's box (`scrollWidth/Height` and bounding boxes) |

- Cases 4, 5, 7 and 8 need data the seed does not contain. They render the sheet from
  **fixture payloads** through the settings preview route (or a small dev-only preview page),
  so no database edits are needed.
- The same cases run for both templates and, after the redesign, for a non-default design.

## Visual regression

- **Baselines:** `expect(locator).toHaveScreenshot()` on the sheet element, per case, committed
  under `e2e/__screenshots__/`.
- **Keeping it stable:**
  - one browser (Chromium) and one OS: baselines are produced and compared in the CI Linux
    image (the Playwright Docker image), not on developer machines;
  - fonts loaded from the repo, not from Google at test time, and `document.fonts.ready`
    awaited;
  - fixed viewport and device scale factor; animations disabled; dates frozen;
  - a small tolerance (`maxDiffPixelRatio` about 0.01) instead of exact pixels.
- **A second, font-independent guard:** layout assertions (page count, boxes inside the
  sheet, column widths within tolerance), so a real layout break fails even if a screenshot
  is within tolerance.
- **Changing a design on purpose:** run with `--update-snapshots` on a branch; the diff images
  are reviewed in the pull request; baselines are merged only after approval.

## Examination tests

| Area | Checks (against real rules, not just rendering) |
|---|---|
| Listing, search, filters | rows match the API for the chosen year, class and status |
| Status transitions | DRAFT → PUBLISHED → LOCKED → unlock, as admin; buttons absent for other roles and the API refuses them |
| Subject configuration | subjects snapshot at creation; a later ClassSubject edit does not change the exam |
| Marks entry | save valid marks; reload shows them |
| Invalid marks | above full marks, negative, non-numeric: field error and nothing saved |
| Editing restrictions | DRAFT and LOCKED exams are read-only in the UI and refused by the API |
| Verification / missing marks | counts match the database |
| Results listing | grades and GPA equal the API payload; unpublished cards hidden from student and parent |
| Role access | teacher sees only assigned subjects and PUBLISHED exams; exam officer can enter any subject; accountant, student, parent are refused |

## General regression (added gradually)

1. Login, expired access token refreshed silently, logout.
2. Role-based navigation: each role sees its menu and is redirected from others' pages.
3. Students: create, edit, search (case-insensitive), enrolment.
4. Teachers: create and assign subjects.
5. Attendance: mark a class, student summary updates.
6. Fees: collect a payment, receipt prints on 1 page, statement and balance update.

## Order of work (Phase 6)

1. Scaffold `e2e/`, auth fixtures, CI job, one smoke test per role.
2. Report-card cases 1–3 and 11–14 on today's design, to protect the redesign.
3. Fixture-driven cases 4–10, then visual baselines.
4. Examination workflow and role tests.
5. General regression flows.

## Risks

- **Flaky screenshots** across machines: avoided by comparing only in the CI image.
- **Slow suites:** keep writes few, share logged-in storage state, run files in parallel
  against one seeded database where they do not conflict.
- **Test data drift:** tests rely on the seed; a seed change that renames the demo exam or
  class must update `fixtures/data.js`.
