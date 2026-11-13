# Production deployment

Three hosts, one per layer:

```text
Browser ── https://vidyalaya-sms.vercel.app          Vercel: static React build (frontend/)
   │          any path -> index.html (React Router)
   │
   └─ API ── https://sms.nevanhandicraft.com.np        Nest Nepal cPanel: Node.js App (Passenger)
                ├─ /api/v1/*, /health                  Express (backend/src/server.js)
                ├─ /uploads/*                          files on the server disk (backend/uploads)
                └─ Supabase PostgreSQL                 production project, through the pooler
```

- **The frontend calls the API cross-origin.** It knows the API's address from
  `VITE_API_URL`, set at build time.
- **The API allows the frontend's address through CORS.** That address comes from
  `FRONTEND_URL`, which can list several, comma-separated.
- **Sign-in tokens live in localStorage.** There are no cookies, so CORS is all the cross-origin
  setup needed.
- **Never point production at the Supabase test project.** It is separate, and the integration
  tests rewrite its data.

Contents:
1. [Supabase production project](#1-supabase-production-project)
2. [Backend on Nest Nepal cPanel](#2-backend-on-nest-nepal-cpanel)
3. [Frontend on Vercel](#3-frontend-on-vercel)
4. [Check the deployment](#4-check-the-deployment)
5. [Upgrades](#5-upgrades)
6. [Backups](#6-backups)
7. [Limits and trade-offs](#7-limits-and-trade-offs)

---

## 1. Supabase production project

### 1.1 Choose the region from the backend server

Every API request makes several database queries, and each one is a round trip between the
cPanel server and Supabase. So pick the region **closest to the server**, not to the
school. Measure it in cPanel → **Terminal**:

```bash
for host in aws-0-ap-southeast-1.pooler.supabase.com aws-0-ap-south-1.pooler.supabase.com; do
  for port in 6543 5432; do
    node -e '
      const [h, p] = process.argv.slice(1); const t = Date.now();
      const s = require("net").connect(+p, h, () => { console.log(h, p, "OK", Date.now() - t, "ms"); s.end(); });
      s.setTimeout(8000, () => { console.log(h, p, "TIMEOUT"); s.destroy(); });
      s.on("error", (e) => console.log(h, p, "FAILED", e.code));
    ' "$host" "$port"
  done
done
```

- `ap-southeast-1` is Singapore and `ap-south-1` is Mumbai. Pick the one with the lower time.
- **If every line says TIMEOUT or FAILED,** the host's firewall blocks outbound database
  ports. Ask Nest Nepal support to **allow outbound TCP 5432 and 6543** (CSF `TCP_OUT`) for
  the account, and go no further until they do.

### 1.2 Create the project

1. supabase.com → New project → name `vidyalaya-sms-prod`, region from 1.1.
2. Use a database password **without `@ : / # ?`**. Otherwise it must be URL-encoded in every
   connection string.
3. Wait until the project is ready.

### 1.3 Connection strings

Open **Connect** (or Project Settings → Database) and choose the **URI** type.

| Variable | Connection | Port | Add to the end |
|---|---|---|---|
| `SUPABASE_DATABASE_URL` | **Transaction pooler** | 6543 | `?pgbouncer=true&sslmode=require&connection_limit=5` |
| `SUPABASE_DIRECT_URL` | **Session pooler** | 5432 | `?sslmode=require` |

- The app runs on the transaction pooler.
- Migrations need the session pooler. The "direct" host (`db.<project>.supabase.co`) is
  IPv6-only, and shared hosts usually have no IPv6.

---

## 2. Backend on Nest Nepal cPanel

### 2.1 Subdomain and HTTPS

1. cPanel → **Domains**: make sure `sms.nevanhandicraft.com.np` exists as a subdomain. If it
   was ever pointed at Vercel with a CNAME (an older plan), remove that record in
   **Zone Editor**.
2. cPanel → **SSL/TLS Status** → run **AutoSSL** for the subdomain. Do not continue until
   `https://sms.nevanhandicraft.com.np` serves a valid certificate.

### 2.2 Get the code

In cPanel → **Terminal**:

```bash
cd ~
git clone https://github.com/amiryogi/sms.git
```

(Or cPanel → Git Version Control → Create, same URL, path `sms`.) The app runs from
`~/sms/backend`.

### 2.3 Create the Node.js app

cPanel → **Setup Node.js App** → Create Application:

| Field | Value |
|---|---|
| Node.js version | 22 (or the highest offered; at least 18) |
| Application mode | Production |
| Application root | `sms/backend` |
| Application URL | `sms.nevanhandicraft.com.np` |
| Application startup file | `src/server.js` |

Click **Create**, then copy the command shown at the top ("Enter to the virtual
environment"). It looks like
`source /home/<user>/nodevenv/sms/backend/22/bin/activate && cd /home/<user>/sms/backend`.

Leave the environment-variable list in this screen empty. The settings live in a `.env`
file (next step), so Passenger and the commands you run in Terminal read the same values.

### 2.4 The `.env` file

Create `~/sms/backend/.env`:

```bash
cd ~/sms/backend
nano .env          # paste the block below, filled in
chmod 600 .env
```

```bash
NODE_ENV=production
DATABASE_PROVIDER=supabase
SUPABASE_DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=5"
SUPABASE_DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"

# Two NEW secrets; never reuse old ones. Generate each with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<64 hex characters>
JWT_REFRESH_SECRET=<a different 64 hex characters>
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# The Vercel address; add a custom domain later, comma-separated.
FRONTEND_URL=https://vidyalaya-sms.vercel.app

UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

- **Cloudinary:** leave the `CLOUDINARY_*` lines out. Uploads are then stored in
  `~/sms/backend/uploads`. The folder is gitignored, so `git pull` never touches it.
- **Proxy:** `TRUST_PROXY_HOPS` is not needed. Apache → Passenger is one proxy hop, which is
  the production default (`backend/src/app.js`).
- **Required settings:** the server refuses to start in production without the JWT secrets.

### 2.5 Install, migrate, seed

In Terminal, **inside the virtual environment** (the command from 2.3):

```bash
npm ci                       # also generates the Prisma clients for this server
npm run db:migrate:deploy    # creates the tables in the new project
npm run db:status            # "Database schema is up to date!"
npm run seed                 # demo school, demo users, demo fees
```

- **If `npm ci` is killed** (CloudLinux memory limits during `prisma generate`), run it again.
  If it keeps failing, ask Nest Nepal to raise the account's memory limit for the install.
- **The seed** took about 16 minutes from a PC in Nepal. From the server it is as fast as the
  route to Supabase allows.
- `npm run seed` never wipes data. `--clean` against this database is refused without
  `--yes-really`. **Do not use it in production.**

### 2.6 Start and check

Setup Node.js App → **Restart**. Then:

```bash
curl https://sms.nevanhandicraft.com.np/health      # {"status":"ok",...}
```

If it fails, read `~/sms/backend/stderr.log` (Passenger writes it there) or the log path the
Node.js App screen shows.

### 2.7 Lock down the demo accounts

The seeded password `password123` is written in this public repository.

1. Sign in on the frontend as **`superadmin`**, then as **`admin`**. Change each password from the
   name menu at the top right → **Change password** (`/account/password`), and keep the new
   ones somewhere safe.
2. The other demo logins (`teacher1`…`teacher8`, `examofficer`, `accountant`, students such as
   `stu20240001`, parents such as `p.stu20240001`) can keep `password123` for showing clients.
   Reset them from Teachers / Students when the system is handed to a real school.

---

## 3. Frontend on Vercel

1. vercel.com → **Add New → Project** → import the GitHub repository `amiryogi/sms`.
2. **Project Name:** `vidyalaya-sms`. This gives `https://vidyalaya-sms.vercel.app`. If that
   name is taken, use another and put the address you get into `FRONTEND_URL`.
3. **Root Directory:** `frontend`. Framework preset: **Vite**. `frontend/vercel.json` sets the
   build, the output folder, long caching for `/assets/*`, and the fallback of every path to
   `index.html`.
4. **Settings → General → Node.js Version:** 22.x.
5. **Environment Variables** (Production). Both are read at **build time**: change them →
   redeploy.

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://sms.nevanhandicraft.com.np/api/v1` |
   | `VITE_DEFAULT_SCHOOL_CODE` | `DEMO001` |

6. **Deploy.** Every push to `main` redeploys.

**Custom domain later:**
1. Add it in Vercel → Settings → Domains, and the DNS record Vercel asks for.
2. Append the domain to `FRONTEND_URL` on the server, comma-separated, then restart the app.

---

## 4. Check the deployment

1. `https://sms.nevanhandicraft.com.np/health` returns 200.
2. CORS allows the frontend. The response must contain
   `Access-Control-Allow-Origin: https://vidyalaya-sms.vercel.app`:
   ```bash
   curl -si -X OPTIONS https://sms.nevanhandicraft.com.np/api/v1/auth/login \
     -H "Origin: https://vidyalaya-sms.vercel.app" -H "Access-Control-Request-Method: POST" | grep -i access-control
   ```
3. On `https://vidyalaya-sms.vercel.app`:
   - the public pages and their screenshots load;
   - opening `/finance/accounts` directly and reloading shows the app (sign-in), not a 404;
   - each role signs in: the admin with its new password, `teacher1`, `accountant`,
     `stu20240001`, `p.stu20240001`;
   - the browser console shows no errors.
4. School Settings → Branding: upload a logo. It is served from
   `https://sms.nevanhandicraft.com.np/uploads/…` and shows on the sign-in page and on a
   report card.
5. Record a fee payment and print the receipt. Print a report card: one A4 page.
6. Note how long typical pages take, to judge the region (§7).

---

## 5. Upgrades

**Frontend:** pushing to `main` redeploys it.

**Backend**, in Terminal inside the virtual environment:

```bash
cd ~/sms && git pull
cd backend
npm ci                       # only needed when package-lock.json changed, but always safe
npm run db:migrate:deploy    # applies new migrations, if any
```

Then **Restart** in Setup Node.js App.

Order matters when a release changes the schema: migrate before the frontend that needs it goes
live.

---

## 6. Backups

**Supabase free plan:** it has no backups, and it pauses a project after about a week without
traffic. Resume a paused project from the dashboard.

**Database:** weekly, and before every migration, dump it from a machine that has PostgreSQL's
client tools:

```bash
pg_dump "<SUPABASE_DIRECT_URL>" --no-owner --format=custom -f sms-prod-$(date +%F).dump
```

**Uploaded files:** copy `~/sms/backend/uploads` as well, with cPanel → Backup or by downloading
the folder.

Keep backups off the server and **never in the repository**. The restore drill is in
[database/supabase-deployment.md](database/supabase-deployment.md) §5.

---

## 7. Limits and trade-offs

- **Latency:** each API call makes several queries from the cPanel server to Supabase.
  - If pages feel slow, measure again (§1.1).
  - The fix is a backend host in the same region as the database, not a code change.
- **Vercel Hobby plan:** it is for non-commercial use. Move to Pro for a paying client.
- **Supabase free plan:** it pauses when idle and has connection limits.
  - `connection_limit=5` keeps the app well inside those limits.
  - A transient `P1017` error ("server has closed the connection") recovers on the next
    request.
- **Login rate limit:** it is held in memory, so it resets when the app restarts.
- **Uploads:** at most 10 MB each, stored on the cPanel disk, so include them in backups.
