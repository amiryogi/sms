Extend existing RBAC middleware.
Add support for role: EXAM_OFFICER.
Implement helper:
canEnterMarks(user, examSubject)
Rules:
- TEACHER → only if assigned to subject
- EXAM_OFFICER → always allowed
- ADMIN → only if override flag is true
- STUDENT / PARENT → never allowed
All checks must run server-side.
Return 403 for unauthorized access.
