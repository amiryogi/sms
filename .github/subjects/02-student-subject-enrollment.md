# Task 2 — Student ↔ Subject Enrollment (Grade 11–12 Only)

Problem:
Grade 11–12 students can enroll in different subject combinations.
Current system assigns subjects only at class level.

Goal:
Allow Admin to select subjects per student during admission.

Requirements:
1. Create `StudentSubject` mapping table:
   - studentId
   - subjectId
   - academicYearId
   - status (ACTIVE | DROPPED)

2. Enrollment Rules:
   - Applies ONLY to Grade 11 & 12
   - Grade 1–10 must continue using class subjects

3. Backend:
   - Validation: student.grade IN (11, 12)
   - Prevent duplicate enrollment
   - Enforce NEB credit limits (future-safe)

4. Frontend (Admin):
   - While adding student:
     - Load subjects based on selected class
     - Allow checkbox select/deselect
     - Auto-group theory + practical

Deliverables:
- Prisma model
- API endpoints
- Controller-level validation
