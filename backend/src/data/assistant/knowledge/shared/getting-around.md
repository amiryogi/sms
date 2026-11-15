---
id: getting-around
title: Finding your way around the app
roles: [SUPER_ADMIN, ADMIN, TEACHER, EXAM_OFFICER, ACCOUNTANT, STUDENT, PARENT]
modules: [navigation, dashboard]
routes: [/dashboard]
guides: []
status: published
aliases: [menu, sidebar, navigation, dashboard, home, where is, कहाँ, मेनु, ड्यासबोर्ड, kaha, khojne]
verifiedAgainst: [frontend/src/layouts/DashboardLayout.jsx, frontend/src/layouts/navigation.js, frontend/src/App.jsx]
verifiedOn: 2026-11-15
---
# Finding your way around the app

## Purpose
Every signed-in page has the same frame: a menu on the left, a bar at the top with your name,
and the page itself in the middle.

## Who can use it
Everyone who signs in. The menu lists only the pages your role may open.

## Where to find it
- **Left menu (sidebar):** grouped into sections such as Overview, Academics, People,
  Exams & Results, Finance, Communication, Settings and Calendar (administrators), Teaching
  (teachers), My school (students) or My children (parents).
- **On a phone:** the menu is hidden. Tap the menu button (three lines) at the top left to open it.
- **Your name, top right:** opens a menu with **Show dates in** (B.S., A.D. or both),
  **मिति नेपालीमा** / **Dates in English**, **Change password** and **Sign out**.

## Steps
1. Open the left menu (tap the three-line button on a phone).
2. Choose the page. Its title also appears in the top bar.
3. To go back to your start page choose **Dashboard**. Exam officers start on **Marks Entry**.

## What you should see
The page opens and its menu item is highlighted.

## Common mistakes
- Looking for a page your role does not have. If a menu item is missing, your account does not
  have that role; ask the school administrator.
- Opening a link meant for another role shows **Unauthorized**. That is expected.

## Troubleshooting
- **"Unauthorized" page:** your role cannot open that page.
- **Sent to "Change password":** an administrator set your password; choose your own first.
- **Signed out unexpectedly:** your session ended; sign in again.

## Related pages
Dashboard, Change password (`/account/password`), Calendar (`/calendar`).

## Menu by role
| Role | Menu items |
|---|---|
| Administrator and super administrator | Dashboard, Academic Years, Classes, Sections, Subjects, Class Subjects, Teacher Assignment, Students, Teachers & Staff, Parents, Promotions, Exams, Exam Admin (pilot), Marks Entry, Report Cards, Finance Overview, Collect Fees, Student Accounts, Transactions, Discounts, Reports, Fee Structures, Fee Types, Notices, School Settings, AI Assistant, and the Calendar pages |
| Teacher | Dashboard, My Students, Attendance, Assignments, Marks Entry, Notices, Calendar, My Class Events, Exam Schedule, Academic Calendar |
| Exam officer | Marks Entry, Students (view only), Notices, Calendar, Exam Schedule, Academic Calendar |
| Accountant | Dashboard, Collect Fees, Student Accounts, Transactions, Discounts, Reports, Fee Structures, Fee Types, Students (view only), Notices, Calendar pages |
| Student | Dashboard, Attendance, Assignments, Results, Report Card, Fees, Notices, My Profile, Calendar pages |
| Parent | Dashboard, Attendance, Assignments, Results, Report Card, Fees, Notices, Child's Profile, Calendar pages |
