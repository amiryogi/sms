---
id: marks-entry
title: Entering exam marks
roles: [TEACHER, EXAM_OFFICER, ADMIN, SUPER_ADMIN]
modules: [marks, examinations]
routes: [/teacher/marks]
guides: [marks.entry]
status: published
aliases: [marks, marks entry, enter marks, exam marks, theory, practical, absent in exam, result entry, अंक, अङ्क, नम्बर, प्राप्ताङ्क, परीक्षा, सैद्धान्तिक, प्रयोगात्मक, marks halne, number halne]
verifiedAgainst: [frontend/src/pages/teacher/MarksEntry.jsx, backend/src/controllers/examResult.controller.js, backend/src/controllers/exam.controller.js]
verifiedOn: 2026-11-15
---
# Entering exam marks

## Purpose
Enter each student's theory and practical marks for a subject in an exam.

## Who can use it
- **Teachers:** only the subjects and sections they teach this academic year.
- **Exam officers and administrators:** any subject in a published exam.

## Where to find it
Left menu → **Marks entry** (`/teacher/marks`).

## Before you start
The exam must be **Published** by the administrator. Draft exams are not shown, and locked exams
can no longer be changed.

## Steps
1. Open **Marks entry**.
2. Choose the **Exam** (only published exams are listed).
3. Teachers choose **Class, section and subject**. Exam officers and administrators choose
   **Class**, **Section** and **Subject**.
4. Type each student's **Theory** marks, and **Practical** marks if the subject has a practical
   part. Press Enter or the arrow keys to move between rows.
5. Mark a student **Absent** if they missed the exam. Add optional remarks.
6. Click **Save marks**. **Discard** throws away unsaved changes.

## What you should see
The marks are saved. Grades are worked out by the system from the school's grade scale when
report cards are generated.

## Common mistakes
- Typing more than the full marks, or a negative number: the field shows "Not a number" or
  "Below 0", and the server refuses marks above the full marks.
- Leaving the page without **Save marks**.

## Troubleshooting
- **"No published exams":** the administrator has not published an exam yet.
- **"None of your subjects are in this exam":** the exam does not include your class subjects, or
  you are not assigned to them.
- **Marks are read-only:** the exam is **Locked**. Ask the administrator to **Unlock** it.
- **"You do not have permission to enter marks":** your role cannot enter marks.

## Related pages
Exams (administrators, `/admin/exams`), Report cards (administrators, `/admin/report-cards`).
