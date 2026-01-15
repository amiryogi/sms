# Fee & Billing Module – Implementation Plan

Read `schema.prisma` before implementing.

### Level 1 – Basic Fees

Admin can:

- Define Fee Structure per Class + Academic Year
- Add Fee Items:
  - Tuition
  - Exam
  - Admission
  - Misc

Each fee item has:

- name
- amount
- frequency (one-time / monthly)

Students:

- Automatically receive fee dues based on enrollment
- Can view total dues

Parents:

- Can view child dues

No online payments yet.

### Level 2 – Tracking

- Track paid vs unpaid
- Partial payments
- Payment records
- Printable receipt (PDF later)

Rules:

- Fees must reference studentClass
- Fees must reference academicYear
- Teachers must never see fees
