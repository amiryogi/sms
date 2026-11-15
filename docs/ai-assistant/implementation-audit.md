# AI help assistant: implementation audit

Audit of the school system before adding the AI help assistant (2026-11-15, branch
`feature/ai-assistant`, cut from `feature/site-calendar-and-app` at `714a6a7`). Nothing in the
existing modules was changed by this audit.

## 1. Architecture

| Layer | What is there |
|---|---|
| Backend | Express 4 (CommonJS), Prisma 5.22, JWT access + refresh tokens. One codebase for MySQL 8 or Supabase PostgreSQL (`src/database`, `dialect` helpers). |
| Request flow | Route → `authenticate` → `requireRole` / `isAdmin` / `authorize` → ownership middleware → `validate` (express-validator) → controller (`asyncHandler`) → Prisma. Errors via `ApiError`, responses via `ApiResponse`. |
| Routers | 31 routers under `/api/v1` (`routes/index.js`), about 200 endpoints. |
| Services | `services/push/` (pluggable transport, `setTransport` for tests, off in tests), `services/finance/`, `services/calendar/`, `account`, `portal`, `notice`, `parent`, `gradeScale`. |
| Per-school config | JSON columns on `School` normalized by a util: `reportCardConfig` (`utils/reportCardLayout.js`), `calendarConfig` (`utils/calendar/calendarConfig.js`). |
| Rate limiting | `express-rate-limit` v7 in `middleware/rateLimit.middleware.js`: login and refresh limiters; a general limiter deliberately not applied (a school shares one IP). |
| Frontend | React 19 + Vite 7, React Router 7, axios `apiClient` (JWT attach, single-flight refresh), Tailwind 4 kit in `components/ui/`, shadcn pieces, recharts. React-admin only in `src/examAdmin/`. |
| Shell | `layouts/DashboardLayout.jsx` (sidebar from `layouts/navigation.js`, mobile drawer, top bar), pages lazy-loaded in `App.jsx` behind `ProtectedRoute roles`. |
| Dates | AD stored; BS shown and entered through adapters; `NepaliDatePicker` in every date field; per-browser display preference in localStorage `sms.calendar.prefs`. |
| Deployment | Frontend on Vercel; backend on cPanel Node.js (Passenger) at one host; database on Supabase. |

## 2. Roles (verified in `prisma/seed.js` and `middleware/auth.middleware.js`)

ADMIN (1), TEACHER (2), EXAM_OFFICER (3), ACCOUNTANT (4), STUDENT (5), PARENT (6), SUPER_ADMIN (7).
`authenticate` adds ADMIN to a super admin. Roles decide access; 11 permissions are checked by
`authorize` on attendance, result and report-card routes only. Full matrix:
[role-permission-matrix.md](role-permission-matrix.md).

## 3. Findings that change the original specification

The specification listed tasks for some roles that the code does not give them, and features
that do not exist. The assistant must not describe them as available.

| Specification said | The code | Consequence for the assistant |
|---|---|---|
| EXAM_OFFICER: create exams, configure exam subjects, publish results, generate and print report cards | EXAM_OFFICER has **Marks Entry** (any subject), a read-only **Students** directory and **Notices** only. Exams and Report Cards are ADMIN routes. | Exam officers are told these are administrator tasks. |
| ADMIN: attendance monitoring | `/teacher/attendance` is `ProtectedRoute roles={["TEACHER"]}`; the admin menu has no attendance page; no attendance report page exists (the API exists). | Admins are told there is no attendance page for them. |
| SUPER_ADMIN: school registration, school management, platform configuration, system monitoring | No school-creation endpoint or page; super admin is same-school only. No page creates administrators (`PUT /users/:id/roles` has no UI). | Super admins are told what exists: admin pages plus protection of super-admin accounts. |
| TEACHER: student progress, learning support | `My Students` is a roster only; no progress view. | Not described. |
| STUDENT: timetable | Not built. | Listed in `not-available`. |
| Knowledge docs `formative-assessment.md`, `cas-assessment.md` | CAS and formative assessment are not built. | Covered by `not-available` instead of separate guides. |
| Notices with attachments | `NoticeAttachment` exists in the schema, but the admin Notices page has no upload. | Docs say notices carry no attachments in the web app. |

## 4. Implemented modules (what the knowledge base covers)

Academic years, classes, sections, subjects (with Excel import), class subjects, teacher
assignment, students (generated admission numbers, class login slips), teachers and staff,
parents (linking), promotions, exams (DRAFT → PUBLISHED → LOCKED, snapshot of marks), marks entry
(theory and practical), report cards (generate, publish, individual and bulk print, working days,
layout and design, grade scales), assignments and submissions, notices (targeting), fee ledger
(types, structures, installments, generation, collection, receipts, reversals, discounts, bills,
statements, day book, reports, dashboard), school calendar (events, holidays, import, settings,
print), BS date picker and display preferences, student and parent portals, push notifications
(mobile app), password resets and forced change.

