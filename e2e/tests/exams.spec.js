// Examinations: lifecycle, marks entry rules, the pilot tables, results.
// Each run creates its own exam ("E2E <run>") and deletes it afterwards, so
// the seeded exams and their marks are never changed.
const { test, expect, data, stateFor } = require("../helpers/fixtures");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { call } = require("../helpers/api");

const RUN = Date.now().toString(36).toUpperCase();
const EXAM_NAME = `E2E ${RUN}`;
const ctx = {};

const filterUrl = (path, filter) => `${path}?filter=${encodeURIComponent(JSON.stringify(filter))}`;
const tableRows = (page) => page.locator("table tbody tr");

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const d = data();
  ctx.tokens = d.tokens;
  ctx.scope = d.scope;
  const made = await call("POST", "/exams", d.tokens.admin, { name: EXAM_NAME, examType: "unit_test", academicYearId: d.yearId, classIds: [d.scope.classId] });
  expect(made.status, made.body?.message).toBe(201);
  ctx.examId = made.body.data.id;
  const exam = (await call("GET", `/exams/${ctx.examId}`, d.tokens.admin)).body.data;
  ctx.examSubject = exam.examSubjects[0];
  ctx.subjectName = ctx.examSubject.classSubject.subject.name;
  ctx.theoryFull = Number(ctx.examSubject.theoryFullMarks || ctx.examSubject.fullMarks);
  ctx.student = d.students.slice().sort((a, b) => a.rollNumber - b.rollNumber)[0];
});

test.afterAll(async () => {
  if (!ctx.examId) return;
  // The API (rightly) refuses to delete an exam that has marks, so the test
  // exam is removed directly in the test database.
  const backend = path.join(__dirname, "..", "..", "backend");
  execFileSync(process.execPath, ["scripts/with-test-db.js", "--provider", "mysql", "node", "../e2e/helpers/cleanup-exams.js"], { cwd: backend, stdio: "pipe" });
  expect((await call("GET", `/exams/${ctx.examId}`, ctx.tokens.admin)).status).toBe(404);
});

const saveMarks = (token, marks) =>
  call("POST", "/exam-results", token, { examSubjectId: ctx.examSubject.id, sectionId: ctx.scope.sectionId, results: [{ studentId: ctx.student.id, marksObtained: marks }] });

