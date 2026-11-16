---
id: admin-attendance-and-accounts
title: Attendance oversight and password resets for administrators
roles: [ADMIN, SUPER_ADMIN]
modules: [attendance, users]
routes: [/admin/students, /admin/teachers, /admin/parents]
guides: []
status: published
aliases: [attendance report, attendance monitoring, check attendance, reset password, forgot password, deactivate, हाजिरी रिपोर्ट, पासवर्ड रिसेट, password reset garne]
verifiedAgainst: [frontend/src/App.jsx, frontend/src/layouts/navigation.js, frontend/src/components/admin/ResetPasswordDialog.jsx, frontend/src/pages/admin/Students.jsx]
verifiedOn: 2026-11-15
---
# Attendance oversight and password resets

## Attendance: what administrators can and cannot do
- **Teachers take the register** on their **Attendance** page for the sections assigned to them.
- **There is no attendance report page for administrators** in the web app, and the
  administrator's menu has no Attendance item.
- What you can do: make sure every section has a teacher on **Teacher Assignment**; set weekly
  holidays and the **No attendance on holidays** rule in **Calendar Settings**; set each exam's
  working days on **Report Cards** so report cards show days present.
- Students and parents see each student's register on their **Attendance** page.

## Resetting a password
1. Open **Students**, **Teachers & Staff** or **Parents**.
2. Click the key button on the person's row (Parents: row menu → **Reset password**).
3. Type a temporary password or let the system generate one. It needs at least 8 characters
   with an upper-case letter, a lower-case letter and a number.
4. Give the person the temporary password once (copy it or **Print login slip**). They must
   choose their own when they sign in, and their old sessions end.

## Rules
- Nobody resets their own password this way; use **Change password**.
- Only a super administrator can reset a super administrator's password.

## Related pages
Students (**Class logins** for a whole class), Teachers & Staff, Parents.
