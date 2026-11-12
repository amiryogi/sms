# Browser tests (Playwright)

These tests drive the real app in a browser. They run against the **MySQL test database
only**: Playwright starts its own API (through `backend/scripts/with-test-db.js`) and its own
Vite server, on ports 5012 and 5184, so the development servers and database are never used.

## Run

```bash
# once: the test database must be migrated and seeded
cd backend
node scripts/with-test-db.js npm run db:migrate:deploy
node scripts/with-test-db.js npm run seed

cd ../e2e
npm install
PW_CHANNEL=chrome npm test      # use the installed Chrome (no browser download)
# or: npx playwright install chromium   then   npm test
npm run report                  # open the HTML report of the last run
```

On Windows PowerShell: `$env:PW_CHANNEL="chrome"; npm test`.

## What is covered

| File | Covers |
|---|---|
| `tests/report-cards.spec.js` | Individual and bulk print: one A4 page per card, page count and size from the real PDF, roll order, no clipped content, grades equal the API, long school and student names, 5 / 12 / 16 subjects, missing remarks, the fail grade, bulk equal to individual, student access, two visual baselines |
| `tests/exams.spec.js` | The exam pilot tables (list, search, filters, subject snapshot, results), the lifecycle DRAFT → PUBLISHED → LOCKED → unlock, who may publish, marks refused outside PUBLISHED, invalid marks, real marks entry through the grid |
| `tests/smoke.spec.js` | Sign-in and a wrong password, silent token refresh, each of the 7 roles' pages and a refused page, a fee receipt on one page, the same balance for student and accountant |

Every test also fails on an unexpected console error or uncaught exception
(`helpers/fixtures.js`).

## Rules for writing tests

- **Never edit seeded data.** Create what you need (the exam tests create "E2E <run>") and
  remove it; `helpers/cleanup-exams.js` deletes leftover test exams.
- **Awkward data comes from rewriting the API response** (`rewriteCards` in the report-card
  tests), not from the database.
- **Compare with the API or the rules**, not with what the page happens to show.

## Visual baselines

`tests/report-cards.spec.js-snapshots/` holds the approved screenshots of the default report
card design (tagged `@visual`).

- They are **Windows + Chrome** baselines. Fonts render differently on other systems, so these
  two tests are skipped elsewhere, and CI runs `npm run test:ci`, which leaves them out. The
  layout assertions (page count, nothing clipped, identical sizes) run everywhere.
- When a design change is intended:
  1. run `npm run test:visual` and look at the differences in the report;
  2. if they are what you meant, run `npm run update-baselines`;
  3. commit the new images, so the change is reviewed like code.

## CI

The `e2e` job in `.github/workflows/ci.yml` seeds a MySQL container and runs `npm run test:ci`
with Playwright's own Chromium. On failure it uploads the HTML report and traces.
