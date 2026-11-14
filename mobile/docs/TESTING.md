# Testing

Three layers, from fastest to closest to reality.

| Layer | Command | Needs | What it proves |
|---|---|---|---|
| Unit + component + navigation | `npm test` | nothing (no network) | logic, screens, guards, client behaviour |
| Contract | `npm run test:contract` | MySQL test database | the app's own services work against the real API |
| Device | EAS build (`BUILD_AND_DEPLOYMENT.md`) | a phone or emulator | native modules, layout, real network |

Also run `npm run typecheck`, `npm run lint` and `npx expo export --platform android|ios`
(proves both bundles compile) before calling a phase done.

## `npm test`

Jest with `jest-expo`, in `tests/`. Native modules are faked in `tests/setup.ts`:
- secure store and AsyncStorage are in memory;
- network is connected by default (`__setState` changes it);
- splash screen is a no-op;
- NativeWind's scheme hooks are replaced.

What is covered:
- **`tests/utils/`:**
  - the BS converter, with the backend's own cases and a round trip over six years;
  - money (Rs., Indian grouping), names, dates, assets;
  - role areas;
  - the brand palette.
- **`tests/api/client.test.ts`:**
  - one refresh for many concurrent 401s;
  - session end only on 400/401/403 from refresh, with network errors and 5xx keeping the
    tokens;
  - one retry only;
  - no refresh for login;
  - forced-password and other 403 events;
  - error mapping (offline, timeout, validation fields, no raw 500 text).
- **`tests/auth/AuthContext.test.tsx`:**
  - restore (none / ok / refused / unreachable + retry / stale iOS keychain);
  - sign-in (tokens only in SecureStore, a previous user's data wiped);
  - sign-out (online and offline, full wipe);
  - session-expired and password-required events;
  - throttled profile reload after a 403;
  - forced and voluntary password change.
- **`tests/auth/screens.test.tsx`:** the sign-in and change-password screens (validation,
  server messages, what is sent, school branding).
- **`tests/navigation/roles.test.tsx`:** the real route tree:
  - each of the 7 roles lands on its area;
  - areas a role may not open redirect home;
  - multi-role users;
  - no session → sign-in;
  - first launch → onboarding;
  - forced password change;
  - restore failure;
  - an unknown role.
- **`tests/navigation/*.router.test.tsx`:** sign-in → home, and session end → sign-in.

### Pitfalls found while setting this up

- **Router tests on Windows:**
  - Pass `renderRouter` an absolute path built from `__dirname`. A cwd-relative path can
    differ in drive-letter case from Jest's registry and load React twice.
  - One guard flip on a mounted tree per file: Expo Router's test router keeps state after
    it, which blanks the next render. Test state changes on `AuthProvider` instead (see
    `AuthContext.test.tsx`), and keep one end-to-end flip per file.
- **Testing Library 14:**
  - `render` / `renderHook` are async: `await` them.
  - `screen` is replaced on every render, so read it from the module (`rtl.screen`) when
    you hold the module in a variable.
- **Screen tests: use `tests/isolated.ts` (`fresh()`).** Screen tests that type into forms blanked the next test's render. `screens.test.tsx`
  loads fresh modules per test (`jest.resetModules()` + `require`, Testing Library's `pure`
  entry, manual `cleanup`). `tests/isolated.ts` packages that: `m = await fresh()` in `beforeEach`, then `m.render(...)`, `m.screen()`, `m.req(path)` for modules, `m.helpers` to seed the device. Two more rules there:
  - spy on modules from `m.req` (for example `m.req("react-native").Alert`), not on top-level imports, which are a different copy;
  - after `fireEvent.changeText`, wait for the value before pressing anything (`typeAnswer` in `tests/portal/portal.test.tsx`): updates are not flushed at once, so a press would run with the old text.
- **Single-file runs:** the test providers use a query client without the 24 h
  garbage-collection timer and without retries (`tests/renderWithProviders.tsx`); otherwise a
  one-file Jest run waits on that timer.
- **ESM and native-only packages:**
  - `lucide-react-native` is mapped to its CommonJS build;
  - CSS imports map to `tests/styleMock.js`;
  - the kit avoids Reanimated (its Jest support in v4 needs the worklets runtime). The
    skeleton uses React Native's `Animated`.

## `npm run test:contract`

`scripts/contract.js`:
1. starts the backend on port 5013 against the **MySQL test database**, through
   `backend/scripts/with-test-db.js` (which refuses the app's own database);
2. waits for `/health`;
3. runs `tests/contract/` in a Node environment (real HTTP);
4. stops the backend.

Set the test database up once:

```bash
cd backend
node scripts/with-test-db.js npm run db:migrate:deploy
node scripts/with-test-db.js npm run seed
```

To use a backend that is already running: `CONTRACT_API_URL=http://localhost:5013/api/v1 npm run test:contract`.
To see the backend's log: `CONTRACT_BACKEND_LOGS=1`.

**Rules for contract tests:**
- They sign in with the seeded demo accounts (`tests/contract/session.ts`). Those names
  live only in tests, never in the app.
- They never change seeded data: they create their own records and delete them
  (`auth.contract.test.ts` creates and deletes an accountant), or they send only writes the
  server must refuse (`teacher.contract.test.ts`: an unassigned section, a stranger to the class,
  a mark above the limit). A refused write rolls back, so nothing is stored.
- They go through the app's services (`src/api/services/*`), so a contract break shows up
  as a failing service, which is what the app would hit.
- `POST /auth/logout` ends every session of that user, including e2e sessions on the same
  test database. Don't run the two suites at the same time.

## Results

| Date | `npm test` | contract | typecheck / lint | bundles |
|---|---|---|---|---|
| 2026-11-13 (phase 3) | 122 passed (9 suites) | 14 passed | clean / clean | Android and iOS export OK; `expo-doctor` 20/20 |
| 2026-11-13 (phase 4) | 152 passed (12 suites) | 21 passed | clean / clean | Android and iOS export OK |
| 2026-11-13 (phase 5) | 171 passed (14 suites) | 31 passed | clean / clean | Android and iOS export OK; `expo-doctor` 20/20 |
| 2026-11-13 (phase 6) | 178 passed (15 suites) | 38 passed | clean / clean | Android and iOS export OK |
| 2026-11-13 (phases 7–8) | 185 passed (18 suites) | 38 passed | clean / clean | Android and iOS export OK with `APP_ENV=production`; `expo-doctor` 20/20; backend `npm test` 497 passed |
| 2026-11-14 (device feedback) | 187 passed (19 suites) | not rerun (no service changes) | clean / clean | Android and iOS export OK; `expo-doctor` 20/20 |
| 2026-11-14 (brand intro) | 191 passed (20 suites) | not rerun (no service changes) | clean / clean | Android and iOS export OK; `expo-doctor` 20/20 |
| 2026-11-14 (sign-in, home photo) | 193 passed (21 suites) | not rerun (no service changes) | clean / clean | Android and iOS export OK; `expo-doctor` 20/20 |
