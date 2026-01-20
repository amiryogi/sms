TASK: Redesign Prisma schema to support NEB subject components
WITHOUT breaking Grade 1–10 logic.

PROBLEM:
Current Subject model mixes theory/practical using booleans.
This is invalid for Grade 11–12 NEB.

SOLUTION:
Introduce a new model: SubjectComponent

REQUIREMENTS:
- Subject remains generic (Physics, Chemistry, etc.)
- SubjectComponent is grade-specific and component-specific

IMPLEMENT:
Add a new Prisma model similar to:

model SubjectComponent {
  id            Int      @id @default(autoincrement())
  subjectId     Int
  classId       Int      // Only Grade 11 or 12
  type          ComponentType // THEORY | PRACTICAL
  subjectCode   String
  fullMarks     Int
  passMarks     Int
  creditHours   Float

  subject       Subject  @relation(fields: [subjectId], references: [id])
  class         Class    @relation(fields: [classId], references: [id])

  @@unique([classId, subjectId, type])
}

enum ComponentType {
  THEORY
  PRACTICAL
}

DO NOT:
- Remove practical flags from Subject (needed for Grade 1–10)
- Modify existing ClassSubject logic yet
