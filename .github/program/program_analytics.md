# Program-wise Analytics

Goal: Enable faculty-level insights.

Metrics:
- Students per Program
- Subject enrollment distribution
- GPA average per Program
- Pass/Fail ratio by Program

APIs:
- GET /analytics/programs
- GET /analytics/programs/:id/gpa

Rules:
- Analytics read-only
- Admin only
- Subject-level GPA aggregation

No impact on exams logic.
