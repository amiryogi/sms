# Task 4 — Subject Locking & Audit Trail

Problem:
Once exams or marks begin, subject structure must NOT change.

Goal:
Prevent accidental or malicious edits.

Requirements:
1. Subject Locking:
   - Add `isLocked` flag
   - Lock triggers:
     - Exam created
     - Marks entry started

2. Restrictions:
   - Locked subjects cannot be:
     - Edited
     - Deleted
     - Reassigned

3. Audit Trail:
   - Create SubjectAudit table:
     - action (CREATE, UPDATE, LOCK)
     - oldValue
     - newValue
     - performedBy
     - timestamp

4. UI:
   - Show lock icon
   - Disable edit buttons
   - Tooltip explaining why locked

Deliverables:
- Prisma models
- Middleware guards
- Admin UI updates
