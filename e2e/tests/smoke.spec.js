// General regression: sign-in, token refresh, role-based navigation, a fee receipt.
const { test, expect, data, stateFor, pdfPageCount, printPdf } = require("../helpers/fixtures");
const { ROLES } = require("../helpers/roles");

test.describe("signing in", () => {
  // the browser logs the refused login (401) as a console error; that is expected
  test.use({ allowedError: /401|Unauthorized/i });

  test("wrong password shows an error and stays on the login page", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(ROLES.admin);
    await page.locator("#password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("an admin signs in through the form and lands on the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(ROLES.admin);
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  });

  test("a visitor who is not signed in is sent to the login page", async ({ page }) => {
    await page.goto("/admin/students");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("expired access token", () => {
  test.use({ storageState: stateFor("admin"), allowedError: /401|Unauthorized/i });

  test("is refreshed silently and the page still loads", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    // Corrupt only the access token; the refresh token is still valid.
    await page.evaluate(() => localStorage.setItem("accessToken", "expired.invalid.token"));
    const refreshed = page.waitForResponse((r) => r.url().includes("/auth/refresh-token") && r.ok());
    await page.goto("/admin/classes");
    await refreshed;
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/classes/);
    expect(await page.evaluate(() => localStorage.getItem("accessToken"))).not.toBe("expired.invalid.token");
  });
});

// Each role: its home page loads, and a page that belongs to another role is refused.
const HOMES = {
  superadmin: { home: "/admin/dashboard", allowed: "/admin/school-settings", forbidden: null },
  admin: { home: "/admin/dashboard", allowed: "/finance/dashboard", forbidden: "/student/dashboard" },
  teacher: { home: "/teacher/dashboard", allowed: "/teacher/attendance", forbidden: "/admin/students" },
  examofficer: { home: "/teacher/marks", allowed: "/teacher/notices", forbidden: "/finance/dashboard" },
  accountant: { home: "/finance/dashboard", allowed: "/finance/accounts", forbidden: "/admin/exams" },
  student: { home: "/student/dashboard", allowed: "/student/fees", forbidden: "/admin/dashboard" },
  parent: { home: "/parent/dashboard", allowed: "/parent/fees", forbidden: "/finance/collect" },
};

for (const [role, { home, allowed, forbidden }] of Object.entries(HOMES)) {
  test.describe(`role: ${role}`, () => {
    test.use({ storageState: stateFor(role) });

    test("home and an allowed page load with a heading and no errors", async ({ page }) => {
      for (const path of [home, allowed]) {
        await page.goto(path);
        await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")));
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await expect(page.locator("main")).not.toContainText(/undefined|NaN|\[object Object\]|Invalid Date/);
      }
    });

    test("a page for another role is refused", async ({ page }) => {
      test.skip(!forbidden, "a super admin can open every admin page");
      await page.goto(forbidden);
      await expect(page).not.toHaveURL(new RegExp(forbidden.replace(/\//g, "\\/")));
    });
  });
}

test.describe("middle name", () => {
  test.use({ storageState: stateFor("admin") });
  const RUN = Date.now().toString(36);
  const email = `e2e.middle.${RUN}@svi.edu.np`;

  test.afterAll(async () => {
    const { call } = require("../helpers/api");
    const { tokens } = data();
    const found = await call("GET", `/users?search=${encodeURIComponent(email)}`, tokens.admin);
    for (const u of found.body?.data?.users || found.body?.data || []) {
      if (u.email === email) await call("DELETE", `/users/${u.id}`, tokens.admin);
    }
  });

  test("a staff member added with a middle name is listed and found by it", async ({ page }) => {
    await page.goto("/admin/teachers");
    await page.getByRole("button", { name: "Add staff member" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("First name").fill("Ram");
    await dialog.getByLabel("Middle name").fill("Bahadur");
    await dialog.getByLabel("Last name").fill(`Thapa${RUN}`);
    await dialog.getByLabel("Email").fill(email);
    await dialog.getByLabel("Password").fill("Password123");
    await dialog.getByRole("button", { name: "Add staff member" }).click();
    await expect(dialog).toBeHidden();

    await page.getByPlaceholder("Search name or email…").fill("bahadur");
    await expect(page.locator("main")).toContainText(`Ram Bahadur Thapa${RUN}`);
  });
});

test.describe("fees", () => {
  test.use({ storageState: stateFor("accountant") });

  test("a receipt opens from the ledger and prints on one page", async ({ page }) => {
    await page.goto("/finance/transactions");
    const link = page.locator('a[href^="/finance/receipts/"]').first();
    await expect(link).toBeVisible();
    const number = (await link.innerText()).trim();
    await link.click();
    await expect(page).toHaveURL(/\/finance\/receipts\/\d+/);
    await expect(page.locator("article")).toContainText(number);
    expect(pdfPageCount(await printPdf(page))).toBe(1);
  });

  test("the accountant's account page shows the balance the student sees", async ({ page, browser }) => {
    const { studentId } = data();
    const context = await browser.newContext({ storageState: stateFor("student") });
    const studentPage = await context.newPage();
    await studentPage.goto("/student/fees");
    const figure = studentPage.locator("main .text-3xl").first();
    await expect(figure).toBeVisible();
    const balance = (await figure.innerText()).trim();
    await context.close();
    expect(balance).toMatch(/[0-9]/);

    await page.goto(`/finance/accounts/${studentId}`);
    await expect(page.locator("main")).toContainText(balance);
  });
});
