---
id: examination-lifecycle
title: Creating an exam and moving it through Draft, Published and Locked
roles: [ADMIN, SUPER_ADMIN]
modules: [examinations]
routes: [/admin/exams, /admin/exam-admin/*]
guides: [admin.exam]
status: published
aliases: [exam, create exam, new exam, terminal exam, midterm, final, unit test, publish exam, lock exam, unlock exam, exam subjects, exam status, परीक्षा, परीक्षा बनाउने, त्रैमासिक, अर्धवार्षिक, वार्षिक, प्रकाशन, लक, pariksha]
verifiedAgainst: [frontend/src/pages/admin/Exams.jsx, backend/src/controllers/exam.controller.js, frontend/src/examAdmin]
verifiedOn: 2026-11-15
---
# Creating and running an exam

## Purpose
Set up an exam for chosen classes, open it for marks entry, then freeze the marks before report
cards are generated.

## Who can use it
Administrators. (Exam officers and teachers only enter marks.)

## Where to find it
Left menu → **Exams & results** → **Exams** (`/admin/exams`). **Exam admin (pilot)**
(`/admin/exam-admin`) is a read-only trial view of the same exams with the lifecycle buttons.

## Before you start
Each class sitting the exam needs its subjects and full marks on **Class subjects** for the year.

## The three statuses
| Status | Meaning |
|---|---|
| **Draft** | Being set up. Teachers can't see it yet. Subjects can be added or removed; the exam can be edited or deleted. |
| **Published** | Teachers are entering marks. Subjects can no longer be added or removed. |
| **Locked** | Marks are frozen; report cards can be generated. |

## Steps
1. Click **Create exam**.
2. Type the **Exam name**, choose the **Type** (**Unit test**, **Midterm**, **Final** or
   **Board**), the **Academic year**, and the **Starts** and **Ends** dates.
3. Tick the **Classes sitting this exam** (**Select all** ticks every class), then
   **Create exam**. Each class's subjects are added
   with their theory and practical marks ("Exam created with the selected classes' subjects").
4. Check the subjects with **View subjects**. While it is a draft you can **Add a class** or
   **Remove** a subject.
5. Click **Publish** and confirm. Teachers can now enter marks on **Marks entry**.
6. When marks entry is complete, click **Lock** and confirm. Marks are frozen for every subject.
7. Generate report cards on **Report cards**.
8. If marks need fixing after locking, click **Unlock** (back to Published), fix them, lock again
   and regenerate the report cards.

## What you should see
The exam's status badge changes, and the exam appears on **Calendar → Exam schedule** on its dates.

## Common mistakes
- Trying to edit an exam or its subjects after publishing: "Cannot edit exam after publishing.
  Exam must be in DRAFT status."
- Publishing an exam with no subjects: "Cannot publish exam without any subjects."
- Expecting a change on **Class subjects** to change an existing exam: the exam keeps the full
  marks it copied when it was created.

## Troubleshooting
- **Delete** is allowed only for draft exams without marks: "Cannot delete exam - marks have
  already been entered. Lock the exam instead."
- A subject shows **Not configured**: set its marks on **Class subjects** before creating the exam.
- Unlocking does not change generated report cards until you regenerate them.

## Related pages
Marks entry (`/teacher/marks`), Report cards (`/admin/report-cards`), Exam schedule
(`/calendar/exams`).
