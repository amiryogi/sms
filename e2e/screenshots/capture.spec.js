// Captures the screenshots the public site shows (frontend/public/screenshots/*.jpg)
// from the real app, signed in as each role on the seeded TEST database. Only demo
// data appears. Run `npm run screenshots`, then look at every image before committing.
const path = require("node:path");
const { test, expect, data, stateFor } = require("../helpers/fixtures");
const { call } = require("../helpers/api");

const OUT = path.join(__dirname, "..", "..", "frontend", "public", "screenshots");

/** Wait until the page has finished loading its data and drawing (charts animate in). */
const settle = async (page) => {
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByText(/^Loading/)).toHaveCount(0);
  await page.waitForTimeout(900);
};

const save = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 82 });

/** One capture: sign in as `role`, open `url`, optionally drive the page, save `name`.jpg. */
const shot = (name, role, url, prepare) =>
  test(name, async ({ browser }) => {
    const context = await browser.newContext({ storageState: stateFor(role), viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(typeof url === "function" ? url() : url);
    await settle(page);
    if (prepare) {
      await prepare(page);
      await settle(page);
    }
    await save(page, name);
    await context.close();
  });

test.describe.configure({ mode: "serial" });

// Admin
shot("admin-dashboard", "admin", "/admin/dashboard");
shot("admin-students", "admin", "/admin/students");
shot("admin-exams", "admin", "/admin/exams");
shot("admin-report-cards", "admin", "/admin/report-cards", async (page) => {
  const { scope } = data();
  const selects = page.locator("main select");
  // exam, class, section — in the order the page shows them
  await selects.nth(0).selectOption(String(scope.examId)).catch(() => {});
  await page.waitForLoadState("networkidle");
  await selects.nth(1).selectOption(String(scope.classId)).catch(() => {});
  await page.waitForLoadState("networkidle");
  await selects.nth(2).selectOption(String(scope.sectionId)).catch(() => {});
  await page.getByRole("button", { name: "View Report Cards" }).click();
});
shot("admin-school-settings", "admin", "/admin/school-settings", async (page) => {
  await page.getByRole("tab", { name: "Report card" }).click();
});

// Exams and marks
shot("marks-entry", "examofficer", "/teacher/marks", async (page) => {
  const { scope } = data();
  await page.locator("select#me-exam").selectOption(String(scope.examId));
  await page.locator("select#me-class").selectOption(String(scope.classId));
  await page.locator("select#me-section").selectOption(String(scope.sectionId));
  await page.locator("select#me-subject").selectOption({ index: 1 });
});
shot("teacher-dashboard", "teacher", "/teacher/dashboard");
shot("teacher-attendance", "teacher", "/teacher/attendance", async (page) => {
  // a section that has students (the seed enrols Grades 9 and 10)
  const select = page.locator("main select").first();
  const value = await select.locator("option", { hasText: /Grade (9|10)/ }).first().getAttribute("value");
  await select.selectOption(value);
});

// Finance
shot("finance-dashboard", "accountant", "/finance/dashboard");
// The account with the most real-sized payments whose fees are all demo data (the
// integration tests leave "Integration …" and "Dashboard dash-…" fee plans on some students), so the ledger
// shown is full and clean.
let busiestStudentId;
test.beforeAll(async () => {
  const token = data().tokens.accountant;
  const res = await call("GET", "/fees/transactions?type=PAYMENT&limit=100", token);
  const counts = {};
  for (const t of res.body?.data || []) if (Number(t.amount) >= 100) counts[t.studentId] = (counts[t.studentId] || 0) + 1;
  for (const [id] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    const account = await call("GET", `/fees/accounts/${id}`, token);
    if (!/integration|dash-|e2e|test|mw[a-z0-9]{5}/i.test(JSON.stringify(account.body?.data || ""))) {
      busiestStudentId = id;
      break;
    }
  }
  busiestStudentId ||= data().studentId;
});
shot("finance-account", "accountant", () => `/finance/accounts/${busiestStudentId}`);
shot("finance-transactions", "accountant", "/finance/transactions");
shot("finance-reports", "accountant", "/finance/reports");

// Student and parent portals
shot("student-dashboard", "student", "/student/dashboard");
shot("student-report-card", "student", "/student/report-card");
shot("student-results", "student", "/student/results");
shot("student-attendance", "student", "/student/attendance", async (page) => {
  // the month tab with the most register days
  const tabs = page.getByRole("tab");
  let best = 0;
  let bestDays = -1;
  for (let i = 0; i < (await tabs.count()); i += 1) {
    await tabs.nth(i).click();
    const days = await page.locator("main").getByText(/^\d+ of \d+ days/).first().textContent({ timeout: 2000 }).then((t) => Number(t.match(/of (\d+)/)[1])).catch(() => 0);
    if (days > bestDays) [best, bestDays] = [i, days];
  }
  await tabs.nth(best).click();
});
shot("parent-dashboard", "parent", "/parent/dashboard");
shot("parent-fees", "parent", "/parent/fees");

// The student dashboard on a phone, for the phone frame on the home page.
test("student-dashboard-mobile", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: stateFor("student"),
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/student/dashboard");
  await settle(page);
  await save(page, "student-dashboard-mobile");
  await context.close();
});
