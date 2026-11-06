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

- `DATABASE_URL` — your new user and password. URL-encode any `@ : / #` in the
  password (`@` → `%40`, and so on).
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
npx prisma generate
npx prisma migrate deploy    # applies 0_init, creating all 35 tables
npm run seed                 # demo school, roles, classes 1-10, students, exams
```

`migrate deploy` is the right command here: it applies committed migrations
without trying to create a shadow database, so it works whether or not you ran
the extra `GRANT`.

## 6. If `prisma migrate dev` fails with P3014

That error means the MySQL user cannot create the shadow database. Either run
the `GRANT ALL PRIVILEGES ON *.*` from section 3, or use the baseline workaround
to record a schema change without a shadow database:

```bash
cd backend
mkdir -p prisma/migrations/<timestamp>_<name>
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel  prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_<name>/migration.sql
npx prisma db push
npx prisma migrate resolve --applied <timestamp>_<name>
```

The `GRANT` is much less trouble. Do that instead if you can.

## 7. Run it

```bash
cd backend  && npm run dev     # http://localhost:5000  (health: /health)
cd frontend && npm run dev     # http://localhost:5173
```

Demo logins, all with password `password123`:

| Role | Email |
|---|---|
| Admin | `admin@svi.edu.np` |
| Teacher | `teacher1@svi.edu.np` … `teacher8@svi.edu.np` |
| Exam officer | `examofficer@svi.edu.np` |
| Accountant | `accountant@svi.edu.np` |
| Student | `student1@svi.edu.np` … `student30@svi.edu.np` |
| Parent | `parent.stu2024xxxx@svi.edu.np` |

## 8. Check it works

```bash
cd backend && npm test          # 244 unit tests, no database needed
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
cd backend && npx prisma migrate deploy && npx prisma generate
```

Run `migrate deploy` after every pull — if someone added a migration, this
applies it. If the schema changed in a way that confuses your local data, the
fastest reset is `npm run seed -- --clean`.
