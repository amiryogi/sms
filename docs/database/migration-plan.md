# Migration plan: two providers, two histories, one model

## Principles

- `prisma/schema/models.prisma` is the only file where models change. The two provider schemas
  are generated from it.
- **MySQL** keeps its existing history unchanged. Existing MySQL databases need **no migration**
  to run the dual-provider version of the app.
- **PostgreSQL** gets its own history, starting from a baseline that equals today's schema.
- Every later schema change ships as **two** migration folders, one per provider, generated in
  the same commit.
- Nothing destructive runs automatically. Resetting a database or wiping data needs explicit
  flags and is refused against non-test databases.

## Step 1: move the MySQL history (Phase 3)

```
prisma/migrations/*  →  prisma/mysql/migrations/*      (git mv; contents untouched)
prisma/migrations/migration_lock.toml → prisma/mysql/migrations/migration_lock.toml  (provider = "mysql")
```

- `_prisma_migrations` stores migration **names** and checksums, not paths, so existing
  databases see the same history.
- **Check:** `npm run db:status` on the dev and test MySQL databases reports "Database schema
  is up to date" both before and after the move.

## Step 2: PostgreSQL baseline (Phase 4)

```bash
# no database needed: diff from nothing to the shared model
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/postgresql/schema.prisma \
  --script > prisma/postgresql/migrations/0_init/migration.sql
# + prisma/postgresql/migrations/migration_lock.toml  (provider = "postgresql")
```

- The baseline contains the final shape only. The MySQL history's intermediate steps and the
  `fee_ledger` backfill are not needed, because a new PostgreSQL database starts empty.
- **Check:**
  1. `migrate deploy` into the empty test PostgreSQL database (Supabase test project, direct
     URL);
  2. `migrate diff --from-url <test db> --to-schema-datamodel prisma/postgresql/schema.prisma`
     must print an empty migration.

## Step 3: initialising a new deployment

**MySQL client:**
```bash
DATABASE_PROVIDER=mysql  MYSQL_DATABASE_URL=...
npm run db:migrate:deploy      # applies the 8 MySQL migrations
npm run seed                   # roles, permissions, demo school, presets (idempotent)
```

**Supabase client:**
1. Create a Supabase project. Copy the pooled connection string (port 6543) and the direct
   one (port 5432) from Project Settings → Database.
2. Run:
   ```bash
   DATABASE_PROVIDER=supabase  SUPABASE_DATABASE_URL=...pooled...  SUPABASE_DIRECT_URL=...direct...
   npm run db:migrate:deploy      # applies postgresql/migrations via the direct URL
   npm run seed
   ```
3. Supabase's own schemas (`auth`, `storage`, ...) are untouched; the app uses `public` only.

**Existing MySQL deployment upgrading to this version:**
1. Add `DATABASE_PROVIDER=mysql` and rename `DATABASE_URL` → `MYSQL_DATABASE_URL` in `.env`.
2. Run `npm install`, which generates both clients.
3. Run `npm run db:status`. It must report "up to date"; there is nothing to apply.

## Step 4: changing the schema later (the "add a field to both" workflow)

1. Edit `prisma/schema/models.prisma` only.
2. Run `npm run db:migrate:new -- add_student_blood_group`, which:
   - rebuilds both schema files;
   - writes `prisma/mysql/migrations/<ts>_add_student_blood_group/migration.sql` with
     `migrate diff` from the MySQL history to the new MySQL schema (through a shadow database
     if you have the `GRANT`, else from the previously committed schema file);
   - writes the PostgreSQL migration the same way, under the same `<ts>_<name>`.
3. Read both SQL files. Data migrations (backfills) are hand-written in **both** dialects, in
   the same files.
4. Apply them to both test databases (`node scripts/with-test-db.js --provider mysql|pg npm
   run db:migrate:deploy`) and run both integration suites.
5. Commit the model change and both migration folders together. CI rejects:
   - stale generated schema files (`db:schemas:check`);
   - a history that doesn't reproduce the schema (the deploy and drift check on both
     engines).

## Guards against hitting the wrong database

- `src/database/config.js` refuses a URL whose scheme doesn't match `DATABASE_PROVIDER`.
- `scripts/db.js`:
  - prints the provider and `host/db` before running;
  - uses the direct URL for Supabase migrations;
  - refuses `migrate reset`, `db push` and `seed --reset` unless both hold: `--yes-really`
    is given, and the target is a test database (its name ends in `_test`, or it is one of the
    `*_TEST_*` URLs).
- `scripts/with-test-db.js` refuses any test URL equal to a configured app URL (same host and
  database), for either provider.
- **`db push` is not offered:** it changes a database without recording a migration.

## Data movement between providers

- **Not in scope:** moving an existing school's data from MySQL to Supabase.
- **If it is ever needed:**
  1. deploy the PostgreSQL baseline;
  2. copy the data table by table, in foreign-key order, with a one-off script that reads
     through the MySQL client and writes through the PostgreSQL client;
  3. reset each sequence to `MAX(id)`;
  4. run `scripts/reconcile.js` and row-count checks.

## Backups

- **MySQL:** `mysqldump --single-transaction --routines` before every `db:migrate:deploy` in
  production, kept off the server.
- **Supabase:**
  - daily backups on paid plans; the free plan has none;
  - otherwise `pg_dump` over the direct URL before migrations.
- **Restore drill:** restore into a `_test` database and run `reconcile.js`.
