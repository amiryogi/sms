---
id: subjects-and-class-subjects
title: Subjects and class subjects (full marks, credit hours)
roles: [ADMIN, SUPER_ADMIN]
modules: [academics, subjects]
routes: [/admin/subjects, /admin/class-subjects]
guides: []
status: published
aliases: [subject, class subject, full marks, pass marks, credit hours, practical, theory, import subjects, excel, विषय, पूर्णाङ्क, उत्तीर्णाङ्क, क्रेडिट आवर, प्रयोगात्मक, सैद्धान्तिक, bisaya]
verifiedAgainst: [frontend/src/pages/admin/Subjects.jsx, frontend/src/pages/admin/ClassSubjects.jsx, frontend/src/components/admin/SubjectImportModal.jsx]
verifiedOn: 2026-11-15
---
# Subjects and class subjects

## Purpose
**Subjects** is the master list. **Class Subjects** says which subjects each class studies this
year, with theory and practical full marks and credit hours. Exams copy these settings when they
are created.

## Who can use it
Administrators.

## Where to find it
Left menu → **Academics** → **Subjects** (`/admin/subjects`) and **Class Subjects**
(`/admin/class-subjects`).

## Steps
**Add a subject**
1. **Subjects** → **Add subject** (or **Import from Excel** for many at once).
2. Type the **Subject name** and **Code**, optional **Credit hours** and **Description**.
3. Tick **Has a practical part** if marks are entered for theory and practical separately.
4. Save.

**Attach it to a class**
1. **Class Subjects** → choose the **Academic year** and **Class**.
2. Click **Add subject to class** and choose the **Subject**.
3. Set **Theory full marks**, **Practical full marks** (internal / practical), and credit hours
   (**Theory credit hours (TH)**, **Practical credit hours (IN)**) shown on the grade sheet.
4. Save.

## What you should see
The subject listed for the class. A subject marked **Not configured** still needs its marks.

## Common mistakes
- Changing full marks after an exam was created and expecting the exam to change: an exam keeps
  the marks it copied when it was created. Only new exams use the new values.
- Forgetting to set up class subjects for a new academic year.

## Troubleshooting
- "Credit hours must be greater than zero" / "Theory marks must be zero or greater": fix the
  number and save again.

## Related pages
Exams, Teacher Assignment.
