---
id: teacher-my-students
title: My Students and the teacher dashboard
roles: [TEACHER]
modules: [students, dashboard]
routes: [/teacher/students, /teacher/dashboard]
guides: []
status: published
aliases: [my students, class list, roster, my classes, dashboard, student list, विद्यार्थी सूची, मेरो कक्षा, mero bidyarthi]
verifiedAgainst: [frontend/src/pages/teacher/MyStudents.jsx, frontend/src/pages/teacher/Dashboard.jsx]
verifiedOn: 2026-11-15
---
# My Students and the teacher dashboard

## Purpose
See the classes you teach and the students in them.

## Who can use it
Teachers.

## Where to find it
- **Dashboard** (`/teacher/dashboard`): your classes, subjects, teaching slots, exams open for
  marks, notices, and **Quick actions** to take the register or enter marks.
- **My Students** (`/teacher/students`): roll number, name, admission number and class of each
  student in the classes you teach this year, with a link to take attendance.

## Steps
1. Open **My Students**.
2. Filter by class or section, or search by name.

## What you should see
Only students of sections you are assigned to this year. A **Class teacher** badge marks the
section you are class teacher of.

## Common mistakes
- Expecting a per-student progress or marks history: the system has no progress view for teachers.

## Troubleshooting
- **"No classes yet" / "You don't have any class assignments for the current academic year":**
  ask the administrator to assign you on **Teacher Assignment**.

## Related pages
Attendance (`/teacher/attendance`), Marks Entry (`/teacher/marks`).
