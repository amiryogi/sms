# Mobile architecture

The mobile app is an Expo (React Native) client for the existing School Management System. It
talks to the same `/api/v1` API as the web app and adds no business rules of its own: the
backend decides who may see and change what, and the app draws what the API returns.

Read `CLAUDE.md` at the repository root first. This document covers only what is specific to
the mobile app.

---

## 1. The existing system

| Part | What it is |
|---|---|
| Backend | Express 4 + Prisma 5. One codebase serves MySQL 8 or Supabase PostgreSQL. JWT access + refresh tokens. Production: `https://sms.nevanhandicraft.com.np` (cPanel Node.js app) |
| Web app | React 19 + Vite, on Vercel. Talks to the API only through `frontend/src/api/*.js` |
| Data model | `backend/prisma/schema/models.prisma`. Every core table has `school_id`; one school is used |

How a request is handled (unchanged by mobile):

```
Route -> authenticate -> requireRole/authorize -> ownership middleware -> validate -> controller -> Prisma
```

Rules the app relies on and must never work around:

- **School isolation.** The server takes the school from the token, never from the client.
- **Year scope.** Classes, subjects, teacher assignments, exams and fees belong to an academic
  year. The server answers for the current year (`AcademicYear.isCurrent`) unless asked for
  another one.
- **Ownership.** `isOwnStudent` lets a student read only themself and a parent only a linked
  child. Teachers reach only students in their current-year sections. Exam officers and
  accountants read any student in the school but edit none.
- **Exam lifecycle.** `DRAFT -> PUBLISHED -> LOCKED`. Marks are entered only while
  `PUBLISHED`. Teachers never see `DRAFT`.
- **Publication gating.** Students and parents see a report card only once it is published,
  and raw marks only once the exam is `LOCKED` or the card is published.
- **Fee ledger.** Payments are append-only `FeeTransaction` rows. A mistake is undone by a
  reversal that an admin approves. Payments never exceed what is owed.

## 2. The mobile app

| Concern | Choice |
|---|---|
| Framework | Expo SDK 58, React Native 0.88, TypeScript `strict` |
| Navigation | Expo Router (file-based). Route groups per role |
| Styling | NativeWind 4 (Tailwind 3 syntax). Tokens in `tailwind.config.js` and `src/theme/` |
| Server state | TanStack Query 5. Selected read-only queries are persisted to disk |
| HTTP | Axios, one instance in `src/api/client.ts` |
| Forms | React Hook Form + Zod |
| Secure storage | `expo-secure-store` for tokens. AsyncStorage for preferences, drafts and the persisted cache |
| Icons | `lucide-react-native` |
| Charts | Simple bar charts drawn with `react-native-svg` (`components/ui/BarChart.tsx`), finance dashboard only. Victory Native would add Skia and the Reanimated worklets runtime for two small charts |
| PDF | `expo-print` renders HTML to PDF; `expo-sharing` shares it; `react-native-webview` previews it |
| i18n | `i18next` + `expo-localization`. English now, Nepali ready |

The app is independent of `frontend/` and `backend/`: it imports nothing from them and has its
own `package.json`. Where it needs the same logic it holds a **port**, with the same tests:

- `src/utils/nepaliDate.ts` ports `backend/src/utils/dateConverter.js`;
- `src/utils/names.ts` ports `fullName()`;
- `src/theme/brand.ts` ports the shade ladder of `frontend/src/lib/brand.js`;
- `src/features/report-cards/html/` ports the report-card sheets.

Grades, GPA, percentages, balances and totals are never recomputed. They come from the API.

### Layers

```
app/ (screens: layout and navigation only)
  -> src/features/<domain>/hooks.ts   useQuery / useMutation, query keys
    -> src/api/services/<domain>.ts   one function per endpoint, typed request/response
      -> src/api/client.ts            axios: base URL, token, refresh, error mapping
```

A screen never calls axios or a service directly. It calls a hook.

## 3. API integration

- **Base URL:** `EXPO_PUBLIC_API_URL` (for example `https://sms.nevanhandicraft.com.np/api/v1`),
  read in `app.config.ts` and exposed through `expo-constants`. Production builds refuse a
  non-HTTPS URL.
- **Envelope:** every answer is `{ success, message, data }`. Lists that page add
  `pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }`. Errors are
  `{ success: false, message, code?, errors? }`. The client turns every failure into one
  `ApiFailure` type: `{ status, message, code, fieldErrors, isNetwork, isTimeout }`.
- **Static files:** logos, avatars and attachments may come back as a relative
  `uploads/...` path (disk storage) or an absolute Cloudinary URL. `resolveAssetUrl()` joins a
  relative one to the API origin, as `frontend/src/utils/assets.js` does.
