# Dual-database audit (MySQL 8 → MySQL 8 + Supabase PostgreSQL)

Phase 1 of the dual-database work. Read-only: nothing in the code changed while this was written.

- **Date:** 2026-11-08, at commit `978de22`.
- **Companion docs:**
  - [mysql-postgresql-compatibility.md](mysql-postgresql-compatibility.md): each incompatibility
    and its fix;
  - [architecture-proposal.md](architecture-proposal.md);
  - [migration-plan.md](migration-plan.md);
  - [testing-plan.md](testing-plan.md).

## 1. Summary

1. **The provider is already isolated in one place.**
   - `backend/src/config/database.js` creates the only shared `PrismaClient`, and every
     controller and service imports it.
   - Five more files touch `@prisma/client` directly (section 3).
2. **The schema is portable.**
   - Every field type and every `@db` attribute in `schema.prisma` exists on both MySQL and
     PostgreSQL. Only the `datasource` and `generator` blocks differ, so one model body can
     serve both providers.
3. **Where behaviour actually differs:**
   - one MySQL-only raw statement (`INSERT IGNORE`);
   - MySQL-only statements in the seed's reset;
   - 12 text filters and 3 code lookups that rely on MySQL's case-insensitive collation;
   - list queries that rely on InnoDB returning rows in id order;
   - NULL sort order;
   - the MySQL-only integration-test helper and migration history.
4. **Nothing in authentication, RBAC, `schoolId` / `academicYearId` scoping, grading or the
   exam lifecycle depends on the database engine.**

## 2. Schema inventory

`backend/prisma/schema.prisma`:
- 45 models and 21 enums;
- 44 `@default(autoincrement())` primary keys and 1 composite primary key (`ReceiptSequence`);
- 29 unique constraints and 137 indexes;
- relations: 68 `Cascade`, 37 `Restrict`, 8 `SetNull`.

`@db` attributes used, all valid on both providers:

| Attribute | Count | MySQL column | PostgreSQL column |
|---|---|---|---|
| `@db.VarChar(n)` | 77 | `VARCHAR(n)` | `VARCHAR(n)` |
| `@db.Text` | 15 | `TEXT` (64 KB) | `TEXT` (unbounded) |
| `@db.Decimal(p,s)` | 25 | `DECIMAL(p,s)` | `DECIMAL(p,s)` |
| `@db.Date` | 12 | `DATE` | `DATE` |
| `@db.Time` | 2 | `TIME` | `TIME` |

Unannotated types:

| Type | MySQL | PostgreSQL |
|---|---|---|
| `DateTime` | `DATETIME(3)` | `TIMESTAMP(3)` (no time zone; Prisma writes UTC on both) |
| `Boolean` | `TINYINT(1)` | `BOOLEAN` |
| `Json` (3 fields: `School.reportCardConfig`, `SubjectAudit.oldValue` / `newValue`) | `JSON` | `JSONB` |
| Enums (21) | inline `ENUM(...)` columns | named `CREATE TYPE ... AS ENUM` |
| `Int @default(autoincrement())` | `AUTO_INCREMENT` | `SERIAL` (sequence) |

No `Float`, `BigInt`, `Bytes`, `Unsupported`, unsigned integers or full-text indexes are used.

**Reserved words:** `rank` is already mapped to `class_rank`. No other column or table name
collides with a PostgreSQL reserved word. The table `users` is a plain identifier in PostgreSQL.

### Models

