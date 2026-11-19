---
id: report-cards
title: Generating, publishing and printing report cards
roles: [ADMIN, SUPER_ADMIN]
modules: [report-cards, results]
routes: [/admin/report-cards]
guides: [admin.reportCards]
status: published
aliases: [report card, grade sheet, marksheet, result, publish result, print report card, bulk print, print all, generate report card, working days, unpublish, रिपोर्ट कार्ड, ग्रेड सिट, मार्कसिट, नतिजा, नतिजा प्रकाशन, प्रिन्ट, result publish garne]
verifiedAgainst: [frontend/src/pages/admin/ReportCards.jsx, frontend/src/components/admin/WorkingDaysEditor.jsx, backend/src/controllers/reportCard.controller.js, frontend/src/components/common/BulkReportCardPrint.jsx]
verifiedOn: 2026-11-15
---
# Report cards

## Purpose
Turn the entered marks into grade sheets, check them, publish them to students and parents, and
print them.

## Who can use it
Administrators.

## Where to find it
Left menu → **Exams & results** → **Report cards** (`/admin/report-cards`).

## Before you start
- Marks are entered, and the exam is **Locked** (recommended) or at least **Published**. Only
  published or locked exams are listed.
- For the attendance line ("Attendance 61/70"), set the exam's working days on this page.

## Steps
1. Choose the **Exam**, **Class** and **Section**.
2. Optionally set the working days for the exam (the "70" in "Attendance 61/70").
3. Click **Generate report cards** and confirm. Grades come from the school's grade scale.
4. Check them: the summary shows **Students**, **Generated**, **Published**, **Passed**,
   **Failed**. Use **View** on a student to preview and print one card.
5. Click **Publish All** and confirm. Students and parents can now see them.
6. To print the whole section, click **Print all** (one A4 sheet per student), then use the
   browser's print dialog.

## What you should see
Each student's row shows **Published**. Students and parents see the card on **Report card** and
**Results**, and app users get a notification.

## Common mistakes
- Generating before all marks are in: generate again (**Regenerate report cards**) after fixing.
- Expecting students to see unpublished cards: they see nothing until you publish.

## Troubleshooting
- **Unpublish all** hides them again ("Students and parents will no longer see them.").
- **"No students in this section":** enrol students on **Students** first.
- The exam is missing from the list: it is still a draft; publish it on **Exams**.
- The look of the card (marks or grades, columns, attendance, rank, remarks, fonts, logo) is set
  in **School settings → Report card**. The grade scale is in **School settings → Grading**.

## Related pages
Exams, Marks entry, School settings.
