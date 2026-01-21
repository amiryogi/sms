# Project Context — K-12 School Management System

You are working inside an existing production-grade K-12 School Management System.

Tech stack:
- Backend: Node.js, Express, Prisma ORM, MySQL
- Frontend: React (Admin / Teacher / Student dashboards)
- Auth: JWT + Role-Based Access Control (RBAC)

Key facts:
- Grades 1–10 use fixed class-level subjects
- Grades 11–12 (+2) follow NEB structure
- NEB does NOT label students as "Science" or "Management"
- Campuses MAY group students internally for administration

CRITICAL RULE:
❌ Do NOT modify, refactor, or break Grade 1–10 logic.
✅ All new logic applies ONLY to Grade 11 and Grade 12.

Before coding:
- Read `prisma/schema.prisma`
- Identify existing Subject, Class, Student, Enrollment, Exam models
