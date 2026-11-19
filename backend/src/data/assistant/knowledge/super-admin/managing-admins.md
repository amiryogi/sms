---
id: super-admin-role
title: What a super administrator can do
roles: [SUPER_ADMIN]
modules: [users, school]
routes: [/admin/teachers, /admin/school-settings]
guides: []
status: published
aliases: [super admin, superadmin, manage admins, create admin, make admin, school registration, register school, platform, system settings, सुपर एडमिन, प्रशासक बनाउने]
verifiedAgainst: [backend/src/middleware/auth.middleware.js, backend/src/routes/user.routes.js, backend/src/routes/school.routes.js, frontend/src/pages/admin/Teachers.jsx, CLAUDE.md]
verifiedOn: 2026-11-15
---
# What a super administrator can do

## Purpose
Explain how the super administrator differs from an administrator.

## Who can use it
Super administrators.

## What you can do
- **Everything an administrator can**, in your own school: the same menu and pages. Every
  administrator help topic applies to you.
- **Protect administrator accounts:** only a super administrator can edit, deactivate, demote,
  delete or reset the password of another super administrator. Ordinary administrators cannot
  change a super administrator.
- **Choose the AI assistant's provider and model** on **AI assistant** (administrators can too).

## What the system does not have
- **No school registration and no multi-school screen.** The system runs one school; a super
  administrator works only in that school.
- **No web page for creating administrators.** **Teachers & staff** creates teachers, exam
  officers and accountants only. Giving someone the administrator role is done by the system's
  technical maintainer.
- No monitoring or audit-log screen apart from the AI assistant's usage page.

## Common mistakes
- Looking for a "Schools" page or a platform settings page: they do not exist.

## Troubleshooting
- To change school details, logo, colour, grading or report card: **School settings**.
- To reset a staff password: **Teachers & staff** → the key button on the person's row.

## Related pages
Teachers & staff (`/admin/teachers`), School settings (`/admin/school-settings`).
