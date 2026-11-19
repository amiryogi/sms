---
id: finance-reports
title: Financial reports and the finance dashboard
roles: [ACCOUNTANT, ADMIN, SUPER_ADMIN]
modules: [finance, reports]
routes: [/finance/reports, /finance/dashboard]
guides: [finance.reports]
status: published
aliases: [financial report, fee report, collection report, outstanding report, export, csv, excel, dashboard, finance overview, income, आर्थिक प्रतिवेदन, रिपोर्ट, संकलन, आम्दानी, report nikalne]
verifiedAgainst: [frontend/src/pages/finance/Reports.jsx, frontend/src/pages/finance/Dashboard.jsx, backend/src/utils/financeReports.js]
verifiedOn: 2026-11-15
---
# Financial reports and dashboard

## Purpose
See collections and dues at a glance, and produce reports to print or download.

## Who can use it
Accountants and administrators.

## Where to find it
- **Finance overview** / **Dashboard** (`/finance/dashboard`): collection figures and charts.
- **Reports** (`/finance/reports`).

## Steps
1. Open **Reports**.
2. Choose the report: **Collections**, **Outstanding**, **Discounts** or **Reversals**.
3. Set the filters: **Academic year**, **Class**, **Fee type**, **From** / **To**, **Method**,
   **Status**, **Group by**, **Overdue only** (depending on the report).
4. Click **Print**, or **Download CSV** to download a spreadsheet.

## What you should see
The report table. Every figure comes from the fee ledger.

## Common mistakes
- Dates outside the period you meant: check **From** and **To**.

## Troubleshooting
- "Nothing to report" / "No records match these filters": widen the filters.
- "Could not download the CSV": try again; check you are still signed in.

## Related pages
Student accounts, Transactions (day book).
