// Captures the mobile-app screenshots the public site shows
// (frontend/public/screenshots/app/{ios,android}-<screen>.jpg) from the app's web build,
// signed in as each role on the seeded TEST database. Only demo data appears.
// Run `npm run screenshots:mobile` (build first, see e2e/README.md), then look at every image.
//
// The phone's safe areas (status bar, home indicator) are emulated, so the app lays itself out as
// on a real phone and the site's device frame draws the status bar into the space left at the top.
// For each image it prints whether the top of the screen is dark: the frame then draws the status
// bar in white (APP_SHOTS[].darkTop in frontend/src/pages/public/content.js).
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { login } = require("../helpers/api");
const { ROLES } = require("../helpers/roles");

const OUT = process.env.MOBILE_SHOTS_OUT || path.join(__dirname, "..", "..", "frontend", "public", "screenshots", "app");

const DEVICES = {
  ios: {
    viewport: { width: 390, height: 844 },
    insets: { top: 47, bottom: 34, left: 0, right: 0 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  },
  android: {
    viewport: { width: 412, height: 915 },
    insets: { top: 28, bottom: 16, left: 0, right: 0 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  },
};

/** The month chip whose register has the most days (the current month may have only begun). */
const fullestMonth = async (page) => {
  const chips = page.getByRole("button", { name: /^(Baisakh|Jestha|Asar|Shrawan|Bhadra|Asoj|Kartik|Mangsir|Poush|Magh|Falgun|Chaitra) \d{4}$/ });
  let best = 0;
  let bestDays = -1;
  for (let i = 0; i < (await chips.count()); i += 1) {
    await chips.nth(i).click();
    await page.waitForTimeout(300);
    const days = await page.getByText(/^[PALE]$/).count();
    if (days > bestDays) [best, bestDays] = [i, days];
  }
  await chips.nth(best).click();
};

/** Open a section that has students (the seed enrols Grades 9 and 10). Nothing is saved. */
const sectionWithStudents = async (page) => {
  await page.getByRole("button", { name: /^Grade (9|10) A$/ }).first().click();
};

/** The screens, as [name, role, path, prepare?]. */
const SCREENS = [
  ["student-home", "student", "/student"],
  ["student-attendance", "student", "/student/attendance", fullestMonth],
  ["teacher-attendance", "teacher", "/teacher/attendance", sectionWithStudents],
  ["student-results", "student", "/student/results"],
  ["finance-home", "accountant", "/finance"],
];

const sessions = {};
const sessionFor = async (role) => (sessions[role] ||= await login(ROLES[role]));

/** Wait until requests have finished and nothing is still loading. */
const settle = async (page) => {
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/^Loading/)).toHaveCount(0);
  await page.waitForTimeout(1200);
};

/** Whether the first opaque background under the top-left corner is dark. */
const darkTop = (page) =>
  page.evaluate(() => {
    for (let el = document.elementFromPoint(8, 4); el; el = el.parentElement) {
      const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (m && (m.length < 4 || Number(m[3]) > 0)) return 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2] < 150;
    }
    return false;
  });

test.describe.configure({ mode: "serial" });
fs.mkdirSync(OUT, { recursive: true });

for (const [platform, device] of Object.entries(DEVICES)) {
  const { insets, ...options } = device;
  for (const [name, role, url, prepare] of SCREENS) {
    test(`${platform}-${name}`, async ({ browser }) => {
      const { accessToken, refreshToken } = await sessionFor(role);
      const context = await browser.newContext({
        ...options,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        reducedMotion: "reduce",
        timezoneId: "Asia/Kathmandu",
        locale: "en-US",
      });
      // Signed in (the web build keeps the session in sessionStorage) and past onboarding.
      await context.addInitScript(
        ([session]) => {
          sessionStorage.setItem("sms.session", session);
          localStorage.setItem("sms.pref.onboardingDone", "true");
          localStorage.setItem("sms.pref.installed", "true"); // or the app clears the session as a fresh install
        },
        [JSON.stringify({ accessToken, refreshToken })],
      );
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets });
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(url);
      await settle(page);
      if (prepare) {
        await prepare(page);
        await settle(page);
      }
      await page.screenshot({ path: path.join(OUT, `${platform}-${name}.jpg`), type: "jpeg", quality: 82 });
      console.log(`${platform}-${name}: darkTop ${await darkTop(page)}`);
      expect(errors, "page errors").toEqual([]);
      await context.close();
    });
  }
}
