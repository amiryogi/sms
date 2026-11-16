---
id: parent-accounts
title: Parent accounts and linking children
roles: [ADMIN, SUPER_ADMIN]
modules: [parents]
routes: [/admin/parents]
guides: []
status: published
aliases: [parent, guardian, add parent, link student, link child, parent login, अभिभावक, अभिभावक थप्ने, बच्चा जोड्ने, abhibhawak]
verifiedAgainst: [frontend/src/pages/admin/Parents.jsx, backend/src/routes/parentAdmin.routes.js]
verifiedOn: 2026-11-15
---
# Parent accounts

## Purpose
Give parents a sign-in and link the children they may follow.

## Who can use it
Administrators.

## Where to find it
Left menu → **People** → **Parents** (`/admin/parents`).

## Steps
1. Click **Add parent**.
2. Type **First name**, optional **Middle name**, **Last name**, **Phone**, optional **Email**,
   **Occupation**, **Workplace**, **Address**.
3. **Username** and **Password** are optional: left empty, they are generated (usually
   `p.` + the child's admission number).
4. Set the **Relationship** and choose the **Child**.
5. Save, and note the sign-in shown once.
6. To link another child later: row menu → **Link a student** → **Search students**, choose the
   **Child**, the **Relationship**, and tick **Primary guardian** if this is the main contact.

## What you should see
"Parent account created". The parent sees only linked children.

## Common mistakes
- Creating a second account for a parent with two children: use **Link a student** on the
  existing parent instead.

## Troubleshooting
- Row menu: **Link a student**, **Reset password**, **Deactivate account** / **Activate account**.

## Related pages
Students.
