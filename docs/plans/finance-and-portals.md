# Finance ledger and the Accountant, Student and Parent portals

Approved 2026-11-08. Progress is tracked in `docs/STATUS.md`; implementation notes are at the end.

## Context

The Phase 1 audit found:
- **The fee model cannot support an accountant portal.** `FeePayment`
  (`backend/prisma/schema.prisma`, table `fee_payments`) is one row per
  enrolment × fee structure. Each payment overwrites `paymentDate`,
  `receiptNumber`, `paymentMethod` and `remarks` and adds to `amountPaid`
  (`backend/src/controllers/feePayment.controller.js`, `recordPayment`).
- **`recordPayment` has integrity problems:**
  - read-then-write with no transaction or lock, so concurrent payments can
    lose updates;
  - no protection against duplicate submissions;
  - receipt numbers are `RCP-${Date.now()}-${id}`, with no unique constraint;
  - money is calculated with `parseFloat`.
- **Paid records can be destroyed.** `onDelete: Cascade` from `StudentClass`
  deletes fee rows, and two code paths trigger it:
  - promotion undo (`promotion.controller.js`, `tx.studentClass.deleteMany`);
  - user delete (`user.controller.js`, `prisma.user.delete`).
- **The accountant has no real portal.** `/accountant/dashboard` renders
  `AdminFeePayments`.
- **Student and parent portals are thin.** Their dashboards load almost
  nothing; students have no Attendance or Profile page; all ten student and
  parent pages are still in pre-Tailwind styling.
- **Attendance % is inconsistent.** It counts only `present`
  (`attendance.controller.js`, `getStudentAttendanceSummary`), while report
  cards honour the layout's `countLateAsPresent`.

**Goal:** a correct, auditable fee ledger first, then the accountant tools on top
of it, then student and parent portals that show the same numbers.

### Business rules decided (answers on 2026-11-08)
| Topic | Decision |
|---|---|
| Discounts / scholarships | Accountant or admin **requests** (PENDING); only ADMIN / SUPER_ADMIN **approve or reject**; nobody approves their own request; only APPROVED discounts change balances. |
| Payment reversal | **Admin only.** Accountants file a reversal request with a reason; an admin approves it, which creates the reversal. An admin may also reverse directly. |
| Overpayment | **Rejected.** A payment can never exceed the outstanding balance of what it pays. No credit balances. |
| Receipt numbers | **Sequential per school per Nepali fiscal year** (Shrawan 1 → Ashadh end), e.g. `RCP-2082-83-00042`. |

## Review of the brief (what I changed and why)

1. **shadcn/ui: selective, not wholesale.**
   - shadcn's theme layer uses `--primary`, `--border`, `--radius`, `--background`. Those names collide with
     the legacy variables still bridged in `styles/bridge.css` / `index.css` until UI wave 6.
   - It also duplicates our existing kit (`components/ui/`: Button, Dialog, Tabs, Menu, Field…).
   - Plan: use shadcn as a **copy-in source for components we lack**, restyled to our tokens, with no `shadcn init` theme:
     - the **Chart** pattern (a recharts wrapper) for dashboards;
     - **Command + Popover** (cmdk + Radix Popover) for the student search combobox.
   - Date ranges use two native `<input type="date">` fields (accessible, no dependency).
2. **The reconciliation formula is made unambiguous** by storing a signed ledger.
   Payments are positive and reversals negative:
   `outstanding = Σ installment amount − Σ approved discount applied + Σ ledger lines (payments −, reversals +)`.
   Written per obligation: `outstanding = original − discount − paid + reversed`, where `paid` and `reversed` are both shown on statements.
3. **Reversals are full-transaction only.** A wrong amount is fixed by "reverse + record again".
   Partial reversals make receipts unreadable and are unnecessary given 1 and the overpayment rule.
4. **"Refunds" = a reversal** whose reason category is `REFUND` (money handed back), versus `CORRECTION` (entry error).
   No other refund mechanism, because overpayments cannot exist.
5. **"Cancelled obligation" = waiver** by an admin with a reason, allowed only while its net paid is 0.
   Otherwise reverse first. Cancelled items drop out of every expected/outstanding figure.
