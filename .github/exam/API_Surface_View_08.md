Review API routes related to marks.
Ensure:
- EXAM_OFFICER can access mark entry endpoints
- EXAM_OFFICER cannot access admin-only endpoints
- Route guards are explicit (no role fallthrough)
Do NOT expose new endpoints unless necessary.
Reuse existing routes wherever possible.