## 5. Frontend routes by role (from `App.jsx`)

| Roles | Routes |
|---|---|
| ADMIN (and SUPER_ADMIN) | `/admin/dashboard`, `/admin/academic-years`, `/admin/classes`, `/admin/sections`, `/admin/subjects`, `/admin/class-subjects`, `/admin/exams`, `/admin/exam-admin/*`, `/admin/teacher-assignment`, `/admin/parents`, `/admin/students`, `/admin/teachers`, `/admin/report-cards`, `/admin/notices`, `/admin/school-settings`, `/admin/fee-types`, `/admin/fee-structures`, `/admin/promotions`, `/admin/login-slips` |
| TEACHER | `/teacher/dashboard`, `/teacher/attendance`, `/teacher/assignments`, `/teacher/students` |
| TEACHER, EXAM_OFFICER, ADMIN | `/teacher/notices`, `/teacher/marks` |
| STUDENT | `/student/dashboard`, `/student/notices`, `/student/assignments`, `/student/results`, `/student/report-card`, `/student/fees`, `/student/attendance`, `/student/profile`, `/student/receipts/:id`, `/student/fees/statement`, `/student/fees/bill` |
| PARENT | `/parent/dashboard`, `/parent/notices`, `/parent/attendance`, `/parent/results`, `/parent/report-card`, `/parent/fees`, `/parent/assignments`, `/parent/profile`, `/parent/receipts/:id`, `/parent/fees/statement`, `/parent/fees/bill` |
| ACCOUNTANT, ADMIN | `/finance/dashboard`, `/finance/reports`, `/finance/collect`, `/finance/accounts`, `/finance/accounts/:studentId` (+ `/statement`, `/bill`), `/finance/transactions`, `/finance/discounts`, `/finance/receipts/:id`, `/finance/bills`, `/finance/daybook`, `/accountant/fee-types`, `/accountant/fee-structures`, `/accountant/notices` |
| EXAM_OFFICER, ACCOUNTANT | `/staff/students` (read-only) |
| Everyone signed in | `/calendar`, `/calendar/exams`, `/calendar/academic`, `/calendar/print/:kind`, `/account/password`, `/dashboard` |
| ADMIN, TEACHER | `/calendar/events` |
| ADMIN | `/calendar/holidays`, `/calendar/settings` |

## 6. Isolation rules the assistant must keep

- `schoolId` from `req.user` on every query; never from the client.
- Academic-year scoping: the assistant reads no academic data at all, so it cannot mix years.
- Teacher, parent-child and student ownership: the assistant reads no records, so these rules
  cannot be bypassed through it. Help documents are filtered by role.
- Conversations belong to one user in one school: every read and delete filters by
  `{ id, userId, schoolId }`.

## 7. Documentation gaps found

- `.github/fee/USER_MANUAL.md` describes the removed "Fee Payments" page; not used as a source.
- `docs/STATUS.md` says `POST /auth/register` is public; it is admin-only (`auth.routes.js`).
- No in-app help existed before this feature.
- Very few `data-testid` attributes (calendar pages only): walkthrough targets need new
  `data-guide` attributes.

## 8. Recommended architecture (adopted)

- **Backend:** `services/assistant/` with a provider contract (Anthropic, OpenAI, Gemini adapters
  over their official SDKs), a provider manager (selection, timeout, one pre-stream fallback),
  language resolver, role-filtered BM25 retrieval over Markdown files in
  `backend/src/data/assistant/knowledge/`, route catalog for page context, prompt builder,
  usage and quota accounting, lazy retention. Routes under `/api/v1/assistant`.
- **Data:** `School.assistantConfig` (JSON, normalized like `calendarConfig`), and tables
  `ai_conversations`, `ai_messages`, `ai_usage_events`. API keys only in environment variables.
- **Frontend:** a floating widget inside `DashboardLayout`, SSE streaming through `fetch` with a
  non-streaming fallback, a driver.js walkthrough runner limited to `data-guide` targets from a
  fixed registry, and an admin page at `/admin/assistant`.
- **No personal data to providers:** answers are grounded only in help documents.

## 9. Provider integration requirements

- Keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, server-side only.
- Streaming through Server-Sent Events. Passenger or the proxy in front of it may buffer, so
  responses set `X-Accel-Buffering: no` and `Cache-Control: no-transform`, and the client falls
  back to a single JSON response.
- Gemini's free tier may use prompts to improve Google's products; the admin page says so.
- Model ids are configuration, verified against each provider's documentation when the adapters
  are written.
