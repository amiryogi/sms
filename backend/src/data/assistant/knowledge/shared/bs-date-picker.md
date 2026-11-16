---
id: bs-date-picker
title: Choosing dates and how dates are shown (B.S. and A.D.)
roles: [SUPER_ADMIN, ADMIN, TEACHER, EXAM_OFFICER, ACCOUNTANT, STUDENT, PARENT]
modules: [dates]
routes: []
guides: []
status: published
aliases: [date, date picker, BS, AD, bikram sambat, nepali date, english date, मिति, वि.सं., ई.सं., गते, नेपाली मिति, miti]
verifiedAgainst: [frontend/src/components/ui/NepaliDatePicker.jsx, frontend/src/layouts/DashboardLayout.jsx, frontend/src/lib/calendar/datePrefs.js, docs/calendar/calendar-administration-guide.md]
verifiedOn: 2026-11-15
---
# Choosing dates and how dates are shown

## Purpose
Dates are shown in Bikram Sambat (B.S.) by default, for example `1 Baisakh 2083`. Every date
field opens a calendar where you can pick a B.S. or A.D. day.

## Who can use it
Everyone.

## Where to find it
- Any date field: Attendance **Date**, exam **Starts** and **Ends**, payment **Date received**
  and so on.
- Your name (top right) → **Show dates in**: B.S. only, A.D. only, or B.S. with A.D.; and
  **मिति नेपालीमा** / **Dates in English** for month names.

## Steps
1. Click the date field. A calendar opens.
2. Click a day, or type the date at the bottom as year-month-day (`2083-01-15`; Nepali digits
   work) and press Enter.
3. Inside the calendar you can switch **Calendar** (B.S. or A.D.), **Language** and **Numerals**.
   The small number in each day is the same day in the other calendar.
4. **Clear date** empties an optional field.

## What you should see
The field shows the date in your chosen style.

## Common mistakes
- Typing an A.D. date while the picker is in B.S. mode. The hint says "Type B.S. date" or
  "Type A.D. date".
- Trying to pick a weekly holiday for attendance: those days cannot be chosen there.

## Troubleshooting
- **"That date cannot be chosen here":** the field limits the range, for example no future
  payment date.
- The supported range is 1975–2100 B.S. (1918–2044 A.D.).
- Your date choice is remembered on that browser only.

## Related pages
School calendar (`/calendar`), Calendar Settings for administrators (`/calendar/settings`).
