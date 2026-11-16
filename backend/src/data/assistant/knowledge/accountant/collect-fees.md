---
id: collect-fees
title: Collecting a fee payment and printing the receipt
roles: [ACCOUNTANT, ADMIN, SUPER_ADMIN]
modules: [finance, fees, payments]
routes: [/finance/collect]
guides: [finance.collect]
status: published
aliases: [collect fee, record payment, payment, receive fee, fee payment, receipt, print receipt, cash, esewa, khalti, cheque, शुल्क संकलन, भुक्तानी, रसिद, शुल्क बुझ्ने, fee tirne, fee uthaune, receipt katne]
verifiedAgainst: [frontend/src/pages/finance/Collect.jsx, frontend/src/components/finance/PaymentDialog.jsx, frontend/src/components/finance/StudentPicker.jsx, backend/src/services/finance]
verifiedOn: 2026-11-15
---
# Collecting a fee payment

## Purpose
Find a student, take a payment and print the receipt.

## Who can use it
Accountants and administrators.

## Where to find it
Left menu → **Collect Fees** (`/finance/collect`).

## Before you start
The student's fees for the year must exist (**Student Accounts → Generate fees**).

## Steps
1. Open **Collect Fees** and type in **Find a student** (name or admission number); choose the
   student.
2. Check **Total fees**, **Discounts**, **Paid** and **Balance**.
3. Click **Record payment**.
4. Choose how to apply it: **Automatic** (oldest dues first) or **Choose installments** (split it
   yourself).
5. Type the **Amount received (Rs.)**, choose the **Method** (**Cash**, **Bank transfer**,
   **Mobile wallet (eSewa, Khalti…)**, **Cheque**, **Card**) and the **Date received**. For
   non-cash methods type the **Reference** (transaction ID, cheque or bank slip number).
   **Remarks** are optional.
6. Click **Record Rs. …**.
7. Print the receipt (four slips fit on an A4 page) or open it from **Recent receipts**.

## What you should see
"Payment recorded", a receipt number like `RCP-2083-84-00042`, and the balance reduced.

## Common mistakes
- Entering more than is owed: a payment can never exceed what the student owes.
- A future date: "The payment date cannot be in the future."

## Troubleshooting
- "No fees for this year yet": generate the student's fees first.
- "No enrolment": the student is not enrolled in a class this year.
- A wrong payment cannot be edited or deleted. It is undone by a reversal (see
  receipts and reversals).

## Related pages
Student Accounts, Transactions, Reports.
