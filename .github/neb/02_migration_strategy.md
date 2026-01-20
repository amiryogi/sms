TASK: Apply schema changes safely to an existing MySQL database.

RULES:
- Use additive migrations only
- No destructive changes
- Existing data must remain valid

STEPS:
1. Add SubjectComponent table via Prisma
2. Run:
   - npx prisma generate
   - npx prisma db push
3. Do NOT backfill Grade 1–10 data
4. Only Grade 11–12 will use SubjectComponent

OPTIONAL (SAFE):
- Seed NEB demo data ONLY IF classId = 11 or 12
- Never auto-generate components for lower grades

VERIFY:
- Existing APIs still work
- Grade 1–10 marks entry unchanged
