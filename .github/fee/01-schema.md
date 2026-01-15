# Fee Module – Schema Rules

Before coding:

1. Inspect `schema.prisma`
2. Identify if fee-related tables already exist

Allowed actions:

- Add minimal new tables if required
- Reuse studentClass as enrollment anchor

Disallowed:

- Redefining Student, Class, AcademicYear
- Storing classId directly on payment records

If schema changes are required:

- Propose them first
- Keep relations normalized
