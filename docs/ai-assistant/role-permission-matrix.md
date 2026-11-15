# AI help assistant: role and permission matrix

What each role may ask the assistant about, which help documents it can retrieve, and what it
may do in the assistant itself. Retrieval is filtered by the roles in each document's front
matter (`backend/src/data/assistant/knowledge/**`). SUPER_ADMIN is treated as ADMIN plus the
super-admin document, the same way `authenticate` treats it.

## Topics by role

| Topic (document id) | SUPER_ADMIN | ADMIN | TEACHER | EXAM_OFFICER | ACCOUNTANT | STUDENT | PARENT |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| getting-around, sign-in-and-passwords, bs-date-picker, school-calendar, not-available | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| reading-notices | | | ✓ | ✓ | ✓ | ✓ | ✓ |
| academic-years, classes-and-sections, subjects-and-class-subjects, teacher-assignment | ✓ | ✓ | | | | | |
| student-admission, teachers-and-staff, parent-accounts, promotions | ✓ | ✓ | | | | | |
| examination-lifecycle, report-cards, school-settings | ✓ | ✓ | | | | | |
| publishing-notices, holiday-management, admin-attendance-and-accounts, assistant-settings | ✓ | ✓ | | | | | |
| super-admin-role | ✓ | | | | | | |
| marks-entry | ✓ | ✓ | ✓ | ✓ | | | |
| calendar-events | ✓ | ✓ | ✓ | | | | |
| teacher-attendance, teacher-assignments, teacher-my-students | | | ✓ | | | | |
| exam-officer-role | | | | ✓ | | | |
| staff-student-directory | | | | ✓ | ✓ | | |
| fee-setup, collect-fees, accounts-reversals-discounts, finance-reports | ✓ | ✓ | | | ✓ | | |
| portal-dashboard, portal-attendance, portal-assignments, portal-results, portal-fees | | | | | | ✓ | ✓ |
| parent-child-switcher | | | | | | | ✓ |

## What each role can do in the assistant

| Action | Who |
|---|---|
| Ask questions, see suggestions, run walkthroughs for its own pages | Every role the school has enabled (all seven by default) |
| See, continue and delete its own conversations | The owner only (`userId` + `schoolId` on every query) |
| Give 👍 / 👎 feedback with an optional comment | The owner of the message |
| Change provider, model, fallback, limits, language defaults, enabled roles, retention | ADMIN, SUPER_ADMIN (owner decision) |
| See usage, errors, costs and feedback comments | ADMIN, SUPER_ADMIN |
| Create, change or delete any school record through the assistant | **Nobody.** The first release has no actions. |

## Walkthroughs by role

| Guide id | Roles |
|---|---|
| teacher.attendance, teacher.assignment | TEACHER |
| marks.entry | TEACHER, EXAM_OFFICER, ADMIN |
| admin.academicYear, admin.student, admin.exam, admin.reportCards, admin.notice, calendar.holidays | ADMIN |
| calendar.event | ADMIN, TEACHER |
| finance.collect, finance.reports | ACCOUNTANT, ADMIN |
| portal.results | STUDENT, PARENT |
| parent.fees | PARENT |
