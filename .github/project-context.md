# Project Context

This is a K-12 School Management System for ONE school.
Architecture is prepared for multi-school expansion later.

Core roles:

- ADMIN: full academic, finance, exam control
- TEACHER: attendance, assignments, marks
- STUDENT: view own data
- PARENT: view child data

Important:

- Students are linked to classes via `studentClass`
- Teachers are linked via `teacherSubject`
- AcademicYear is central to all operations
