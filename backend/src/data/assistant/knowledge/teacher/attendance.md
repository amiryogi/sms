---
id: teacher-attendance
title: Taking the daily attendance register
roles: [TEACHER]
modules: [attendance]
routes: [/teacher/attendance]
guides: [teacher.attendance]
status: published
aliases: [attendance, register, roll call, mark attendance, take attendance, present, absent, late, excused, हाजिरी, हाजिर, अनुपस्थित, उपस्थित, ढिलो, बिदा, hajiri, hajir]
verifiedAgainst: [frontend/src/pages/teacher/Attendance.jsx, backend/src/controllers/attendance.controller.js, docs/calendar/calendar-administration-guide.md]
verifiedOn: 2026-11-15
---
# Taking the daily attendance register

## Purpose
Record who was present, absent, late or excused in a class section on a day.

## Who can use it
Teachers, for the class sections they are assigned to this academic year. (Administrators,
exam officers and accountants have no attendance page in the web app.)

## Where to find it
Left menu → **Teaching** → **Attendance** (`/teacher/attendance`). The teacher **Dashboard**
also has a quick link.

## Before you start
The administrator must have assigned you to the class section on **Teacher Assignment**, and
students must be enrolled in it.

## Steps
1. Open **Attendance**.
2. Under **Class and section**, choose one of your classes.
3. Under **Date**, pick the day (today is chosen for you; the hint says "Today").
4. Mark each student: **Present (P)**, **Absent (A)**, **Late (L)** or **Excused (E)**. Use
   **All present** to mark everyone present, then change the few who are not.
5. Optionally type a **Reason** for a student.
6. Click **Save Attendance**.

## What you should see
A confirmation, and the day shows as **Taken**. Parents with the mobile app get a notification
when their child is newly marked absent for today.

## Common mistakes
- Choosing a weekly holiday or a school holiday: the register cannot be saved on those days
  (unless the administrator switched that rule off in **Calendar Settings**). The page says which
  holiday it is.
- Forgetting to click **Save Attendance** before leaving the page.

## Troubleshooting
- **"Choose a class" with nothing to choose:** you have no assignment for the current academic
  year; ask the administrator.
- **"No students":** nobody is enrolled in that section this year.
- **Correcting a day:** open the same class and date again, change the marks and save. Saving
  again updates the register.

## Related pages
My Students (`/teacher/students`), Calendar (`/calendar`).