test.describe("pilot: examination list", () => {
  test.use({ storageState: stateFor("admin") });

  test("lists what the API returns, inside the app shell", async ({ page }) => {
    const api = (await call("GET", "/exams", ctx.tokens.admin)).body.data;
    await page.goto("/admin/exam-admin");
    await expect(page).toHaveURL(/\/admin\/exam-admin\/exams/);
    await expect(page.getByRole("heading", { level: 1, name: "Exam administration" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await expect(tableRows(page)).toHaveCount(Math.min(api.length, 10));
    await expect(page.locator("table tbody")).toContainText(EXAM_NAME);
  });

  test("search ignores case; the status filter narrows the list", async ({ page }) => {
    await page.goto(filterUrl("/admin/exam-admin/exams", { q: EXAM_NAME.toLowerCase() }));
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText(EXAM_NAME);

    await page.goto(filterUrl("/admin/exam-admin/exams", { status: "DRAFT" }));
    await expect(tableRows(page).first()).toBeVisible();
    for (const text of await tableRows(page).allInnerTexts()) expect(text).toContain("Draft");
  });

  test("the academic-year filter shows that year's exams only", async ({ page }) => {
    const years = (await call("GET", "/academic-years", ctx.tokens.admin)).body.data;
    const list = Array.isArray(years) ? years : years.academicYears;
    const other = list.find((y) => !y.isCurrent);
    test.skip(!other, "the seed has only one academic year");
    const api = (await call("GET", `/exams?academicYearId=${other.id}`, ctx.tokens.admin)).body.data;
    await page.goto(filterUrl("/admin/exam-admin/exams", { academicYearId: other.id }));
    if (api.length === 0) await expect(page.getByText(/No .* found|No results/i).first()).toBeVisible();
    else await expect(tableRows(page)).toHaveCount(Math.min(api.length, 10));
    await expect(page.locator("body")).not.toContainText(EXAM_NAME);
  });

  test("the subjects page shows the snapshot taken when the exam was created", async ({ page }) => {
    const exam = (await call("GET", `/exams/${ctx.examId}`, ctx.tokens.admin)).body.data;
    await page.goto(`/admin/exam-admin/exams/${ctx.examId}/show`);
    await expect(tableRows(page)).toHaveCount(exam.examSubjects.length);
    await expect(page.locator("table tbody")).toContainText(ctx.subjectName);
  });
});

test.describe("lifecycle and marks rules", () => {
  test("DRAFT: hidden from teachers, marks refused", async () => {
    const teacherExams = (await call("GET", "/exams", ctx.tokens.teacher)).body.data;
    expect(teacherExams.map((e) => e.id)).not.toContain(ctx.examId);
    expect((await call("GET", `/exams/${ctx.examId}`, ctx.tokens.teacher)).status).toBe(404);

    const res = await saveMarks(ctx.tokens.examofficer, 10);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/PUBLISHED/);
  });

  test("only an admin can publish", async () => {
    for (const role of ["teacher", "examofficer", "accountant", "student", "parent"]) {
      expect((await call("PUT", `/exams/${ctx.examId}/publish`, ctx.tokens[role])).status, role).toBe(403);
    }
  });

  test.describe("as admin, in the pilot", () => {
    test.use({ storageState: stateFor("admin") });

    test("Publish moves DRAFT to PUBLISHED", async ({ page }) => {
      await page.goto(filterUrl("/admin/exam-admin/exams", { q: EXAM_NAME }));
      await expect(tableRows(page)).toHaveCount(1);
      await tableRows(page).first().getByRole("button", { name: "Publish" }).click();
      await expect(tableRows(page).first()).toContainText("Published");
      expect((await call("GET", `/exams/${ctx.examId}`, ctx.tokens.admin)).body.data.status).toBe("PUBLISHED");
    });
  });

  test("PUBLISHED: teachers see it; invalid marks are refused, valid ones saved", async () => {
    const teacherExams = (await call("GET", "/exams", ctx.tokens.teacher)).body.data;
    expect(teacherExams.map((e) => e.id)).toContain(ctx.examId);

    const tooHigh = await saveMarks(ctx.tokens.examofficer, ctx.theoryFull + 1);
    expect(tooHigh.status).toBe(400);
    expect(tooHigh.body.message).toMatch(/cannot exceed/);
    expect((await saveMarks(ctx.tokens.examofficer, -1)).status).toBe(400);

    for (const role of ["accountant", "student", "parent"]) {
      expect((await saveMarks(ctx.tokens[role], 5)).status, role).toBe(403);
    }
    expect([200, 201]).toContain((await saveMarks(ctx.tokens.examofficer, 1)).status);
  });

  test.describe("marks entry screen, as exam officer", () => {
    test.use({ storageState: stateFor("examofficer") });

    test("enter and save marks; a value above full marks is flagged and not saved", async ({ page }) => {
      const marks = Math.min(ctx.theoryFull - 1, 17);
      await page.goto("/teacher/marks");
      await page.locator("select#me-exam").selectOption(String(ctx.examId));
      await page.locator("select#me-class").selectOption(String(ctx.scope.classId));
      await page.locator("select#me-section").selectOption(String(ctx.scope.sectionId));
      await page.locator("select#me-subject").selectOption(String(ctx.examSubject.id));

      const input = page.getByLabel(`Theory marks for ${ctx.student.name}`);
      await expect(input).toBeVisible();

      // invalid first: above full marks
      await input.fill(String(ctx.theoryFull + 50));
      await input.blur();
      await expect(input).toHaveAttribute("aria-invalid", "true");
      await page.getByRole("button", { name: "Save Marks" }).first().click();
      await expect(page.getByText(/highlighted row/i)).toBeVisible();

      // then a valid value
      await input.fill(String(marks));
      await input.blur();
      await expect(input).not.toHaveAttribute("aria-invalid", "true");
      await page.getByRole("button", { name: "Save Marks" }).first().click();
      await expect(page.getByText(/Marks saved for/i)).toBeVisible();

      const saved = (await call("GET", `/exam-results/exam-subjects/${ctx.examSubject.id}?sectionId=${ctx.scope.sectionId}`, ctx.tokens.admin)).body.data;
      const rows = saved.results || saved.students || saved;
      const row = rows.find((r) => (r.studentId ?? r.student?.id) === ctx.student.id);
      expect(Number(row.marksObtained ?? row.theoryMarks)).toBe(marks);

      // and it is still there after a reload
      await page.reload();
      await page.locator("select#me-exam").selectOption(String(ctx.examId));
      await page.locator("select#me-class").selectOption(String(ctx.scope.classId));
      await page.locator("select#me-section").selectOption(String(ctx.scope.sectionId));
      await page.locator("select#me-subject").selectOption(String(ctx.examSubject.id));
      await expect(page.getByLabel(`Theory marks for ${ctx.student.name}`)).toHaveValue(String(marks));
    });
  });

  test.describe("as admin, in the pilot (lock)", () => {
    test.use({ storageState: stateFor("admin") });

    test("Lock, then Unlock, through the buttons", async ({ page }) => {
      await page.goto(filterUrl("/admin/exam-admin/exams", { q: EXAM_NAME }));
      const row = tableRows(page).first();
      await row.getByRole("button", { name: "Lock", exact: true }).click();
      await expect(row).toContainText("Locked");

      // LOCKED: marks are read-only for everyone
      const res = await saveMarks(ctx.tokens.examofficer, 2);
      expect(res.status).toBe(400);
      expect((await saveMarks(ctx.tokens.admin, 2)).status).toBe(400);

      await row.getByRole("button", { name: "Unlock" }).click();
      await expect(row).toContainText("Published");
      expect((await call("GET", `/exams/${ctx.examId}`, ctx.tokens.admin)).body.data.status).toBe("PUBLISHED");
    });
  });
});

test.describe("pilot: results", () => {
  test.use({ storageState: stateFor("admin") });

  test("asks for exam, class and section before showing anything", async ({ page }) => {
    await page.goto("/admin/exam-admin/results");
    await expect(page.getByText("Choose an examination, a class and a section")).toBeVisible();
  });

  test("rows, GPA and grades equal the API; the failed filter matches", async ({ page }) => {
    const { scope, students } = data();
    await page.goto(filterUrl("/admin/exam-admin/results", scope));
    await expect(tableRows(page)).toHaveCount(students.length);
    const byRoll = [...students].sort((a, b) => a.rollNumber - b.rollNumber);
    const texts = await tableRows(page).allInnerTexts();
    byRoll.forEach((s, i) => {
      expect(texts[i]).toContain(s.name);
      expect(texts[i]).toContain(s.gpa.toFixed(2));
      expect(texts[i]).toContain(s.isPassed ? "Passed" : "Failed");
    });

    await page.goto(filterUrl("/admin/exam-admin/results", { ...scope, outcome: "failed" }));
    const failed = students.filter((s) => !s.isPassed).length;
    if (failed === 0) await expect(page.getByText("No students match.")).toBeVisible();
    else await expect(tableRows(page)).toHaveCount(failed);
  });
});