| Model | Table | Scalars | Relations | Decimal | Date/Time | Text | Json | Unique | Index |
|---|---|---|---|---|---|---|---|---|---|
| School | `schools` | 21 | 0 | 0 | 0 | 1 | 1 | 1 | 2 |
| GradeScale | `grade_scales` | 7 | 1 | 1 | 0 | 0 | 0 | 1 | 1 |
| GradeBand | `grade_bands` | 8 | 1 | 3 | 0 | 0 | 0 | 1 | 1 |
| Role | `roles` | 4 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Permission | `permissions` | 5 | 0 | 0 | 0 | 0 | 0 | 1 | 2 |
| RolePermission | `role_permissions` | 4 | 2 | 0 | 0 | 0 | 0 | 1 | 2 |
| User | `users` | 14 | 20 | 0 | 0 | 0 | 0 | 1 | 4 |
| UserRole | `user_roles` | 4 | 2 | 0 | 0 | 0 | 0 | 1 | 2 |
| AcademicYear | `academic_years` | 8 | 3 | 0 | 2 | 0 | 0 | 1 | 3 |
| Class | `classes` | 7 | 3 | 0 | 0 | 1 | 0 | 1 | 2 |
| Section | `sections` | 5 | 1 | 0 | 0 | 0 | 0 | 1 | 1 |
| Subject | `subjects` | 9 | 1 | 1 | 0 | 1 | 0 | 1 | 2 |
| ClassSubject | `class_subjects` | 15 | 3 | 3 | 0 | 0 | 0 | 1 | 4 |
| TeacherSubject | `teacher_subjects` | 7 | 4 | 0 | 0 | 0 | 0 | 1 | 5 |
| Student | `students` | 12 | 2 | 0 | 2 | 1 | 0 | 1 | 4 |
| StudentClass | `student_classes` | 9 | 5 | 0 | 0 | 0 | 0 | 1 | 7 |
| Parent | `parents` | 8 | 2 | 0 | 0 | 1 | 0 | 1 | 2 |
| StudentParent | `student_parents` | 7 | 3 | 0 | 0 | 0 | 0 | 1 | 3 |
| Attendance | `attendance` | 10 | 4 | 0 | 1 | 1 | 0 | 1 | 7 |
| Exam | `exams` | 13 | 3 | 0 | 2 | 0 | 0 | 0 | 6 |
| ExamSubject | `exam_subjects` | 13 | 2 | 0 | 3 | 0 | 0 | 1 | 3 |
| ExamResult | `exam_results` | 14 | 5 | 2 | 0 | 1 | 0 | 1 | 6 |
| ReportCard | `report_cards` | 17 | 4 | 2 | 0 | 2 | 0 | 1 | 6 |
| Assignment | `assignments` | 9 | 1 | 0 | 1 | 1 | 0 | 0 | 3 |
| AssignmentFile | `assignment_files` | 7 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Submission | `submissions` | 13 | 5 | 1 | 0 | 2 | 0 | 1 | 6 |
| SubmissionFile | `submission_files` | 7 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Notice | `notices` | 14 | 2 | 0 | 0 | 1 | 0 | 0 | 5 |
| NoticeRoleTarget | `notice_role_targets` | 4 | 2 | 0 | 0 | 0 | 0 | 1 | 2 |
| NoticeClassTarget | `notice_class_targets` | 6 | 4 | 0 | 0 | 0 | 0 | 1 | 4 |
| NoticeAttachment | `notice_attachments` | 7 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Promotion | `promotions` | 11 | 6 | 0 | 0 | 1 | 0 | 0 | 5 |
| FeeType | `fee_types` | 10 | 3 | 0 | 0 | 1 | 0 | 1 | 3 |
| FeeStructure | `fee_structures` | 11 | 6 | 1 | 0 | 0 | 0 | 1 | 6 |
| FeeObligation | `fee_payments` | 16 | 6 | 3 | 0 | 0 | 0 | 1 | 4 |
| SubjectAudit | `subject_audits` | 8 | 0 | 0 | 0 | 0 | 2 | 0 | 4 |
| RefreshToken | `refresh_tokens` | 9 | 1 | 0 | 0 | 0 | 0 | 1 | 4 |
| FeeStructureInstallment | `fee_structure_installments` | 7 | 1 | 1 | 1 | 0 | 0 | 1 | 0 |
| FeeInstallment | `fee_installments` | 12 | 2 | 3 | 1 | 0 | 0 | 1 | 2 |
| FeeTransaction | `fee_transactions` | 19 | 9 | 1 | 1 | 0 | 0 | 3 | 3 |
| FeeAllocation | `fee_allocations` | 4 | 2 | 1 | 0 | 0 | 0 | 0 | 2 |
| FeeReversalRequest | `fee_reversal_requests` | 12 | 5 | 0 | 0 | 0 | 0 | 0 | 2 |
| FeeDiscount | `fee_discounts` | 20 | 7 | 1 | 0 | 0 | 0 | 0 | 2 |
| FeeDiscountApplication | `fee_discount_applications` | 4 | 2 | 1 | 0 | 0 | 0 | 1 | 1 |
| ReceiptSequence | `receipt_sequences` | 4 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |

