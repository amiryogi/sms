---
id: sign-in-and-passwords
title: Signing in and changing your password
roles: [SUPER_ADMIN, ADMIN, TEACHER, EXAM_OFFICER, ACCOUNTANT, STUDENT, PARENT]
modules: [account]
routes: [/account/password]
guides: []
status: published
aliases: [login, log in, sign in, password, username, forgot password, लगइन, पासवर्ड, प्रयोगकर्ता, birsiye, password change]
verifiedAgainst: [frontend/src/pages/Login.jsx, frontend/src/pages/account/ChangePassword.jsx, backend/src/middleware/auth.middleware.js, frontend/src/components/admin/ResetPasswordDialog.jsx]
verifiedOn: 2026-11-15
---
# Signing in and changing your password

## Purpose
How to sign in, what your username is, and how passwords are changed.

## Who can use it
Everyone.

## Where to find it
- Sign-in page: **Username or email** and **Password**.
- Change password: your name (top right) → **Change password** (`/account/password`).

## Before you start
You need the username and password the school gave you, usually on a printed login slip.

## Steps
1. On the sign-in page type your **Username or email** and **Password**, then sign in.
   - Students: the username is usually the admission number.
   - Parents: usually `p.` followed by the child's admission number, for example `p.stu20240001`.
   - Staff: the username the school created, or a generated number such as `svi-0001`.
2. If the school set your password, the app first takes you to **Change password**. Type a
   **New password** and **New password again**. It needs at least 8 characters with an upper-case
   letter, a lower-case letter and a number.
3. To change it later: your name → **Change password**.

## What you should see
After changing the password you reach your dashboard.

## Common mistakes
- Worrying about capital letters in the username: usernames are not case-sensitive. Passwords are.
- Expecting a "forgot password" email: there is none. The school administrator resets passwords.

## Troubleshooting
- **Forgot password:** ask the school administrator to use **Reset password** on your account.
  They give you a temporary password, and you choose a new one when you sign in.
- **"Too many failed login attempts":** wait a few minutes and try again.
- **"Account is not active":** the school has deactivated the account; contact the office.

## Related pages
Change password (`/account/password`).
