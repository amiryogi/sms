# Implementation status

Updated after every phase. Plan: repository analysis → foundation → auth → student/parent →
teacher → admin roles → advanced → release (see MOBILE_ARCHITECTURE.md).

| Phase | State |
|---|---|
| 1. Repository analysis | **Done** (2026-11-13) |
| 2. Foundation | **Done** (2026-11-13) |
| 3. Authentication | **Done** (2026-11-13) |
| 4. Student and parent portals | **Done** (2026-11-13) |
| 5. Teacher portal | **Done** (2026-11-13) |
| 6. Admin, super admin, exam officer, accountant | **Done** (2026-11-13) |
| 7. Notifications, offline, PDF, uploads, i18n, dark mode | **Done**, except moving every screen's text into translations (see below) |
| 8. Testing and release | **Done in code**: release config, security review, tests. **Not done**: EAS builds and device checks, which need the owner's Expo login and phones |

No backend or web code has changed. Proposals for backend changes are in API_GAPS.md.

---

## Sign-in and home photo (2026-11-14)

After the owner's second phone test:
- **Sign-in header:**
  - a gradient, sliding down, in the school's colour;
  - the default colour, for a school that has not chosen one, is now the logo blue `#1D5FD1`
    (it was indigo);
  - the logo, the school's name (word by word, larger and centred) and the slogan animate in
    one after another.
- **Sign-in form:**
  - a raised card over the header, with icons in the fields;
  - the school-code link has an icon;
  - the help line about forgotten passwords sits under the card.
- **Home screens** show the signed-in person's photo (initials without one) with a short spring
  and halo, for every role.
- **Motion:** each animation respects Reduce Motion. The sign-in animation waits for the launch
  animation, so it is seen.

## Brand and launch animation (2026-11-14)

The owner supplied the Vidyalaya SMS logo and a welcome-screen design.

- **Welcome screen:** rebuilt as the launch animation (`src/features/brand/BrandIntro.tsx`) rather
  than shown as one picture. Its words are real text, it works in dark mode, it scales to any
  phone, and it can move. It starts from the native splash picture, so the handover is seamless.
- **Logo:** split into layers by `scripts/build-brand-assets.py`. It appears on:
  - the sign-in screen when no school is known yet;
  - the first onboarding slide;
  - About;
  - the native splash.
- **Tests:** `tests/brand/intro.test.tsx` checks the handover from the splash, that the intro
  waits for the session, skip, Reduce Motion and that screen readers skip it.
- **Not checked:** the splash alignment can only be seen in a release or development build;
  Expo Go shows the app icon instead of the splash. The app icon itself is unchanged.

---

## Device feedback round (2026-11-14)

The owner tried the app on a phone and reported four things. What changed for each:

**a. The design was plain.**
- A token-based palette with checked contrast, the Mukta typeface and a 44 px minimum touch
  target throughout.
- Each role's home opens on a band in the school's colour: the school, today's Bikram Sambat
  date, a greeting, and the one number that role starts the day with:
  - a teacher sees the registers marked today;
  - an accountant sees the collection rate;
  - a parent sees the child switcher.
- Lists are grouped sheets with tinted icon tiles; badges are outlined stamps.
- The login screen now has the same brand band as home.

**b. Marks were partly hidden.**
- **Cause:** a fixed 44 px input height plus a 24 px line height, which Android clips.
- **Fix:** each mark box grows with the text (24 px digits, `/ max` inside the box) and uses
  the kit input, which sets neither.
- **Also changed:** the screen avoids the keyboard; the absent toggle and the attendance status
  buttons use tone tokens (soft fill, 2 px border) with full words instead of P/A/L/E.

**c. Changing the theme printed an error.**
- **Cause:** NativeWind's `setColorScheme` throws unless dark mode is class-based, and it also
  changed the phone's own appearance setting.
- **Fix:** the theme is now CSS variables swapped by the provider, with no call into NativeWind
  or the system.
- **Tests:** `tests/theme/theme.test.tsx` checks the switch and that neither API is touched.

**d. Audit.** I ran a design critique, an accessibility review (WCAG 2.1 AA adapted to touch)
and a code review over `src`. Fixed from them:
- **Class merging:** `cn()` did not merge, so overrides lost to the stylesheet order: chips
  rendered at 16 px instead of 14 px, and `Card p-0` kept its padding. It now uses
  `tailwind-merge`.
