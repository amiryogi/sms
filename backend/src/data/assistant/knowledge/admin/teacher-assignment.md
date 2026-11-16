---
id: teacher-assignment
title: Assigning teachers to subjects and sections
roles: [ADMIN, SUPER_ADMIN]
modules: [academics, teachers]
routes: [/admin/teacher-assignment]
guides: []
status: published
aliases: [teacher assignment, assign teacher, class teacher, who teaches, subject teacher, शिक्षक तोक्ने, कक्षा शिक्षक, विषय शिक्षक, teacher assign]
verifiedAgainst: [frontend/src/pages/admin/TeacherAssignment.jsx, backend/src/controllers/teacherSubject.controller.js]
verifiedOn: 2026-11-15
---
# Assigning teachers

## Purpose
Say who teaches which subject to which section this year. Teachers see only the classes they
are assigned here (attendance, assignments, marks entry, My Students).

## Who can use it
Administrators.

## Where to find it
Left menu → **Academics** → **Teacher Assignment** (`/admin/teacher-assignment`).

## Before you start
The teacher's account exists (**Teachers & Staff**) and the class has its subjects for the year
(**Class Subjects**).

## Steps
1. Click **Assign teacher**.
2. Choose the **Academic year**, **Teacher**, **Class**, **Section** and **Subject**.
3. Tick **Class teacher for this section** if this teacher is the class teacher (shown on report
   cards).
4. Save.

## What you should see
"Teacher assigned", and the row in the list with a **Class teacher** badge where set.

## Common mistakes
- Assigning in last year: assignments from a past year grant nothing; use the current year.

## Troubleshooting
- A teacher says they see no classes: check their assignment is for the current academic year.
- **Edit assignment** / **Remove assignment** are on each row.

## Related pages
Teachers & Staff, Class Subjects, Academic Years.
