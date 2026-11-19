// The help assistant in the browser: chat, languages, errors, walkthroughs, phone layout.
// The backend runs with ASSISTANT_FAKE_PROVIDER=true (playwright.config.js): answers are
// canned, no AI provider is called. Conversations made here are deleted afterwards and the
// school's assistant settings are restored.
const { test, expect, stateFor } = require("../helpers/fixtures");
const { ROLES } = require("../helpers/roles");
const { call, login } = require("../helpers/api");

const saved = {};

test.beforeAll(async () => {
  const admin = await login(ROLES.admin);
  saved.adminToken = admin.accessToken;
  const settings = await call("GET", "/assistant/admin/settings", admin.accessToken);
  saved.settings = settings.body?.data?.settings;
  // Repeated runs on the same day must not reach the daily question limit.
  await call("PUT", "/assistant/admin/settings", admin.accessToken, { enabled: true, userDailyLimit: 1000 });
});

test.afterAll(async () => {
  for (const role of ["teacher", "student"]) {
    const user = await login(ROLES[role]);
    await call("DELETE", "/assistant/conversations", user.accessToken);
  }
  if (saved.settings) await call("PUT", "/assistant/admin/settings", saved.adminToken, saved.settings);
});

const openAssistant = async (page) => {
  await page.getByRole("button", { name: "Open the help assistant" }).click();
  const panel = page.getByTestId("assistant-panel");
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "New conversation" }).click();
  return panel;
};
const active = (page) => page.evaluate(() => document.querySelector(".driver-active-element")?.getAttribute("data-guide") ?? null);
const popover = (page) => page.locator(".driver-popover");

