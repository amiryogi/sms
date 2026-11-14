# Vidyalaya SMS — mobile app

The Android and iOS app for the K–10 School Management System. It is a client of the existing
API (`backend/`, `/api/v1`) and changes nothing there. Expo SDK 58, React Native 0.88,
TypeScript, Expo Router, NativeWind, TanStack Query.

Start with:
- [docs/MOBILE_ARCHITECTURE.md](docs/MOBILE_ARCHITECTURE.md): how the app is built and why;
- [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md): what is done and what is next.

## Run it

You need Node 20+ and the backend running (see `docs/SETUP-NEW-MACHINE.md` at the repo root).

```bash
cd mobile
npm install
cp .env.example .env.development.local   # set EXPO_PUBLIC_API_URL (see below)
npx expo start                           # then press a (Android) or i (iOS)
```

**Which API URL:**
- **On a phone or emulator:** use the computer's LAN address, not `localhost`, for example
  `EXPO_PUBLIC_API_URL=http://192.168.1.20:5000/api/v1`. The backend's port is `PORT` in
  `backend/.env`.
- **Production builds:** need an `https://` URL and refuse anything else.

**Expo Go or a development build:** the app uses native modules (secure store, notifications,
print). Expo Go runs most of it. For everything, make a development build:
`npx eas-cli build --profile development` (see
[docs/BUILD_AND_DEPLOYMENT.md](docs/BUILD_AND_DEPLOYMENT.md)).

**Demo accounts:** `npm run seed` in `backend/` creates them, with password `password123`.
- `admin`
- `teacher1`
- `examofficer`
- `accountant`
- `stu20240001`
- `p.stu20240001`

## Commands

| Command | What it does |
|---|---|
| `npm start` | Expo dev server |
| `npm test` | unit, component and navigation tests (Jest, no network) |
| `npm run test:contract` | the app's services against a real backend on the MySQL test database |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | `expo lint` |
| `npm run doctor` | `expo-doctor` |

Details: [docs/TESTING.md](docs/TESTING.md).

## Layout

```
src/app/            routes (Expo Router): login, onboarding, change-password,
                    student/ parent/ teacher/ exam/ finance/ admin/ (one area per role),
                    shared/ (screens several roles open)
src/api/            client.ts (axios + single-flight refresh), tokenStore.ts (SecureStore),
                    services/ (one per domain), schemas/ (Zod)
src/contexts/       AuthContext (session lifecycle)
src/features/       screens and hooks per domain
src/components/ui/  the kit: Button, TextField, Card, ListItem, states, Screen…
src/theme/          brand colour (school), light/dark
src/utils/          nepaliDate (BS), format (names, money, dates), roles
src/i18n/           translations (English; Nepali-ready)
tests/              Jest tests; tests/contract/ runs against a live backend
```

## Rules

These come from the repository's `CLAUDE.md` and apply here too:

- **The backend decides access.** Role guards and hidden buttons are UX only.
- **No business rules in the app.** Grades, GPA, balances and totals come from the API.
- **Tokens only in SecureStore.** Never log tokens, passwords or student data.
- **Nothing that writes is queued offline.** Attendance, marks and payments are sent only
  while online, and only by the person.
- **Every displayed name goes through `fullName()`.**
- **Dates:** BS for display, AD on the wire.