"Scalars" counts columns; "Relations" counts `@relation` fields on that model.

### Enums

`UserStatus`, `Gender`, `StudentClassStatus`, `AttendanceStatus`, `ExamType`,
`SubmissionStatus`, `PromotionStatus`, `Relationship`, `TargetAudience`, `NoticePriority`,
`NoticeStatus`, `NoticeTargetType` (`GLOBAL`, `ROLE_SPECIFIC`, `CLASS_SPECIFIC`), `ExamStatus`
(`DRAFT`, `PUBLISHED`, `LOCKED`), `PaymentStatus`, `FeeTxnType`, `PaymentMethod`,
`DiscountKind`, `DiscountCategory`, `ApprovalStatus`, `ReversalCategory`, `SubjectAuditAction`.

Prisma maps enums to native types on both providers, and the values are the same strings. On
PostgreSQL, a later migration that adds an enum value is an `ALTER TYPE ... ADD VALUE`. That
cannot run inside a transaction block on PostgreSQL versions before 12; Supabase runs 15+, so
this is fine.

## 3. How the backend reaches the database

| File | What it takes from `@prisma/client` | Note |
|---|---|---|
| `src/config/database.js` | `PrismaClient` | The shared instance, imported by every controller and service (and mocked by the middleware and grade-scale unit tests) |
| `src/server.js` | `PrismaClient` | Creates a second client only to test the connection at startup. It should use the shared one |
| `src/utils/money.js` | `Prisma.Decimal` | Pure utility, unit-tested without a database |
| `src/services/finance/balances.js` | `Prisma.join`, `Prisma.TransactionIsolationLevel` | Row locks and READ COMMITTED transactions |
| `src/controllers/reportCardLayout.controller.js` | `Prisma.DbNull` | Resets the JSON layout to `NULL` |
| `prisma/seed.js` | `PrismaClient` | Seeding |
| `prisma/seeds/comprehensiveSeed.js` | `PrismaClient` | Already broken (writes the dropped +2 tables); not wired to any script |

### Raw SQL (all in the fee ledger and the seed)

| Location | Statement | PostgreSQL |
|---|---|---|
| `services/finance/balances.js:23` | `SELECT id FROM fee_installments WHERE id IN (...) ORDER BY id FOR UPDATE` | Works as is |
| `services/finance/ledger.service.js:44` | `INSERT IGNORE INTO receipt_sequences ...` | **MySQL-only syntax** |
| `services/finance/ledger.service.js:45-46` | `SELECT next_number ... FOR UPDATE`; `UPDATE receipt_sequences SET next_number = next_number + 1` | Works as is |
| `services/finance/ledger.service.js:171` | `SELECT id FROM fee_transactions WHERE id = ... FOR UPDATE` | Works as is |
| `prisma/seed.js:86-104` | `SET FOREIGN_KEY_CHECKS = 0/1`; ``TRUNCATE TABLE `name` `` | **MySQL-only** (the variable and the backtick quoting) |

### Transactions and error codes

- **Transactions:** `balances.withTransaction` uses an interactive transaction with
  `isolationLevel: ReadCommitted`, `maxWait: 10000` and `timeout: 20000`. It retries on `P2034`
  or a message matching `/deadlock|lock wait timeout/`. Prisma reports PostgreSQL deadlocks
  (`40P01`) and serialization failures (`40001`) as `P2034`, so the retry still triggers.
- **Idempotent payments:** `ledger.service.js:157` treats `P2002` as a replay when
  `String(error.meta.target)` contains `"idempotency"`.
  - On MySQL, `target` is the index name (`fee_transactions_school_id_idempotency_key_key`).
  - On PostgreSQL it is the column list (`["school_id", "idempotency_key"]`), whose string
    form still contains `idempotency`.
  - Behaviour is kept, but it needs a PostgreSQL test.
- **Error middleware:** `error.middleware.js` handles `P2002` / `P2003` / `P2025` without
  depending on the provider. It already copes with both forms of `target`.

## 4. Case-sensitive comparisons

