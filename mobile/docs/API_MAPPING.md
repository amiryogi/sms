# API mapping

Every endpoint the mobile app calls, the guard the backend puts on it, and the screens that use
it. Paths are relative to `EXPO_PUBLIC_API_URL` (`…/api/v1`). Read from the route files in
`backend/src/routes/` and the controllers they call (2026-11-13). Response bodies are the
`data` field of `{ success, message, data }`.

Service column = the function in `mobile/src/api/services/`.

## Auth and account

| Method + path | Guard | Body / query | Returns | Service | Screens |
|---|---|---|---|---|---|
| `POST /auth/login` | rate limited | `{ identifier, password, schoolCode? }` | `{ user, accessToken, refreshToken }` | `auth.login` | Login |
| `POST /auth/refresh-token` | rate limited | `{ refreshToken }` | `{ accessToken, refreshToken }` | client (internal) | — |
| `GET /auth/me` | authenticate | — | the user (same shape as login's `user`, plus `status`, `lastLogin`) | `auth.me` | start-up, Profile |
| `POST /auth/logout` | authenticate | — | `null` (deletes all the user's refresh tokens) | `auth.logout` | Profile |
| `PUT /auth/change-password` | authenticate | `{ currentPassword, newPassword }` (8+, upper, lower, digit) | forced: `{ accessToken, refreshToken }`; voluntary: `null` | `auth.changePassword` | Change password |
| `GET /public/school/:code` | none | — | public branding (name, logo, colour, contact) | `school.publicByCode` | Login |
| `GET /school` | authenticate | — | the user's school | `school.mine` | School profile (admin) |
| `POST /uploads/avatar` | authenticate | multipart `avatar` | user with new `avatarUrl` | `users.uploadAvatar` | Profile |

The `user` object: `id, username, email, mustChangePassword, firstName, middleName, lastName,
phone, avatarUrl, roles[], permissions[], school{ id, name, code, logoUrl, bannerUrl, tagline,
address, phone, email, website, brandColor, … }, student?{ id, admissionNumber, rollNumber,
enrollments[{ class, section, academicYear }] }, parent?{ id, children[{ studentId,
studentName, class, section, rollNumber, relationship, isPrimary }] }`.

## Academic structure

| Method + path | Guard | Notes | Service |
|---|---|---|---|
| `GET /academic-years` | authenticate | all years | `academic.years` |
| `GET /academic-years/current` | authenticate | the current year | `academic.currentYear` |
| `GET /classes` | authenticate | | `academic.classes` |
| `GET /sections` | authenticate | | `academic.sections` |
| `GET /class-subjects?classId=&academicYearId=` | authenticate | subjects of a class | `academic.classSubjects` |
| `GET /teacher-subjects` | authenticate; non-admins forced to their own `userId` | **all years**: filter `classSubject.academicYear.isCurrent` | `teachers.myAssignments` |

## Student and parent portal

| Method + path | Guard | Returns | Service | Screens |
|---|---|---|---|---|
| `GET /portal/students/:studentId/overview` | `isOwnStudent` | `{ student, enrolment, subjects[], attendance{ …counts, percentage, countLateAsPresent, lastMarked, lastStatus }, latestResult, upcomingExams[], assignments[], fees{ due, paid, discount, balance, overdue, status, nextDue } }` | `portal.overview` | Student/Parent Home, Profile |
| `GET /parents/me/children` | PARENT | `{ children[{ id, studentId, fullName, admissionNumber, rollNumber, currentEnrollment{ class, section, academicYear }, relationship, isPrimary, … }], count }` | `parents.myChildren` | Child switcher |
| `GET /attendance/student/:studentId` | `authorize(attendance.view_own/all/class)` + `canAccessAttendance` | `{ summary{ present, absent, late, excused, attended, percentage, countLateAsPresent }, byMonth[{ year, month, label, …counts, percentage }], attendances[{ attendanceDate, status, remarks, bsDate }] }` | `attendance.studentSummary` | Attendance register |
| `GET /report-cards/student/:studentId/exams` | `authorize(report_card.view_*)` + `canAccessResults` | published only: `[{ examId, examName, examType, academicYear, className, sectionName, overallGrade, percentage, classRank, generatedAt }]` | `reportCards.publishedExams` | Results |
| `GET /report-cards/student/:studentId/exam/:examId` | same; unpublished → 403 for students/parents | `{ school, examination, student, subjects[], summary, remarks, meta, gradeReference, layout }` | `reportCards.get` | Report card + PDF |
| `GET /results/student/:studentId/exam/:examId` | `authorize(result.view_*)` + ownership | per-subject marks (LOCKED exam or published card only, for students/parents) | `results.forStudent` | Result detail |
| `GET /assignments` (`?studentId=` for a parent) | authenticate; scoped in controller | published assignments of the student's class/section, with the student's own `submissions[]` | `assignments.list` | Assignments |
| `GET /assignments/:id` | authenticate; scoped | one assignment with `assignmentFiles` | `assignments.get` | Assignment detail |
| `POST /submissions` | STUDENT | multipart: `assignmentId`, `content?`, `files[]` (≤ 3) | the submission | `submissions.submit` | Submit |
| `GET /notices` | authenticate; visibility in service | paginated; `?status&priority&search&page&limit` | `notices.list` | Notices, notification center |
| `GET /notices/:id` | authenticate; visibility | one notice | `notices.get` | Notice detail |
| `GET /fees/accounts/:studentId` | ADMIN, ACCOUNTANT, or the student/parent (ownership) | `{ student, years[{ academicYear, fees[{ feeType, amountDue, discount, paid, balance, status, overdue, installments[] }], totals, status }], discounts[], transactions[] }` | `fees.statement` | Fees |
| `GET /fees/bills/student/:studentId` | ownership | `{ school, bill }` | `fees.studentBill` | Fees → Bill |
| `GET /fees/transactions/:id` | ownership | receipt | `fees.transaction` | Receipt |

## Teacher

| Method + path | Guard | Notes | Service | Screens |
|---|---|---|---|---|
| `GET /teachers/my-students` | TEACHER | `{ summary, classes[{ class, section, students[] }] }` for the current year | `teachers.myStudents` | My students |
| `GET /attendance?classId&sectionId&date` | `authorize(attendance.view_class/all)` + `canAccessAttendance` | enrolled students with that day's `status` (null if unmarked) | `attendance.forSection` | Mark attendance |
| `POST /attendance` | `authorize(attendance.mark)` + `canAccessAttendance`; teacher must be assigned (current year) | `{ classId, sectionId, date: "YYYY-MM-DD", attendanceRecords[{ studentId, studentClassId, status: present/absent/late/excused, remarks? }] }`; upsert per student in one transaction | `attendance.mark` | Mark attendance |
| `GET /exam-results/exams` | TEACHER, EXAM_OFFICER, ADMIN | PUBLISHED exams of the current year; for a teacher only their subjects, with `examSubjects[].assignedSectionIds`; for others every subject with `sections[]` | `marks.exams` | Marks: pick exam/subject/section |
| `GET /exam-results/students?examSubjectId&sectionId` | same; teacher assignment checked | `{ examSubject (snapshot: hasTheory, hasPractical, fullMarks, passMarks, theoryFullMarks, practicalFullMarks; exam.status), students[{ studentId, studentClassId, rollNumber, names, existingResult }] }` | `marks.students` | Marks entry |
| `POST /exam-results` | same; exam must be PUBLISHED | `{ examSubjectId, sectionId, results[{ studentId, marksObtained, practicalMarks?, isAbsent?, remarks? }] }`; checked against the snapshot full marks | `marks.save` | Marks entry |
| `GET /assignments` | TEACHER: own; ADMIN: all | | `assignments.list` | Assignments |
| `POST /assignments` | TEACHER, ADMIN | multipart: `title`, `teacherSubjectId`, `description?`, `dueDate?`, `totalMarks?`, `isPublished?`, `files[]` (≤ 5) | `assignments.create` | New assignment |
| `PUT /assignments/:id` | TEACHER (own), ADMIN | same fields, optional | `assignments.update` | Edit / publish |
| `GET /submissions/assignment/:assignmentId` | TEACHER (own), ADMIN | submissions with files | `submissions.forAssignment` | Submissions |
| `PUT /submissions/:id/grade` | TEACHER (own), ADMIN | `{ marksObtained, feedback? }` | `submissions.grade` | Grade |
| `POST /notices` | ADMIN, TEACHER (CLASS_SPECIFIC, own classes) | not used by the app in phase 5; see IMPLEMENTATION_STATUS | — | — |

## Exam officer

The marks-entry endpoints above (any subject, any section), plus:

| Method + path | Guard | Service | Screens |
|---|---|---|---|
| `GET /exams` | authenticate (non-admins never see DRAFT) | `exams.list` | Exams overview |
| `GET /exams/:id` | authenticate | `exams.get` | Exam detail |
| `GET /students?search&classId&sectionId&page&limit` | ADMIN, TEACHER, EXAM_OFFICER, ACCOUNTANT | `students.list` | Student directory |
| `GET /students/:id` | `isOwnStudent` (GET allowed for exam officer/accountant) | `students.get` | Student detail |

## Accountant (and admin)

| Method + path | Guard | Notes | Service | Screens |
|---|---|---|---|---|
| `GET /fees/dashboard` | ADMIN, ACCOUNTANT | `{ academicYear, filters, kpis, series{ daily, monthly, byClass, byFeeType, obligationStatus, overdueTrend }, overdueStudents[], recentTransactions[] }` | `finance.dashboard` | Finance home |
| `GET /fees/accounts?search&classId&sectionId&status&page&limit` | ADMIN, ACCOUNTANT | paginated accounts with balances | `fees.accounts` | Accounts |
| `GET /fees/accounts/:studentId` | | statement (above) | `fees.statement` | Account detail |
| `POST /fees/transactions` | ADMIN, ACCOUNTANT | `{ studentId, amount, method: cash/cheque/bank_transfer/wallet/card, allocations?[{ installmentId, amount }], reference?, remarks?, paidOn?, idempotencyKey (UUID) }` → receipt, `replayed` | `fees.recordPayment` | Record payment |
| `GET /fees/transactions?from&to&type&method&classId&studentId&page&limit` | ADMIN, ACCOUNTANT | paginated, append-only | `fees.transactions` | Transactions |
| `GET /fees/transactions/:id` | | receipt | `fees.transaction` | Receipt |
| `GET /fees/reversal-requests?status` | ADMIN, ACCOUNTANT | read only in the app | `fees.reversalRequests` | Transaction detail (status) |
| `GET /fees/reports/:report` | ADMIN, ACCOUNTANT | `{ title, subtitle, columns[], rows[], totals }` | `finance.report` | Reports |

Not called by the app on purpose: reversals, discounts, cancellations, obligation generation,
installment templates and reconciliation stay on the web, where their approval workflows
live.

## Admin

Read-only monitoring on mobile:

| Method + path | Service | Screens |
|---|---|---|
| `GET /students` (paginated `total` = student count) | `students.list` | Home, Students |
| `GET /teachers?search&page&limit` (ADMIN) | `teachers.list` | Home, Staff |
| `GET /users?role=&page&limit` (ADMIN) | `users.list` | Staff |
| `GET /classes`, `GET /sections`, `GET /academic-years/current` | `academic.*` | Home, Classes |
| `GET /exams` | `exams.list` | Exams |
| `GET /report-cards?examId&classId&sectionId` (ADMIN) | `reportCards.forSection` | Report cards |
| `GET /attendance?classId&sectionId&date` | `attendance.forSection` | Class attendance (one section, one day) |
| `GET /fees/dashboard` | `finance.dashboard` | Finance |
| `GET /notices` | `notices.list` | Notices |
| `GET /school` | `school.mine` | School profile |

Exam lifecycle changes (publish, lock, unlock), report-card generation and publishing,
promotions, user management and school settings stay on the web in this release.
