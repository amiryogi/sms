---
id: accounts-reversals-discounts
title: Student accounts, statements, bills, reversals and discounts
roles: [ACCOUNTANT, ADMIN, SUPER_ADMIN]
modules: [finance, fees]
routes: [/finance/accounts, /finance/transactions, /finance/discounts, /finance/bills, /finance/daybook]
guides: []
status: published
aliases: [outstanding, outstanding fees, due, balance, dues, unpaid, overdue, statement, bill, fee bill, due notice, reversal, refund, wrong payment, cancel payment, discount, scholarship, day book, daybook, transactions, बाँकी, बक्यौता, बाँकी शुल्क, विवरण, बिल, छुट, छात्रवृत्ति, फिर्ता, दैनिक किताब, baki, chhut]
verifiedAgainst: [frontend/src/pages/finance/Accounts.jsx, frontend/src/pages/finance/AccountDetail.jsx, frontend/src/pages/finance/Transactions.jsx, frontend/src/pages/finance/Discounts.jsx, frontend/src/components/finance/DiscountDialog.jsx, backend/src/services/finance/ledger.service.js, backend/src/services/finance/discount.service.js]
verifiedOn: 2026-11-15
---
# Student accounts, reversals and discounts

## Purpose
See what every student owes, print statements and bills, undo a wrong payment, and give
discounts or scholarships.

## Who can use it
Accountants and administrators. Some steps need an administrator's approval.

## Where to find it
- **Student accounts** (`/finance/accounts`): what each student owes and has paid this year.
- **Transactions** (`/finance/transactions`): the **Ledger** and **Reversal requests**.
- **Discounts** (`/finance/discounts`).

## Outstanding balances
1. Open **Student accounts**, choose **Academic year**, **Class**, **Section**.
2. Filter by status: **Overdue**, **Unpaid**, **Partly paid**, **Paid**, **No fees**.
3. Open a student to see their fees, payments, reversals and discounts.
4. **Print bills** prints fee bills / due notices for the class (four to an A4 page). On one
   student: **Print statement** or **Print bill**.

## Undoing a wrong payment (reversal)
- Payments are never edited or deleted. On the student's account, open the payment's menu.
- **Accountant:** **Request reversal**, choose the type (**Correction (entered by mistake)** or
  **Refund (money handed back)**) and the reason, then **Send request**. An administrator
  approves or rejects it under **Transactions → Reversal requests**.
- **Administrator:** **Reverse payment**: the payment stays on record and a reversal entry
  (`REV-…`) dated today cancels it.
- Nobody can approve their own request.

## Discounts and scholarships
1. **Discounts** → **New request**, or **Request discount** on a student's account.
2. Fill **Request a discount or scholarship**: **Student**, **Kind** (Discount or Scholarship),
   **Type** (percentage or amount), what it **Applies to**, **Name** and **Reason**.
3. Click **Send for approval**. It is **Awaiting approval** until an administrator clicks
   **Approve** or **Reject**. Only approved ones reduce the balance; **Revoke** removes one later.

## Day book
**Transactions** → **Print day book**: every receipt and reversal between two dates (up to a year).

## Common mistakes
- Trying to delete a payment: use a reversal.
- Expecting a discount to apply before approval.

## Related pages
Collect fees, Reports, Finance dashboard.
