# Calendar testing guide

What tests cover the BS dates and the school calendar, how to run them, and what they do not
cover.

## Suites

| Suite | Files | Needs | Count |
| --- | --- | --- | --- |
| Backend unit (Jest) | `backend/src/utils/__tests__/calendar.test.js`, `calendarHolidays.test.js` | nothing | 64 |
| Frontend unit (Vitest) | `frontend/src/lib/calendar/__tests__/calendar.test.js` | nothing | 34 |
| Integration (Jest + supertest) | `backend/src/__integration__/calendar.test.js` | a seeded test database, MySQL or PostgreSQL | 26 |
| Browser (Playwright) | `e2e/tests/calendar.spec.js` | the MySQL test database; starts its own servers | 11 |

## Running them

```bash
# unit, no database
cd backend  && npm test                    # all backend unit tests
cd frontend && npm test                    # vitest

# integration, both providers
cd backend
node scripts/with-test-db.js npm run db:migrate:deploy                    # once per schema change
node scripts/with-test-db.js --provider pg npm run db:migrate:deploy
npm run test:integration:mysql
npm run test:integration:pg

# browser
cd e2e && PW_CHANNEL=chrome npx playwright test tests/calendar.spec.js    # or npm test for all
```

The frontend suite also passes with the process time zone set elsewhere
(`TZ=America/New_York npm test`), which is how it proves no date depends on the device's zone.

## What each suite checks

### Conversion (backend and frontend unit)

- Known AD ↔ BS pairs from sources outside the package, with weekdays
  (`backend/src/utils/calendar/referenceDates.json`, shared by both suites).
- The 2083 gazette list: every holiday falls on its printed weekday; every Saturday of the 12
  months matches the notice; holidays the notice also dates in AD convert to that day.
- Round trips over all 46,022 supported days, both directions, with consecutive days and month
  roll-overs checked.
- Month lengths, month and year boundaries, Gregorian leap days, range edges, invalid BS and AD
  dates, Nepali digits, typed-date parsing.
- "Today" in Nepal at the 18:15 UTC boundary.
- Formatting: BS, AD and both; English and Nepali names; Nepali numerals; times.
- Month grids: Kartik 2083 starts on Sunday and has 30 days; Saturdays per month equal the
  gazette's; Sunday- or Monday-first rows; navigation across years and range ends; AD months.
- Repeating events (weekly, monthly BS with short months, yearly BS, yearly AD with 29 February,
  end date, long rules).
- Calendar settings normalizer and validator; working-day rules (weekly holiday from settings,
  school-wide, class and section holidays, role events never close a class).
- Event input checking, holiday rows, the built-in holiday list.
- The date preference store: school default, personal choice, notifications.
- A record of where the old `dateConverter.js` table differs (BS 2062, 2081, 2082, 2083, 2087).

### Database and API (integration, MySQL and PostgreSQL)

- Settings: defaults, sent at sign-in, admin-only changes with named errors, weekly holiday
  changes take effect.
- Events: create, read, edit, delete; a calendar day comes back as the same day and is stored as
  UTC midnight; a client `schoolId` is ignored; bad input names its field.
- Roles: students, parents and accountants cannot write; teachers only for sections they teach,
  only class events, never holidays, only their own.
- Visibility: admin sees drafts; students see events for all and their class; parents their
  children's; role events reach that role only; drafts and other classes' events cannot be
  opened by id.
- School isolation: another school's event is never listed, read, changed or deleted, and its
  holiday does not close this school.
- Repeats: a yearly BS holiday lands on the right AD day in later years and closes the school;
  weekly events stop at their end.
- Existing records shown, not copied: a DRAFT exam is seen only by admins and adds no calendar
  row; the academic year's first day; assignments and fees follow their modules' rules and carry
  no amounts.
- Holiday import: admin only; the preview writes nothing; confirmation required; only chosen rows
  are created; a renamed or switched-off holiday is not overwritten; a second import creates
  nothing; pasted lists, Nepali digits, repeated and impossible dates.
- Attendance: refused on a weekly holiday and on a holiday, nothing written; a holiday for
  another class does not block; the school setting turns the rule off.
- Date-only fields elsewhere: an exam created with a plain date or a full ISO timestamp stores
  that day; an impossible date is refused.

### Browser (Playwright)

- A BS date typed in the picker is stored as the matching AD day; the field shows BS with AD.
- An impossible BS date is refused; arrow keys and Enter choose a day; the AD and Nepali-numeral
  toggles; Esc closes only the picker.
- The student form's date of birth takes Nepali digits.
- The overview: today in both calendars, the BS month title, Sunday first, next month, the A.D.
  switch, week and list views.
- An event shows on its day with both dates and is deleted after confirmation.
- The person's choice of BS, AD or both changes the dates on a page.
- The month printout is one A4 landscape page; the year is A4 portrait; the list printouts are
  A4 portrait.
- Holiday import through the UI: preview with the published BS date and the AD date, group
  holidays unticked, one chosen and imported, a second import marks it and adds nothing.
- Weekly holidays changed in the settings and reset.
- A parent sees a published event but not a draft, and has no management links.
- The attendance page explains a holiday, the API refuses the save, and weekly holidays cannot be
  picked.

Tests create their own data (titled with a run id) and remove it; seeded data is never edited.

## Writing more tests

- In a browser test, choose a date with `pickDate(page, label, adDate)` from
  `e2e/helpers/fixtures.js`. The app's date fields are no longer native inputs, so `fill()` on
  them does not work.
- Compute expected BS dates with the backend adapter
  (`require("../../backend/src/utils/calendar/bsDateAdapter")`), never by hand.
- A test that saves attendance must pick a working day, or switch the rule off for its run and
  restore it (see `backend/src/__integration__/push.test.js`).
- Add any newly verified date pair to `referenceDates.json` with its source; both unit suites
  pick it up.

## Not covered

- PostgreSQL in the browser suite (it runs on the MySQL test database only).
- The push sent for a published event (the trigger reuses the notice audience, which
  `push.test.js` covers; the calendar trigger itself has no dedicated test).
- Visual baselines of the calendar pages.
