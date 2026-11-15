# Calendar implementation audit

Audit of date handling before the Bikram Sambat (BS) calendar work. Done 2026-11-14 on branch
`feature/bs-calendar`. Nothing was changed while auditing.

## 1. Summary

- Dates are stored in AD and the storage is sound. No data migration is needed.
- The web frontend had no BS conversion. Every BS string on screen came from the backend.
- The backend's BS table (`backend/src/utils/dateConverter.js`) is **wrong for five BS years,
  including the current one** (section 6). This is the most important finding.
- There was no holiday, weekend or working-day concept anywhere.
- Several write paths could store the wrong calendar day if a client sent a full timestamp
  (section 5).

## 2. How dates are stored

Both providers store UTC with no column time zone (MySQL `DATETIME(3)`, PostgreSQL
`TIMESTAMP(3)`); `@db.Date` columns come back as UTC midnight.

**Calendar dates (`@db.Date`), AD:**

| Model | Fields |
| --- | --- |
| AcademicYear | `startDate`, `endDate` |
| Student | `dateOfBirth`, `admissionDate` |
| Attendance | `attendanceDate` |
| Exam | `startDate`, `endDate` (nullable) |
| ExamSubject | `examDate` (nullable), plus `startTime` / `endTime` as `@db.Time` |
| Assignment | `dueDate` |
| FeeStructureInstallment, FeeInstallment | `dueDate` (nullable) |
| FeeTransaction | `paidOn` (and `fiscalYear`, a stored string such as `2082-83`) |

**Real timestamps (plain `DateTime`):** every `createdAt` / `updatedAt`, `User.lastLogin`,
`Exam.publishedAt`, `ReportCard.generatedAt`, `Submission.submittedAt` / `gradedAt`,
`Notice.publishFrom` / `publishTo` / `publishedAt` / `archivedAt`, `Promotion.processedAt`, and
the fee approval and token timestamps. A notice's publish window is a timestamp, not a date.

**Records that must not be modified:** all of the above. In particular `FeeTransaction` rows
(append-only ledger, `fiscalYear` and receipt numbers are stored), `Attendance` rows, and the
attendance totals frozen on `ReportCard`.

## 3. API date formats

- **Out:** `res.json` serialises a `Date`, so a calendar date leaves as
  `"2026-04-14T00:00:00.000Z"`. A few responses add a BS string computed by the server:
  attendance `bsDate` and month labels, `dateOfBirthBs`, `paidOnBs`, `billDateBs`, day-book
  `fromBs` / `toBs`, report-card `issueDateBS`.
- **In:** `"YYYY-MM-DD"` from every web form. Attendance and fees read the digits of the string
  (`attendanceDay()`, `dateOnly()`), which is safe. Students, academic years, exams and
  assignments used `new Date(value)` after a non-strict `isISO8601()` check.

## 4. Frontend before this work

- **Inputs:** 13 native `<input type="date">` fields, no date picker component:
  `admin/Students.jsx` (date of birth, admission date), `admin/AcademicYears.jsx` (start, end),
  `admin/Exams.jsx` (start, end), `admin/Notices.jsx` (show from, show until),
  `teacher/Assignments.jsx` (due date), `teacher/Attendance.jsx` (register date),
  `finance/PaymentDialog.jsx` (paid on), `finance/InstallmentPlanDialog.jsx` (due date per row),
  and the filters on `finance/Bills`, `Dashboard`, `Reports`, `Transactions`.
- **Display:** `utils/format.js` — `formatDate` (about 73 call sites, "14 Apr 2025"),
  `formatDateTime` (11), `formatRelative` (3), `toDateInput` (10). Six more inline
  `toLocaleDateString` calls.
- **Preferences:** none, per user or per school. `localStorage` held only the auth tokens and
  the sidebar state.
- **Tests:** the frontend had no unit-test runner.

The mobile app has its own BS code (`mobile/src/utils/nepaliDate.ts`), generated from the
backend table, so it shares the error in section 6. It is not changed by this work.

## 5. Time zone handling and day-shift risks

No `TZ` is set at runtime (only in the Jest configs). Code that needs "today in Nepal" uses a
fixed +5:45 offset (`kathmanduToday()` in `utils/fiscalYear.js`, duplicated in
`services/push/index.js`).

| # | Where | Risk | Action |
| --- | --- | --- | --- |
| 1 | `new Date(x)` into `@db.Date` (students, academic years, exams, assignments) | a full timestamp such as a browser's local-midnight `toISOString()` stores the previous day | fixed: `parseDateOnly` |
| 2 | `toDateInput(new Date())` in the frontend | gives the UTC date: yesterday before 05:45 in Nepal | fixed |
| 3 | `formatDate` of a date-only value | read in the browser's zone; a day early west of UTC | fixed: read by digits |
| 4 | "today" from the browser clock (three `localToday` copies) | wrong outside Nepal | fixed: Kathmandu today |
| 5 | Notice "show until 14th" | stored as 00:00 UTC, so it expires at 05:45 that morning; a one-day window is refused | **not changed, needs a decision** |
| 6 | Submission lateness | `dueDate` is 00:00 UTC, so anything after 05:45 on the due date is late | **not changed, needs a decision** |
| 7 | Report-card BS year | `getApproxBSYear` adds 57 to the first number in the academic year's name | **not changed** |
| 8 | `ExamSubject.startTime` / `endTime` | `new Date("10:00")` is invalid; no validator, no UI | not changed |

