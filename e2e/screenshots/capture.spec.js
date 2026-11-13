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

// The link-preview image (Open Graph) Facebook, WhatsApp and others show when the site is shared:
// 1200 x 630, built from the screenshots above. Saved as frontend/public/og-image.jpg and
// referenced by the og:image tag in frontend/index.html.
test("og-image", async ({ browser }) => {
  const base = process.env.E2E_BASE_URL;
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; font-family: Inter, system-ui, sans-serif; color: #fff;
    background: linear-gradient(135deg, #020617 0%, #172554 55%, #1e40af 100%); position: relative; }
  .grid { position: absolute; inset: 0; background-image: linear-gradient(to right, rgb(255 255 255 / .05) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 255 255 / .05) 1px, transparent 1px); background-size: 40px 40px; }
  .glow { position: absolute; border-radius: 50%; filter: blur(80px); }
  .text { position: absolute; left: 64px; top: 64px; width: 520px; }
  .brand { display: flex; align-items: center; gap: 14px; font-size: 28px; font-weight: 800; letter-spacing: -.02em; }
  .logo { width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, #6366f1, #4338ca);
    display: flex; align-items: center; justify-content: center; }
  .brand b { color: #7dd3fc; }
  h1 { margin-top: 40px; font-size: 54px; line-height: 1.05; font-weight: 800; letter-spacing: -.03em; }
  h1 span { color: #7dd3fc; }
  .tags { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 10px; }
  .tags span { padding: 8px 14px; border-radius: 999px; background: rgb(255 255 255 / .1); border: 1px solid rgb(255 255 255 / .18);
    font-size: 17px; font-weight: 600; }
  .foot { position: absolute; left: 64px; bottom: 48px; font-size: 19px; font-weight: 600; color: #bfdbfe; }
  .frame { position: absolute; left: 630px; top: 92px; width: 640px; border-radius: 14px; overflow: hidden; background: #fff;
    box-shadow: 0 30px 60px -10px rgb(0 0 0 / .6); border: 1px solid rgb(255 255 255 / .15); transform: rotate(-2deg); }
  .bar { height: 26px; background: #f1f5f9; display: flex; align-items: center; gap: 6px; padding-left: 12px; }
  .bar i { width: 9px; height: 9px; border-radius: 50%; display: block; }
  .frame img { display: block; width: 100%; }
  .phone { position: absolute; left: 560px; top: 300px; width: 150px; padding: 6px; border-radius: 26px; background: #0f172a;
    box-shadow: 0 25px 50px -10px rgb(0 0 0 / .7); transform: rotate(3deg); }
  .phone img { display: block; width: 100%; height: 280px; object-fit: cover; object-position: top; border-radius: 20px; }
</style></head><body>
  <div class="grid"></div>
  <div class="glow" style="width:420px;height:420px;right:-120px;top:-140px;background:rgb(56 189 248 / .35)"></div>
  <div class="glow" style="width:380px;height:380px;left:-140px;bottom:-160px;background:rgb(59 130 246 / .35)"></div>
  <div class="text">
    <div class="brand"><div class="logo"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg></div>Vidyalaya <b>SMS</b></div>
    <h1>Run your whole school from <span>one place</span></h1>
    <div class="tags"><span>Attendance</span><span>NEB report cards</span><span>Fees &amp; receipts</span><span>Parent app</span></div>
  </div>
  <div class="foot">KG to Grade 10 · Bikram Sambat · Made for Nepal</div>
  <div class="frame"><div class="bar"><i style="background:#fca5a5"></i><i style="background:#fcd34d"></i><i style="background:#6ee7b7"></i></div>
    <img src="${base}/screenshots/admin-dashboard.jpg"></div>
  <div class="phone"><img src="${base}/screenshots/student-dashboard-mobile.jpg"></div>
</body></html>`);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("img")).toHaveCount(2);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await page.screenshot({ path: path.join(OUT, "..", "og-image.jpg"), type: "jpeg", quality: 88 });
  await context.close();
});
