Audit the existing Prisma schema.
If roles are stored as ENUM:
- Add EXAM_OFFICER to Role enum
Ensure ExamResult (or Marks table) contains:
- enteredByUserId (FK → User)
- enteredByRole (enum or string)
- entrySource ("TEACHER" | "EXAM_OFFICER" | "ADMIN_OVERRIDE")
DO NOT remove existing fields.
DO NOT rename tables.
Only add what is strictly required.
After schema update:
- Run prisma generate
- Run prisma db push (no migrations unless required)
