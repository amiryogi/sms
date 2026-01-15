# Prisma & Database Rules

Before coding:

- Inspect `schema.prisma`
- Respect existing relations and constraints

Rules:

- Do NOT redefine Student, Class, Section, Subject, Exam tables
- Use existing foreign keys
- All new records must align with academicYear
- Financial data must reference student enrollment (`studentClass`)

If a required table does not exist:

- Propose changes before implementing
