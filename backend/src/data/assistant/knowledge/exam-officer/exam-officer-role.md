---
id: exam-officer-role
title: What an exam officer can do
roles: [EXAM_OFFICER]
modules: [examinations, marks, students]
routes: [/teacher/marks, /staff/students, /teacher/notices]
guides: [marks.entry]
status: published
aliases: [exam officer, create exam, publish result, report card, print report card, bulk print, verify marks, student directory, परीक्षा अधिकृत, परीक्षा बनाउने, नतिजा प्रकाशन, रिपोर्ट कार्ड]
verifiedAgainst: [frontend/src/layouts/navigation.js, frontend/src/App.jsx, frontend/src/pages/teacher/MarksEntry.jsx, frontend/src/pages/admin/Teachers.jsx]
verifiedOn: 2026-11-15
---
# What an exam officer can do

## Purpose
Explain the exam officer's role in this system and which exam tasks belong to the administrator.

## Who can use it
Exam officers.

## Where to find it
Left menu → **Exams**: **Marks Entry**, **Students** (view only) and **Notices**, plus the
Calendar pages (**Exam Schedule** shows exam dates).

## What you can do
1. **Enter and correct marks for any subject** in a published exam, without a teaching
   assignment: **Marks Entry** → choose **Exam**, **Class**, **Section**, **Subject** → type
   **Theory** / **Practical** marks or mark **Absent** → **Save Marks**.
2. **Check marks** by opening the same exam, class, section and subject on **Marks Entry**; the
   saved marks load into the table.
3. **Look up students** on **Students** (`/staff/students`): search by name, username or
   admission number. It is read-only.
4. **Read notices** and see the **Exam Schedule**.

## What needs an administrator
These are administrator tasks; an exam officer cannot do them in this system:
- Creating an exam, choosing its classes and subjects, editing it.
- Publishing, locking or unlocking an exam.
- Generating, publishing or unpublishing report cards, and printing them (individually or with
  **Print All**).
- Changing full marks or pass marks (**Class Subjects**) or the grade scale.
Ask the school administrator for these.

## Common mistakes
- Looking for **Exams** or **Report Cards** in the menu: they are in the administrator's menu only.

## Troubleshooting
- **"No published exams"** on Marks Entry: the administrator has not published the exam.
- **Marks are read-only:** the exam is locked; the administrator can unlock it.
- **No access to fees:** exam officers have no finance pages, by design.

## Related pages
Marks Entry (`/teacher/marks`), Students (`/staff/students`), Exam Schedule (`/calendar/exams`).
