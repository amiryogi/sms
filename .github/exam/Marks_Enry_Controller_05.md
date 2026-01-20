Audit mark/grade entry controllers.
Modify mark creation & update logic to:
- Accept EXAM_OFFICER role
- Store enteredByUserId
- Store enteredByRole
- Store entrySource
Do NOT allow EXAM_OFFICER to:
- Modify locked exams
- Override grading rules
Add defensive validation:
- Student must be enrolled in class
- Subject must belong to exam
- Exam must be ACTIVE (not DRAFT or LOCKED)