- **CORS:** does not apply. Native requests carry no `Origin` header.
- **Cancellation:** TanStack Query passes an `AbortSignal` to every service call.
- **Uploads:** `multipart/form-data` with `{ uri, name, type }` parts. The server allows 5 MB
  per file and a MIME whitelist (JPEG, PNG, GIF, WebP, PDF, DOC/DOCX, XLS/XLSX, TXT) checked by
  magic bytes. The app checks the type and size before sending, so the user gets the error
  early. The server stays the real check.

Endpoint-by-endpoint detail: [API_MAPPING.md](API_MAPPING.md). Missing API: [API_GAPS.md](API_GAPS.md).

## 4. Authentication

| Step | Endpoint | Notes |
|---|---|---|
| Sign in | `POST /auth/login { identifier, password, schoolCode? }` | `identifier` is a username or an email. Returns `{ user, accessToken, refreshToken }` |
| Branding before sign-in | `GET /public/school/:code` | Optional school code on the login screen shows the school's name, logo and colour |
| Restore session | `GET /auth/me` | Run at start-up if a refresh token is stored |
| Refresh | `POST /auth/refresh-token { refreshToken }` | Rotates the refresh token |
| Change password | `PUT /auth/change-password { currentPassword, newPassword }` | After a forced change the answer carries a new session; after a voluntary one it is `null` and every session ends |
| Sign out | `POST /auth/logout` | Deletes **all** of the user's refresh tokens (see API_GAPS) |

Token handling:

- Both tokens live in SecureStore (Keychain / Android Keystore). The access token is also
  kept in memory for speed. Nothing auth-related goes to AsyncStorage, and tokens are never
  logged.
- **Single-flight refresh.** The backend rotates refresh tokens. A rotated token presented
  again more than 10 s later revokes every session the user has. So all concurrent 401s wait
  for one refresh call, as `frontend/src/api/apiClient.js` does.
- Only a 400/401/403 from the refresh call ends the session. A network error, 429 or 5xx
  keeps the tokens and shows a retry, so a flaky connection or a backend restart never signs
  anyone out.
- A request is retried once after a successful refresh. Login and refresh themselves never
  trigger a refresh.
- `403 code: PASSWORD_CHANGE_REQUIRED` (or `user.mustChangePassword` at sign-in) sends the
  user to the change-password screen. While the flag is set the server allows only `/auth/me`,
  `/auth/change-password` and `/auth/logout`.
- An inactive account, inactive school or user with no role is refused at sign-in. The
  server's message is shown as is.
- **Sign out, and session expiry:** call `/auth/logout` (best effort), then wipe SecureStore,
  the in-memory and persisted query cache, marks/attendance drafts and the notification
  "seen" state.

There is no public registration and no forgot-password flow. The login screen says to ask the
school office for a reset.

## 5. Roles and what each one gets

`user.roles` decides the navigation. A `SUPER_ADMIN` is also an `ADMIN` everywhere (same rule
as the backend and the web `hasRole`). If a user holds several roles, the first match in this
order picks the home: ADMIN, EXAM_OFFICER, ACCOUNTANT, TEACHER, PARENT, STUDENT. The others are
reachable from the profile menu.

| Role | Tabs | Highlights |
|---|---|---|
| STUDENT | Home, Attendance, Assignments, Results, More (Fees, Notices, Report card, Profile) | Overview dashboard; submit assignments (text + up to 3 files) |
| PARENT | Home, Attendance, Results, Fees, More (Assignments, Notices, Profile) | Child switcher on every screen; read-only |
| TEACHER | Home, Attendance, Marks, Assignments, More (My students, Notices, Profile) | Mark attendance; enter theory/practical marks; create and grade assignments |
| EXAM_OFFICER | Home, Marks, Students, More (Notices, Profile) | Marks entry for any subject of a PUBLISHED exam; read-only directory |
| ACCOUNTANT | Home, Accounts, Transactions, More (Reports, Notices, Profile) | Finance dashboard; statements; record a payment; receipts |
| ADMIN / SUPER_ADMIN | Home, Students, Exams, Finance, More (Staff, Classes, Report cards, Notices, School, Profile) | Monitoring. Heavy set-up forms stay on the web |

The tabs are UX only. Every screen still handles a 403 from the API: it shows "You don't have
access to this" and refreshes the profile, because roles may have changed.

## 6. Navigation

