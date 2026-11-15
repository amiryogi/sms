# Calendar API reference

Base path `/api/v1/calendar`. Every route needs a signed-in user (`Authorization: Bearer …`).
The school is always the signed-in user's; a `schoolId` in a request is ignored.

Responses use the usual shape `{ success, message, data }`; lists add `pagination`. Errors are
`{ success: false, message, errors: [{ field, message }] }`.

## Date contract

- Dates in and out are **AD `"YYYY-MM-DD"`**. The API does not accept BS dates. (The one
  exception is the holiday import, whose rows carry the BS date as published and are converted on
  the server.)
- A full ISO timestamp is accepted where a date is expected and means its date part.
- Times of day are `"HH:mm"`, 24 hour, Nepal time.
- Supported range: `1918-04-13` to `2044-04-12` (BS 1975–2100).
- Event responses also carry `startDateBs` / `endDateBs` as `{ year, month, day }`.

## Who may call what

| Route | ADMIN | TEACHER | EXAM_OFFICER, ACCOUNTANT | STUDENT, PARENT |
| --- | --- | --- | --- | --- |
| `GET /feed`, `/overview`, `/meta`, `/settings`, `/events/:id` | yes | yes | yes | yes |
| `GET /working-day` | yes | yes | yes | no |
| `GET /events` (management list) | all events | own events | no | no |
| `POST /events`, `PUT`/`DELETE /events/:id` | any | class events for sections they teach; own only | no | no |
| `PUT`/`DELETE /settings` | yes | no | no | no |
| `/holidays/*` | yes | no | no | no |

A super admin is an admin. Roles decide access; no permission was added.

What a reader gets back is filtered on the server:

