# Task 3 — Excel Import for Grade 11–12 Subjects

Goal:
Allow Admin to upload NEB subject lists via Excel instead of manual UI entry.

Excel Columns:
- Grade
- Subject Name
- Subject Code
- Component (Theory / Practical)
- Credit Hour
- Full Marks
- Parent Subject Code (optional)

Requirements:
1. Backend:
   - Excel parser (xlsx)
   - Validation:
     - No duplicate subject codes
     - Parent subject must exist
   - Transaction-safe insert

2. Behavior:
   - Import applies ONLY to Grade 11 & 12
   - Existing subjects are NOT overwritten unless flagged

3. Frontend:
   - Simple upload UI
   - Preview before commit
   - Error row reporting

Deliverables:
- Import API
- Validation logic
- Rollback on failure
