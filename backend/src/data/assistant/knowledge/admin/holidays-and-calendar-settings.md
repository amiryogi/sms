---
id: holiday-management
title: Holidays, weekly holidays and calendar settings
roles: [ADMIN, SUPER_ADMIN]
modules: [calendar, holidays]
routes: [/calendar/holidays, /calendar/settings]
guides: [calendar.holidays]
status: published
aliases: [holiday, holidays, import holidays, public holiday, government holiday, weekly holiday, saturday, vacation, calendar settings, school closed, बिदा, सार्वजनिक बिदा, साप्ताहिक बिदा, छुट्टी, बिदाको सूची, bida]
verifiedAgainst: [frontend/src/pages/calendar/Holidays.jsx, frontend/src/pages/calendar/Settings.jsx, frontend/src/components/calendar/HolidayImportDialog.jsx, docs/calendar/calendar-administration-guide.md]
verifiedOn: 2026-11-15
---
# Holidays and calendar settings

## Purpose
Set which weekdays the school is closed, import the government's public holidays, and add the
school's own holidays. Holidays show in red and block attendance on those days.

## Who can use it
Administrators.

## Where to find it
Left menu → **Calendar** → **Holidays** (`/calendar/holidays`) and **Calendar settings**
(`/calendar/settings`).

## Steps
**1. Weekly holidays** (Calendar settings)
1. Under **Weekly holidays**, click the days the school is closed (Saturday by default).
2. Leave **No attendance on holidays** on unless classes are sometimes held on holidays.
3. Under **How dates are shown**, choose the school's default **Calendar**, **Month and weekday
   names** and **Numerals**, and **Week starts on**.
4. Click **Save settings**.

**2. Import public holidays** (Holidays → **Import holidays**)
1. Choose the **B.S. year** (2083 is built in, from the Nepal Gazette notice).
2. Click **Preview**. Nothing is saved yet.
3. Tick the holidays the school observes. Nationwide ones are ticked; holidays limited to one
   community or region are listed but not ticked.
4. Click **Add … holidays to the calendar**.
5. For another year or a local list, use **Paste a list**: one holiday per line as
   `B.S. date, name, who it applies to`.

**3. The school's own holidays** (Holidays → **Add holiday**)
- Choose the category, **Starts** / **Ends**, **Who is it for?** (everyone or certain classes),
  **Repeats** (every year on the same B.S. date), and whether **The school observes this holiday**.

## What you should see
Holidays in red on every calendar page. Teachers cannot save attendance on them.

## Common mistakes
- Expecting the import to overwrite edited holidays: importing twice is safe; edited holidays
  are left as they are.
- Holidays without a date in the notice (Eid and others) must be added by hand when announced.

## Troubleshooting
- A class is held on a holiday: switch off **No attendance on holidays**, or edit the holiday and
  switch off **The school observes this holiday**.
- **Reset to defaults** in Calendar settings returns to B.S., Saturday off.

## Related pages
Calendar, Events, Attendance.