## 6. The existing BS table is wrong

`dateConverter.js` holds month lengths for BS 2000–2090 with no cited source. Compared day by
day with `@inicrea/bikram-sambat-core` (data generated from the Yorion engine) over all 33,238
days of BS 2000–2090, **369 days differ**, all by one day, in five years:

| BS year | Existing table | Verified data |
| --- | --- | --- |
| 2062 | 30 32 31 32 31 31 29 30 29 30 29 31 | 31 31 31 32 31 31 29 30 29 30 29 31 |
| 2081 | 31 31 32 32 31 30 30 30 29 30 30 30 | 31 32 31 32 31 30 30 30 29 30 29 31 |
| 2082 | 30 32 31 32 31 30 30 30 29 30 30 30 | 31 31 32 31 31 31 30 29 30 29 30 30 |
| 2083 | 31 31 32 31 31 30 30 30 29 30 30 30 | 31 31 32 31 31 31 30 29 30 29 30 30 |
| 2087 | 31 31 32 31 31 31 30 30 29 30 30 30 | 31 31 32 31 31 31 30 29 30 30 30 30 |

Affected AD ranges: 2005-05-14 – 06-14; 2024-06-14 – 07-15; 2025-03-14 – 04-13;
2025-05-14 – 06-14; 2025-07-16 – 08-16; 2025-10-17 – 12-15; 2026-01-14 – 02-12;
**2026-10-17 – 12-15**; 2027-01-14 – 02-12; 2030-12-16 – 2031-01-14.

Independent sources agree with the verified data, not the existing table:

- Kathmandu Metropolitan City's calendar: Kartik 1, 2083 = 18 October 2026 and Kartik 30 =
  16 November 2026 (the existing table says 17 October).
- Hamro Patro's 2082 holiday table: 3 Kartik 2082 = 20 October 2025, so Kartik 1 = 18 October.
- News reports of the fiscal year start: Shrawan 1, 2082 = 17 July 2025 (the existing table
  says 16 July).
- Daily almanacs: Ashadh 1, 2081 = 15 June 2024 (the existing table says 14 June).

**Effect today:** every server-made BS string is one day ahead between 17 October and
15 December 2026: attendance `bsDate` and its month grouping, `paidOnBs` on receipts,
`billDateBs`, the day-book range, the report-card issue date. The existing unit test asserts one
of the wrong values (`2026-11-06 = 2083/07/21`; the correct date is 2083/07/20).

**Effect on money:** `fiscalYearOf` differs on exactly one day, 16 July 2025 (really the last
day of 2081-82, treated as the first of 2082-83). Stored `fiscalYear` values and receipt
numbers are never recomputed, so existing rows keep what they have.

**Status:** the new adapter uses the verified engine. `dateConverter.js` and its callers were
left as they are, as agreed for the case where the two disagree. Recommended next step: make
`dateConverter.js` delegate to the adapter and correct its test, so the server and the browser
show the same BS date. Until then a receipt's server-made BS date can differ by one day from
the BS date the browser shows for the same AD date.

## 7. Provider compatibility constraints

- Models only in `prisma/schema/models.prisma`; one migration per provider.
- `@db.Date`, `Json` and `VarChar` behave the same on both. `@db.Time` differs in driver
  handling, so new times of day are stored as `"HH:mm"` strings.
- PostgreSQL has no default row order and compares text case-sensitively: explicit `orderBy`,
  `dialect.text.equals` / `search`.
- No raw SQL is needed for the calendar.

## 8. Modules and BS support

| Module | Date fields | Needs |
| --- | --- | --- |
| Students | date of birth, admission date | BS picker, BS display |
| Academic years | start, end | BS picker, BS display, calendar feed |
| Attendance | register date | BS picker, non-working-day rule |
| Exams | start, end; `ExamSubject.examDate` (no UI) | BS picker, calendar feed |
| Assignments | due date | BS picker, calendar feed |
| Fees | paid on, installment due dates, report ranges | BS picker, calendar feed |
| Notices | show from / until (timestamps) | BS picker, calendar feed |
| Report cards, promotions | timestamps only | BS display |
| Teachers and staff | no date fields exist | nothing |
| CAS, formative assessment, certificates, timetable | not built | nothing |
| React-admin exam pilot | read-only `DateField` | left as is |

## 9. Integration strategy

1. One verified engine behind an adapter on each side (`backend/src/utils/calendar/`,
   `frontend/src/lib/calendar/`), same function names and behaviour.
2. AD stays the only stored and transmitted form. The API never accepts BS.
3. Calendar dates travel as `YYYY-MM-DD` and are never passed through a local `Date`.
4. One formatter (`utils/format.js`) and one picker (`NepaliDatePicker`) for the whole web app,
   driven by a school default plus a per-browser preference.
5. The School Calendar stores only its own events and holidays. Exams, assignments, fee due
   dates, notices and the academic year are read from their own tables.
