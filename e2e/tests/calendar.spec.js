// The Bikram Sambat date picker, BS/AD display, the school calendar, holiday
// import, the attendance rule and the A4 calendar printouts.
//
// Everything created here is titled "E2E cal <run> ..." and removed afterwards;
// seeded rows are never edited.
const fs = require("node:fs");
const { test, expect, data, stateFor, pdfPageCount, pdfPageSize, printPdf } = require("../helpers/fixtures");
const { call } = require("../helpers/api");
const { adToBs, bsToAd, todayAd, addDays, weekdayOf } = require("../../backend/src/utils/calendar/bsDateAdapter");
const { formatBs, formatAd } = require("../../backend/src/utils/calendar/dateFormatter");

const RUN = Date.now().toString(36);
const TAG = `E2E cal ${RUN}`;
const created = [];

const admin = () => data().tokens.admin;
const newEvent = async (body) => {
  const res = await call("POST", "/calendar/events", admin(), { category: "SCHOOL_EVENT", ...body, title: `${TAG} ${body.title}` });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  created.push(res.body.data.id);
  return res.body.data;
};
const findMine = async () => {
  const res = await call("GET", `/calendar/events?search=${encodeURIComponent(TAG)}&limit=100`, admin());
  return res.body.data;
};

test.afterAll(async () => {
  for (const event of await findMine()) await call("DELETE", `/calendar/events/${event.id}`, admin());
  // Holidays imported through the UI carry the list's name, not the tag.
  const imported = await call("GET", "/calendar/events?kind=holiday&search=Christmas&limit=100", admin());
  for (const event of imported.body.data || []) {
    if (event.importId && event.createdAt > new Date(Date.now() - 15 * 60000).toISOString()) await call("DELETE", `/calendar/events/${event.id}`, admin());
  }
});

test.describe("date picker", () => {
  test.use({ storageState: stateFor("admin") });

  test("a date typed in BS is stored as the matching AD day", async ({ page }) => {
    const bs = { year: 2084, month: 1, day: 15 };
    const ad = bsToAd(bs);

    await page.goto("/calendar/events");
    await page.getByRole("button", { name: "Add event" }).click();
    const dialog = page.getByRole("dialog", { name: "Add an event" });
    await dialog.getByLabel("Name").fill(`${TAG} typed date`);

    await dialog.locator("#ev-start").click();
    const picker = page.getByRole("dialog", { name: "Choose a date" });
    await expect(picker.getByRole("grid")).toBeVisible();
    await picker.getByLabel("Type a B.S. date, year-month-day").fill("2084-01-15");
    await picker.getByRole("button", { name: "Set", exact: true }).click();
    await expect(picker).toBeHidden();

    // The field shows BS first with AD beside it, and holds the AD value.
    await expect(dialog.locator("#ev-start")).toHaveAttribute("data-value", ad);
    await expect(dialog.locator("#ev-start")).toContainText(formatBs(bs));
    await expect(dialog.locator("#ev-start")).toContainText(formatAd(ad));
    await expect(dialog.locator("#ev-end")).toHaveAttribute("data-value", ad);

    await dialog.getByRole("button", { name: "Add to calendar" }).click();
    await expect(dialog).toBeHidden();

    const mine = (await findMine()).find((e) => e.title === `${TAG} typed date`);
    expect(mine.startDate).toBe(ad);
    expect(mine.startDateBs).toEqual(bs);
  });

  test("a date that does not exist is refused, and the keyboard moves through the grid", async ({ page }) => {
    await page.goto("/calendar/events");
    await page.getByRole("button", { name: "Add event" }).click();
    const dialog = page.getByRole("dialog", { name: "Add an event" });
    await dialog.locator("#ev-start").click();
    const picker = page.getByRole("dialog", { name: "Choose a date" });

    // Mangsir 2083 has 29 days.
    await picker.getByLabel("Type a B.S. date, year-month-day").fill("2083-08-30");
    await picker.getByRole("button", { name: "Set", exact: true }).click();
    await expect(picker.getByRole("alert")).toContainText("does not have this day");
    await expect(picker).toBeVisible();

    // Type a real day, then walk the grid: right, down, Enter.
    const start = bsToAd({ year: 2083, month: 8, day: 10 });
    await picker.getByLabel("Type a B.S. date, year-month-day").fill("2083-08-10");
    await picker.getByRole("button", { name: "Set", exact: true }).click();
    await expect(dialog.locator("#ev-start")).toHaveAttribute("data-value", start);

    await dialog.locator("#ev-start").click();
    await expect(picker.locator(`[data-day="${start}"]`)).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await expect(picker.locator(`[data-day="${addDays(start, 8)}"]`)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog.locator("#ev-start")).toHaveAttribute("data-value", addDays(start, 8));

    // The A.D. toggle shows the same day in the Gregorian month, Nepali numerals on request.
    await dialog.locator("#ev-start").click();
    await picker.getByRole("button", { name: "A.D.", exact: true }).click();
    await expect(picker.getByLabel("Month", { exact: true })).toHaveValue(String(Number(addDays(start, 8).slice(5, 7))));
    await picker.getByRole("button", { name: "१२३" }).click();
    await expect(picker.getByLabel("Year", { exact: true }).locator("option:checked")).toHaveText("२०२६");
    await page.keyboard.press("Escape");
    await expect(picker).toBeHidden();
    await expect(dialog).toBeVisible(); // Esc closed the picker only
  });

  test("the student form takes the date of birth in BS and keeps the AD value", async ({ page }) => {
    await page.goto("/admin/students");
    await page.getByRole("button", { name: /add student/i }).first().click();
    const field = page.locator("#dateOfBirth");
    await expect(field).toBeVisible();
    await field.click();
    const picker = page.getByRole("dialog", { name: "Choose a date" });
    await picker.getByLabel("Type a B.S. date, year-month-day").fill("२०६९/१२/१९"); // Nepali digits
    await picker.getByRole("button", { name: "Set", exact: true }).click();
    await expect(field).toHaveAttribute("data-value", bsToAd({ year: 2069, month: 12, day: 19 }));
    await expect(field).toContainText("19 Chaitra 2069");
    // Nothing is saved: the dialog is closed without submitting.
  });
});

