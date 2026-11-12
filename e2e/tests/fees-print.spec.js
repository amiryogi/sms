// Fee printouts: bills four to an A4 page, a receipt as a quarter-page slip,
// the A4 statement and the day book. Totals on paper must equal the API's.
const fs = require("node:fs");
const { test, expect, data, stateFor, pdfPageCount, pdfPageSize, printPdf } = require("../helpers/fixtures");
const { call } = require("../helpers/api");

const SLIP_HEIGHT_MM = 148.5;

/** Every slip's content fits its quarter of the page (FitSlot shrank it if needed). */
const slipsFit = (page) =>
  page.locator(".slip-slot").evaluateAll((slots) =>
    slots.map((s) => {
      const inner = s.firstElementChild;
      const zoom = Number(inner.style.zoom || 1);
      const style = getComputedStyle(s);
      const room = s.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      return { fits: inner.offsetHeight * zoom <= room + 1, zoom };
    }),
  );

const savePdf = (testInfo, name, pdf) => fs.writeFileSync(testInfo.outputPath(name), pdf);

test.describe("fee bills (four to a page)", () => {
  test.use({ storageState: stateFor("accountant") });

  test("a class's bills print ceil(n/4) A4 pages and each total equals the API", async ({ page }, testInfo) => {
    const { scope, tokens } = data();
    const api = await call("GET", `/fees/bills?classId=${scope.classId}`, tokens.accountant);
    expect(api.status).toBe(200);
    const bills = api.body.data.bills;
    test.skip(bills.length === 0, "nobody in the seeded class owes fees");

    await page.goto(`/finance/bills?classId=${scope.classId}`);
    const slips = page.locator(".bill-slip");
    await expect(slips).toHaveCount(bills.length);
    await page.evaluate(() => document.fonts.ready);

    // same students, same order, same totals as the API
    const totals = await page.locator(".bill-total").allInnerTexts();
    const shown = await slips.evaluateAll((els) => els.map((e) => Number(e.dataset.studentId)));
    expect(shown).toEqual(bills.map((b) => b.studentId));
    bills.forEach((b, i) => expect(totals[i].replace(/[^\d]/g, "")).toBe(String(Math.round(b.totals.due))));

    for (const s of await slipsFit(page)) expect(s.fits).toBe(true);
    await expect(page.locator(".slip-page")).toHaveCount(Math.ceil(bills.length / 4));

    const pdf = await printPdf(page);
    savePdf(testInfo, "bills.pdf", pdf);
    expect(pdfPageCount(pdf)).toBe(Math.ceil(bills.length / 4));
    const size = pdfPageSize(pdf);
    expect([Math.round(size.width), Math.round(size.height)]).toEqual([595, 842]); // A4 portrait
  });

  test("bills without a class ask for one; a section narrows them", async ({ page }) => {
    await page.goto("/finance/bills");
    await expect(page.getByText("Bills are printed for one class")).toBeVisible();
    const { scope, tokens } = data();
    const api = await call("GET", `/fees/bills?classId=${scope.classId}&sectionId=${scope.sectionId}`, tokens.accountant);
    await page.goto(`/finance/bills?classId=${scope.classId}&sectionId=${scope.sectionId}`);
    if (api.body.data.bills.length) await expect(page.locator(".bill-slip")).toHaveCount(api.body.data.bills.length);
  });

  test("a long bill shrinks to fit its quarter page", async ({ page }) => {
    const { scope } = data();
    // 18 fee lines, injected into the response; the database is untouched
    await page.route("**/api/v1/fees/bills?*", async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      const lines = Array.from({ length: 18 }, (_, i) => ({ feeType: `Fee type number ${i + 1}`, label: `Installment ${i + 1}`, dueDate: "2026-01-15", balance: 1000, overdue: i % 3 === 0 }));
      json.data.bills = [{ studentId: 1, studentClassId: 1, name: "A Very Long Student Name Bahadur Shrestha", admissionNumber: "ADM-1", rollNumber: 1, class: { name: "Grade 9" }, section: { name: "A" }, lines, totals: { due: 18000, overdue: 6000 }, earliestDue: "2026-01-15" }];
      await route.fulfill({ response, json });
    });
    await page.goto(`/finance/bills?classId=${scope.classId}`);
    await expect(page.locator(".bill-slip")).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);
    const [slot] = await slipsFit(page);
    expect(slot.fits).toBe(true);
    expect(slot.zoom).toBeLessThan(1);
    expect(pdfPageCount(await printPdf(page))).toBe(1);
  });

  test("one student's bill prints on one page from the account", async ({ page }, testInfo) => {
    const { studentId } = data();
    await page.goto(`/finance/accounts/${studentId}`);
    await page.getByRole("link", { name: "Print bill" }).click();
    await expect(page).toHaveURL(new RegExp(`/finance/accounts/${studentId}/bill`));
    await expect(page.locator(".bill-slip")).toHaveCount(1);
    const pdf = await printPdf(page);
    savePdf(testInfo, "bill-one.pdf", pdf);
    expect(pdfPageCount(pdf)).toBe(1);
  });
});

