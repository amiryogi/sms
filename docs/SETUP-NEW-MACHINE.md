# Setting up on a new machine

Everything needed to go from a fresh clone to a running system. Takes about ten
minutes, most of it waiting on `npm install`.

The database is **not** carried between machines. The schema is in version
control as a Prisma migration and the demo data comes from the seed script, so
each machine builds its own local copy. Nothing is lost by this — the only data
in it is seeded demo data.

## 1. Prerequisites

| | |
|---|---|
| Node | ≥ 18 (developed on 22.19.0) |
| MySQL | 8.0 or newer (school machine runs 26.10; both work with Prisma 5.22) |
| Git | any recent version |

## 2. Clone and install

```bash
git clone https://github.com/amiryogi/sms.git
cd sms
cd backend  && npm install
cd ../frontend && npm install
```

## 3. Create the database and a user

Open a MySQL shell as root (on Windows the client is usually at
`C:\Program Files\MySQL\MySQL Server <version>\bin\mysql.exe` and may not be on
`PATH`):

```sql
CREATE DATABASE school_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sms'@'localhost' IDENTIFIED BY '<pick a password>';
GRANT ALL PRIVILEGES ON school_management.* TO 'sms'@'localhost';

-- Prisma needs to create a temporary "shadow database" for `migrate dev`.
-- Without this, migrate dev fails with P3014 and you have to use the
-- workaround in section 6.
GRANT ALL PRIVILEGES ON *.* TO 'sms'@'localhost';

FLUSH PRIVILEGES;
```

**Do not reuse any password that has ever been in this repository.** Earlier
commits contain a real `DATABASE_URL`, `JWT_SECRET` and `JWT_REFRESH_SECRET`;
they are published on GitHub and must be treated as burned.

## 4. Environment files

Both `.env` files are gitignored on purpose. Create them from the examples:

```bash
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
```

Then edit `backend/.env`:

- `DATABASE_PROVIDER=mysql` and `MYSQL_DATABASE_URL` — your new user and password.
  URL-encode any `@ : / #` in the password (`@` → `%40`, and so on). For a Supabase
  (PostgreSQL) install use `DATABASE_PROVIDER=supabase` with `SUPABASE_DATABASE_URL` and
  `SUPABASE_DIRECT_URL` instead: follow `docs/database/supabase-deployment.md`. The server refuses
  to start without a valid provider and URL.
- `JWT_SECRET` and `JWT_REFRESH_SECRET` — generate fresh ones, never copy them
  between machines:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Changing these invalidates existing logins, which is fine on a new machine.
  In production the app now refuses to start if either is missing.

`frontend/.env` usually needs no edit — the default API URL is correct.

## 5. Create the schema and seed

```bash
cd backend
npm install                  # also generates both Prisma clients (MySQL and PostgreSQL)
npm run db:migrate:deploy    # MySQL: 0_init and 7 later migrations, 45 tables
npm run seed                 # demo school, roles, classes 1-10, students, exams
```

`db:migrate:deploy` applies the committed migrations of the configured provider
(`prisma/mysql/migrations` or `prisma/postgresql/migrations`) without trying to create a
shadow database, so it works whether or not you ran the extra `GRANT`.

**Upgrading an existing install** to the two-provider layout: add
`DATABASE_PROVIDER=mysql` and rename `DATABASE_URL` to `MYSQL_DATABASE_URL` in
`backend/.env`, run `npm install`, then `npm run db:status`. It reports "up to date"; the
database itself does not change.

## 6. If `prisma migrate dev` fails with P3014

That error means the MySQL user cannot create the shadow database. Either run
the `GRANT ALL PRIVILEGES ON *.*` from section 3, or write the migration as a
diff between the committed schema and your edited one (no database needed), then
apply it like any other:

```bash
cd backend
# edit prisma/schema/models.prisma, then:
npm run db:schemas
git show HEAD:backend/prisma/mysql/schema.prisma > /tmp/schema-before.prisma
mkdir -p prisma/mysql/migrations/<timestamp>_<name>
npx prisma migrate diff \
  --from-schema-datamodel /tmp/schema-before.prisma \
  --to-schema-datamodel   prisma/mysql/schema.prisma \
  --script > prisma/mysql/migrations/<timestamp>_<name>/migration.sql
# ... and the same for prisma/postgresql/ (one migration per provider)
node scripts/with-test-db.js npm run db:migrate:deploy   # try it on the test DB first
npm run db:migrate:deploy
```