test.describe("school calendar", () => {
  test.use({ storageState: stateFor("admin") });

  test("the overview shows today in both calendars and the month in BS and AD", async ({ page }) => {
    const today = todayAd();
    const bs = adToBs(today);
    await page.goto("/calendar");
    await expect(page.getByTestId("today-card")).toContainText(formatBs(bs));
    await expect(page.getByTestId("today-card")).toContainText(formatAd(today));

    const monthNames = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Asoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
    await expect(page.getByTestId("calendar-title")).toHaveText(`${monthNames[bs.month - 1]} ${bs.year}`);
    // Sunday first, seven columns.
    await expect(page.getByRole("columnheader").first()).toContainText("Sun");
    await expect(page.getByRole("columnheader")).toHaveCount(7);
    await expect(page.locator(`[data-day="${today}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Next month" }).click();
    const next = bs.month === 12 ? `Baisakh ${bs.year + 1}` : `${monthNames[bs.month]} ${bs.year}`;
    await expect(page.getByTestId("calendar-title")).toHaveText(next);
    await page.getByRole("button", { name: "Today", exact: true }).click();

    await page.getByRole("button", { name: "A.D.", exact: true }).click();
    const adMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    await expect(page.getByTestId("calendar-title")).toHaveText(`${adMonths[Number(today.slice(5, 7)) - 1]} ${today.slice(0, 4)}`);
    await page.getByRole("tab", { name: "Week" }).click();
    await page.getByRole("tab", { name: "List" }).click();
    await page.getByRole("tab", { name: "Month" }).click();
  });

  test("an event shows on its day with both dates, and can be deleted with confirmation", async ({ page }) => {
    const day = addDays(todayAd(), 3);
    await newEvent({ title: "open day", startDate: day, description: "Parents welcome" });

    await page.goto("/calendar");
    // The day may fall in the next BS month.
    if (adToBs(day).month !== adToBs(todayAd()).month) await page.getByRole("button", { name: "Next month" }).click();
    await page.locator(`[data-day="${day}"]`).click();
    const panel = page.getByTestId("day-panel");
    await expect(panel).toContainText(formatBs(adToBs(day)));
    await expect(panel).toContainText(formatAd(day));
    await panel.getByRole("button", { name: `${TAG} open day` }).click();

    const detail = page.getByRole("dialog", { name: `${TAG} open day` });
    await expect(detail).toContainText("Parents welcome");
    await expect(detail).toContainText("Everyone in the school");
    await detail.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).last().click();
    await expect(detail).toBeHidden();
    await expect(panel.getByText(`${TAG} open day`)).toHaveCount(0);
    expect((await findMine()).some((e) => e.title === `${TAG} open day`)).toBe(false);
  });

  test("dates follow the person's choice of calendar", async ({ page }) => {
    const day = bsToAd({ year: adToBs(todayAd()).year, month: 12, day: 5 });
    await newEvent({ title: "pref check", startDate: day });
    await page.goto(`/calendar/events`);
    const row = page.getByTestId("calendar-row").filter({ hasText: `${TAG} pref check` });
    await expect(row).toContainText(formatBs(adToBs(day)));

    await page.getByRole("button", { name: /admin/i }).last().click();
    await page.getByRole("menuitem", { name: "A.D. only" }).click();
    await expect(row.locator("td").first().locator("span").first()).toHaveText(formatAd(day));

    await page.getByRole("button", { name: /admin/i }).last().click();
    await page.getByRole("menuitem", { name: "B.S. with A.D." }).click();
    await expect(row.locator("td").first().locator("span").first()).toHaveText(`${formatBs(adToBs(day))} (${formatAd(day)})`);
    await page.evaluate(() => localStorage.removeItem("sms.calendar.prefs"));
  });

  test("the month and the year print on one A4 page each", async ({ page }, testInfo) => {
    await newEvent({ title: "print check", startDate: todayAd() });
    const bs = adToBs(todayAd());

    await page.goto(`/calendar/print/month?mode=bs&year=${bs.year}&month=${bs.month}`);
    const sheet = page.getByTestId("calendar-sheet");
    await expect(sheet).toContainText(`${TAG} print check`);
    await page.evaluate(() => document.fonts.ready);
    let pdf = await printPdf(page);
    fs.writeFileSync(testInfo.outputPath("calendar-month.pdf"), pdf);
    expect(pdfPageCount(pdf)).toBe(1);
    let size = pdfPageSize(pdf);
    expect(Math.round(size.width)).toBe(842); // A4 landscape
    expect(Math.round(size.height)).toBe(595);

    await page.goto(`/calendar/print/year?year=${bs.year}`);
    await expect(sheet).toContainText("Baisakh");
    await expect(sheet).toContainText("Chaitra");
    pdf = await printPdf(page);
    fs.writeFileSync(testInfo.outputPath("calendar-year.pdf"), pdf);
    expect(pdfPageCount(pdf)).toBeLessThanOrEqual(2);
    size = pdfPageSize(pdf);
    expect(Math.round(size.width)).toBe(595); // A4 portrait
    expect(Math.round(size.height)).toBe(842);

    for (const kind of ["holidays", "exams", "events"]) {
      await page.goto(`/calendar/print/${kind}?year=${bs.year}`);
      await expect(sheet).toBeVisible();
      size = pdfPageSize(await printPdf(page));
      expect(Math.round(size.width)).toBe(595);
    }
  });

  test("holidays are imported after a preview, and a second import adds nothing", async ({ page }) => {
    const before = await call("POST", "/calendar/holidays/import/preview", admin(), { bsYear: 2083 });
    const christmas = before.body.data.rows.find((r) => r.key === "moha-2083:christmas");
    test.skip(Boolean(christmas.duplicate), "the test database already has this holiday");

    await page.goto("/calendar/holidays?year=2083");
    await page.getByRole("button", { name: "Import holidays" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Import holidays" });
    await expect(dialog).toContainText("Ministry of Home Affairs");
    await dialog.getByRole("button", { name: "Preview" }).click();

    const rows = dialog.getByTestId("import-row");
    await expect(rows).toHaveCount(before.body.data.rows.length);
    const row = rows.filter({ hasText: "Christmas Day" });
    await expect(row).toContainText("2083-09-10"); // as published
    await expect(row).toContainText("25 Dec 2026"); // worked out
    await expect(row).toContainText("Friday");
    // A holiday for one group is listed but not ticked.
    await expect(dialog.getByLabel("Import Haritalika Teej")).not.toBeChecked();

    await dialog.getByRole("button", { name: "Tick none" }).click();
    await dialog.getByLabel("Import Christmas Day (25 December)").check();
    await dialog.getByRole("button", { name: "Add 1 holiday to the calendar" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("calendar-row").filter({ hasText: "Christmas Day" })).toHaveCount(1);

    // Again: the row is now marked and cannot be ticked.
    await page.getByRole("button", { name: "Import holidays" }).first().click();
    await dialog.getByRole("button", { name: "Preview" }).click();
    await expect(rows.filter({ hasText: "Christmas Day" })).toContainText("Already imported from this list");
    await expect(dialog.getByLabel("Import Christmas Day (25 December)")).toBeDisabled();
    const stored = await call("GET", "/calendar/events?kind=holiday&search=Christmas&limit=100", admin());
    expect(stored.body.data.filter((e) => e.startDate === "2026-12-25")).toHaveLength(1);
  });

  test("weekly holidays can be changed in the settings and put back", async ({ page }) => {
    await page.goto("/calendar/settings");
    const friday = page.getByRole("button", { name: /^Friday/ });
    await expect(page.getByRole("button", { name: /^Saturday/ })).toHaveAttribute("aria-pressed", "true");
    await expect(friday).toHaveAttribute("aria-pressed", "false");
    await friday.click();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Calendar settings saved")).toBeVisible();

    const saved = await call("GET", "/calendar/settings", admin());
    expect(saved.body.data.config.weeklyHolidayDays).toEqual([5, 6]);

    await page.getByRole("button", { name: "Reset to defaults" }).click();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByText("Settings reset")).toBeVisible();
    const reset = await call("GET", "/calendar/settings", admin());
    expect(reset.body.data).toMatchObject({ isCustom: false, config: { weeklyHolidayDays: [6] } });
  });
});

test.describe("who sees what", () => {
  test("a parent sees a published school event but not a draft, and cannot manage the calendar", async ({ browser }) => {
    const day = addDays(todayAd(), 5);
    await newEvent({ title: "for families", startDate: day });
    await newEvent({ title: "not yet", startDate: day, status: "DRAFT" });

    const context = await browser.newContext({ storageState: stateFor("parent") });
    const page = await context.newPage();
    await page.goto("/calendar");
    await page.getByRole("tab", { name: "List" }).click();
    if (adToBs(day).month !== adToBs(todayAd()).month) await page.getByRole("button", { name: "Next month" }).click();
    await expect(page.getByText(`${TAG} for families`).first()).toBeVisible();
    await expect(page.getByText(`${TAG} not yet`)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add event" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Holidays" })).toHaveCount(0);

    const feed = await call("GET", `/calendar/feed?from=${day}&to=${day}&sources=event`, data().tokens.parent);
    expect(feed.body.data.items.map((i) => i.title)).toContain(`${TAG} for families`);
    expect(feed.body.data.items.map((i) => i.title)).not.toContain(`${TAG} not yet`);
    await context.close();
  });
});

test.describe("attendance", () => {
  test.use({ storageState: stateFor("teacher") });

  test("the register explains a holiday and cannot be saved on it", async ({ page }) => {
    const today = todayAd();
    const { scope } = data();
    const weeklyOff = weekdayOf(today) === 6;
    if (!weeklyOff) await newEvent({ title: "surprise holiday", category: "SCHOOL_HOLIDAY", startDate: today });

    await page.goto("/teacher/attendance");
    const notice = page.getByRole("status").filter({ hasText: weeklyOff ? "Saturday is a weekly holiday" : `Holiday: ${TAG} surprise holiday` });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("Attendance is not taken on this day");

    const res = await call("POST", "/attendance", data().tokens.admin, { classId: scope.classId, sectionId: scope.sectionId, date: today, attendanceRecords: [] });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Attendance cannot be marked on this day");

    // Weekly holidays cannot be picked in the date field at all.
    await page.locator("#att-date").click();
    const picker = page.getByRole("dialog", { name: "Choose a date" });
    let saturday = today;
    while (weekdayOf(saturday) !== 6) saturday = addDays(saturday, -1);
    const cell = picker.locator(`[data-day="${saturday}"]`);
    if (await cell.count()) await expect(cell).toHaveAttribute("aria-disabled", "true");
  });
});
