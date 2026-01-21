# Task 1 — Redesign Grade 11–12 Subject Model (NEB-Safe)

Goal:
Support NEB Grade 11–12 subjects where:
- Theory and Practical are separate entities
- Each has its own:
  - Subject Code
  - Full Marks
  - Credit Hour

Constraints:
- Grade 1–10 subject structure MUST remain unchanged
- No breaking Prisma migrations

Requirements:
1. Extend Subject model to support:
   - subjectCode
   - creditHour
   - componentType: THEORY | PRACTICAL
   - parentSubjectId (for theory ↔ practical pairing)

2. Add flags:
   - isPlusTwoOnly (boolean)
   - gradeLevel (11 or 12)

3. Ensure:
   - Existing subjects remain valid
   - No required field added to old rows

Deliverables:
- Prisma schema changes
- Safe migration notes
- Clear comments in schema for future devs
