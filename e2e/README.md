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
| `tests/fees-print.spec.js` | Fee printouts: a class's bills print four to an A4 page with totals equal to the API, a long bill shrinks to fit its quarter, one bill on one page, the receipt reprint link opens the print dialog and prints as one slip, the student's statement balance equals the API, a student cannot print another's, the day book total equals the API |
| `tests/accounts.spec.js` | An admin resets a student's password in the UI; the student signs in with the temporary one, is held on "Choose your password" (even when typing another address), sets a new one and reaches the dashboard; old and temporary passwords stop working. Class login slips print four to an A4 page (API response rewritten, so no real password changes) |
| `tests/public-site.spec.js` | The public site: every navbar page, sign-in and back, the contact hrefs (tel / WhatsApp / Viber / mailto) and the footer credit link, the enquiry form's required fields, every tour screenshot served, the lightbox with arrow keys, the phone menu, no sideways scroll at 390 px, "Go to dashboard" when signed in |
| `tests/smoke.spec.js` | Sign-in and a wrong password, silent token refresh, each of the 7 roles' pages and a refused page, a fee receipt on one page, the same balance for student and accountant |

Every test also fails on an unexpected console error or uncaught exception
(`helpers/fixtures.js`).

## Rules for writing tests

- **Never edit seeded data.** Create what you need (the exam tests create "E2E <run>") and
  remove it; `helpers/cleanup-exams.js` deletes leftover test exams.
- **Awkward data comes from rewriting the API response** (`rewriteCards` in the report-card
  tests), not from the database.
- **Compare with the API or the rules**, not with what the page happens to show.

## Public-site screenshots

The pictures on the public site (`frontend/public/screenshots/*.jpg`) are captured from the
running app, signed in as each role on the seeded test database:

```bash
PW_CHANNEL=chrome npm run screenshots   # playwright.screenshots.config.js -> screenshots/capture.spec.js
```

It is a separate config, so `npm test` never runs it. It also renders the 1200×630 link-preview image `frontend/public/og-image.jpg` (Facebook / WhatsApp), referenced by the `og:image` tag in `frontend/index.html`. **Look at every image before committing.**
The integration and e2e tests leave fee plans named "Integration …" / "Dashboard dash-…" in the
test database, and the capture skips students who have them. Check for empty states and test
leftovers anyway. To add a screen, add a `shot(...)` line there and an entry in
`frontend/src/pages/public/content.js`.

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
