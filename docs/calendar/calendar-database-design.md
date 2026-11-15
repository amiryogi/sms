# Calendar database design

Migration `20261115100000_school_calendar`, one file per provider
(`backend/prisma/mysql/migrations/`, `backend/prisma/postgresql/migrations/`). It adds three
tables and one nullable column. No existing row is changed.

Models are defined once in `backend/prisma/schema/models.prisma`; `database/schema.sql` mirrors
the structure.

## What is stored, and what is not

The calendar stores only what belongs to it: school events, holidays, who they are for, and a
record of each holiday import.

It does **not** store exams, assignment due dates, fee due dates, notices or the academic year.
Those are read from their own tables every time the calendar is shown
(`services/calendar/feed.js`), so there is never a second copy to keep in step.

| Shown on the calendar | Read from |
| --- | --- |
| Events and holidays | `calendar_events` |
| Exams | `exams.start_date / end_date`, `exam_subjects.exam_date` |
| Assignment deadlines | `assignments.due_date` |
| Fee deadlines | `fee_structure_installments.due_date` (fee staff), `fee_installments.due_date` (own) |
| Notices | `notices.publish_from`, else `published_at` |
| Academic year start and end | `academic_years` |

## `schools.calendar_config`

`JSON` (MySQL) / `JSONB` (PostgreSQL), nullable. `NULL` means the defaults. Read and written only
through `utils/calendar/calendarConfig.js` (`normalizeConfig` never throws; `validateConfig`
names bad fields), the same pattern as `report_card_config`.

| Key | Default | Meaning |
| --- | --- | --- |
| `defaultCalendar` | `"bs"` | `bs`, `ad` or `both` |
| `defaultLanguage` | `"en"` | month and weekday names: `en` or `ne` |
| `defaultNumerals` | `"en"` | `en` (0-9) or `ne` (०-९) |
| `weekStartsOn` | `0` | 0 = Sunday |
| `weeklyHolidayDays` | `[6]` | weekdays the school is closed; any set of fewer than 7 |
| `blockAttendanceOnNonWorkingDays` | `true` | refuse the register on a non-working day |
| `timezone` | `"Asia/Kathmandu"` | fixed; not changeable |

A separate settings table was not added: one row per school with seven values is what the
existing JSON-column pattern is for.

## `calendar_events`

One row per event or holiday. Holidays are events whose category is one of the three holiday
categories; keeping them in one table means date ranges, audiences, visibility and repeats are
implemented once.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int, PK | |
| `school_id` | int, FK → `schools`, cascade | always from the signed-in user |
| `academic_year_id` | int, null, FK → `academic_years`, set null | the year the first day falls in |
| `title` | varchar(255) | |
| `description` | text, null | |
| `category` | varchar(40) | see below |
| `start_date`, `end_date` | date | AD; equal for a one-day event |
| `is_all_day` | boolean, default true | |
| `start_time`, `end_time` | varchar(5), null | `"HH:mm"`, Nepal time |
| `recurrence` | varchar(20), default `NONE` | `NONE`, `WEEKLY`, `MONTHLY_BS`, `YEARLY_BS`, `YEARLY_AD` |
| `recurrence_until` | date, null | last day a repeat may start |
| `audience_type` | varchar(10), default `ALL` | `ALL`, `ROLE`, `CLASS` |
| `status` | varchar(10), default `PUBLISHED` | `DRAFT` or `PUBLISHED` |
| `is_active` | boolean, default true | off = kept on record, not observed |
| `source` | varchar(255), null | who published a holiday |
| `source_document` | varchar(500), null | title or link of the notice |
| `source_published_date` | varchar(20), null | the date as published, normally BS |
| `applicability` | varchar(500), null | who the notice says it applies to |
| `source_key` | varchar(100), null | the list row it came from (`moha-2083:dashain`) |
| `import_id` | int, null, FK → `calendar_imports`, set null | |
| `created_by_id` | int, FK → `users`, restrict | |
| `updated_by_id` | int, null, FK → `users`, set null | |
| `created_at`, `updated_at` | timestamp | |

Indexes: `(school_id, start_date, end_date)` for range reads, `(school_id, category)`,
`(school_id, source_key)` for duplicate checks, and one per foreign key.

**Categories** (`utils/calendar/calendarRules.js`): `PUBLIC_HOLIDAY`, `LOCAL_HOLIDAY`,
`SCHOOL_HOLIDAY` (these three close the school), `EXAMINATION`, `PARENT_TEACHER_MEETING`,
`SCHOOL_EVENT`, `SPORTS_EVENT`, `ADMISSION_DEADLINE`, `FEE_DEADLINE`, `ASSIGNMENT_DEADLINE`,
`ACADEMIC_ACTIVITY`, `STAFF_MEETING`, `OTHER`.

## `calendar_event_audiences`

Who a `ROLE` or `CLASS` event is for. An `ALL` event has no rows.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int, PK | |
| `event_id` | int, FK → `calendar_events`, cascade | |
| `role_id` | int, null, FK → `roles`, cascade | for `ROLE` events |
| `class_id` | int, null, FK → `classes`, cascade | for `CLASS` events |
| `section_id` | int, null, FK → `sections`, cascade | null = the whole class |

No academic year on the row: class membership is always resolved against the **current**
academic year when the calendar is read, as for teacher scope elsewhere in the system.

## `calendar_imports`

One row per confirmed holiday import.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int, PK | |
| `school_id` | int, FK → `schools`, cascade | |
| `calendar_year` | int | BS year of the list |
| `source`, `source_document` | varchar | |
| `status` | varchar(20), default `COMPLETED` | |
| `created_count`, `skipped_count` | int | |
| `imported_by_id` | int, FK → `users`, restrict | |
| `imported_at` | timestamp | |

## Choices that keep both databases working

| Choice | Why |
| --- | --- |
| Category, recurrence, audience type and status are `varchar`, checked in code | no `CREATE TYPE` on PostgreSQL, and a new category needs no migration (the existing `device_tokens.platform` does the same) |
| Times of day are `varchar(5)` | `TIME` columns come back differently from the two drivers |
| Dates are `DATE` | a calendar day, returned as UTC midnight by both |
| Duplicate holidays are found in the service, not by a unique index | the rule is "same list row, or same day and same name ignoring case", which an index cannot express on both engines |
| No raw SQL | Prisma only; text comparison through `dialect.text.equals` / `search` |
| Every list has an explicit `orderBy` | PostgreSQL has no default order |

## Rules enforced in code

- Every query carries `schoolId` from `req.user`.
- An event's classes and sections must belong to the school; roles must exist.
- `end_date >= start_date`, at most 366 days, inside the supported calendar range.
- A holiday import never updates or deletes an existing row, and checks for a clash again inside
  the transaction that creates the rows.
- Deleting a school, class, section or role cascades to its events' audience rows; deleting a
  user who created events is restricted.

## Applying

```bash
cd backend
npm run db:migrate:deploy                                    # DATABASE_PROVIDER's database
node scripts/with-test-db.js npm run db:migrate:deploy       # MySQL test database
node scripts/with-test-db.js --provider pg npm run db:migrate:deploy
```

`npm run seed` adds six demo events when the school has none (`prisma/seeds/demoCalendar.js`).
It adds no holidays: a seeded holiday would close the register on that day.
