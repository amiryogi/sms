---
id: not-available
title: Features this system does not have
roles: [SUPER_ADMIN, ADMIN, TEACHER, EXAM_OFFICER, ACCOUNTANT, STUDENT, PARENT]
modules: [general]
routes: []
guides: []
status: published
aliases: [timetable, routine, class routine, CAS, continuous assessment, formative assessment, library, transport, bus, hostel, payroll, salary, certificate, transfer certificate, character certificate, SMS, email notification, grade 11, grade 12, plus two, +2, school registration, new school, audit log, progress report, student progress, तालिका, रुटिन, पुस्तकालय, यातायात, छात्रावास, तलब, प्रमाणपत्र, निरन्तर मूल्याङ्कन]
verifiedAgainst: [CLAUDE.md, frontend/src/pages/public/content.js, docs/calendar/calendar-implementation-audit.md, frontend/src/App.jsx]
verifiedOn: 2026-11-15
---
# Features this system does not have

## Purpose
So nobody looks for something that is not there. When a user asks about one of these, say
plainly that the system does not have it, and suggest what does exist where that helps.

## Not built
| Asked about | Answer |
|---|---|
| Timetable / class routine | Not available. Exam dates are on **Calendar → Exam schedule**. |
| CAS (continuous assessment) or formative assessment | Not available. Exams take theory and practical marks on **Marks entry**. |
| A teacher view of each student's progress | Not available. Teachers see their class list on **My students** and enter marks on **Marks entry**; results reach students and parents through published report cards. |
| An attendance report page for administrators | Not available in the web app. Teachers take the register; students and parents see it on **Attendance**; report cards show days present. |
| Registering a new school or managing several schools | Not available. The system runs one school. |
| Library, transport, hostel, payroll | Not available. |
| Certificates, transfer certificates | Not available. |
| SMS or email notifications | Not available. The mobile app can send push notifications. |
| Forgot-password email | Not available. An administrator resets passwords. |
| Grade 11–12 (+2) | Not supported. The system covers Kindergarten to Grade 10. |
| Audit-log screen | Not available. |

## Who can use it
Everyone.

## What to say
"This system doesn't have <feature>." Then point to the nearest existing page from the table, or
suggest asking the school administrator.
