---
id: teacher-assignments
title: Setting assignments and grading submissions
roles: [TEACHER]
modules: [assignments]
routes: [/teacher/assignments]
guides: [teacher.assignment]
status: published
aliases: [assignment, homework, publish assignment, create assignment, submissions, grade, feedback, गृहकार्य, असाइनमेन्ट, कार्य, ग्रेड, अंक दिने, homework dine]
verifiedAgainst: [frontend/src/pages/teacher/Assignments.jsx, backend/src/routes/assignment.routes.js]
verifiedOn: 2026-11-15
---
# Setting assignments and grading submissions

## Purpose
Give work to a class, collect what students hand in, and grade it.

## Who can use it
Teachers, for the classes and subjects they are assigned to.

## Where to find it
Left menu → **Teaching** → **Assignments** (`/teacher/assignments`).

## Before you start
You need a teaching assignment from the administrator for the current academic year.

## Steps
1. Open **Assignments** and click **Create Assignment**.
2. Choose the **Class and subject**.
3. Fill in **Title**, **Instructions**, **Due date** and **Total marks**.
4. Optionally add attachments: PDF, Word, PowerPoint or images, up to 5 files.
5. Click **Create Assignment**. It is published straight away: students of that section see it
   ("Assignment set. Students can see it now.").
6. To grade, open the assignment's **Submissions**, choose a student's work, enter the marks and
   optional feedback, and click **Save grade**.

## What you should see
The assignment in your list with its due date (**Due today**, **Closed** after the date).
Students with the mobile app are notified when it is set and when their work is graded.

## Common mistakes
- Looking for a draft or "publish later" option: there is none; creating publishes it.
- Expecting to grade before a student hands in: submissions appear only after students submit.

## Troubleshooting
- **"You need a class assignment from the admin before you can set work":** ask the
  administrator to assign you on **Teacher Assignment**.
- **Edit or delete:** use **Edit assignment** or **Delete** on the assignment. Deleting removes its
  attachments too and cannot be undone.

## Related pages
My Students (`/teacher/students`), Calendar (deadlines appear there).