- **Missing dependency:** `expo-asset`, which `expo-font` needs, was not installed; added with
  its config plugin.
- **Status bar on home:** content and the offline banner could sit under the status bar with
  the title bar hidden. The brand status strip fixes that, and the status-bar style is now
  declarative, so the root layout no longer resets it.
- **Date picker:** the iOS date picker followed the phone's theme, not the app's
  (`themeVariant`).
- **Contrast:** caption colour `ink-subtle` was 3.9:1 on the light canvas; now 4.9:1.
- **Clean-up:**
  - divider insets come from the kit (`<Divider inset />`);
  - no hex values in screens (except the white logo tile);
  - removed the unused `src/theme/colors.ts`.

Not verified on a device yet: the look itself, large-text settings, and the iOS status bar. See
the device test plan in BUILD_AND_DEPLOYMENT.md.

---

## Phase 8: testing and release

**Release configuration:**
- `eas.json`: development (dev client), preview (Android APK, production API) and production
  (store builds, remote version numbers).
- `app.config.ts`: APP_ENV-based name and bundle id suffix; the HTTPS rule; cleartext only in
  development; Android `allowBackup: false`.
- `docs/BUILD_AND_DEPLOYMENT.md`: set-up, builds, store submission, a device test plan and a
  production checklist.

