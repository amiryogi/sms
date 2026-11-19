---
id: academic-years
title: Creating an academic year and making it current
roles: [ADMIN, SUPER_ADMIN]
modules: [academics]
routes: [/admin/academic-years]
guides: [admin.academicYear]
status: published
aliases: [academic year, new year, session, current year, start new session, शैक्षिक वर्ष, शैक्षिक सत्र, नयाँ वर्ष, chalu barsa, naya sal]
verifiedAgainst: [frontend/src/pages/admin/AcademicYears.jsx, backend/src/controllers/academicYear.controller.js]
verifiedOn: 2026-11-15
---
# Creating an academic year

## Purpose
The current academic year scopes classes, enrolments, exams, teacher assignments and fees across
the system. Only one year is current at a time.

## Who can use it
Administrators.

## Where to find it
Left menu → **Academics** → **Academic years** (`/admin/academic-years`).

## Steps
1. Click **Add academic year**.
2. Type the **Year name**, for example `2083`.
3. Pick the **Start date** and **End date** (B.S. date picker).
4. Tick **Make this the current academic year** if the school is moving to it now.
5. Save.

## What you should see
The year in the list, marked **Current** or **Past / upcoming**.

## Common mistakes
- Making a new year current before finishing the old one: teachers then see only the new year's
  assignments, and new enrolments, exams and fees use it.
- Forgetting that teacher assignments, class subjects, enrolments, fee structures and exams are per
  year: set them up again for the new year (promotions move the students).

## Troubleshooting
- Teachers see "No classes yet" after a new year is made current: assign them again on
  **Teacher assignment** for the new year.

## Order of setup for a new year
1. **Academic years**: add the year and make it current.
2. **Class subjects**: subjects, full marks and credit hours per class for the year.
3. **Teacher assignment**: who teaches what in each section.
4. **Promotions**: move students from last year's classes.
5. **Fee structures** and **Student accounts → Generate fees**.

## Related pages
Classes, Sections, Class subjects, Teacher assignment, Promotions.