6. **KPI names were ambiguous.** Each has a formula and source below.
   "Pending payments" means installments not yet due with a balance; "Overdue" means past their due date with a balance.
7. **Report dating uses the ledger date (cash basis).**
   - A reversal reduces the collection of the day it is recorded, not the original day.
   - Past daily reports therefore never change. This is standard append-only accounting.
8. **Month = Bikram Sambat month** (the school's calendar), shown with AD dates.
   Fiscal-year boundaries also come from BS dates via the existing `backend/src/utils/dateConverter.js`.
9. **Order kept as requested (3 → 8), with one addition.** Phase 3 also fixes the cascade-delete hazards and the
   attendance-% rule, because later phases rely on both.
10. **Out of scope** (not requested, not in the model): late fines, online gateways (eSewa / Khalti),
    cashier day-close, timetable (no model exists), credit balances.

## 1. Architecture (final)

**Kept as is:**
- React 19 + Vite 7 + Tailwind 4 + our `components/ui/` kit.
- One service file per domain in `frontend/src/api/` through `apiClient`.
- Express + Prisma + MySQL.
- The `{ success, message, data }` envelope, with paginated lists on `ApiResponse.paginated`.
- `req.user.schoolId` on every query.
- Ownership middleware (`isOwnStudent`, parent ↔ child via `StudentParent`).

**New:**
- **Finance services (backend).** The money logic is shared and transactional, so it gets the `services/` layer the
  CLAUDE.md rule asks for, with thin controllers.
  - `services/finance/ledger.service.js`: payments, reversals, receipt sequence.
  - `services/finance/obligation.service.js`: generation, installments, waivers.
  - `services/finance/discount.service.js`
  - `services/finance/reports.service.js`: dashboard KPIs and reports.
- **Pure utils with Jest tests:**
  - `utils/money.js`: `Prisma.Decimal` helpers (add, sub, cmp, round2, sum). No new dependency; decimal.js ships with Prisma.
  - `utils/feeAllocation.js`: allocate a payment across installments, oldest due first; spread a discount newest installment first.
  - `utils/feeStatus.js`: derive installment and obligation status.
  - `utils/fiscalYear.js`: BS fiscal year of a date.
  - `utils/attendanceRate.js`: % with the late rule.
- **Frontend:**
  - `pages/finance/*`: shared by ADMIN and ACCOUNTANT route blocks.
  - `components/finance/*`, `components/portal/*`: shared by student and parent pages.
  - New dependencies (each needs your OK at Phase 4/5): `recharts` (charts), `cmdk` + `@radix-ui/react-popover` (student combobox).

## 2. Data model (Prisma)

Existing models are kept. `FeePayment` is renamed **in Prisma only** to `FeeObligation`.
`@@map("fee_payments")` keeps the table, so the rename moves no data.

```
FeeType 1─* FeeStructure 1─* FeeStructureInstallment   (template: label, dueDate, amount)
                    │
StudentClass 1─*  FeeObligation (table fee_payments) 1─* FeeInstallment
                    │ (feeStructureId, original amount)        │
                    │                                           ├─* FeeAllocation *─1 FeeTransaction (ledger)
FeeDiscount 1─* FeeDiscountApplication *─1 FeeInstallment       │        │ type PAYMENT | REVERSAL
 (student, year, feeType?)                                      │        │ reversesId → FeeTransaction (unique)
                                                                │        └─1 FeeReversalRequest *
ReceiptSequence (schoolId, series, fiscalYear) → nextNumber
```

| Model | Key fields | Constraints and notes |
|---|---|---|
| `FeeObligation` (renamed `FeePayment`) | existing `amountDue` = original; **new cached** `discountTotal`, `paidTotal` (net of reversals), `status` (`pending`, `partial`, `paid`, **`cancelled`**); `cancelledAt / By / Reason` | Existing unique `(studentClassId, feeStructureId)` kept. Relation to `StudentClass` → **`onDelete: Restrict`**. `paymentDate`, `receiptNumber`, `paymentMethod`, `remarks` stop being written; dropped in Phase 8. |
| `FeeStructureInstallment` | `feeStructureId, sequence, label, dueDate?, amount` | Unique `(feeStructureId, sequence)`. Σ amount = structure amount (validated). Optional: no rows means one installment for the whole amount. |
| `FeeInstallment` | `schoolId, obligationId, sequence, label, dueDate?, amount, discountTotal, paidTotal, status` | Snapshot of the template at generation, like `ExamSubject`. Unique `(obligationId, sequence)`. Indexes on `(schoolId, dueDate)` and `status`. |
| `FeeTransaction` | `schoolId, studentId, studentClassId, academicYearId, type, amount` (positive; sign comes from `type`), `paidOn` (`@db.Date`), `method` enum, `reference?`, `remarks?`, `receiptNumber`, `fiscalYear`, `idempotencyKey?`, `recordedById`, `createdAt`, `reversesId?` (unique), `reversalReason?`, `reversalCategory?` | Unique `(schoolId, receiptNumber)`; unique `(schoolId, idempotencyKey)`; indexes on `(schoolId, paidOn)`, `(schoolId, studentId)`, `type`. **No update or delete routes.** Every relation uses `Restrict`. |
| `FeeAllocation` | `transactionId, installmentId, amount` | One payment can settle several installments or fee types on one receipt. A reversal mirrors its original's allocations. |
| `FeeReversalRequest` | `schoolId, transactionId, reason, category` (`CORRECTION`, `REFUND`), `status` (`PENDING`, `APPROVED`, `REJECTED`), `requestedById, decidedById?, decidedAt?, decisionNote?, reversalTxnId?` | At most one PENDING request per transaction; the approver must differ from the requester. |
| `FeeDiscount` | `schoolId, studentId, academicYearId, feeTypeId?` (null = all fee types), `kind` (`FIXED`, `PERCENT`), `value`, `category` (`DISCOUNT`, `SCHOLARSHIP`), `name, reason, status` (`PENDING`, `APPROVED`, `REJECTED`, `REVOKED`), `requestedById, approvedById?, approvedAt?, revokedById?, revokedAt?, revokeReason?` | `PERCENT` value is between 0 and 100. Edits only while PENDING, and only by the requester or an admin. |
| `FeeDiscountApplication` | `discountId, installmentId, amount` | Written on approval and deleted on revoke (the discount row keeps the history). The amount is capped at the installment's unpaid balance; any capped-off part is reported, never refunded. |
| `ReceiptSequence` | `schoolId, series` (`RCP`, `REV`), `fiscalYear` ("2082-83"), `nextNumber` | Primary key is the three columns together. Locked `FOR UPDATE` inside the payment transaction. |

- Money columns are `Decimal(12,2)`.
- Every new table has `schoolId` plus a relation to `School`.
- Enums are new: `FeeTxnType`, `PaymentMethod` (`cash`, `cheque`, `bank_transfer`, `wallet`, `card`), `DiscountKind`, `DiscountCategory`, `ApprovalStatus`, `ReversalCategory`.
- **Cached totals versus the ledger.** The ledger (`FeeTransaction` + `FeeAllocation` + `FeeDiscountApplication`) is
  authoritative. The cached `discountTotal`, `paidTotal` and `status` on installments and obligations are rewritten in the
  same DB transaction as every ledger write. `GET /fees/reconcile` (admin) recomputes them from the ledger and lists any
  mismatch.

## 3. Workflows and integrity rules

**Record payment** (`ledger.service.recordPayment`):
1. One `prisma.$transaction(async tx => …)`.
2. If `idempotencyKey` exists for the school, return the existing receipt (HTTP 200, `replayed: true`).
3. `SELECT … FROM fee_installments WHERE id IN (…) FOR UPDATE` (via `tx.$queryRaw`). Re-read balances.
   Reject if any allocation exceeds its installment's outstanding (no overpayment), if the obligation is cancelled, or if
   the installment belongs to another student or school.
4. With no explicit allocations, allocate the amount oldest due date first (`utils/feeAllocation`).
5. Lock `ReceiptSequence` for (school, `RCP`, fiscalYear of `paidOn`), then read and increment it. The fiscal year comes from
   `utils/fiscalYear`.
6. Insert the transaction and its allocations, recompute the cached totals and status, then commit.
7. The client generates `idempotencyKey` when the payment dialog opens, so a double click or retry returns the same receipt.

**Reverse:**
- An accountant or admin files `FeeReversalRequest` (reason required). An admin approves it, or an admin uses the
  direct reverse endpoint.
- In one transaction: lock the original's installments, insert a `REVERSAL` with `reversesId`, mirror its allocations,
  take a number from the `REV` series, recompute the caches, and set the request to APPROVED.
- A transaction already reversed cannot be reversed again (`reversesId` is unique), and a REVERSAL itself cannot be reversed.

**Discounts:**
- Requested as PENDING.
- On approval, compute the amount per matching obligation: `PERCENT` uses the original amount; `FIXED` is spread across
  matching obligations in proportion to their amounts.
- Spread it newest installment first, capped at each installment's unpaid amount. Write the applications and recompute.
- Revoke deletes the applications (with a reason) and recomputes; the outstanding balance goes back up.

**Installments:**
- A fee structure may carry a template.
- Generating fees (existing single and bulk endpoints, now in `obligation.service`) snapshots the template into
  `FeeInstallment`s. With no template it creates one installment with no due date.
- Approved discounts for that student, year and fee type are applied at generation.

**Status derivation** (`utils/feeStatus`): net payable = amount − discount, then
- `paid` if paid ≥ net payable;
- `partial` if paid > 0;
- otherwise `pending`.
`overdue` is derived at read time (dueDate < today in Asia/Kathmandu and balance > 0), never stored.

**Integrity rules:**
- No physical delete of transactions, allocations or discount rows.
- No float maths; all sums use `Prisma.Decimal`.
- All finance writes happen inside DB transactions.
- Every row records the acting user.
- Fee structures stay locked once obligations exist (existing rule).
- Promotion undo refuses when the new enrolment has any transaction, and otherwise deletes only its zero-paid obligations.
- Deleting a user refuses for a student with financial records (deactivate instead).

## 4. Dashboard KPIs (all school + academic-year scoped, cancelled obligations excluded)

| KPI | Formula | Source |
|---|---|---|
| Expected (gross) | Σ `FeeInstallment.amount` | installments of the year's obligations |
| Discounts | Σ `FeeDiscountApplication.amount` (APPROVED only) | applications |
| Expected (net) | gross − discounts | — |
| Collected | Σ PAYMENT allocations − Σ REVERSAL allocations | ledger, year's obligations |
| Outstanding | net expected − collected (per installment, never < 0) | caches, checked by `/reconcile` |
| Today's collection | Σ PAYMENT − Σ REVERSAL with `paidOn` = today (Asia/Kathmandu) | ledger, cash basis |
| This month | same, `paidOn` within the current BS month | ledger + dateConverter |
| Pending | count and Σ balance of installments with balance > 0 and (dueDate ≥ today or none) | installments |
| Overdue | count, Σ balance and distinct students for balance > 0 and dueDate < today | installments |
| Transactions | count of PAYMENT in range (reversals counted separately) | ledger |

**Charts** (recharts):
- Daily net collection, last 30 days.
- Monthly net collection by BS month of the fiscal year.
- Class-wise expected vs collected vs outstanding.
- Fee-category collected and outstanding.
- Obligations by status (paid, partial, pending, overdue).
- Outstanding trend: month-end due-to-date − collected-to-date.

**Filters:** year, date range, class, fee type, method.

**How the reports treat each case:**
- **Reversals:** negative on their own date.
- **Discounts:** reduce expected and outstanding, never collection.
- **Partial payments:** count their actual amounts.
- **Overpayments:** cannot exist.

**Reports:** daily, monthly, fiscal-year and academic-year collection; class-wise; fee-category; outstanding (as of a
date, overdue only); student statement; discounts and scholarships; reversals.
- On screen: a table plus print CSS.
- **CSV export:** `?format=csv` streams `text/csv`. This is the one documented exception to the JSON envelope.

## 5. API (new unless marked "existing")

All routes run `authenticate` and are school-scoped. FA = ACCOUNTANT, ADMIN, SUPER_ADMIN; AD = ADMIN, SUPER_ADMIN.

| Method | Route | Purpose | Access |
|---|---|---|---|
| GET | `/fees/accounts?search&classId&sectionId&academicYearId&status&page` | Paged student accounts with gross, discount, paid and balance | FA |
| GET | `/fees/accounts/:studentId?academicYearId` | Statement: obligations → installments, discounts, transactions, totals. Replaces existing `/fees/payments/student/:id`, which stays as an alias until Phase 8. | FA; student own; parent child |
| GET / PUT | `/fees/structures/:id/installments` | Installment template | GET FA; PUT FA |
| POST | `/fees/payments/generate/:studentClassId`, `/fees/payments/generate-bulk` (existing) | Now also create installments and apply discounts | FA |
| POST | `/fees/obligations/:id/cancel {reason}` | Waive (only if net paid = 0) | AD |
| POST | `/fees/transactions {studentId, academicYearId, amount, allocations?[{installmentId, amount}], method, reference?, paidOn, remarks?, idempotencyKey}` | Record a payment and return the receipt | FA |
| GET | `/fees/transactions?from&to&type&method&classId&search&page` | Ledger | FA |
| GET | `/fees/transactions/:id` | Receipt detail (printable) | FA; student own; parent child |
| POST | `/fees/payments/:feePaymentId/pay` (existing) | Rewritten as a wrapper over `recordPayment`; removed in Phase 8 | FA |
| POST | `/fees/transactions/:id/reversal-requests {reason, category}` | Request a reversal | FA |
| GET | `/fees/reversal-requests?status` | Queue | FA |
| POST | `/fees/reversal-requests/:id/approve` / `reject {note}` | Decide (approver ≠ requester) | AD |
| POST | `/fees/transactions/:id/reverse {reason, category}` | Direct reversal | AD |
| GET / POST | `/fees/discounts?status&studentId&academicYearId` / `{studentId, academicYearId, feeTypeId?, kind, value, category, name, reason}` | List / request | FA |
| PUT | `/fees/discounts/:id` | Edit while PENDING | requester or AD |
| POST | `/fees/discounts/:id/approve` / `reject` / `revoke {note or reason}` | Decide or revoke | AD (not own request) |
| GET | `/fees/dashboard?academicYearId&from&to&classId&feeTypeId&method` | KPIs and chart series | FA |
| GET | `/fees/reports/:report?…&format=csv` | collections (groupBy day, month, class, feeType, method), outstanding, discounts, reversals | FA |
| GET | `/fees/reconcile` | Recompute caches vs ledger; report mismatches | AD |
| GET | `/portal/students/:studentId/overview` | Dashboard bundle: profile, enrolment, subjects, attendance summary, latest published result, upcoming PUBLISHED/LOCKED exams, fee totals | `isOwnStudent` (student own, parent child, staff) |
| GET | `/attendance/student/:studentId` (existing) | Adds `byMonth` (BS) and uses the school's late rule for `%` | existing guards |

- Validation goes in `validators/finance.validators.js` (express-validator):
  - positive amounts with at most 2 decimals;
  - `paidOn` ≤ today and within the academic year ± 1 year;
  - `method` from the enum;
  - `idempotencyKey` is a UUID;
  - reason length 5–500.
- Errors use `ApiError` (400 or 409 for a conflict such as an exceeded balance or an already reversed payment).

## 6. Permission matrix

| Action | Student | Parent | Accountant | Admin | Super admin |
|---|---|---|---|---|---|
| Own or child statement, receipts | own | linked children | all (school) | all | all |
| Fee types, structures, templates | – | – | write | write + delete | same |
| Generate obligations | – | – | ✓ | ✓ | ✓ |
| Record payment | – | – | ✓ | ✓ | ✓ |
| Request reversal | – | – | ✓ | ✓ | ✓ |
| Approve reversal / reverse directly | – | – | – | ✓ (not own request) | ✓ |
| Request discount | – | – | ✓ | ✓ | ✓ |
| Approve, reject or revoke discount | – | – | – | ✓ (not own) | ✓ |
| Cancel obligation | – | – | – | ✓ | ✓ |
| Dashboard, reports, ledger | – | – | ✓ | ✓ | ✓ |
| Reconcile | – | – | – | ✓ | ✓ |

- Roles decide access through `requireRole` (no new permissions, matching CLAUDE.md §5).
- A parent's access is checked through `StudentParent` on every student-keyed route.
- Every finance query filters on `req.user.schoolId`.

## 7. Frontend

```
src/api/feeService.js            + accounts, transactions, reversals, discounts, dashboard, reports
src/api/portalService.js         overview
src/pages/finance/               (ADMIN + ACCOUNTANT routes; ADMIN nav "Finance" group)
  Dashboard.jsx   Collect.jsx   Accounts.jsx   AccountDetail.jsx
  Transactions.jsx   Discounts.jsx   Reports.jsx
src/components/finance/          ReceiptSheet (A5 print), StudentPicker (cmdk), MoneyText,
                                 FeeStatusBadge, InstallmentTable, AllocationEditor, KpiCard, charts/*
src/components/portal/           ChildSwitcher, AttendanceMonths, FeeStatement, ResultsTable,
                                 UpcomingExams, ProfileCard
src/pages/student/   Dashboard, Attendance (new), Academics (results + subjects), ReportCard (chrome only),
                     Fees, Profile (new), Assignments, Notices (existing shared)
src/pages/parent/    same set; every page takes ?child=<studentId> via ChildSwitcher
```

**Accountant pages:**
- **Dashboard:** KPI row, charts, overdue list, recent transactions.
- **Collect:** find a student → statement → pay dialog with auto or manual allocation, method and reference → receipt with print.
- **Accounts:** paged list with balance and overdue filters.
- **Account detail:** statement, discounts, transactions, request reversal or discount.
- **Transactions:** ledger plus the reversal queue (admins approve here).
- **Discounts:** request form, approval queue.
- **Reports:** a report picker, filters, table, print and CSV.
- **Fee Structures (existing):** gains an installment-template editor.

**Student and parent pages** are thin wrappers around the `components/portal/*` blocks, so both show identical numbers.
- **Child switching:** a segmented control persisted in the URL, shown only for 2 or more children.
- **Report-card sheets:** untouched; print exception.

**Patterns:** the same as waves 1–3, i.e. `PageHeader`, `Card`, `DataTable`, `Dialog`, toast and `confirmDialog`,
skeletons, empty and error states, and 390 px layouts (tables scroll inside cards; the pay dialog becomes a sheet).

## 8. Migration strategy

1. **Phase 3, migration A (additive):**
   - new enums and tables;
   - new columns on `fee_payments` (`discount_total` default 0, `paid_total`, cancel fields);
   - `cancelled` added to `PaymentStatus`.
2. **Same migration, backfill SQL** (travels with `prisma migrate deploy`):
   - one `fee_installments` row per `fee_payments` row (sequence 1, amount = `amount_due`, no due date);
   - for rows with `amount_paid` > 0, one `PAYMENT` transaction plus allocation (`paidOn` = `payment_date`, or
     `updated_at` if missing; the existing `receipt_number` is kept with `legacy` remarks; the method is mapped);
   - `paid_total` = `amount_paid`;
   - `receipt_sequences` start above the existing numbers.
   Today's DB has 10 rows, all unpaid; the SQL handles paid rows anyway.
3. **Migration B (Phase 3, after code switches):** `fee_payments.student_class_id` → `ON DELETE RESTRICT`; new FKs use `RESTRICT`.
4. **Phase 8 migration C:** drop the deprecated columns `payment_date`, `receipt_number`, `payment_method`, `remarks`
   on `fee_payments`, and the alias routes.
5. **Checks after each migration:**
   - Σ installments = `amount_due` per obligation;
   - Σ ledger = `paid_total`;
   - `/fees/reconcile` shows no mismatches.
6. **Seed:** `seed.js` gains demo installment templates, discounts and a handful of payments and a reversal, created
   **through the services**, so a fresh machine has a meaningful dashboard.

## 9. Testing

- **Jest, pure (no DB, runs anywhere):**
  - money helpers;
  - allocation (oldest-due-first, caps);
  - discount spread and caps;
  - status derivation;
  - fiscal year at the Shrawan boundary (BS);
  - attendance rate with and without the late rule;
  - KPI aggregation over fixture rows, including reversed payments, discounted obligations and cancelled obligations.
- **Integration (new, `npm run test:integration`, opt-in via `TEST_DATABASE_URL`)** against a migrated MySQL test DB:
  - first, partial, multiple and settling payments;
  - overpayment rejected;
  - the same `idempotencyKey` twice gives one row;
  - two parallel payments on one installment give one success and one 409, with consistent totals;
  - receipt numbers unique and gap-free under parallel load;
  - reversal approval flow and self-approval blocked;
  - discount approval, revoke and cap;
  - overdue detection;
  - migration backfill on a fixture with paid rows;
  - reconcile shows 0 mismatches.
- **Security probes** (scratchpad, as for RBAC): student reads another student's statement or receipt (403); parent
  reads an unrelated child (403); accountant approves a discount or reverses (403); admin approves own request (403);
  cross-school ids (404); students and parents call FA routes (403).
- **Dashboard accuracy:** an API test that seeds known payments and reversals across two days and two classes, then
  asserts each KPI and series against hand-computed values.
- **Regression for every phase:**
  - `npm test`, lint and build;
  - `uisweep.mjs` across all pages × 7 roles (0 console or API errors);
  - print flows (NEB and Performance single 1 page, bulk N);
  - the existing marks, attendance and assignment flows (`w3.mjs`);
  - the RBAC and super-admin API probes.

## 10. Roadmap (each phase verified, committed and pushed separately)

| Phase | Scope | Done when |
|---|---|---|
| 3 | Schema and migrations A + B; finance services and utils; payment, reversal and discount endpoints; reconcile; the rewritten legacy pay endpoint; cascade fixes in promotion undo and user delete; attendance-% rule | Jest + integration suites green; reconcile clean; the existing admin Fee Payments page still works through the wrapper |
| 4 | Accountant and admin fee management UI: Collect, Accounts, Account detail, Transactions + reversal queue, Discounts + approvals, installment templates, receipt print | Browser flows: pay → receipt → reverse request → approve; discount request → approve; 390 px |
| 5 | Dashboard and reports endpoints and UI (recharts), CSV and print | KPI accuracy test; every chart from the API |
| 6 | Student portal: dashboard, attendance, academics, report-card chrome, fees and receipts, profile, assignments | Own-data-only probes; sweep |
| 7 | Parent portal (shared portal blocks + ChildSwitcher) | Unrelated-child probes; multi-child test parent |
| 8 | Integration and QA; migration C; remove aliases; UI wave 6 cleanup (`index.css` / `bridge.css`); docs (CLAUDE.md §6/§8, STATUS, SETUP) | Full regression list above |

## 11. Risks and open points (defaults chosen, change any)

- **Excused attendance:** counts in total days, not as present (current behaviour).
- **Discount after full payment:** capped at the unpaid balance; nothing is refunded automatically.
- **Mid-year transfer or promotion:** obligations stay with the old enrolment; a new enrolment gets its own.
- **Legacy receipt numbers** on migrated payments keep their old format.
- **Fiscal-year receipt numbering** needs a correct BS conversion at the Shrawan 1 boundary; it is covered by tests and
  depends on `dateConverter`'s year tables being current.
- **Time zone:** "today" and dates use Asia/Kathmandu on the server.
- **New dependencies** (`recharts`, `cmdk`, `@radix-ui/react-popover`) will be confirmed before Phase 4/5 installs.
- **Not included:** late fines, online payment gateways, cashier day-close, timetable, credit balances.

## Critical files

- **Backend:**
  - `prisma/schema.prisma` and new migrations;
  - `src/services/finance/*`;
  - `src/controllers/feePayment.controller.js` (thin), plus new controllers for transactions, discounts, reports and portal;
  - `src/routes/fee.routes.js` and a new `portal.routes.js` registered in `routes/index.js`;
  - `src/validators/finance.validators.js`;
  - `src/utils/{money,feeAllocation,feeStatus,fiscalYear,attendanceRate}.js` plus `__tests__`;
  - `src/controllers/{promotion,user,attendance}.controller.js` (fixes);
  - `prisma/seed.js`.
- **Frontend:**
  - `src/api/feeService.js`, `portalService.js`;
  - `src/pages/finance/*`, `src/pages/student/*`, `src/pages/parent/*`;
  - `src/components/finance/*`, `src/components/portal/*`;
  - `App.jsx` routes;
  - `layouts/navigation.js`.
- **Reused as is:**
  - `components/ui/*`, `DataTable`, `Modal`, `StatCard`;
  - `utils/format.js` (`formatCurrency`, dates);
  - `backend/src/utils/dateConverter.js`;
  - `utils/reportCardLayout.js` (`countLateAsPresent`);
  - `middleware/ownership.middleware.js`;
  - the `ApiResponse` / `ApiError` helpers.

## Verification (end to end)

1. Backend: `npm test`, `npm run test:integration` (test DB), `npx prisma migrate deploy` on a copy, then `/fees/reconcile`.
2. Frontend: lint and build.
3. Browser harness:
   - sweep all roles;
   - accountant collects, prints the receipt and requests a reversal; the admin approves;
   - discount request and approval;
   - dashboard numbers equal the API test's expected values;
   - student and parent see the same statement as the accountant;
   - 390 px screenshots.
4. Print regression and RBAC probes.
5. Every test record created is removed or created only in the test DB.

---

## Implementation notes

### Phase 3 — done (2026-11-08)

What shipped, and where it differs from the plan above:

- **One migration**, `20261108120000_fee_ledger`, holds both "A" and "B": new tables, new
  `fee_payments` columns, `RESTRICT` foreign keys and the backfill. Code that used to delete
  through the cascade (promotion undo, user delete) was changed in the same commit.
- **No separate `paidTotal` on obligations.** The existing `fee_payments.amount_paid` column is
  the cache (net of reversals). `discount_total` and the cancel columns are new.
- **`schoolId` on top-level tables only** (installments, transactions, reversal requests,
  discounts, receipt sequences). Child rows (`fee_allocations`, `fee_discount_applications`,
  `fee_structure_installments`) are scoped through their parent.
- **Migrated payments** keep their old receipt number, get fiscal year `legacy` and an
  `idempotency_key` of `migrated-fee-payment-<fee row id>`. The old model kept only a running
  total, so each fee row's money becomes one payment dated on its last payment date.
- **Isolation level.** Finance transactions run at READ COMMITTED. Under MySQL's default
  REPEATABLE READ, a transaction that waited for the row lock still read its old snapshot, and two
  racing payments both passed the balance check. The integration test caught it.
- **Rejecting a discount or reversal** is admin only and, like approval, never by the requester.
- `GET /fees/accounts` computes a year's totals in memory and then pages; fine for one school.
- Not done in Phase 3: the portal overview endpoint (`/portal/students/:id/overview`) moves to
  Phase 6 with the student portal; dashboard and report endpoints are Phase 5; the seed still
  creates no payments or discounts. Demo finance data comes with the Phase 4/5 UI work, so the
  dashboard has something to show.

**Tests:**
- 20 unit tests in `utils/__tests__/finance.test.js`.
- 23 integration tests in `src/__integration__/finance.test.js` (`npm run test:integration`,
  `sms_test`), stable over repeated runs.
- A 34-check HTTP probe against a test backend.
- The migration backfill was checked on `sms_test` with paid, partial and unpaid legacy rows
  (fixture `scripts/fixtures/legacy-fee-rows.js`, run before the migration).
- The development database was migrated and reconciles: `node scripts/reconcile.js`.