**Security review:**
- **Tokens:** only in SecureStore (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`), never in AsyncStorage
  (tested). A keychain session left behind by an old iOS install is ignored.
- **Logging:** none. `no-console` (except warn/error) is a lint error, and the client never
  logs requests.
- **Transport:** HTTPS is enforced in production builds (config throws; the runtime refuses
  too). Cleartext is allowed only in development.
- **Device storage:** the offline cache is read-only data marked for it, per user, wiped at
  sign-out and session end. It is excluded from Android cloud backup.
- **Generated files:** PDFs are named after the student and deleted at sign-out.
- **WebView:** the report-card sheet is local HTML with every value escaped; navigation away
  is blocked, and there are no extra windows.
- **Writes:** a confirm step everywhere; double-tap guards; never retried automatically;
  payments carry an idempotency key.
- **Server checks:** every role and ownership rule is still enforced by the API. Contract tests
  check the refusals: other students and children, unassigned sections, unpublished cards,
  DRAFT exams, finance for non-fee staff, overpayment.
- **Dependencies:** unused packages removed (`expo-notifications`, `expo-device`,
  `expo-haptics`, `expo-localization`). Charts use the SVG already present instead of adding
  Skia.

**Test totals (2026-11-13):**
- `npm test`: 185 passed in 18 suites, covering units, components, navigation, the session,
  report-card HTML, the feed and persistence;
- `npm run test:contract`: 38 passed against the real backend on the MySQL test database;
- `tsc --noEmit`, `expo lint`, `expo-doctor` 20/20;
- `expo export` for Android and iOS with `APP_ENV=production`;
- the backend's own `npm test` still passes 497 (unchanged), and the web lint has 0 errors.

**Not done (needs the owner):**
- **EAS builds:** not run; this machine is not logged in to Expo (`eas whoami` → "Not logged
  in").
- **Device testing:** not done. The steps are in BUILD_AND_DEPLOYMENT.md, "First run on a
  phone".
- **Store identity:** the final bundle id, icon and splash.

## Phase 7: notifications, offline, translations, dark mode

**Notification center** (`/shared/notifications`, bell with an unread count in every tab
header):
- **Sources:** built from data the app already reads, since there is no notification API.
  - Everyone: published notices.
  - Students, and parents for every linked child (named when there are several): new
    assignments, graded work, published report cards, overdue fees.
- **Read state:** kept per user on the phone and wiped at sign-out. Anything present the
  first time counts as read, so there's no flood.
- **No OS notifications yet:** without push (API_GAPS #1), they would only appear while the
  app is open. Background polling is unreliable, and it needs tokens readable while the phone
  is locked. Push is the proposed route.

**Offline:**
- marked read-only queries persist per user and are restored on start (tested: restore,
  nothing unmarked written, another user gets nothing, sign-out deletes);
- an offline banner, "saved copy, updated …" notes, and no endless loading for data that was
  never fetched;
- writes are disabled offline and keep their drafts.

**Uploads:** type and size are checked before upload (phase 4), for hand-ins (3 files) and
new assignments (5).

**Dark mode:**
- every screen uses the kit's dark variants;
- the remaining hard-coded icon colours now come from the theme, with an `info` tone added;
- the report-card sheet stays white, because it is paper.

**Translations:**
- i18next is set up with English. A test checks that every `t()` key used in the code
  exists, and that every added locale has every English key.
- **Not done:**
  - **Feature screens:** the role screens from phases 4–6 still use English text directly;
    moving it into `en.json` is the next step before a Nepali file can cover them.
  - **Nepali file:** none is added; a translator should write it.

## Phase 6: admin, super admin, exam officer, accountant

The app watches the school and covers frequent tasks. Set-up and lifecycle actions stay on the
web, and the screens say so:
- creating or editing students, staff, classes and fee structures;
- publishing, locking and unlocking exams;
- generating and publishing report cards;
- reversals, discounts and cancellations, with their approval steps;
- school settings.

**Admin and super admin** (tabs Home, Students, Exams, Finance, More):
- **Home:** student and teacher totals (read from pagination totals, since there is no count
  API), classes, academic year, fee collection with the overdue amount, exams by state,
  notices.
- **Students:** directory with search (paged).
- **Exams:** list with state; per exam, choose class and section to see report cards
  generated, published and passed, then open any card (an admin may view unpublished ones;
  the API allows it).
- **Finance:** the same screens as the accountant.
- **More:** fee accounts, transactions, finance reports, marks entry (any subject), staff (by
  role), classes, school profile, notices.
- A super admin uses the admin area. Super-admin-only actions (managing admins) are
  web-only, and the app offers none.

**Exam officer** (tabs Home, Marks, Students, More):
- **Home:** exams open for marks and the student total.
- **Marks:** every subject of a PUBLISHED exam, with the sections that have students. Uses the
  same entry screen and rules as teachers.
- **Students:** read-only directory.
- **More:** exams by state, and notices.
- No finance, which the API refuses anyway.

**Accountant** (tabs Home, Accounts, Transactions, More):
- **Home:**
  - KPIs from `GET /fees/dashboard`: collected and rate, outstanding, today and this month,
    overdue with student count;
  - monthly collection bars;
  - collected against expected by class;
  - the most overdue students;
  - latest payments.
- **Accounts:** search and status filter, paged. The account page is the ledger statement plus
  **Record payment**.
- **Record payment:**
  - **Inputs:** amount (more than 0, at most 2 decimals, not above the year's balance), method,
    reference (required unless cash), paid-on date (not in the future), remarks.
  - **Sending:** confirm with the amount, method and student. One idempotency key per form
    (`expo-crypto`), so a retry after a lost connection is recorded once; double-tap and
    offline guards.
  - **After saving:** the receipt opens.
  - The server allocates the payment and refuses an overpayment.
- **Transactions:** payments and reversals, filtered by type and day.
- **Reports:** collections, outstanding, discounts and reversals, as cards. The API computes
  rows and totals.

**Charts:** two small charts drawn with `react-native-svg` (already a dependency), each with a
spoken summary. Victory Native would add Skia and the worklets runtime.

**Endpoints integrated:**
- `GET /students`, `GET /users?role=`;
- `GET /academic-years/current`, `GET /classes`, `GET /sections`, `GET /school`;
- `GET /exams`, `GET /report-cards?examId&classId&sectionId`;
- `GET /fees/dashboard`, `GET /fees/accounts`, `GET /fees/transactions`,
  `POST /fees/transactions`, `GET /fees/reports/:report`.

**Tests:**
- `npm test`: 178 passed in 15 suites. New:
  - record payment (0 and 3-decimal amounts refused, over-balance refused, reference required
    for non-cash, a single send on double tap, the same idempotency key reused on retry, the
    receipt opens);
  - finance dashboard figures and the chart summary;
  - admin dashboard counts from totals.
- `npm run test:contract`: 38 passed. New:
  - accountant: dashboard, accounts, transactions and the four reports; directory read
    allowed, staff refused; an overpayment refused with 409 and the transaction count and
    balance unchanged; a 3-decimal amount refused;
  - admin: directories, year, classes, sections, exams including DRAFT, section report cards;
  - exam officer and teacher: never get DRAFT; refused the admin report-card list and finance.
- `tsc`, lint and both bundle exports are clean.

**Known limits:**
- **No real payment is recorded in tests.** The ledger is append-only, so a test payment would
  stay. Idempotent replay (`replayed: true`) is covered only by the component test with a
  mocked server.
- **Marks-entry progress** per subject is not shown (API_GAPS #5), and there is no
  school-wide attendance figure on the admin home (API_GAPS #3).

## Phase 5: teacher portal

**Built** (tabs Home, Attendance, Marks, Assignments, More; My students and Notices open from
More):
- **Home:**
  - students and sections;
  - subject-sections open for marks;
  - each section with today's register status (Marked, 12/30, Not marked);
  - recent assignments with hand-in counts;
  - notices.
- **Attendance:**
  - **Sections:** only the teacher's own current-year sections, from `/teacher-subjects` with
    other years dropped.
  - **Days:** move day by day, BS first, never past today.
  - **Marking:** P/A/L/E per student; "Mark everyone else present"; live totals.
  - **Saving:** a half-marked register can't be saved. Save asks to confirm with the totals,
    sends once (ref guard), and then shows the day the server stored.
  - **Offline:** saving is disabled, and the marks stay as a draft.
  - **Drafts:** an unsent draft for the same section and day comes back with a "Discard"
    option.
- **Marks:**
  - **List:** PUBLISHED exams → subject → section. A teacher sees their assigned sections; an
    exam officer or admin sees every section with students.
  - **Entry:** limits come from the ExamSubject snapshot (theory/practical full marks, pass
    marks). Ranges are checked as the web and the server do; there is an Absent toggle and
    entered/absent/to-do/to-fix counts.
  - **Saving:** confirm first. Only rows with marks or absent are sent, with absent marks sent
    as 0. A draft is kept while editing; offline and double-tap guards apply.
  - **Read-only:** when the exam is not PUBLISHED.
- **Assignments:**
  - the teacher's own list, with published/draft;
  - new assignment: subject-section chips from their own assignments, title, instructions,
    due date (`DateField`: native picker, BS shown), total marks, publish switch, up to 5
    files;
  - detail: publish / unpublish; delete (refused by the server once anyone has handed in, and
    disabled in the app then);
  - submissions with text, files, status; grade with marks (capped at the total) and feedback.
- **My students:** the teacher's sections with roll and admission numbers.

**Endpoints integrated:**
- `GET /teacher-subjects`, `GET /teachers/my-students`;
- `GET /attendance`, `POST /attendance`;
- `GET /exam-results/exams`, `GET /exam-results/students`, `POST /exam-results`;
- `POST /assignments` (multipart), `PUT /assignments/:id`, `DELETE /assignments/:id`;
- `GET /submissions/assignment/:id`, `PUT /submissions/:id/grade`.

**New native dependency:** `@react-native-community/datetimepicker` (through `expo install`;
`expo-doctor` 20/20).

**Tests:**
- `npm test`: 171 passed in 14 suites. New:
  - the attendance/marks/sections logic (payloads, limits, change counting, half-marked
    refusal);
  - the teacher screens: own-section loading; bulk mark and a single send after confirm with
    a double tap; offline; draft restore and discard; limits flagged and save refused; the
    marks payload with absent; locked exam read-only; grade above the total refused.
- `npm run test:contract`: 31 passed. New:
  - a teacher's assignments are all current-year;
  - reading an own section's register;
  - refused for a section they don't teach (read and write);
  - marking a stranger to the section refused;
  - marks exams only PUBLISHED and only their sections;
  - a mark above the snapshot limit refused, with the stored result unchanged;
  - the exam officer gets all subjects with sections, and is refused attendance and finance.
- `tsc`, lint, `expo-doctor` and both bundle exports are clean.

**Known limits:**
- **No contract test writes attendance or marks.** That would change the seeded test data,
  which the repo forbids; the writes are proven by component tests and refusal paths.
- **Unassigned-section marks test:** it returns early when every class has only the teacher's
  sections, as on this seed.
- **Not checked on a device:** the date picker, file picking, and the keyboard over marks
  entry.

## Phase 4: student and parent portals

**Built** (screens are shared, each takes a `studentId`):
- **Student area:** tabs Home, Attendance, Assignments, Results, More. Fees, Notices and My
  profile open from More.
- **Parent area:** tabs Home, Attendance, Results, Fees, More. Assignments, Notices and Child's
  profile open from More.
  - A child switcher appears above every screen when there is more than one child. Children
    come only from `/parents/me/children`.
  - The choice is remembered per parent (`sms.user.<id>.child`, wiped at sign-out).
  - Every query key carries the student id, and the gate remounts per child, so one child's
    data never shows under another.
- **Dashboard:** greeting with today's BS date; attendance %; latest published result; fee
  balance and next due; assignments due; upcoming exams; latest notices.
- **Attendance:** year summary; BS-month chips; a day grid from the server's `bsDate`; days not
  present, with remarks.
- **Results:** only exams with a published report card. GPA, %, rank and pass counts as the
  server computed them; per-subject theory/practical with grades; remarks.
- **Report card** (`/shared/report-card/:studentId/:examId`):
  - a phone summary, and the printed sheet in a WebView;
  - **Share PDF** (`expo-print` A4 → `expo-sharing`, file named after the student and exam)
    and **Print**;
  - the HTML ports `ReportSheet.jsx` / `PerformanceSheet.jsx`, honouring `layout` and
    `layout.design`;
  - the CSS is copied from the web by `scripts/sync-report-card-css.js`, and a test fails if
    the copy is stale;
  - every value is HTML-escaped, and the logo is inlined as base64.
- **Assignments:** To do / Handed in / All. Detail with attachments (open in the phone's
  viewer) and the student's submission, marks and feedback.
  - **Hand-in** (students only): text plus up to 3 files from files, photos or camera. Type
    and 5 MB are checked first; there is a confirm step; it is disabled offline.
  - A ref guard stops a double tap from sending twice. Server refusals (409 already
    submitted) are shown as is.
- **Fees:** balance, overdue amount, % paid, fees with installments and due dates (BS),
  receipts, approved discounts. A receipt screen shows allocations. Read-only.
- **Notices:** search, paged list, detail; published only.
- **Profile:** the school's record of the student, with DOB in BS and AD and subjects with
  teachers.

**Endpoints integrated:**
- `GET /portal/students/:id/overview`, `GET /parents/me/children`;
- `GET /attendance/student/:id`;
- `GET /report-cards/student/:id/exams`, `GET /report-cards/student/:id/exam/:examId`;
- `GET /assignments` (with `?studentId=` for a parent), `GET /assignments/:id`,
  `POST /submissions` (multipart);
- `GET /fees/accounts/:studentId`, `GET /fees/transactions/:id`;
- `GET /notices`, `GET /notices/:id`.

**Tests:**
- `npm test`: 152 passed in 12 suites. New:
  - report-card HTML (escaping, TH/IN rows, layout switches, Performance columns, design
    variables, CSS in sync with the web);
  - portal screens (dashboard, child switching with no data mixing, remembered child
    ignored when unlinked, no-children state, results only when published, register, fees,
    hand-in with double tap / empty / 409 / offline / graded / parent read-only).
- `npm run test:contract`: 21 passed. New:
  - a student reads their own portal and is refused another student's;
  - unpublished report cards are refused (exams 2 and 3 on the seed);
  - the multipart hand-in request reaches the server;
  - a parent reads a linked child, is refused a stranger, and cannot hand in.
- `tsc`, lint and the Android/iOS bundle exports are clean.

**Known limits:**
- **No submission is created against the real backend.** The API cannot delete an assignment
  that has one, so a test submission would stay in the database. Contract tests stop at the
  request format.
- **Not checked on a device:**
  - the PDF (page fit, logo) and the WebView sheet;
  - file and photo pickers;
  - attachments opening in the phone's viewer.
- **Translations:** feature screens use English strings directly. Only the shared shell
  (sign-in, navigation, profile) goes through `t()`. Moving the rest is phase 7.

## Phase 3: authentication

**Built:**
- **Screens:** onboarding (three slides, once per install); sign-in (username or email,
  password, optional school code); change password (forced or voluntary); the "More" tab
  (profile card, appearance, change password, about, switch area, sign out); the start-up
  error screens (not configured, can't restore, no known role).
  - The sign-in screen remembers the school code (not the username) and shows that school's
    name, logo and colour from `GET /public/school/:code`.
  - It explains that a forgotten password is reset by the school office, since there is no
    reset API.
- **Session (`src/contexts/AuthContext.tsx`):**
  - restore through `/auth/me`;
  - a refused session signs out; an unreachable server keeps the session and offers a retry;
  - a keychain session left behind by a previous iOS install is ignored;
  - sign-in wipes any previous user's data;
  - sign-out calls the server, then wipes tokens, cache, drafts and seen state, even offline;
  - a session-expired event goes to sign-in with a message;
  - a password-required event goes to the change screen;
  - after a 403, the profile reloads at most every 10 s.
- **Routing:** `Stack.Protected` guards from session state and roles. Six role areas with their
  own tabs, and a shared stack.

**Endpoints integrated:** `POST /auth/login`, `GET /auth/me`, `POST /auth/refresh-token`
(client), `POST /auth/logout`, `PUT /auth/change-password`, `GET /public/school/:code`,
`GET /school`.

**Tests:**
- `npm test`: 122 passed in 9 suites, covering the client, the auth context, the screens and
  the role navigation of all 7 roles.
- `npm run test:contract`: 14 passed against the real backend:
  - every role signs in and lands on the right area;
  - email sign-in;
  - a uniform wrong-password message;
  - public branding;
  - refresh-and-retry when the access token is rejected (one refresh for three parallel
    calls);
  - logout makes the refresh token useless;
  - an admin-set password blocks other routes until it is changed.
- `tsc`, `expo lint`, `expo-doctor` (20/20) and `expo export` for Android and iOS: clean.

**Known limits:**
- Signing out of the app signs the user out of the web too (API_GAPS #2).
- **Not checked on a device:** nothing has run on a phone or emulator yet. No emulator is
  available on this machine; an EAS preview build comes in phase 8, or earlier on request.
- Role homes show only the header for now; phases 4–6 fill them.

## Phase 2: foundation

**Built:**
- **Project:** Expo SDK 58 (React Native 0.88, React 19.3), TypeScript strict
  (`noUncheckedIndexedAccess`), Expo Router (`src/app`), NativeWind 4 (Tailwind 3; v5 is still
  an RC), TanStack Query 5, axios, React Hook Form + Zod 4, i18next.
- **Configuration:** `app.config.ts` takes `APP_ENV` and `EXPO_PUBLIC_API_URL`. Production
  refuses non-HTTPS, and plain HTTP is allowed only in development builds (Android
  cleartext).
- **API client (`src/api/client.ts`):** single-flight refresh; only 400/401/403 from refresh
  end the session; one retry; typed `ApiFailure`; events for session end, refresh,
  password-required and forbidden.
- **Token store:** SecureStore (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`), kept in memory as well.
- **Persistence:** read-only queries marked `meta.persist`, per user, wiped at sign-out.
  Writes are never retried automatically.
