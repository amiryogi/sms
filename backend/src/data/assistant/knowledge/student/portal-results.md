---
id: portal-results
title: Exam results and report cards (students and parents)
roles: [STUDENT, PARENT]
modules: [results, report-cards]
routes: [/student/results, /student/report-card, /parent/results, /parent/report-card]
guides: [portal.results]
status: published
aliases: [result, results, exam result, marks, grade, GPA, report card, grade sheet, marksheet, print report card, academic progress, progress, नतिजा, परीक्षाफल, अंक, ग्रेड, रिपोर्ट कार्ड, मार्कसिट, प्रगति, natija, result herne]
verifiedAgainst: [frontend/src/pages/student/Results.jsx, frontend/src/pages/student/ReportCard.jsx, frontend/src/components/portal/ResultsView.jsx, frontend/src/components/portal/ReportCardView.jsx]
verifiedOn: 2026-11-15
---
# Results and report cards

## Purpose
See exam results and print the report card once the school publishes it.

## Who can use it
Students (their own) and parents (their linked children).

## Where to find it
- **Results** (`/student/results` or `/parent/results`): marks and grades from published report
  cards.
- **Report card** (`/student/report-card` or `/parent/report-card`): the printable card.

## Steps
1. Open **Results**. Parents: choose the child first.
2. Choose the **Exam**. You see **GPA**, **Percentage**, **Class rank**, **Subjects passed**, and
   each subject's marks and grade, with **Passed** or **Not passed**.
3. For the printable card open **Report card**, choose the **Exam**, and click
   **Print or save as PDF**.

## What you should see
Results of every exam whose report card the school has published. Progress across the year is
seen by comparing exams here.

## Common mistakes
- Expecting results right after the exam: they appear only when the school publishes the report
  cards.

## Troubleshooting
- **"No results yet" / "No report card yet"**: the school has not published it. Ask the school.
- A mark looks wrong: ask the subject teacher or the school office; you cannot change it.

## Related pages
Attendance, Dashboard (**Latest result**).
