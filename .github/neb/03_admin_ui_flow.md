TASK: Add Admin UI to manage NEB Subject Structure.

LOCATION:
Admin Dashboard → Academics

ADD NEW MENU:
"NEB Curriculum"

SCREENS:
1. Select Grade (11 or 12)
2. Select Subject
3. Manage Components:
   - Add/Edit Theory
   - Add/Edit Practical

FIELDS PER COMPONENT:
- Subject Code (required)
- Full Marks
- Pass Marks
- Credit Hours

RULES:
- Only Admin can CRUD SubjectComponent
- Teachers can only VIEW
- Validation:
  - Credit hours > 0
  - Pass marks <= full marks

IMPORTANT:
Do NOT mix this UI with existing "Subjects" page.
