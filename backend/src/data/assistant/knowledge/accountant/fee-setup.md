---
id: fee-setup
title: Setting up fees: fee types, fee structures, installments and generating fees
roles: [ACCOUNTANT, ADMIN, SUPER_ADMIN]
modules: [finance, fees]
routes: [/admin/fee-types, /admin/fee-structures, /accountant/fee-types, /accountant/fee-structures, /finance/accounts]
guides: []
status: published
aliases: [fee type, fee structure, fee setup, fee configuration, tuition fee, installment, monthly fee, generate fees, शुल्क, शुल्क संरचना, किस्ता, मासिक शुल्क, शिक्षण शुल्क, fee banaune, fee setup garne]
verifiedAgainst: [frontend/src/pages/admin/FeeTypes.jsx, frontend/src/pages/admin/FeeStructures.jsx, frontend/src/components/finance/InstallmentPlanDialog.jsx, frontend/src/pages/finance/Accounts.jsx]
verifiedOn: 2026-11-15
---
# Setting up fees

## Purpose
Decide what each class pays, split it into installments, and create each student's fees for the
year so they can be collected.

## Who can use it
Accountants and administrators.

## Where to find it
- **Fee types**: accountants `/accountant/fee-types`, administrators `/admin/fee-types`.
- **Fee structures**: accountants `/accountant/fee-structures`, administrators
  `/admin/fee-structures`.
- **Student accounts** (`/finance/accounts`) → **Generate fees**.

## Steps
1. **Fee types** → **Add fee type**: **Name** (tuition, lab, sports, transport…), **Description**,
   **Active**. Inactive types can't be added to new fee structures.
2. **Fee structures** → **Add fee structure**: choose the **Academic year**, **Class**,
   **Fee type** and **Amount (Rs.)**. Repeat for each fee of each class.
3. Optionally open **Installment plan** on a structure, set the **Number of installments** and
   click **Split**. Installment due dates appear on the calendar.
4. **Student accounts** → **Generate fees** → choose **Academic year**, **Class** (and
   **Section**) → **Generate**. Each student's fees are created from the class's structures and
   installment plans. Students who already have a fee are skipped.

## What you should see
Each student's account shows **Total fees** and **Balance**, with status **Unpaid**.

## Common mistakes
- Changing a structure amount and expecting existing student fees to change: generate only creates
  fees students do not have yet.
- Forgetting to generate fees: the Collect page then says "No fees for this year yet".

## Troubleshooting
- A wrong fee on one student: open the student's account and use **Cancel fee** (allowed only
  while nothing has been paid on it).

## Related pages
Collect fees, Student accounts, Reports.