test.describe("help assistant as a teacher", () => {
  test.use({ storageState: stateFor("teacher") });

  test("answers a suggested question with its source and a walkthrough offer", async ({ page }) => {
    await page.goto("/teacher/attendance");
    const panel = await openAssistant(page);
    await panel.getByRole("button", { name: "How do I take attendance?" }).click();
    const answer = panel.getByTestId("assistant-answer").last();
    await expect(answer).toContainText("(test answer)");
    await expect(answer).toContainText("Taking the daily attendance register");
    await expect(panel.getByTestId("guide-offer").first()).toContainText("Take the attendance register");
    await expect(panel.getByRole("button", { name: "Copy answer" })).toBeVisible();
  });

  test("answers in Nepali when Nepali is chosen", async ({ page }) => {
    await page.goto("/teacher/dashboard");
    const panel = await openAssistant(page);
    await panel.getByRole("button", { name: "नेपाली" }).click();
    await panel.getByRole("textbox").fill("हाजिरी कसरी लिने?");
    await panel.getByRole("textbox").press("Enter");
    await expect(panel.getByTestId("assistant-answer").last()).toContainText("परीक्षण उत्तर");
    await panel.getByRole("button", { name: "Auto" }).click();
  });

  test("shows a provider error with Try again", async ({ page }) => {
    await page.goto("/teacher/dashboard");
    const panel = await openAssistant(page);
    await panel.getByRole("textbox").fill("How do I enter marks? [fail:rate_limited]");
    await panel.getByRole("textbox").press("Enter");
    await expect(panel.getByRole("alert")).toContainText("busy right now");
    await expect(panel.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("walks through taking attendance: menu, page, missing control, back, pause, resume, exit", async ({ page }) => {
    await page.goto("/teacher/dashboard");
    const panel = await openAssistant(page);
    await panel.getByTestId("guide-start").filter({ hasText: "Take the attendance register" }).click();
    await expect(panel).toBeHidden();

    await expect(popover(page)).toContainText("Open Attendance");
    expect(await active(page)).toBe("nav:/teacher/attendance");
    await page.getByRole("button", { name: "Go to Attendance" }).click();
    await expect(page).toHaveURL(/\/teacher\/attendance$/);
    await expect.poll(() => active(page)).toBe("attendance.class");

    await popover(page).getByRole("button", { name: "Next" }).click();
    await expect.poll(() => active(page)).toBe("attendance.date");
    await popover(page).getByRole("button", { name: "Next" }).click();
    // No class chosen yet: the step explains instead of pointing at nothing.
    await expect(popover(page)).toContainText("Choose a class first", { timeout: 6000 });

    await popover(page).getByRole("button", { name: "Back" }).click();
    await expect.poll(() => active(page)).toBe("attendance.date");

    await popover(page).getByRole("button", { name: "Pause" }).click();
    await expect(page.getByTestId("guide-paused")).toBeVisible();
    await expect(popover(page)).toHaveCount(0);
    await page.reload();
    await page.getByTestId("guide-paused").getByRole("button", { name: "Resume" }).click();
    await expect.poll(() => active(page)).toBe("attendance.date");

    await page.keyboard.press("Escape");
    await expect(popover(page)).toHaveCount(0);
    await expect(page.getByTestId("guide-paused")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open the help assistant" })).toBeVisible();
  });

  test("on a phone the panel is full screen and a walkthrough starts at the menu button", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/teacher/dashboard");
    const panel = await openAssistant(page);
    const box = await panel.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(389);
    await panel.getByTestId("guide-start").filter({ hasText: "Enter exam marks" }).click();
    await expect.poll(() => active(page)).toBe("nav:menu");
    await page.locator('[data-guide="nav:menu"]').click();
    await expect.poll(() => active(page)).toBe("nav:/teacher/marks");
    await page.locator(".driver-active-element").click();
    await expect(page).toHaveURL(/\/teacher\/marks$/);
    await expect.poll(() => active(page)).toBe("marks.exam");
    await page.keyboard.press("Escape");
  });
});

test.describe("help assistant as a student", () => {
  test.use({ storageState: stateFor("student") });

  test("offers only the student's suggestions and walkthroughs", async ({ page }) => {
    await page.goto("/student/dashboard");
    const panel = await openAssistant(page);
    await expect(panel.getByRole("button", { name: "How do I view my examination results?" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "How do I take attendance?" })).toHaveCount(0);
    await expect(panel.getByTestId("guide-start")).toHaveText(["See exam results"]);
  });
});

test.describe("AI assistant settings page", () => {
  test.describe("as an admin", () => {
    test.use({ storageState: stateFor("admin") });

    test("shows key status only, tests the connection and saves a change", async ({ page }) => {
      await page.goto("/admin/dashboard");
      await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "AI assistant" }).click();
      await expect(page).toHaveURL(/\/admin\/assistant$/);
      await expect(page.getByRole("heading", { name: "AI assistant" })).toBeVisible();

      await page.getByRole("tab", { name: "AI provider" }).click();
      await expect(page.getByText("API keys on this server")).toBeVisible();
      await page.getByRole("button", { name: "Test connection" }).first().click();
      await expect(page.getByText(/Works: answered/)).toBeVisible();

      await page.getByRole("tab", { name: "Assistant" }).click();
      await page.locator("#ai-daily").fill("777");
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByText("Assistant settings saved")).toBeVisible();
      const admin = await login(ROLES.admin);
      const res = await call("GET", "/assistant/admin/settings", admin.accessToken);
      expect(res.body.data.settings.userDailyLimit).toBe(777);

      await page.getByRole("tab", { name: "Usage" }).click();
      await expect(page.getByText("Comments from users")).toBeVisible();
    });
  });

  test.describe("as a student", () => {
    test.use({ storageState: stateFor("student") });
    test("cannot open it", async ({ page }) => {
      await page.goto("/admin/assistant");
      await expect(page).toHaveURL(/\/unauthorized/);
    });
  });
});

test.describe("public site", () => {
  test("has no help assistant", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Open the help assistant" })).toHaveCount(0);
  });
});
