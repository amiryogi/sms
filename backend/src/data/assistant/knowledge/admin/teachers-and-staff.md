---
id: teachers-and-staff
title: Adding teachers, exam officers and accountants
roles: [ADMIN, SUPER_ADMIN]
modules: [teachers, users]
routes: [/admin/teachers]
guides: []
status: published
aliases: [add teacher, new teacher, staff, exam officer account, accountant account, staff role, शिक्षक थप्ने, कर्मचारी, लेखापाल, शिक्षक, staff thapne]
verifiedAgainst: [frontend/src/pages/admin/Teachers.jsx, backend/src/routes/user.routes.js]
verifiedOn: 2026-11-15
---
# Teachers and staff

## Purpose
Create sign-ins for teachers, exam officers and accountants.

## Who can use it
Administrators.

## Where to find it
Left menu → **People** → **Teachers & staff** (`/admin/teachers`).

## Steps
1. Click **Add staff member**.
2. Choose the **Role**:
   - **Teacher:** enters marks and attendance only for the subjects and sections assigned to them.
   - **Exam officer:** enters marks for any subject without an assignment. No access to fees.
   - **Accountant:** manages fee types, structures and payments; read-only student directory.
3. Type **First name**, optional **Middle name**, **Last name**, **Phone**, optional **Email**.
4. **Username** and **Password** are optional: left empty, a number like `svi-0001` is generated.
5. Save, and note the sign-in shown once (or print the slip).

## What you should see
The person in the list with their role badge. They must choose their own password at the first
sign-in.

## Common mistakes
- Expecting a new teacher to see classes: assign them on **Teacher assignment** too.
- Looking for an "Administrator" role here: administrators are not created on this page.

## Troubleshooting
- **Reset password:** the key button on the person's row.

## Related pages
Teacher assignment.