- **Events:** an admin sees every active event, drafts included. Everyone else sees an event
  that is `PUBLISHED` and active and is for `ALL`, for one of their roles, or for a class they
  belong to (a teacher: sections taught in the current year; a student: their current enrolment;
  a parent: their linked children's), plus anything they added themselves.
- **Exams:** only admins see `DRAFT` exams. Students and parents see exams that include their
  class.
- **Assignments:** admin all; a teacher their own; students and parents published ones for their
  section.
- **Fees:** fee staff see the due dates set on fee structures; students and parents see their own
  unpaid installments. No amount is ever included.
- **Notices:** whatever `GET /notices` shows the person.

---

## `GET /feed?from=&to=&sources=`

Everything dated in the range, merged and sorted. `from` and `to` are required; the range may be
at most 400 days. `sources` is an optional comma-separated subset of `event`, `exam`,
`assignment`, `fee`, `notice`, `academicYear`.

```json
{
  "from": "2026-10-18",
  "to": "2026-11-16",
  "items": [
    {
      "key": "event-12-2026-10-17",
      "source": "event",
      "sourceId": 12,
      "title": "Dashain holiday (Fulpati to Dwadashi)",
      "category": "PUBLIC_HOLIDAY",
      "startDate": "2026-10-17",
      "endDate": "2026-10-23",
      "isAllDay": true,
      "startTime": null,
      "endTime": null,
      "isHoliday": true,
      "detail": null,
      "audience": "Everyone",
      "audienceType": "ALL",
      "applicability": null,
      "recurrence": "NONE",
      "status": "PUBLISHED"
    }
  ]
}
```

`source` is `event`, `exam`, `examSubject` (one paper of an exam; returned with `exam`),
`assignment`, `fee`, `notice` or `academicYear`. `sourceId` is the id in that module (for
`examSubject`, the exam's id). A repeating event appears once per occurrence, each with its own
`key`.

`400` when a date is missing or invalid, the range is reversed or too long, or a source is
unknown.

## `GET /overview`

For the calendar dashboard.

```json
{
  "today": { "ad": "2026-11-15", "bs": { "year": 2083, "month": 7, "day": 29 }, "bsText": "29 Kartik 2083", "bsTextNe": "२९ कार्तिक २०८३", "weekday": 0, "weekdayName": "Sunday", "bsMonthName": "Kartik", "bsMonthRange": { "from": "2026-10-18", "to": "2026-11-16" } },
  "isWorkingDay": false,
  "nonWorkingReason": "Holiday: Chhath Parva",
  "config": { "defaultCalendar": "bs", "weeklyHolidayDays": [6] },
  "windowDays": 60,
  "holidays": [], "exams": [], "events": [], "deadlines": [],
  "recentUpdates": [{ "id": 12, "title": "…", "category": "…", "startDate": "…", "isNew": true, "updatedAt": "…" }]
}
```

The four lists hold up to six feed items each from the next 60 days.

## `GET /meta`

The lists the forms need: `categories`, `holidayCategories`, `teacherCategories`,
`audienceTypes`, `statuses`, `recurrences`, `audienceRoles`, `range`, `settingsOptions`.

## Events

### `GET /events`

Management list. Query: `kind` (`holiday` | `event`), `category`, `status`, `from`, `to`,
`search` (name, case-insensitive), `order` (`asc` | `desc`, by start date; default `desc`),
`page`, `limit` (max 100).

### `GET /events/:id`

One event, if the caller may see it; otherwise `404`.

### `POST /events`, `PUT /events/:id`

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string, required | up to 255 |
| `category` | string, required | see the database design |
| `startDate` | date, required | |
| `endDate` | date | default: `startDate`; at most 366 days later |
| `isAllDay` | boolean | default `true` |
| `startTime`, `endTime` | `"HH:mm"` | `startTime` required when not all day |
| `description` | string | up to 5,000 |
| `recurrence` | string | default `NONE` |
| `recurrenceUntil` | date | only with a recurrence |
| `audienceType` | `ALL` \| `ROLE` \| `CLASS` | default `ALL` |
| `roles` | string[] | role names, for `ROLE` |
| `classTargets` | `[{ classId, sectionId? }]` | for `CLASS`; no `sectionId` = whole class |
| `status` | `PUBLISHED` \| `DRAFT` | default `PUBLISHED` |
| `isActive` | boolean | default `true` |
| `source`, `sourceDocument`, `sourcePublishedDate`, `applicability` | string | kept for holiday categories only |
| `notify` | boolean | send a push to the audience when published (once; `notifyAgain: true` on an update repeats it) |

`PUT` replaces the whole event, including its audience.

- `201` / `200` with the event.
- `400` with `errors` naming each bad field; also when a class or section is not in the school
  or a role does not exist.
- `403` for a teacher sending a holiday, an `ALL` or `ROLE` audience, a whole class, a section
  they do not teach, or another person's event.
- `404` when the event is not in the caller's school.

### `DELETE /events/:id`

Removes the event and every repeat of it. `403` / `404` as above.

## Settings

### `GET /settings`

`{ config, isCustom, options }`. `config` is always complete (defaults filled in).

### `PUT /settings` (admin)

Body `{ "config": { … } }` with any of `defaultCalendar`, `defaultLanguage`, `defaultNumerals`,
`weekStartsOn`, `weeklyHolidayDays`, `blockAttendanceOnNonWorkingDays`. `400` with `errors` for
an unknown value, or when all seven weekdays are holidays. `timezone` cannot be changed.

### `DELETE /settings` (admin)

Back to the defaults.

The normalized settings are also in `user.school.calendar` in `POST /auth/login` and
`GET /auth/me`.

## `GET /working-day?date=&classId=&sectionId=`

```json
{ "date": "2026-11-14", "isWorkingDay": false, "type": "WEEKLY_HOLIDAY", "reason": "Saturday is a weekly holiday", "blocksAttendance": true, "weeklyHolidayDays": [6] }
```

`type` is `WEEKLY_HOLIDAY`, `HOLIDAY` or `null`. Without `classId` only school-wide holidays
count; with it, holidays for that class or section count too. `blocksAttendance` is false when
the school has switched the rule off.

## Holiday import (admin)

### `GET /holidays/sources`

`{ sources: [{ bsYear, source, sourceDocument, sourceUrl, count, undated, notes }], imports: [...] }`:
the built-in lists and the school's past imports.

### `POST /holidays/import/preview`

Changes nothing. Body, one of:

```json
{ "bsYear": 2083 }
```

```json
{ "bsYear": 2084, "source": "Municipality notice", "sourceDocument": "…", "rows": [{ "title": "Local fair", "bs": "2084-02-10", "bsEnd": "2084-02-11", "category": "LOCAL_HOLIDAY", "applicability": "Ward 4" }] }
```

Response:

```json
{
  "bsYear": 2083, "source": "…", "sourceDocument": "…",
  "undated": [{ "title": "Eid ul-Fitr", "note": "On the day of the festival" }],
  "rows": [{ "key": "moha-2083:dashain", "title": "…", "titleNe": "…", "category": "PUBLIC_HOLIDAY", "bsStart": "2083-06-31", "bsEnd": "2083-07-06", "startDate": "2026-10-17", "endDate": "2026-10-23", "weekday": 6, "applicability": null, "recommended": true, "error": null, "duplicate": null }],
  "summary": { "total": 34, "new": 34, "duplicates": 0, "invalid": 0 }
}
```

`error` says why a row cannot be used (not a real BS date, end before start, no name).
`duplicate` is `{ eventId, title, reason }` when the school already has it. `recommended` is
false where the notice limits the holiday to a group or region. `404` when no built-in list
exists for the year; `400` for a year outside the range or a pasted list with no source.

### `POST /holidays/import`

The same body as the preview plus `"keys": ["moha-2083:dashain", …]` and `"confirm": true`.
Creates only the chosen rows that are valid and not duplicates, as published, school-wide
holidays, and records the import.

```json
{ "importId": 4, "bsYear": 2083, "source": "…", "created": 21, "skipped": [{ "key": "…", "title": "…", "reason": "Already imported from this list" }] }
```

`400` without `confirm: true` or with no keys.

## Changes to other endpoints

| Endpoint | Change |
| --- | --- |
| `POST /attendance` | `400` "Attendance cannot be marked on this day. …" on a weekly holiday or a holiday for the class, unless the school switched the rule off |
| `POST /auth/login`, `GET /auth/me` | `school.calendar` added |
| Students, academic years, exams, assignments (writes) | date fields must be real calendar dates; they are stored as the day sent |

## Push

`notify: true` on a published event sends "School calendar: <title>" to the event's audience
(`services/push`, `notify.calendarEventPublished`), with `data: { type: "calendar", id }`.
