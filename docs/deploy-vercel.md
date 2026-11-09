# Demo deployment on Vercel

The whole app runs on one Vercel project:
- the React build is served as static files;
- the Express API is one serverless function in **Singapore (`sin1`)**, next to the Supabase
  database (ap-southeast-1);
- the site and the API share one address (`/api/*`), so there is no CORS and the browser
  never needs the API's address.

```text
Browser ── https://<project>.vercel.app
             ├─ /assets, /index.html ...   static (frontend/dist)
             ├─ /api/*, /health            api/index.js -> backend/src/app.js (Express)
             │                                └─ Supabase PostgreSQL (pooler, Singapore)
             │                                └─ Cloudinary (uploaded files)
             └─ any other path             index.html (React Router)
```

**Configuration:**
- `vercel.json`: install, build, region, the function and the rewrites;
- `api/index.js`: the function entry;
- `.vercelignore`: keeps the root SQL dumps, docs and images out of Vercel.

## 1. Cloudinary (uploaded files)

Vercel functions have no permanent disk.

1. Create a free account at cloudinary.com and copy the **cloud name**, **API key** and
   **API secret** from the dashboard.
2. Settings → Security: enable **"Allow delivery of PDF and ZIP files"**. New free accounts
   block PDF delivery, so assignment PDFs would return 401 without it.

**What happens to an uploaded file** (`backend/src/middleware/upload.middleware.js`):
1. multer holds it in memory;
2. its type must be on the whitelist, and its first bytes must match that type (the same
   check as local storage);
3. it is then uploaded:
   - images and PDFs as `image`;
   - Word, Excel and text files as `raw`;
   - under `sms/<field>/`, named from the field and a random suffix, with the extension taken
     from the MIME type (never the client's file name).

Without Cloudinary on Vercel, requests that carry files get 503 "File uploads are not
configured"; everything else works.

## 2. Create the Vercel project

1. vercel.com → Add New → Project → import the GitHub repository `amiryogi/sms`.
2. **Root Directory:** leave it as the repository root. `vercel.json` sets the install and build
   commands and the output folder.
3. **Framework Preset:** Other.
4. **Node.js version** (Settings → General): 22.x.

## 3. Environment variables (Settings → Environment Variables → Production)

| Name | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Requires the JWT secrets below |
| `DATABASE_PROVIDER` | `supabase` | |
| `SUPABASE_DATABASE_URL` | the **transaction pooler** URL + `&connection_limit=1` | Same as `SUPABASE_TEST_DATABASE_URL` in your `backend/.env`, with `&connection_limit=1` appended (one connection per function instance) |
| `JWT_SECRET` | 64 random hex chars | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | a different 64 random hex chars | |
| `FRONTEND_URL` | `https://<project>.vercel.app` | |
| `MAX_FILE_SIZE` | `4194304` | 4 MB. Vercel refuses request bodies over 4.5 MB |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from step 1 | |
| `VITE_API_URL` | `/api/v1` | Build-time; relative, same origin |
| `VITE_DEFAULT_SCHOOL_CODE` | `DEMO001` | Build-time; branding on the login page |

- `SUPABASE_DIRECT_URL` is not needed: migrations are not run from Vercel.
- None of these reach the browser except the two `VITE_*` values, which hold no secrets.

Then **Deploy**. Every push to `main` redeploys.

## 4. The database

The demo uses the Supabase **test** project, which is already migrated and seeded with the
demo school.
- **Demo logins:** `password123` for every seeded account, e.g. `admin@svi.edu.np`,
  `teacher1@svi.edu.np`, `accountant@svi.edu.np`, `student1@svi.edu.np`,
  `parent.stu20240001@svi.edu.np`. All data is fake.
- **Fresh demo data before handing over** (about 16 minutes from Nepal):
  ```bash
  cd backend
  node scripts/with-test-db.js --provider pg npm run seed -- --clean
  ```
- **Integration tests write to this project.** Avoid running `npm run test:integration:pg`
  while the client is testing, or re-seed afterwards.
- **Schema changes:** run them from your PC with
  `node scripts/with-test-db.js --provider pg npm run db:migrate:deploy`, before deploying code
  that needs them.

## 5. Check the deployment

- `https://<project>.vercel.app/health` returns `{"status":"ok",...}`.
- Open `https://<project>.vercel.app/finance/accounts` directly: the app loads (SPA fallback)
  and sends you to sign in.
- Sign in as each role.
- Upload a school logo (School Settings → Branding) and an assignment PDF. The files open
  from `res.cloudinary.com`.
- Record a fee payment, print the receipt, and print a report card (it should be one page).

## 6. Custom domain later (`sms.nevanhandicraft.com.np`)

1. Vercel → Project → Settings → Domains → add `sms.nevanhandicraft.com.np`.
2. Nest Nepal cPanel → Zone Editor → add a **CNAME** record `sms` → `cname.vercel-dns.com`.
3. Set `FRONTEND_URL` to `https://sms.nevanhandicraft.com.np` and redeploy.

Traffic then goes straight to Vercel; Nest Nepal's server and its firewall are not involved.

## Limits to know

- **Plan:** Vercel's free Hobby plan is for **non-commercial** use. Use Pro for a paid client
  deployment.
- **Cold starts:** the first request after idle takes about 1–3 s longer.
- **Rate limiting:** the login limiter is per function instance (in memory).
- **Upload size:** 4 MB per upload.
- **Windows builds:** if you build the frontend locally in Git Bash, run
  `MSYS_NO_PATHCONV=1 VITE_API_URL=/api/v1 npm run build`. Otherwise Git Bash rewrites `/api/v1`
  into a Windows path (`C:/Program Files/Git/api/v1`). Vercel builds on Linux and is not
  affected.

## Verified before the first deploy (2026-11-09)

A local stand-in for this layout ran `api/index.js` with `VERCEL=1` and `NODE_ENV=production`,
serving the production build, against the Supabase test project:
- `/health` returned 200;
- deep links fell back to the app;
- built assets were served as JavaScript;
- an unknown API path returned a JSON 404;
- the case-insensitive school-code lookup worked;
- login and lists worked;
- an upload without Cloudinary got a clean 503;
- the accountant and student dashboards, accounts and fees pages rendered with no console
  errors.

The Cloudinary upload path is covered by unit tests with a mocked Cloudinary. The live upload
still has to be checked after the first deploy.