Read the generated SQL before applying it, and never use `db push`: the change
would not travel to other machines.

The `GRANT` is much less trouble. Do that instead if you can.

## 7. Run it

```bash
cd backend  && npm run dev     # http://localhost:5000  (health: /health)
cd frontend && npm run dev     # http://localhost:5173
```

**Backend crashes with `listen EACCES: permission denied 0.0.0.0:5000`?** Windows
has reserved port 5000 on that machine (check with
`netsh interface ipv4 show excludedportrange protocol=tcp`). Use another port:
set `PORT=5001` in `backend/.env`, and in `frontend/.env` set
`VITE_API_URL=http://localhost:5001/api/v1`. Restart both servers — Vite reads
`.env` only at startup.

Demo logins, all with password `password123`:

| Role | Email |
|---|---|
| Super admin | `superadmin@svi.edu.np` |
| Admin | `admin@svi.edu.np` |
| Teacher | `teacher1@svi.edu.np` … `teacher8@svi.edu.np` |
| Exam officer | `examofficer@svi.edu.np` |
| Accountant | `accountant@svi.edu.np` |
| Student | `student1@svi.edu.np` … `student30@svi.edu.np` |
| Parent | `parent.stu2024xxxx@svi.edu.np` |

## 8. Check it works

```bash
cd backend && npm test          # 377 unit tests, no database needed
cd backend && npm run lint
cd frontend && npm run build
```

Then log in as admin and open **Report Cards** → pick an exam, Grade 10,
section A → Generate → View. A report card should render with real grades.

## Moving between machines

Commit and push before you leave; pull when you arrive. The database does not
travel, and does not need to:

```bash
# leaving
git add -A && git commit -m "wip: <what you were doing>" && git push

# arriving
git pull
cd backend && npm install && npm run db:migrate:deploy
```

Run `db:migrate:deploy` after every pull — if someone added a migration, this
applies it (`npm install` regenerates the clients). If the schema changed in a way that
confuses your local data, the fastest reset is `npm run seed -- --clean --yes-really`
(`--clean` alone is refused outside a test database).

## Syncing the database

**Never commit a database dump.** A dump of a live school database contains
student and parent names, email addresses and bcrypt password hashes, and this
repository is public. The repo root is gitignored for `*.sql` to make that
mistake harder.

Pick whichever matches the data you have:

### While the data is seeded demo data — don't sync

There is nothing to carry. `npm run db:migrate:deploy && npm run seed` rebuilds
an identical database in seconds on any machine and any supported MySQL
version. This is the default and needs no setup.

### Once you have real data — dump to cloud storage

```bash
# before leaving
"C:\Program Files\MySQL\MySQL Server <version>\bin\mysqldump.exe" -u sms -p \
  --single-transaction --routines school_management > "%USERPROFILE%\OneDrive\sms-backup.sql"

# after arriving
"C:\Program Files\MySQL\MySQL Server <version>\bin\mysql.exe" -u sms -p \
  school_management < "%USERPROFILE%\OneDrive\sms-backup.sql"
```

OneDrive, Google Drive or a USB stick — anywhere outside the repository.

One portability note: this database uses `utf8mb4_unicode_ci`, which restores
cleanly into MySQL 8.0 and newer. If a future machine creates the database with
a newer default collation (`utf8mb4_0900_ai_ci` or later), dumps stop being
backward compatible — so keep creating the database with the explicit
`CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` from section 3.

### Best once the data matters — one shared database

Point every machine at the same hosted database: MySQL on your own host, or a Supabase
project with `DATABASE_PROVIDER=supabase` (Aiven's and PlanetScale's free MySQL tiers are
gone). Each machine keeps its own `.env`, with the same URL. No dumps, no drift, no question about which copy is newer, and
it is how the system would run for a real school. The trade-off is needing
internet to work and slower queries than localhost.
