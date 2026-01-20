TASK: Implement NEB-compliant GPA calculation.

GRADE SCALE (NEB STANDARD):
A+ = 4.0
A  = 3.6
B+ = 3.2
B  = 2.8
C+ = 2.4
C  = 2.0
D  = 1.6
NG = 0.0

RULES:
- Grade is computed per SubjectComponent
- Final GPA = Σ(gradePoint × creditHours) / Σ(creditHours)

IMPLEMENT:
- Marks entry uses SubjectComponent instead of Subject
- Store component-level grades
- Aggregate per subject for report card

IMPORTANT:
- Practical failure = subject failure
- GPA rounding to 2 decimal places