test.describe("receipt reprint", () => {
  test.use({ storageState: stateFor("accountant") });

  test("the ledger's print link opens the receipt and the print dialog; it prints as one slip", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      window.__printed = 0;
      window.print = () => {
        window.__printed += 1;
      };
    });
    await page.goto("/finance/transactions");
    const link = page.locator('a[href*="?print=1"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/finance\/receipts\/\d+\?print=1/);
    await expect.poll(() => page.evaluate(() => window.__printed)).toBe(1);

    await expect(page.locator(".receipt-slip")).toHaveCount(1);
    const [slot] = await slipsFit(page);
    expect(slot.fits).toBe(true);
    const pdf = await printPdf(page);
    savePdf(testInfo, "receipt.pdf", pdf);
    expect(pdfPageCount(pdf)).toBe(1);
  });
});

test.describe("statement", () => {
  test("the student prints their statement; the balance equals the API", async ({ browser }, testInfo) => {
    const { studentId, tokens } = data();
    const api = await call("GET", `/fees/accounts/${studentId}`, tokens.student);
    expect(api.status).toBe(200);
    const context = await browser.newContext({ storageState: stateFor("student") });
    const page = await context.newPage();
    try {
      await page.goto("/student/fees");
      await page.getByRole("link", { name: "Print statement" }).click();
      await expect(page).toHaveURL(/\/student\/fees\/statement/);
      await expect(page.locator(".statement-sheet")).toBeVisible();
      for (const y of api.body.data.years) {
        const cell = page.locator(`.statement-balance[data-year="${y.academicYear.id}"]`);
        const expected = y.totals.balance ? String(Math.round(y.totals.balance)) : "";
        expect((await cell.innerText()).replace(/[^\d]/g, "")).toBe(expected);
      }
      const pdf = await printPdf(page);
      savePdf(testInfo, "statement.pdf", pdf);
      expect(pdfPageCount(pdf)).toBeGreaterThanOrEqual(1);
      const size = pdfPageSize(pdf);
      expect([Math.round(size.width), Math.round(size.height)]).toEqual([595, 842]); // A4 portrait
    } finally {
      await context.close();
    }
  });

  test("a student cannot open another student's statement or bill", async ({ browser }) => {
    const { tokens } = data();
    const others = await call("GET", "/fees/accounts?limit=5", tokens.accountant);
    const me = data().studentId;
    const other = (others.body.data || []).find((r) => r.studentId !== me);
    test.skip(!other, "no other student");
    expect((await call("GET", `/fees/accounts/${other.studentId}`, tokens.student)).status).toBe(403);
    expect((await call("GET", `/fees/bills/student/${other.studentId}`, tokens.student)).status).toBe(403);
    // the staff-only print routes are refused in the browser too
    const context = await browser.newContext({ storageState: stateFor("student") });
    const page = await context.newPage();
    try {
      await page.goto(`/finance/accounts/${other.studentId}/statement`);
      await expect(page).not.toHaveURL(/\/finance\/accounts\//);
    } finally {
      await context.close();
    }
  });
});

test.describe("day book", () => {
  test.use({ storageState: stateFor("accountant") });

  test("prints the ledger for a range, with totals equal to the API", async ({ page }, testInfo) => {
    const { tokens } = data();
    const latest = await call("GET", "/fees/transactions?limit=1", tokens.accountant);
    const last = latest.body.data?.[0];
    test.skip(!last, "no transactions in the test database");
    const to = last.paidOn.slice(0, 10);
    const from = new Date(Date.parse(to) - 60 * 86400000).toISOString().slice(0, 10);
    const api = await call("GET", `/fees/transactions/daybook?from=${from}&to=${to}`, tokens.accountant);
    expect(api.status).toBe(200);

    await page.goto("/finance/transactions");
    await page.getByLabel("From date").fill(from);
    await page.getByLabel("To date").fill(to);
    await page.getByRole("button", { name: "Print day book" }).click();
    await expect(page).toHaveURL(new RegExp(`/finance/daybook\\?from=${from}&to=${to}`));
    await expect(page.locator(".daybook-row")).toHaveCount(api.body.data.rows.length);
    // the net can be negative (a period with more reversed than received)
    const netText = await page.locator(".daybook-net").innerText();
    const expectedNet = api.body.data.totals.overall.net;
    expect(netText.replace(/[^\d]/g, "")).toBe(String(Math.abs(Math.round(expectedNet))));
    expect(/[-−]/.test(netText)).toBe(expectedNet < 0);
    const pdf = await printPdf(page);
    savePdf(testInfo, "daybook.pdf", pdf);
    expect(pdfPageCount(pdf)).toBeGreaterThanOrEqual(1);
  });
});
