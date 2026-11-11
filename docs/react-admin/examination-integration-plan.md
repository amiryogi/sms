# React-admin for examinations: assessment and integration plan (Phase 1)

Date: 2026-11-11. Read-only assessment; nothing is installed.

## Bottom line

React-admin can be mounted inside this app, and the versions are compatible. But it brings a
second UI system (Material UI) into a finished Tailwind application, and the examination API
is not shaped for it. **My recommendation is a small pilot (examination list and a results
table), then a decision**, with a Tailwind-native alternative described at the end. Note that
in the earlier finance plan you declined React-admin for this project; this brief reverses
that, so the choice is listed as a decision for Phase 2.

## Compatibility (checked against the npm registry and this repo)

| Requirement of react-admin 5.15 | This project | OK? |
|---|---|---|
| React 18 or 19 | 19.2 | yes |
| react-router / react-router-dom ^6.28 or ^7.1 | 7.18 | yes |
| react-hook-form (any) | installed | yes |
| @tanstack/react-query ^5.83 | not installed | new dependency |
| @mui/material, @mui/icons-material, @mui/system (5.16+, 6, 7 or 9) + Emotion | not installed | new dependencies |

- **Licence:** the core `react-admin` package is MIT. Editable datagrids, realtime, RBAC
  helpers and similar are in the paid Enterprise Edition and are **not** used in this plan.
- **Bundle:** React-admin with MUI and Emotion typically adds several hundred kB of
  JavaScript. It would be lazy-loaded with the examination routes only, so other pages are not
  affected. The exact size is to be measured in the pilot.

## What exists today

- **Screens:**
  - `pages/admin/Exams.jsx` (554 lines): list, create, subjects, publish / lock / unlock;
  - `pages/teacher/MarksEntry.jsx` (570 lines): a spreadsheet-like grid with keyboard
    navigation, per-row errors and a save bar;
  - `pages/admin/ReportCards.jsx` (395 lines): generate, publish, print.
- **Endpoints** (all behind `authenticate`, roles enforced server-side):
  - `/exams`: list, get, create, update, subjects, publish, lock, unlock, working-days, delete;
  - `/exam-results`: exams for marks entry, teacher exams, students, exam-subject results, save;
  - `/results`: by exam subject, save, student result;
  - `/report-cards`: list, generate, publish, unpublish, student card, bulk.
- **Response shape:** `{ success, message, data }`.

## Gaps between the API and React-admin

1. **No pagination, sorting or filtering on examination endpoints.** `GET /exams` returns a
   plain array ordered by start date; only students, teachers, users, parents, notices,
   promotions and finance lists are paginated. A React-admin list expects
   `getList({ pagination, sort, filter })` and a total.
   - Option A: the Data Provider pages, sorts and filters in the browser. Honest at this size
     (a school has a handful of exams a year), but then React-admin's server-driven list adds
     little.
   - Option B: add `page`, `limit`, `sort`, `search`, `academicYearId`, `classId`, `status` to
     the examination list endpoints. Backend work, no schema change.
2. **Actions are not CRUD.** Publish, lock, unlock, set working days, generate and publish
   report cards are commands. They become custom buttons calling the existing services, not
   `update` calls.
3. **Marks entry is a specialised grid.** The brief itself says not to force generic CRUD onto
   it. The existing Tailwind grid already has keyboard navigation and per-row validation, and
   React-admin's editable datagrid is Enterprise-only. **Recommendation: keep the existing
   marks-entry screen.**
4. **"Marks verification" has no data behind it.** `ExamResult` has no verification status or
   verifier fields (`marksObtained, practicalMarks, isAbsent, grade, remarks, enteredBy,
   enteredByRole`).
   - Without a schema change, a verification screen can only show **derived** facts: missing
     marks per subject and section, who entered what, absentees.
   - A real "verified by / at" status needs new columns and a migration for both database
     providers, to be proposed and approved first (CLAUDE.md §10).
5. **Results listing** exists only per exam + class + section (`GET /report-cards?...`). A
   cross-class results table needs either a new read endpoint or one request per section.

## Integration design (if approved)

```
App.jsx (existing BrowserRouter, DashboardLayout, ProtectedRoute)
  └─ /admin/exam-admin/*   lazy → ExamAdminModule
        <CoreAdminContext dataProvider authProvider queryClient theme>   (no <Admin> router)
          <Resource name="exams" list show />
          <Resource name="exam-subjects" list />
          <Resource name="results" list />
```

- **Mounting:** React-admin's `<Admin>` normally owns the router. Here it is mounted inside
  the existing router with a `basename`, using its headless context, so the app's layout,
  sidebar and navigation stay. This arrangement is to be proven in the pilot before anything
  else is built on it.
- **Data Provider** (`src/examAdmin/dataProvider.js`):
  - calls the existing `apiClient` (so JWT attach and refresh-and-retry are reused);
  - maps `{ success, message, data }` to `{ data, total }`;
  - implements `getList`, `getOne`, `getMany` per resource, with Option A or B above;
  - `create` / `update` / `delete` only where a real endpoint exists;
  - turns API errors into React-admin `HttpError`s with the server's message;
  - contains no business rules.
- **Auth Provider** (`src/examAdmin/authProvider.js`): a thin adapter over the existing
  `AuthContext`:
  - `checkAuth` and `getIdentity` read the current user;
  - `logout` calls the existing logout;
  - `checkError` lets `apiClient` handle 401 refresh and only signs out when that fails;
  - `getPermissions` returns the roles, for showing or hiding buttons only.

  The backend stays the only security boundary.
- **Styling:**
  - Tailwind 4 already declares layers; MUI v7 supports emitting its styles into a CSS layer
    (`enableCssLayer`), placed below `utilities`, so Tailwind utilities can still override it;
  - MUI's `CssBaseline` is not mounted, to avoid a second reset;
  - a MUI theme mirrors the app tokens: Inter, slate neutrals, `--brand-*` as primary, 8 px
    and 14 px radii, the card shadow;
  - to be verified in the real Vite build, including that no MUI rule leaks into report-card
    print.
- **Rules preserved:** DRAFT → PUBLISHED → LOCKED, marks editable only while PUBLISHED,
  teachers see only PUBLISHED / LOCKED, `ExamSubject` snapshot, school and year scoping. All of
  these are enforced by the existing endpoints, which the module only calls.

## Proposed scope by feature

| Brief item | Proposal |
|---|---|
| Examination list, filters, status | React-admin list (pilot) |
| Exam subject configuration | React-admin list + show; edits through the existing endpoint |
| Marks entry | Keep the existing Tailwind grid; link to it from the module |
| Marks verification | Derived "missing marks" table first; real verification status only after a schema proposal |
| Results management | React-admin list per exam; bulk publish through the existing endpoint |
| Student examination records | Later, after the pilot |

## Alternative: stay Tailwind-native

Add server-driven sorting, filtering and pagination to the existing `DataTable` (or adopt
TanStack Table, a headless library with no styling of its own) and build the same lists in the
current kit.
- **For:** one design system, no MUI or Emotion, smaller bundle, no router-nesting risk, and
  the print and Tailwind layers stay untouched.
- **Against:** no ready-made list/filter/reference scaffolding; each table is built by hand.

## Decisions needed in Phase 2

1. React-admin pilot, or the Tailwind-native alternative.
2. Client-side lists (Option A) or new list parameters on the API (Option B).
3. Whether to add a real verification status (schema change on both providers).
4. Keep the existing marks-entry grid (recommended).