MySQL's `utf8mb4_unicode_ci` collation compares case-insensitively; PostgreSQL compares
case-sensitively.

**Text search** (`contains`). Without a change, these find fewer rows on PostgreSQL:
- `src/utils/queryHelpers.js:71`: `buildSearchQuery`, the student, teacher and user directory
  search;
- `src/controllers/finance.controller.js:69-73`: ledger search (receipt number, reference,
  admission number, first and last name);
- `src/services/finance/obligation.service.js:220-222`: fee accounts search;
- `src/services/notice.service.js:934-935, 1027`: notice search.

**Equality lookups** that are case-insensitive today:
- `src/controllers/school.controller.js:250`: `school.findUnique({ where: { code } })`, the
  public school lookup behind the login page's `?school=` link;
- `src/controllers/subject.controller.js:55, 97`: duplicate subject-code checks;
- unique constraints on `(schoolId, code)` and similar keys also treat `MATH` and `math` as
  equal on MySQL, but not on PostgreSQL.

**Emails:**
- Every validator that accepts an email calls `normalizeEmail()`, which lowercases it, so
  stored emails and login lookups (`auth.controller.js:95`) are already lowercase on both
  providers.
- Rows inserted outside the API (old dumps, manual SQL) could still differ in case.

**Trailing spaces:** MySQL's `PAD SPACE` collations treat `'abc'` and `'abc '` as equal;
PostgreSQL does not. Validators trim the relevant inputs (`.trim()`), so this only matters for
data imported directly into the database.

## 5. Row order

- **Default order:** PostgreSQL makes no promise about row order without `ORDER BY`. InnoDB
  usually returns rows in primary-key order, and parts of the UI and of the fee logic may
  depend on that.
- **Scan result:** a scan of `src/` found 108 `findMany` calls, of which 83 have no top-level
  `orderBy`. Some add one inside an `include` or after it; the scan is deliberately broad.
- **Phase 5 classifies each candidate** as one of:
  - order irrelevant (a lookup, a set, an aggregation);
  - sorted in JavaScript afterwards (e.g. installments in `utils/feeAllocation.js`);
  - needs an explicit `orderBy`.
- **NULL ordering:** MySQL sorts NULLs first in ascending order; PostgreSQL sorts them last.
  - Nullable sort keys in use: `StudentClass.rollNumber`, `AcademicYear.startDate`,
    `FeeInstallment.dueDate`.
  - The fee allocation order is computed in JavaScript (`dueKey` maps a missing due date to
    `9999-12-31`), so it does not depend on the database.

Candidates (file: line and model):

- `src/controllers/assignment.controller.js`: 56 (studentClass), 123 (assignment)
- `src/controllers/attendance.controller.js`: 81 (studentClass)
- `src/controllers/classSubject.controller.js`: 26 (classSubject)
- `src/controllers/exam.controller.js`: 158 (classSubject)
- `src/controllers/examResult.controller.js`: 91 (section), 119 (teacherSubject), 224 (teacherSubject), 363 (examResult), 470 (studentClass), 661 (studentClass)
- `src/controllers/feeStructure.controller.js`: 19 (feeStructure), 46 (feeStructure), 268 (feeType), 277 (feeStructure)
- `src/controllers/finance.controller.js`: 186 (studentClass)
- `src/controllers/promotion.controller.js`: 40 (promotion), 105 (studentClass), 145 (class), 379 (student), 389 (promotion), 507 (class), 552 (studentClass), 567 (feeObligation)
- `src/controllers/reportCard.controller.js`: 153 (studentClass), 179 (examResult), 328 (studentClass), 371 (examResult), 567 (examResult), 763 (reportCard), 843 (reportCard), 893 (examResult)
- `src/controllers/result.controller.js`: 94 (studentClass), 364 (examResult)
- `src/controllers/student.controller.js`: 67 (teacherSubject)
- `src/controllers/subjectImport.controller.js`: 41 (subject), 48 (class), 209 (subject), 215 (class)
- `src/controllers/submission.controller.js`: 138 (submission)
- `src/controllers/teacher.controller.js`: 279 (teacherSubject), 322 (studentClass)
- `src/controllers/teacherSubject.controller.js`: 34 (teacherSubject)
- `src/controllers/user.controller.js`: 23 (role), 510 (role)
- `src/middleware/context.middleware.js`: 21 (teacherSubject), 130 (classSubject), 172 (studentParent)
- `src/services/finance/balances.js`: 35 (feeAllocation), 36 (feeDiscountApplication), 37 (feeInstallment), 70 (feeInstallment)
- `src/services/finance/discount.service.js`: 98 (feeObligation), 120 (feeInstallment), 143 (feeObligation), 184 (feeDiscountApplication), 211 (feeDiscount)
- `src/services/finance/ledger.service.js`: 105 (feeInstallment), 107 (feeInstallment)
- `src/services/finance/obligation.service.js`: 26 (feeStructure), 33 (feeObligation), 38 (studentClass), 82 (feeInstallment), 277 (feeInstallment), 278 (feeAllocation), 279 (feeDiscountApplication), 280 (feeObligation)
- `src/services/finance/reports.service.js`: 24 (feeInstallment), 70 (feeAllocation), 271 (feeTransaction)
- `src/services/gradeScale.service.js`: 40 (gradeScale)
- `src/services/notice.service.js`: 54 (userRole), 74 (teacherSubject), 274 (class), 291 (section), 313 (role), 951 (notice), 1031 (notice)
- `src/services/parent.service.js`: 93 (student)
- `src/services/portal.service.js`: 62 (classSubject), 70 (attendance), 77 (exam), 89 (assignment)

