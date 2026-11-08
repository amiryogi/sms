# Deploying with Supabase (PostgreSQL)

How to run a new school on Supabase instead of MySQL. The app, its API and its security are the
same. Supabase is used **only as a PostgreSQL server** that the Express backend connects to:
- no Supabase Auth, no Row Level Security, no Supabase client in the browser;
- the database URLs never leave the server.

For MySQL, follow [../SETUP-NEW-MACHINE.md](../SETUP-NEW-MACHINE.md).

## 1. Create the project

1. In the Supabase dashboard, create a project.
2. Set a database password without `@ : / # ?`. Otherwise you'll have to URL-encode it in every
   connection string.
3. Pick the region closest to the school (for Nepal: **ap-south-1, Mumbai**, or
   **ap-southeast-1, Singapore**). Every query makes a round trip there, so latency matters
   more than anything else (see §6).
4. Keep one project per school. Use a **separate project for tests**; never run the test suites
   or `seed --clean` against a school's project.

## 2. Connection strings

Open Project Settings → Database (or **Connect** → Direct connection string) and choose the
**URI** type.

| Variable | Connection method | Port | Append |
|---|---|---|---|
| `SUPABASE_DATABASE_URL` | Transaction pooler | 6543 | `?pgbouncer=true&sslmode=require` (+ `&connection_limit=1` on serverless hosts) |
| `SUPABASE_DIRECT_URL` | Direct connection, or **Session pooler** if the server has no IPv6 | 5432 | `?sslmode=require` |

- The app runs its queries through the transaction pooler.
- Migrations use the direct URL, because the transaction pooler can't run them.
- The direct host (`db.<project>.supabase.co`) is **IPv6-only**. Many hosts and home networks
  have no IPv6. If `npm run db:status` cannot reach it, use the Session pooler string (pooler
  host, port 5432) as `SUPABASE_DIRECT_URL`; migrations work through it.

`backend/.env`:

```bash
DATABASE_PROVIDER=supabase
SUPABASE_DATABASE_URL="postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
SUPABASE_DIRECT_URL="postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
# plus the usual NODE_ENV, PORT, JWT_SECRET, JWT_REFRESH_SECRET, FRONTEND_URL ...
```

Don't set `MYSQL_DATABASE_URL` on a Supabase install. If you do, startup only warns that it is
ignored.

## 3. Create the schema and seed

```bash
cd backend
npm install                  # generates both Prisma clients
npm run db:migrate:deploy    # applies prisma/postgresql/migrations (baseline 0_init: 45 tables)
npm run db:status            # "Database schema is up to date!"
npm run seed                 # roles, permissions, school, grade scales, classes, demo data
npm start
```

- The seed writes demo users, all with password `password123`. For a real school, change the
  super admin and admin passwords straight away, then replace the demo data with the school's
  own.
- `npm run seed -- --clean` wipes everything first. Against a database that isn't a test
  database it is refused unless `--yes-really` is added.

## 4. Upgrades

Same as MySQL:
1. pull;
2. `npm install`;
3. `npm run db:migrate:deploy`.

Every schema change ships one migration for each provider (`prisma/postgresql/migrations/`), so
a Supabase install never needs MySQL SQL.

## 5. Backups and restore

- **Paid plans:** daily backups, and point-in-time recovery on higher tiers.
- **Free plan:** no backups. Before every migration, and on a schedule, run:
  ```bash
  pg_dump "<SUPABASE_DIRECT_URL>" --no-owner --format=custom -f sms-$(date +%F).dump
  ```
  Keep the file off the server, and never in the repository.
- **Restore drill:**
  1. restore into the **test** project
     (`pg_restore --no-owner -d "<test direct URL>" sms-….dump`);
  2. run `node scripts/reconcile.js` against it (through `scripts/with-test-db.js --provider pg`).

## 6. Performance and limits

- **Latency dominates.**
  - From Nepal, each query to Singapore takes about 0.1–0.2 s, and API calls that run several
    queries took 2–5 s in our tests.
  - The seed takes about 16 minutes against Supabase, and seconds locally.
  - Host the **backend** in or near the Supabase region (same cloud region if possible), not in
    the school. The browser then makes one slow hop, and the backend's many queries stay fast.
- **The free plan** pauses a project after about a week without activity. Resume it from the
  dashboard. It also has connection limits; keep `connection_limit` low on serverless hosts.
- **A dropped connection** under load surfaces as Prisma `P1017` ("server has closed the
  connection"). It is transient: the next request reconnects.

## 7. What behaves the same, and what differs

The shared code makes both providers behave alike (see
[mysql-postgresql-compatibility.md](mysql-postgresql-compatibility.md)):
- **Same:**
  - searches ignore upper/lower case;
  - school and subject codes match regardless of case;
  - lists have explicit order, and students without a roll number come first;
  - receipt numbers stay gap-free;
  - money stays exact.
- **One accepted difference:** PostgreSQL's unique indexes are case-sensitive. A subject code
  `math` next to `MATH` is still refused by the API, but not by the database itself if rows are
  inserted outside the app.

## 8. Tested

- **Supabase test project** (PostgreSQL 17, en_US.UTF-8):
  - baseline migration and drift check;
  - seed;
  - all 80 integration tests: fee ledger, database level, HTTP API;
  - `reconcile`;
  - the browser sweep for every role against a PostgreSQL-backed server.
- **CI** runs the same suites on PostgreSQL 16 and MySQL 8 containers for every push
  (`.github/workflows/ci.yml`).
