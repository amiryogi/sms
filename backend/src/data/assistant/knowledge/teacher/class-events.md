---
id: calendar-events
title: Adding calendar events
roles: [TEACHER, ADMIN, SUPER_ADMIN]
modules: [calendar]
routes: [/calendar/events]
guides: [calendar.event]
status: published
aliases: [event, add event, class event, parent teacher meeting, sports day, programme, meeting, कार्यक्रम, घटना, बैठक, अभिभावक भेला, event thapne]
verifiedAgainst: [frontend/src/components/calendar/EventManager.jsx, frontend/src/components/calendar/EventDialog.jsx, docs/calendar/calendar-administration-guide.md]
verifiedOn: 2026-11-15
---
# Adding calendar events

## Purpose
Put a school event (parent-teacher meeting, sports event, admission deadline, staff meeting…)
on the calendar for the people it concerns.

## Who can use it
- **Administrators:** any event, for everyone, certain roles or certain classes.
- **Teachers:** events for the class sections they teach; they can change only what they added.

## Where to find it
Left menu → **Calendar** → **Events** (administrators) or **My class events** (teachers)
(`/calendar/events`). **Add event** is also on the calendar itself.

## Steps
1. Click **Add event**.
2. Choose a category, the title, the start and end dates, and optionally a time.
3. Choose **Who is it for?**: everyone in the school, certain roles, or certain classes.
   Teachers can choose only their own classes.
4. **Shown to people:** *Draft* keeps it visible to administrators only until you publish it.
5. Optionally tick **Send a notification to their phones** (mobile app users).
6. Save.

## What you should see
The event on the calendar for its audience. Choosing certain classes shows it to those students,
their parents and the teachers who teach them.

## Common mistakes
- Teachers trying to add a holiday or a school-wide event: only administrators can.
- Leaving an event as *Draft* and expecting people to see it.

## Troubleshooting
- Can't edit an event: teachers can change only events they created.

## Related pages
Calendar (`/calendar`), Holidays (administrators, `/calendar/holidays`).