## 6. Migrations, seeds and scripts

- **Migrations** (`backend/prisma/migrations/`): `0_init` plus 7 later ones:
  - `grade_scales`, `report_card_config`, `report_card_attendance`,
    `drop_unused_permissions`, `school_brand_color`, `fee_ledger`,
    `drop_legacy_fee_columns`;
  - all MySQL SQL (backtick quoting, `ENUM` columns, `ENGINE=InnoDB`);
  - `fee_ledger` also contains a data backfill written in MySQL SQL;
  - none of this can run on PostgreSQL. A new database needs a separate PostgreSQL baseline.
- **Applied history:** existing MySQL databases record applied migrations by name in
  `_prisma_migrations`. Moving the folder does not affect them.
- **`prisma/seed.js`:**
  - roles, the 11 permissions, the demo school, grade-scale presets, classes 1–10, subjects,
    a teacher, students and parents;
  - demo fee data through the ledger services (`prisma/seeds/demoFinance.js`, which uses no
    raw SQL);
  - it creates every row with upserts or `create`, never with explicit ids, so PostgreSQL
    sequences stay correct;
  - its reset step (`SET FOREIGN_KEY_CHECKS`, backtick `TRUNCATE`) is MySQL-only, and it
    wipes the database every time it runs.
- **`scripts/`:**
  - `with-test-db.js`: derives `sms_test` from `DATABASE_URL`, MySQL-shaped; refuses the dev
    database;
  - `reconcile.js` and `audit-exam-grades.js`: use the shared client, provider-neutral.
- **Legacy one-off scripts in the `backend/` root:**
  - `check_data.js`, `check_exams.js`, `check_grade9.js`, `diagnose_marks_entry.js`,
    `fix_assignments.js`, `fix_missing_student_subjects.js`, `sync_exam_subjects.js`,
    `validate_subject_enrollment.js`;
  - from January 2026 and not wired to any npm script;
  - two of them use the removed +2 models.
  - Decision: delete them, together with `prisma/seeds/comprehensiveSeed.js`.

## 7. Tests today

- **Unit tests** (`npm test`): 410 tests in 13 suites over pure utilities and the mocked
  middleware and services. They need no database, and they must stay as they are.
- **Integration tests** (`npm run test:integration`): 33 fee-ledger tests in
  `src/__integration__/`, against a MySQL test database only.
- **CI:** none. The repository has no `.github/workflows/`.

## 8. Security posture

None of this changes with the database engine:
- Express is the only security boundary: JWT access and refresh tokens, `requireRole` /
  `authorize`, ownership middleware, `req.user.schoolId` on every query.
- The frontend never receives a database URL; there is no Supabase client in the browser, no
  Supabase Auth and no Row Level Security in play.
- Supabase is used purely as a PostgreSQL server reached by the backend over TLS. The
  service-role key is not needed at all.
