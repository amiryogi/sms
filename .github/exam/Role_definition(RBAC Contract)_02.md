Define a new RBAC role: EXAM_OFFICER
Capabilities:
- Can enter marks for ANY exam subject
- Can edit marks until exam is locked
- Can view student academic data
- Cannot:
  - Create or modify exams
  - Assign teachers
  - Modify subjects or classes
  - Publish results
  - Lock exams
Admin retains full authority.
Teacher retains subject-restricted authority.
RBAC must be enforced in backend middleware.
