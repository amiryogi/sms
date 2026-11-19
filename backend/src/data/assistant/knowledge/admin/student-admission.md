---
id: student-admission
title: Adding (admitting) a student and enrolling them
roles: [ADMIN, SUPER_ADMIN]
modules: [students]
routes: [/admin/students, /admin/login-slips]
guides: [admin.student]
status: published
aliases: [add student, new student, admission, register student, enrol, enroll, admission number, roll number, login slip, class logins, student password, भर्ना, विद्यार्थी थप्ने, नयाँ विद्यार्थी, भर्ना नम्बर, रोल नम्बर, bharna]
verifiedAgainst: [frontend/src/pages/admin/Students.jsx, frontend/src/pages/admin/LoginSlips.jsx, frontend/src/components/admin/ResetPasswordDialog.jsx, backend/src/controllers/student.controller.js, backend/src/utils/admissionNumbers.js]
verifiedOn: 2026-11-15
---
# Adding a student

## Purpose
Create a student's record and sign-in, and enrol them in a class and section for the year.

## Who can use it
Administrators. Exam officers and accountants can only view the student directory.

## Where to find it
Left menu → **People** → **Students** (`/admin/students`).

## Before you start
The academic year, class and section exist.

## Steps
1. Click **Add student**.
2. **Personal details:** **First name**, optional **Middle name**, **Last name**, **Gender**,
   **Date of birth**, **Blood group**, **Address**, **Phone**, **Emergency contact**.
3. **School:** **Admission number** (leave empty to generate one, like `SVI-0001`),
   **Admission date**, **Academic year**, **Class**, **Section**, **Roll number**.
4. **Contact & login:** optional **Email**, **Username** and **Password**. Left empty, the
   username is the admission number and a password is generated.
5. Save. A dialog shows the sign-in name and temporary password once: copy it or
   **Print login slip**.

## What you should see
"Student added and enrolled". The student signs in and must choose their own password first.

## Common mistakes
- Closing the dialog before noting the password: it is shown only once. Use **Reset password**
  (key button on the row) to make a new one.
- A student shown as **Not enrolled**: use **Enrol** on the row to put them in a class.

## Class logins for a whole class
**Students** → **Class logins** (`/admin/login-slips`): choose **Academic year**, **Class** and
**Section**, click **Create passwords**, then **Print**. Students who have already signed in are
skipped unless you ask.

## Troubleshooting
- Search with **Search name, username or admission no…**.
- Parents get their own account on **Parents**.

## Related pages
Parents, Promotions, Student accounts (fees).
