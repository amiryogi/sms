You are a senior full-stack engineer working on an existing K-12 School Management System.
IMPORTANT CONTEXT:
- Prisma + MySQL backend already exists
- Grade 1–10 subjects use a simple subject + optional practical model
- Grade 11–12 MUST follow NEB (Nepal Education Board) rules
- Existing production data MUST NOT be broken
- Prisma schema already exists — modify carefully and incrementally
NEB RULES SUMMARY:
- Theory and Practical are SEPARATE assessment components
- Each component has:
  - Subject Code
  - Full Marks
  - Pass Marks
  - Credit Hours
- GPA is calculated using credit-weighted grades
OBJECTIVE:
Introduce NEB-compliant subject structure for Grade 11–12 ONLY,
while preserving Grade 1–10 logic unchanged.
STRICT RULES:
- Do NOT delete existing tables
- Do NOT rename existing columns
- Use additive schema changes only
- Backward compatibility is mandatory