- **Network:** `expo-network` drives TanStack's online state; the app refetches on
  foreground.
- **Theme:** the school's `brandColor` becomes `brand-50…950` (a port of the web's OKLCH
  ladder, converted to sRGB). Light/dark/system, chosen in More.
- **UI kit (`src/components/ui`):** text, button, icon button, card, badge, progress, text
  field, list item, avatar, skeleton, empty/error/offline states, a stale-data note,
  `QueryView` (loading / error / offline-without-data / empty / data), screen frame,
  segmented control, chips, stat card.
- **Utilities:** BS dates (a port of the backend converter plus BS→AD for date pickers,
  Kathmandu "today"), money in Rs. with Indian grouping, `fullName`, asset URLs, roles.

**Decisions:**
- Routes live in `src/app/` (the SDK 58 template default), not `app/`.
- Folders, not route groups, for role areas (see MOBILE_ARCHITECTURE §6).
- No Reanimated in the kit: React Native's `Animated` is enough, and it keeps Jest simple
  (TESTING.md).

## Phase 1: repository analysis

Wrote MOBILE_ARCHITECTURE.md, API_MAPPING.md and API_GAPS.md from the route and controller
code.

**Findings that shaped the design:**
- logout ends every session;
- refresh-token reuse after 10 s revokes everything;
- `/teacher-subjects` is not year-filtered;
- payments take an `idempotencyKey`;
- attendance carries `bsDate`;
- a theory mark of 0 is stored as empty.

---

## Environment variables

| Name | Where | Meaning |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `.env.*.local`, EAS profile env | API base including `/api/v1`. Public (inlined into the bundle) |
| `APP_ENV` | same | `development` / `preview` / `production`. Changes the bundle id suffix, app name, HTTPS rule and cleartext |
| `CONTRACT_API_URL` | test runs only | use an already running backend for `npm run test:contract` |
| `CONTRACT_PORT` | test runs only | port for the backend the contract runner starts (default 5013) |
