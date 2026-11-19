---
id: school-calendar
title: Viewing the school calendar, exam schedule and academic calendar
roles: [SUPER_ADMIN, ADMIN, TEACHER, EXAM_OFFICER, ACCOUNTANT, STUDENT, PARENT]
modules: [calendar]
routes: [/calendar, /calendar/exams, /calendar/academic]
guides: []
status: published
aliases: [calendar, holiday list, exam schedule, exam routine, academic calendar, events, print calendar, पात्रो, क्यालेन्डर, बिदा, छुट्टी, परीक्षा तालिका, कार्यक्रम, bida, patro]
verifiedAgainst: [frontend/src/pages/calendar/Overview.jsx, frontend/src/pages/calendar/ExamSchedule.jsx, frontend/src/pages/calendar/AcademicCalendar.jsx, docs/calendar/calendar-administration-guide.md]
verifiedOn: 2026-11-15
---
# Viewing the school calendar

## Purpose
One place for holidays, exams, school events and deadlines, in B.S. with A.D. alongside.

## Who can use it
Everyone. Each person sees what is meant for them: events for everyone, for their role, and for
their class (parents: their children's classes; teachers: classes they teach).

## Where to find it
Left menu → **Calendar** section:
- **Calendar** (`/calendar`): today in both calendars, upcoming holidays, exams and events, and a
  month, week or list view.
- **Exam schedule** (`/calendar/exams`): exam dates for the year.
- **Academic calendar** (`/calendar/academic`): the whole B.S. year on one page, holidays in red.

## Steps
1. Open **Calendar**.
2. Use the arrows or **Today** to move between months; switch month, week or list view.
3. Use the **B.S. / A.D.** switch to see the same month in the other calendar.
4. Click a day to see what is on and both of its dates. Clicking an exam, assignment or notice
   opens its own page when your role can open it.
5. To print, use the print button on the page (**Print month**, **Print year**, **Print**).

## What you should see
Holidays and weekly holidays in red; exams, events and deadlines on their days.

## Common mistakes
- Expecting a class timetable or routine here: the system has no timetable.
- Expecting to add events as a student, parent, exam officer or accountant: only administrators
  and teachers add events.

## Troubleshooting
- An exam is missing: the exam needs start and end dates on the Exams page (administrator).
- A holiday is missing: an administrator adds or imports holidays.

## Related pages
Events (`/calendar/events`, administrators and teachers), Holidays and Calendar settings
(administrators).