```
src/app/
  _layout.tsx           providers (Query, Theme/Brand, Auth) and ONE Stack whose screens are
                        wrapped in Stack.Protected guards built from the session and roles
  index.tsx             decides: onboarding | login | change-password | the role's home area
  onboarding.tsx        first launch only (a flag in AsyncStorage)
  login.tsx             guard: signed out
  change-password.tsx   guard: signed in. Forced (no way back, only sign out) or voluntary
  student/ parent/ teacher/ exam/ finance/ admin/
                        one folder per role area, each a bottom-tab navigator (AreaTabs);
                        guard: signed in, password changed, and the role
  shared/               screens several roles open: notice/[id], report card, receipt,
                        notifications, about…
```

**Why folders, not `(groups)`:** an Expo Router group adds nothing to the URL, so six groups
would each have their own `/` and clash. A folder gives every area its own path (`/student`,
`/teacher`…).

**Guards:** `Stack.Protected` removes a screen whose guard is false, and anyone asking for it
is sent to `index`, which redirects to the right place. A student asking for `/admin` lands on
`/student` (tested in `tests/navigation/roles.test.tsx`).

**Back behaviour:** detail screens push onto a stack, so Android back and the iOS swipe behave
natively.

## 7. Data relevant to mobile

| Entity | Used for |
|---|---|
| `User`, `UserRole`, `Role` | sign-in, roles, name (`firstName`, `middleName`, `lastName`; build with `fullName`) |
| `School` | name, logo, `brandColor`, contact details, `reportCardConfig` (in report-card payloads as `layout`) |
| `AcademicYear` | the current year scopes almost everything |
| `Class`, `Section`, `ClassSubject`, `Subject` | class/section/subject pickers; subjects are class-wide |
| `Student`, `StudentClass` | profile, enrolment (class, section, roll number) |
| `Parent`, `StudentParent` | a parent's children |
| `TeacherSubject` | a teacher's classes, sections and subjects (current year only) |
| `Attendance` | daily status: present, absent, late, excused |
| `Exam`, `ExamSubject`, `ExamResult` | marks entry: the `ExamSubject` snapshot holds full and pass marks |
| `ReportCard` | published results, rank, frozen attendance |
| `Assignment`, `AssignmentFile`, `Submission`, `SubmissionFile` | homework |
| `Notice` | announcements (targeted by role or class on the server) |
| `FeeObligation`, `FeeInstallment`, `FeeTransaction`, `FeeDiscount` | statement, receipts, dues |

## 8. Offline and caching

- **Read-only data may be kept on the device**, so a parent can open the app without signal and
  see the last state, clearly marked:
  - dashboards, notices, profile, published results, the fee statement and the attendance
    register are persisted;
  - the cache is namespaced by user id and dropped on sign-out;
  - persisted data is `staleTime`-aware, and a "Last updated …" badge shows its age;
  - an offline banner shows while `expo-network` reports no connection.
- **Nothing that writes is queued.** Attendance, marks, payments, submissions and grading:
  - are sent only while online. Their submit buttons are disabled offline, with the reason;
  - keep what the user typed as a local draft until the server confirms it;
  - are never retried automatically after a failure;
  - after saving, the screen reloads from the server and shows what is really stored.
- **Duplicate submissions:** a pending mutation disables its button. Payments also send an
  `idempotencyKey` (UUID), which the server uses to answer a repeat with the original receipt
  (`replayed: true`).

## 9. Security

- Tokens only in SecureStore; nothing sensitive in AsyncStorage except the persisted query
  cache of read-only data, which is wiped on sign-out.
- No logging of tokens, passwords, or student data. The dev request logger prints method, path
  and status only, and production builds don't include it.
- Production builds require an `https://` API URL. Android cleartext traffic is allowed only in
  development builds.
- No production secrets in the app. `EXPO_PUBLIC_*` values are public by design: they hold only
  the API URL and build flags.
- File uploads are checked on the device (type and size) before they are sent. The server
  still checks magic bytes.
- The app never sends a `schoolId`, and never decides access. A hidden button is convenience,
  not protection.
- The report-card HTML escapes every value from the API before it goes into the template.
- Screenshots are not blocked: schools and parents share report cards and receipts.

## 10. API limitations that shape the app

Summarised here. Details and proposed fixes: [API_GAPS.md](API_GAPS.md).

- No push notifications or device-token storage. The in-app notification center is built from
  existing lists.
- Signing out on one device signs the user out everywhere (logout deletes all refresh tokens).
- No school-wide attendance summary, class-wise student counts or marks-entry completion
  endpoint. Admin and exam-officer dashboards show what existing endpoints give.
- Attendance is daily, not per subject, so the app has no subject-wise attendance.
- No timetable, and no forgot-password.
- No server-side PDF. The app renders report-card PDFs on the device.
- `/teacher-subjects` returns every academic year. The app keeps only the current year, which
  matches what the server allows.
- `POST /exam-results` stores a theory mark of `0` as empty (`parseFloat(x) || null`).
