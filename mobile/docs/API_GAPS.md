# API gaps

What the mobile brief asks for that the backend does not provide today (checked against
`backend/src/routes/` on 2026-11-13). The app does **not** fake these: a missing feature has no
button. A backend change ships only after the owner approves it. Each entry proposes the
smallest backward-compatible change.

| # | Gap | Effect in the app today | Proposed change | Priority |
|---|---|---|---|---|
| 1 | Push notifications | **Built 2026-11-14** (owner approved). Remaining: fee-due reminders and a school on/off setting for absence alerts | §1 below | Done |
| 2 | Logout signs out everywhere | Signing out of the app also signs the user out of the web (and the reverse) | §2 | Medium |
| 3 | No school-wide attendance summary | Admin home shows no "today's attendance" figure; admin can open one section on one day | §3 | Medium |
| 4 | No class-wise student counts | Admin home shows the school total only (`pagination.total`) | §3 | Low |
| 5 | No marks-entry progress | Exam officer sees exams and subjects, not "12 of 40 entered", unless they open each subject | §4 | Medium |
| 6 | Attendance is daily, not per subject | No subject-wise attendance screen | None proposed: a data-model change, owner's decision | — |
| 7 | No timetable / routine | No timetable screen | Not built on the web either (CLAUDE.md §6) | — |
| 8 | No forgot-password | Login says "Ask your school office to reset your password" | Needs a mail/SMS service; not built on the web either | — |
| 9 | No server-side PDF | Report-card PDFs are rendered on the device from the API payload with a port of the web sheet | None needed now | — |
| 10 | Notification "read" state is not stored on the server | "Seen" is kept per device, so it does not follow the user to another phone | Part of §1 | Low |
| 11 | A theory mark of 0 is stored as empty | `POST /exam-results` uses `parseFloat(x) \|\| null`, so a typed 0 comes back blank on reload (the report card counts it as 0). The app sends what the web sends | Store `0` when the value is `0` (one-line fix in `examResult.controller.js`, with a unit test) | Low |
| 12 | `/teacher-subjects` returns every year | The app keeps only rows whose `classSubject.academicYear.isCurrent` is true | Optional `?current=true` filter | Low |

---

## 1. Push notifications (built 2026-11-14)

**Built as proposed below**, with these differences:
- the table also has `school_id`, so every query is scoped by school;
- signing out (and an admin resetting the password) deletes the user's device rows on the
  server, so the app does not need to call `DELETE /devices/:token` first;
- "absent" needs no school setting yet: it is sent for today's register only, to parents only,
  and once per absence;
- **not built:** the daily fee-due reminder (it needs a scheduled job on the host), and checking
  Expo's delivery receipts (tokens are removed when Expo refuses them at send time).

**Before:** the app had an in-app notification center (`/shared/notifications`, a bell with an
unread count). It is built from published notices, assignments, grades, published report cards
and overdue fees, with read state kept on the phone. It shows nothing while the app is closed.

**Why not local notifications from background polling instead:**
- Android and iOS run background tasks rarely and at times they choose, so alerts would be
  late or never come.
- Polling needs the session token readable while the phone is locked, which weakens how the
  token is stored.

Push from the server is the reliable route:

**Model** (add to `prisma/schema/models.prisma`, migrations for MySQL and PostgreSQL):

```prisma
model DeviceToken {
  id         Int      @id @default(autoincrement())
  schoolId   Int      @map("school_id")
  userId     Int      @map("user_id")
  token      String   @db.VarChar(255)   // ExponentPushToken[...]
  platform   String   @db.VarChar(10)    // "ios" | "android"
  createdAt  DateTime @default(now()) @map("created_at")
  lastSeenAt DateTime @default(now()) @map("last_seen_at")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([token])
  @@index([userId])
  @@map("device_tokens")
}
```

**Endpoints**, both behind `authenticate`, no role check:

- `POST /devices { token, platform }`: upsert for `req.user`. A token that belonged to someone
  else moves to this user, because the phone changed hands.
- `DELETE /devices/:token`: the app calls it before `POST /auth/logout`.

**Sending** (`services/push.service.js`):
- Batches of up to 100 to `https://exp.host/--/api/v2/push/send`.
- Removes tokens that come back `DeviceNotRegistered`.
- Never blocks the request that triggered it: it runs after the response, and a failure only
  writes a log line.
- Optional `EXPO_ACCESS_TOKEN` env var.

**Triggers.** Recipients are resolved with the same rules the read endpoints use, so a push
never reveals more than the app would show:

| Event | Where | Recipients |
|---|---|---|
| Notice published | `notice.service.publish` | the notice's audience (global / roles / class-section), as `GET /notices` filters it |
| Assignment published | `assignment.controller` create/update when `isPublished` becomes true | students of that section + their parents |
| Submission graded | `submission.controller.gradeSubmission` | the student + their parents |
| Report cards published | `reportCard.controller.publishReportCards` | students of the class/section + parents |
| Attendance marked absent | `attendance.controller.markAttendance` | parents of absent students (school setting, off by default) |
| Fee due reminder | a daily job (cPanel cron) | parents/students with an installment due in N days |

**Payload:** a title, a short body without marks or amounts, and `data: { type, id, studentId }`
for navigation. The app then loads the details through the normal API, which checks access
again.

**Tests:**
- unit tests for recipient resolution;
- an integration test that publishing a notice queues pushes only for its audience;
- a mocked Expo endpoint.

## 2. Per-device logout (proposal)

`POST /auth/logout` deletes every refresh token of the user. Proposal:
- accept an optional `{ refreshToken }` body;
- when present, revoke only that token's row (matched by hash);
- with no body, behave as today, so the web app is unchanged.

The mobile app would always send its refresh token.

## 3. Admin attendance and enrolment summary (proposal)

`GET /attendance/summary?date=YYYY-MM-DD` (ADMIN, `authorize("attendance.view_all")`):

```json
{ "date": "2026-11-13", "bsDate": "2083/07/27",
  "sections": [{ "classId": 1, "className": "Grade 1", "sectionId": 1, "sectionName": "A",
                 "enrolled": 32, "marked": 30, "present": 27, "absent": 2, "late": 1, "excused": 0 }],
  "totals": { "enrolled": 400, "marked": 380, "present": 350 } }
```

It needs one grouped query over `StudentClass` (current year, active) and one over `Attendance`
for the date. The same response would give class-wise student counts (gap 4).

## 4. Marks-entry progress (proposal)

`GET /exam-results/progress?examId=` (EXAM_OFFICER, ADMIN): per exam subject and section,
`{ enrolled, entered, absent }`. It is two grouped counts and adds no new rules.
