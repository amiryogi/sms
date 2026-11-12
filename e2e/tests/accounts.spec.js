// Sign-in accounts: an admin resets a password, the user must choose their own
// before anything else works, and class login slips print four to a page.
// The tests create and remove their own student; seeded passwords never change.
const { test, expect, data, stateFor, pdfPageCount, printPdf } = require("../helpers/fixtures");
const fs = require("node:fs");
const { call } = require("../helpers/api");

const RUN = Date.now().toString(36);

test.describe("password reset and the forced change", () => {
  const ctx = {};

  test.beforeAll(async () => {
    const { scope, yearId, tokens } = data();
    const res = await call("POST", "/students", tokens.admin, {
      firstName: "Reset",
      lastName: `Test${RUN}`,
      admissionNumber: `E2E-${RUN}`,
      password: "Initial123",
      dateOfBirth: "2012-04-01",
      gender: "female",
      admissionDate: "2024-04-14",
      classId: scope.classId,
      sectionId: scope.sectionId,
      academicYearId: yearId,
    });
    if (res.status !== 201) throw new Error(`create student: ${res.status} ${res.body?.message}`);
    ctx.userId = res.body.data.user.id;
    ctx.username = res.body.data.user.username;
    ctx.name = `Reset Test${RUN}`;
  });

  test.afterAll(async () => {
    const { tokens } = data();
    if (ctx.userId) await call("DELETE", `/users/${ctx.userId}`, tokens.admin);
  });

  test("an admin resets the password; the student signs in, must choose a new one, then reaches the dashboard", async ({ browser }) => {
    // 1. the admin resets it in the Students page
    const admin = await browser.newContext({ storageState: stateFor("admin") });
    const page = await admin.newPage();
    await page.goto("/admin/students");
    await page.getByPlaceholder(/Search name, username/).fill(ctx.username);
    await page.getByRole("button", { name: `Reset password for ${ctx.name}` }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Reset password" }).click();
    const temp = (await dialog.locator(".credential-password").innerText()).trim();
    expect(temp).toMatch(/^[A-Za-z0-9]{10}$/);
    await dialog.getByRole("button", { name: "Done" }).click();
    await admin.close();

    // 2. the student signs in with the temporary password and is sent to choose a new one
    const student = await browser.newContext();
    const s = await student.newPage();
    try {
      await s.goto("/login");
      await s.locator("#identifier").fill(ctx.username);
      await s.locator("#password").fill(temp);
      await s.getByRole("button", { name: "Sign in" }).click();
      await expect(s).toHaveURL(/\/account\/password/);
      await expect(s.getByRole("heading", { name: "Choose your password" })).toBeVisible();

      // even typing another address leads back here
      await s.goto("/student/dashboard");
      await expect(s).toHaveURL(/\/account\/password/);

      await s.locator("#cp-current").fill(temp);
      await s.locator("#cp-new").fill("MyNewPass9");
      await s.locator("#cp-confirm").fill("MyNewPass9");
      await s.getByRole("button", { name: "Save and continue" }).click();
      await expect(s).toHaveURL(/\/student\/dashboard/);
    } finally {
      await student.close();
    }

    // 3. the old and the temporary passwords no longer work; the new one does
    expect((await call("POST", "/auth/login", null, { identifier: ctx.username, password: "Initial123" })).status).toBe(401);
    expect((await call("POST", "/auth/login", null, { identifier: ctx.username, password: temp })).status).toBe(401);
    const ok = await call("POST", "/auth/login", null, { identifier: ctx.username, password: "MyNewPass9" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.mustChangePassword).toBe(false);
  });
});

test.describe("class login slips", () => {
  test.use({ storageState: stateFor("admin") });

  test("print four slips to an A4 page", async ({ page }, testInfo) => {
    const { scope } = data();
    // The response is rewritten: no real account gets a new password in this test.
    const fake = Array.from({ length: 6 }, (_, i) => ({
      userId: 900000 + i,
      role: i % 3 === 2 ? "PARENT" : "STUDENT",
      name: `Slip Person ${i + 1}`,
      username: `stu-e2e-${i + 1}`,
      temporaryPassword: `Abcd${i}efgh2`,
      class: "Grade 9",
      section: "A",
      rollNumber: i + 1,
      children: i % 3 === 2 ? ["A Child"] : null,
    }));
    await page.route("**/api/v1/students/credentials/bulk", async (route) => {
      const body = route.request().postDataJSON();
      const data = body.dryRun
        ? { students: 4, parents: 2, skipped: { signedIn: 0, inactive: 0 }, credentials: [] }
        : { students: 4, parents: 2, skipped: { signedIn: 0, inactive: 0 }, credentials: fake };
      await route.fulfill({ json: { success: true, message: "ok", data } });
    });

    await page.goto("/admin/login-slips");
    await page.locator("#ls-class").selectOption(String(scope.classId));
    await page.getByRole("button", { name: "Create passwords" }).click();
    await page.getByRole("alertdialog").or(page.getByRole("dialog")).getByRole("button", { name: "Create passwords" }).click();

    await expect(page.locator(".login-slip")).toHaveCount(6);
    await expect(page.locator(".login-slip-password").first()).toHaveText("Abcd0efgh2");
    await expect(page.locator(".slip-page")).toHaveCount(2);
    const pdf = await printPdf(page);
    fs.writeFileSync(testInfo.outputPath("login-slips.pdf"), pdf);
    expect(pdfPageCount(pdf)).toBe(2);
  });
});
