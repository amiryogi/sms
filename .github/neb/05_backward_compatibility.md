CRITICAL TASK: Ensure Grade 1–10 continues working.

RULES:
- If classId < 11:
  - Ignore SubjectComponent
  - Use existing Subject + ClassSubject logic
- If classId >= 11:
  - Ignore practical flags on Subject
  - Use SubjectComponent ONLY

IMPLEMENT CHECKS:
Backend:
if (class.gradeLevel < 11) {
  useLegacyMarksLogic();
} else {
  useNebComponentLogic();
}

Frontend:
- Hide NEB UI for grades < 11
- Hide old practical UI for grades >= 11

TEST CASES:
- Grade 9 Math with practical → works
- Grade 11 Physics → component-based marks only
