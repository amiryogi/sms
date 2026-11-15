# Bikram Sambat date architecture

How the system stores, sends, converts and shows dates. Read
[calendar-implementation-audit.md](calendar-implementation-audit.md) for what was found before
this work.

## The rule

**Dates are stored and sent in AD. Bikram Sambat (BS) is a way of showing and entering them.**

| Layer | Form |
| --- | --- |
| Database | AD. Calendar days in `DATE` columns (`@db.Date`); moments in `DATETIME(3)` / `TIMESTAMP(3)`, UTC |
| API, in | AD `"YYYY-MM-DD"`. The API never accepts a BS date |
| API, out | AD. A calendar day leaves as `"2026-04-14T00:00:00.000Z"`; calendar endpoints send `"2026-04-14"` |
| Screen | BS by default (`1 Baisakh 2083`), AD, or both, as the person chose |
| Form field | The person picks or types BS; the field's value is the AD day |

There is no BS column anywhere. The one place a BS date is kept as text is
`calendar_events.source_published_date`: the date of a holiday exactly as a notice printed it,
for the record. The event's real dates are still AD.

## The engine

One conversion package, [`@inicrea/bikram-sambat-core`](https://www.npmjs.com/package/@inicrea/bikram-sambat-core)
0.1.3 (MIT, no dependencies, about 5 kB), pinned exactly, installed in `backend/` and
`frontend/`. Its month lengths are generated from the Yorion engine and checked by its authors
day by day in both directions.

It was chosen over the two other candidates after reading their code and metadata:

| Package | Result |
| --- | --- |
| `@inicrea/bikram-sambat-core` | **Chosen.** Pure data and functions, works in Node (CommonJS) and the browser (ESM), BS 1975–2100, typed, tested. Young (August 2026, one maintainer), so it is wrapped |
| `@inicrea/bikram-sambat-react` | Not used. Its picker ships its own stylesheet and would not follow the school's `brand-*` colour or the UI kit |
| `@munatech/nepali-datepicker` | Rejected. No tests, the source of its calendar data is not stated, and it lists Tailwind and `react-hook-form` as runtime dependencies |

**Supported range: BS 1975-01-01 to 2100-12-30 = AD 1918-04-13 to 2044-04-12.** Outside it the
adapters return `null`; nothing is extrapolated. A date outside the range is shown in AD.

### Adapters

The package is imported in exactly two files. Everything else calls the adapter, so replacing
the package means editing these two files and rerunning the tests.

| Side | Folder | Files |
| --- | --- | --- |
| Server | `backend/src/utils/calendar/` | `bsDateAdapter.js` (conversion), `dateValidation.js`, `dateFormatter.js`, `recurrence.js`, `calendarConfig.js`, `calendarRules.js`, `eventInput.js`, `holidayRows.js` |
| Browser | `frontend/src/lib/calendar/` | `bsDateAdapter.js` (conversion), `dateValidation.js`, `dateFormatter.js`, `calendarConstants.js`, `calendarUtils.js`, `datePrefs.js` |

Both adapters expose the same functions with the same behaviour: `adToBs`, `bsToAd`,
`isValidBs`, `isIsoDate`, `isSupportedAd`, `daysInBsMonth`, `weekdayOf`, `bsWeekday`, `addDays`,
`diffDays`, `bsMonthRange`, `bsYearRange`, `todayAd`, `todayBs`. Both test suites read the same
reference dates (`backend/src/utils/calendar/referenceDates.json`) and the same gazette list.

A calendar date inside the code is a `"YYYY-MM-DD"` string (AD) or `{ year, month, day }` (BS,
month 1 = Baisakh). It is never a local-time `Date`.

### The older converter

`backend/src/utils/dateConverter.js` (AD → BS only, BS 2000–2090) is still what the older
server-made BS strings use: attendance `bsDate`, `paidOnBs`, `billDateBs`, the day-book range,
the report-card issue date, and the fiscal year. **Its table is wrong for BS 2062, 2081, 2082,
2083 and 2087** (audit, section 6). It was left unchanged because it feeds receipt numbering and
the decision to switch it belongs to the owner. Until then those strings can be one day off in
the affected ranges, and can disagree with what the browser shows for the same AD date.

## Time zone

The school's time zone is `Asia/Kathmandu` (UTC+5:45, no daylight saving).

- **Calendar days have no time zone.** They are read by their digits:
  `parseDateOnly("2026-04-14")` gives the UTC-midnight `Date` Prisma stores, on any server.
  `new Date(value)` is not used for a calendar day.
- **"Today" is the day in Nepal**, on the server (`todayAd()`, `kathmanduToday()`) and in the
  browser (`todayAd()` in `utils/format.js`), whatever the machine's own zone.
- **Moments** (`createdAt`, a notice's publish time, a payment's `createdAt`) keep their meaning.
  When shown, they are converted to Nepal time first: 20:00 UTC on 13 April is
  `1 Baisakh 2083, 1:45 AM`.

The frontend tests run with the process time zone set to New York to prove nothing depends on
the device clock's zone; the backend tests pin `Asia/Kathmandu`.

## Showing dates

`frontend/src/utils/format.js` is the one formatter:

| Function | Example (preference: BS) |
| --- | --- |
| `formatDate(value)` | `1 Baisakh 2083` |
| `formatDateTime(value)` | `1 Baisakh 2083, 10:30 AM` |
| `formatRelative(value)` | `in 3 days` |
| `dayParts(value)` / `formatShortDay(value)` | `{ monthShort: "Bai", day: "1" }` / `1 Bai` |
| `toDateInput(value)` | `2026-04-14` (the AD value of a date field) |
| `todayAd()` | today in Nepal, AD |

They read the preference from `lib/calendar/datePrefs.js`:

1. the school's default (`School.calendarConfig`, sent in `user.school.calendar` at sign-in);
2. the person's own choice on this browser (`localStorage` key `sms.calendar.prefs`), set from
   the menu under their name. It wins where it is set.

Options: calendar `bs` / `ad` / `both`, language `en` / `ne` (month and weekday names),
numerals `en` / `ne`. Default: BS, English, 0-9. Changing the preference redraws the page
(`DashboardLayout` keys the routed content by it).

There is no per-user column for this: the app had no user-preference storage, and a display
choice does not justify one. A person's choice therefore belongs to the browser, not the account.

## Entering dates

`NepaliDatePicker` (`frontend/src/components/ui/NepaliDatePicker.jsx`, in the UI kit) replaced
all 13 native date inputs.

```jsx
<NepaliDatePicker value={ad} onChange={(ad, { bs, bsText, adText }) => ...} min={...} max={...} isDateDisabled={(ad) => ...} />
```

- `value` and the first argument of `onChange` are AD `"YYYY-MM-DD"` (or `""`).
- It opens on a BS month grid; inside it the person can switch to AD, to Nepali names and to
  Nepali numerals, change month and year, type a date (`2083-01-15`, Nepali digits accepted),
  press Today or Clear.
- Keyboard: arrows, Home/End, PageUp/PageDown (Shift: a year), Enter, Esc.
- With react-hook-form use `DateInput` from `components/common/FormElements.jsx` and pass the
  form's `control`. `required` is checked by the form.

Because the value is unchanged, no form's submit code or API payload changed.

## What the server checks

The browser's checks are a convenience. On the server:

- date-only fields on students, academic years, exams and assignments go through `isDateOnly` in
  their validators and `parseDateOnly` in their controllers;
- calendar events go through `readEventInput` (real date, inside the supported range, end not
  before start, valid times, known category, audience and recurrence);
- holiday rows are converted from BS on the server (`holidayRows.js`); a client-supplied AD date
  for a holiday row is ignored.
