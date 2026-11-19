---
id: promotions
title: Promoting students to the next class
roles: [ADMIN, SUPER_ADMIN]
modules: [students, academics]
routes: [/admin/promotions]
guides: []
status: published
aliases: [promote, promotion, next class, detain, graduate, year end, upgrade class, कक्षा चढाउने, बढुवा, अर्को कक्षा, अनुत्तीर्ण, class chadaune]
verifiedAgainst: [frontend/src/pages/admin/Promotions.jsx, backend/src/controllers/promotion.controller.js]
verifiedOn: 2026-11-15
---
# Promoting students

## Purpose
At the end of the academic year, move students into next year's classes.

## Who can use it
Administrators.

## Where to find it
Left menu → **People** → **Promotions** (`/admin/promotions`).

## Before you start
Create the new academic year on **Academic years**.

## Steps
1. **1. Students to promote:** choose the **Class**, **Section** (or **All sections**) and
   **Academic year** they are finishing. Click **Load students**.
2. **2. Where they go:** choose the new **Class**, **Section** and **Academic year**.
3. For each student choose **Promote**, **Detain** or **Graduate** (for students leaving after
   the top class), or use **Promote all** / **Detain all**.
4. Click **Process promotions** and confirm.

## What you should see
Promoted students are enrolled in the new class; detained students repeat their class in the new
year. The history shows **Promoted**, **Detained**, **Graduated**.

## Common mistakes
- Promoting before creating the new academic year.

## Troubleshooting
- A mistake can be undone with **Undo promotion** in the history.

## Related pages
Academic years, Students.
