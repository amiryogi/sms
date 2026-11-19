---
id: portal-dashboard
title: Student and parent dashboard and profile
roles: [STUDENT, PARENT]
modules: [dashboard, profile]
routes: [/student/dashboard, /student/profile, /parent/dashboard, /parent/profile]
guides: []
status: published
aliases: [dashboard, home, overview, profile, my details, child details, class teacher, admission number, ड्यासबोर्ड, प्रोफाइल, मेरो विवरण, बच्चाको विवरण]
verifiedAgainst: [frontend/src/pages/student/Dashboard.jsx, frontend/src/pages/parent/Dashboard.jsx, frontend/src/components/portal/OverviewCards.jsx, frontend/src/components/portal/ProfileView.jsx]
verifiedOn: 2026-11-15
---
# Dashboard and profile

## Purpose
A summary of school life on one page, and the personal details the school holds.

## Who can use it
Students (their own) and parents (their linked children).

## Where to find it
- **Dashboard**: students `/student/dashboard`, parents `/parent/dashboard`.
- **My profile** (`/student/profile`) or **Child's profile** (`/parent/profile`).

## What the dashboard shows
Cards for **Attendance**, **Assignments** (**To do** / **Submitted**), **Fees**, **Latest result**,
plus **Assignments due**, **Upcoming exams**, **Subjects** and school notices.

## What the profile shows
**Personal details** (date of birth, gender, blood group), **Contact** (phone, email, address,
emergency contact) and **School record** (admission number, admitted on, class this year, class
teacher).

## Common mistakes
- Trying to edit the profile: it is read-only. Ask the school office to correct details.

## Troubleshooting
- **"No student profile"**: the account is not linked to a student record; ask the school office.
- Parents: use the child switcher at the top to see another child.

## Related pages
Attendance, Results, Fees.
