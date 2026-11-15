# Date conversion reference

What the conversion engine covers, how it was verified, and the dates the tests pin. See
[bs-date-architecture.md](bs-date-architecture.md) for where the engine sits.

## Range

| | From | To |
| --- | --- | --- |
| BS | 1975-01-01 | 2100-12-30 |
| AD | 1918-04-13 | 2044-04-12 |

46,022 days. Outside the range every function returns `null`.

BS months have 29 to 32 days and follow no formula; the lengths come from a table. BS 2083, for
example: 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30.

## Functions

Same names on the server (`backend/src/utils/calendar/bsDateAdapter.js`) and in the browser
(`frontend/src/lib/calendar/bsDateAdapter.js`).

| Function | Returns |
| --- | --- |
| `adToBs("2026-04-14")` | `{ year: 2083, month: 1, day: 1 }` or `null` |
| `bsToAd({ year: 2083, month: 1, day: 1 })` | `"2026-04-14"` or `null` |
| `isValidBs(bs)` | `false` for `2083-01-32`, `2083-08-30`, non-integers, out of range |
| `isIsoDate("2026-02-30")` | `false`: must be a real AD date written `YYYY-MM-DD` |
| `daysInBsMonth(2083, 3)` | `32` |
| `weekdayOf("2026-04-14")`, `bsWeekday(bs)` | `2` (0 = Sunday) |
| `addDays(iso, n)`, `diffDays(from, to)` | AD date; whole days |
| `bsMonthRange(2083, 7)` | `{ from: "2026-10-18", to: "2026-11-16" }` |
| `bsYearRange(2083)` | `{ from: "2026-04-14", to: "2027-04-13" }` |
| `todayAd()`, `todayBs()` | today in Nepal |

Formatting (`dateFormatter.js`): `formatBs`, `formatAd`, `formatAdAsBs`, `toNepaliDigits`,
`toLatinDigits`, `bsMonthName`, `adMonthName`, `weekdayName`, `weekdayNameOf`.

| Call | Result |
| --- | --- |
| `formatBs({2083,1,1})` | `1 Baisakh 2083` |
| `formatBs({2083,1,1}, { language: "ne", numerals: "ne" })` | `१ बैशाख २०८३` |
| `formatBs({2083,1,5}, { style: "numeric", numerals: "ne" })` | `२०८३/०१/०५` |
| `formatAd("2026-04-14")` | `14 Apr 2026` |

English month names are the spellings the app already printed: Baisakh, Jestha, Asar, Shrawan,
Bhadra, Asoj, Kartik, Mangsir, Poush, Magh, Falgun, Chaitra.

## How it was verified

Four independent checks, all automated.

### 1. Reference dates from outside the package

`backend/src/utils/calendar/referenceDates.json`, read by the backend and the frontend tests.
Each pair is checked in both directions, with its weekday.

| AD | BS | Source |
| --- | --- | --- |
| 2026-10-18 (Sun) | 1 Kartik 2083 | Kathmandu Metropolitan City calendar |
| 2026-11-16 (Mon) | 30 Kartik 2083 | Kathmandu Metropolitan City calendar |
| 2026-10-21 (Wed) | 4 Kartik 2083 | same: Vijaya Dashami |
| 2026-11-11 (Wed) | 25 Kartik 2083 | same: Bhai Tika |
| 2025-10-20 (Mon) | 3 Kartik 2082 | Hamro Patro public holidays 2082 |
| 2025-07-17 (Thu) | 1 Shrawan 2082 | start of fiscal year 2082/83 |
| 2024-06-24 (Mon) | 10 Asar 2081 | daily almanac |
| 2026-04-14 (Tue) | 1 Baisakh 2083 | Nepali New Year |
| 2025-04-14, 2024-04-13, 2023-04-14, 2020-04-13, 2010-04-14 | 1 Baisakh 2082, 2081, 2080, 2077, 2067 | Nepali New Year |
| 2000-01-01 (Sat) | 17 Poush 2056 | widely published |
| 1944-01-01 (Sat) | 17 Poush 2000 | widely published |
| 2024-01-01 (Mon) | 16 Poush 2080 | |

### 2. The government's own notice for 2083

The Nepal Gazette notice of public holidays for 2083 BS (Part 5, Volume 75, Number 67,
18 Falgun 2082; Ministry of Home Affairs) prints a weekday beside every holiday and lists every
Saturday of the year. The tests check that:

- all 34 dated holidays fall on the printed weekday;
- the Saturdays of each of the 12 months of 2083 are exactly the ones the notice lists (this
  fixes the first weekday and the length of every month of 2083);
- the four holidays the notice also dates in AD convert to that day: 1 May 2026, 3 December 2026,
  25 December 2026, 8 March 2027.

### 3. Round trips over the whole range

- AD → BS → AD for all 46,022 days, also checking that consecutive AD days give consecutive BS
  days and that a month only rolls over on its last day.
- BS → AD → BS for every day of every month of BS 1975–2100.

### 4. Comparison with the older table

A test records that `dateConverter.js` differs from the verified data in exactly BS 2062, 2081,
2082, 2083 and 2087 and nowhere else. If someone corrects the old table, that test tells them
to remove the note.

## Boundaries the tests pin

| Case | Expectation |
| --- | --- |
| Last day of Chaitra 2082 | `2026-04-13`; the next day is 1 Baisakh 2083 |
| Asar 2083 has 32 days | the day after `2083-03-32` is `2083-04-01` |
| Gregorian leap days | `2024-02-29` = 17 Falgun 2080, and comes back |
| Range edges | `1918-04-12` and `2044-04-13` give `null` |
| Midnight in Nepal | 18:14:59 UTC is still the 13th; 18:15:00 UTC is the 14th |
| Nepali digits | `२०८३/०१/१५` parses to `2083-01-15` |

## Repeating events

`recurrence.js` works out occurrences when the calendar is read (nothing is stored per
occurrence).

| Rule | Meaning |
| --- | --- |
| `WEEKLY` | every 7 days |
| `MONTHLY_BS` | the same BS day every BS month |
| `YEARLY_BS` | the same BS month and day every BS year |
| `YEARLY_AD` | the same AD month and day every year |

A day a shorter month lacks moves to that month's last day (Asar 32 → Shrawan 31; 29 February →
28 February). `recurrenceUntil` is the last day a repeat may start. At most 500 occurrences are
returned for one event and one window.

## Running the checks

```bash
cd backend  && npx jest src/utils/__tests__/calendar.test.js src/utils/__tests__/calendarHolidays.test.js
cd frontend && npm test
```
