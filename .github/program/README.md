# Program / Faculty Module (Grade 11–12)

This module introduces **Program / Faculty** (Science, Management, Humanities, etc.)
for **Grade 11 & 12 only**, aligned with Nepal NEB (+2).

## Why Program Exists
NEB does not officially tag students as Science/Management,
but schools MUST group students for:
- Subject combinations
- Exam handling
- Reports
- GPA analysis
- Admin clarity

## Scope
✅ Applies ONLY to Grade 11 & 12  
❌ Must NOT affect Grade 1–10

## Core Concepts
- Program = Faculty grouping
- Program ≠ Subject
- Program ≠ Class
- Subjects remain atomic (code, credit, theory/practical)

## Key Tables
- Program
- ProgramSubject
- StudentProgram
- StudentSubject (existing, remains source of truth)

## High-Level Flow
1. Admin creates Program (Science / Management)
2. Admin links subjects to Program
3. Admin assigns Program to student
4. Subjects auto-populate (override allowed)
5. GPA & Exams remain subject-based

## Guardrails
- Programs only allowed for class 11 & 12
- Backend validation mandatory
- UI hidden for Grade 1–10

## Status
☑ Implemented
☑ Migration-safe
☑ NEB-aligned
