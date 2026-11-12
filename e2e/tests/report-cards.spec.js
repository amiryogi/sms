// Report cards: individual and bulk print, one shared template.
// Awkward data (long names, many subjects, missing remarks) is injected by
// rewriting the API response on its way to the page; the database is untouched.
const { test, expect, data, stateFor, pdfPageCount, pdfPageSize, printPdf, overflowing } = require("../helpers/fixtures");

test.use({ storageState: stateFor("admin") });

const SINGLE_API = "**/api/v1/report-cards/student/*/exam/*";
const BULK_API = "**/api/v1/report-cards/bulk/**";

/** Open Report Cards for the seeded exam / class / section and list the students. */
const openClass = async (page) => {
  const { scope } = data();
  await page.goto("/admin/report-cards");
  await page.locator("select#examId").selectOption(String(scope.examId));
  await page.locator("select#classId").selectOption(String(scope.classId));
  await page.locator("select#sectionId").selectOption(String(scope.sectionId));
  await page.getByRole("button", { name: "View Report Cards" }).click();
  await expect(page.locator("table tbody tr").first()).toBeVisible();
};

const openIndividual = async (page) => {
  await openClass(page);
  await page.locator("table tbody").getByRole("button", { name: "View", exact: true }).first().click();
  const sheet = page.locator(".report-card-overlay .report-card-a4");
  await expect(sheet).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return sheet;
};

const openBulk = async (page) => {
  await openClass(page);
  await page.getByRole("button", { name: /Print All/ }).click();
  const sheets = page.locator(".bulk-print-container .report-card-a4");
  await expect(sheets.first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return sheets;
};

/** Rewrite every report card in a single or bulk response with `change(card)`. */
const rewriteCards = async (page, change) => {
  const handler = async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    if (Array.isArray(json.data?.reportCards)) json.data.reportCards.forEach(change);
    else if (json.data) change(json.data);
    await route.fulfill({ response, json });
  };
  await page.route(SINGLE_API, handler);
  await page.route(BULK_API, handler);
};

const expectOnePage = async (page, sheet) => {
  expect(await overflowing(sheet), "content sticking out of the sheet").toEqual([]);
  const pdf = await printPdf(page);
  expect(pdfPageCount(pdf)).toBe(1);
  return pdf;
};

test.describe("individual report card", () => {
  test("prints on one A4 portrait page with every section", async ({ page }) => {
    const sheet = await openIndividual(page);
    await expect(sheet.locator(".school-name")).not.toBeEmpty();
    await expect(sheet.locator(".report-title h2")).toHaveText(/GRADE SHEET/i);
    await expect(sheet.locator(".marks-table tbody tr").first()).toBeVisible();
    await expect(sheet.locator(".signature-label")).toHaveCount(3);

    const pdf = await expectOnePage(page, sheet);
    const size = pdfPageSize(pdf);
    expect(Math.round(size.width)).toBe(595); // A4: 210mm
    expect(Math.round(size.height)).toBe(842); // A4: 297mm
  });

  test("shows the grades, GPA and result the API returned", async ({ page }) => {
    const cardResponse = page.waitForResponse((r) => /\/report-cards\/student\/\d+\/exam\/\d+/.test(r.url()) && r.ok());
    const sheet = await openIndividual(page);
    const card = (await (await cardResponse).json()).data;

    const finalGrades = (await sheet.locator(".marks-table td.fg-cell").allInnerTexts()).map((t) => t.trim());
    expect(finalGrades).toEqual(card.subjects.map((s) => (s.isAbsent ? "AB" : s.finalGrade)));
    await expect(sheet.locator(".marks-table tfoot")).toContainText(`GRADE POINT AVERAGE (GPA): ${card.summary.gpa.toFixed(2)}`);
    await expect(sheet.locator(".summary-item.highlight").last()).toContainText(card.summary.isPassed ? "PASSED" : "FAILED");
  });

  test("the header shows the school logo or nothing, never a placeholder box, and the name stays centred", async ({ page }) => {
    const sheet = await openIndividual(page);
    const header = sheet.locator(".report-header");
    const headerBox = await header.boundingBox();
    // no emoji stand-ins (the old 🏫 and 🇳🇵 "NP" boxes)
    await expect(header).not.toContainText(/🏫|🇳🇵/u);

    const logo = header.locator(".school-logo");
    if (await logo.count()) {
      const box = await logo.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(headerBox.x - 1);
      expect(box.y + box.height).toBeLessThanOrEqual(headerBox.y + headerBox.height + 1);
      expect(await logo.locator("img").evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
    } else {
      await expect(header.locator(".school-logo-balance")).toHaveCount(0);
    }

    const info = await header.locator(".school-info").boundingBox();
    const offCentre = Math.abs(info.x + info.width / 2 - (headerBox.x + headerBox.width / 2));
    expect(offCentre).toBeLessThan(2);
  });

  for (const position of ["left", "right"]) {
    test(`with a logo on the ${position}, the name stays centred and nothing prints on the other side`, async ({ page }) => {
      await rewriteCards(page, (card) => {
        card.school.logoUrl = `${process.env.E2E_BASE_URL}/vite.svg`;
        if (card.layout?.design) card.layout.design.logoPosition = position;
      });
      const sheet = await openIndividual(page);
      const header = sheet.locator(".report-header");
      const headerBox = await header.boundingBox();
      const logo = await header.locator(".school-logo").boundingBox();
      const onLeft = logo.x + logo.width / 2 < headerBox.x + headerBox.width / 2;
      expect(onLeft).toBe(position === "left");
      await expect(header.locator(".school-logo-balance")).toHaveCount(1);
      await expect(header.locator(".school-logo-balance")).toBeEmpty();
      const info = await header.locator(".school-info").boundingBox();
      expect(Math.abs(info.x + info.width / 2 - (headerBox.x + headerBox.width / 2))).toBeLessThan(2);
      await expectOnePage(page, sheet);
    });
  }

  test("a failed subject prints the fail grade and the card says FAILED", async ({ page }) => {
    await rewriteCards(page, (card) => {
      Object.assign(card.subjects[0], { finalGrade: "NG", finalGpa: 0, isPassed: false, theoryGrade: "NG", theoryGpa: 0 });
      Object.assign(card.summary, { isPassed: false, resultStatus: "FAILED", failedSubjects: 1 });
    });
    const sheet = await openIndividual(page);
    await expect(sheet.locator(".marks-table td.fg-cell").first()).toHaveText("NG");
    await expect(sheet.locator(".summary-item.highlight").last()).toContainText("FAILED");
  });
});

test.describe("awkward content still fits one page", () => {
  test("a very long school name", async ({ page }) => {
    const name = "Shree Vidhya International Secondary Boarding School and Research Academy of Kathmandu Valley";
    await rewriteCards(page, (card) => { card.school.name = name; });
    const sheet = await openIndividual(page);
    await expect(sheet.locator(".school-name")).toHaveText(name, { ignoreCase: true });
    await expectOnePage(page, sheet);
  });

  test("a very long student name", async ({ page }) => {
    const name = "Bishwomitra Narayan Prasad Upadhyaya Gautam-Bhattarai Shrestha";
    await rewriteCards(page, (card) => { card.student.name = name; });
    const sheet = await openIndividual(page);
    await expect(sheet.locator(".student-info-section")).toContainText(name);
    await expectOnePage(page, sheet);
  });

  for (const count of [5, 12, 16]) {
    test(`${count} subjects`, async ({ page }) => {
      await rewriteCards(page, (card) => {
        const base = card.subjects;
        card.subjects = Array.from({ length: count }, (_, i) => ({ ...base[i % base.length], subjectId: 9000 + i, subjectName: `Subject ${i + 1}` }));
        card.summary.totalSubjects = count;
      });
      const sheet = await openIndividual(page);
      await expect(sheet.locator(".marks-table td.sn-cell")).toHaveCount(count);
      await expectOnePage(page, sheet);
    });
  }

  test("missing remarks print no 'undefined' or 'null'", async ({ page }) => {
    await rewriteCards(page, (card) => { card.remarks = null; });
    const sheet = await openIndividual(page);
    const text = await sheet.innerText();
    expect(text).not.toMatch(/undefined|null|NaN|\[object Object\]/);
    await expect(sheet.locator(".remarks-section")).toHaveCount(0);
    await expectOnePage(page, sheet);
  });
});

test.describe("bulk print", () => {
  test("one page per student, in roll order, no blank pages", async ({ page }) => {
    const { students } = data();
    const sheets = await openBulk(page);
    await expect(sheets).toHaveCount(students.length);

    const names = await page.locator(".bulk-print-container .student-info-section .info-item .value").evaluateAll((els) => els.filter((_, i) => i % 5 === 0).map((e) => e.textContent.trim()));
    const expected = [...students].sort((a, b) => a.rollNumber - b.rollNumber).map((s) => s.name);
    expect(names).toEqual(expected);
    expect(new Set(names).size).toBe(students.length);

    for (let i = 0; i < students.length; i += 1) {
      const sheet = sheets.nth(i);
      expect(await overflowing(sheet), `student ${i + 1}: content sticking out`).toEqual([]);
      expect((await sheet.innerText()).length, `student ${i + 1}: page has content`).toBeGreaterThan(200);
    }

    const pdf = await printPdf(page);
    expect(pdfPageCount(pdf)).toBe(students.length);
    expect(Math.round(pdfPageSize(pdf).height)).toBe(842);
  });

  test("uses exactly the same template and sizes as the individual card", async ({ page }) => {
    const measure = (sheet) =>
      sheet.evaluate((root) => {
        const css = (sel, prop) => { const el = root.querySelector(sel); return el ? getComputedStyle(el)[prop] : "missing"; };
        return {
          sections: [".report-header", ".report-title", ".student-info-section", ".marks-table", ".summary-section", ".signature-section", ".report-footer"].map((s) => Boolean(root.querySelector(s))),
          schoolName: css(".school-name", "fontSize"),
          title: css(".report-title h2", "fontSize"),
          cell: css(".marks-table td.subject-name", "fontSize"),
          padding: getComputedStyle(root).padding,
          width: Math.round(root.getBoundingClientRect().width),
        };
      });
    const individual = await measure(await openIndividual(page));
    await page.locator(".report-card-overlay").getByRole("button", { name: "Close" }).click();
    const bulk = await measure((await openBulk(page)).first());
    expect(bulk).toEqual(individual);
  });

  test("16 subjects for every student still gives one page each", async ({ page }) => {
    const { students } = data();
    await rewriteCards(page, (card) => {
      const base = card.subjects;
      card.subjects = Array.from({ length: 16 }, (_, i) => ({ ...base[i % base.length], subjectId: 9000 + i, subjectName: `Subject ${i + 1}` }));
    });
    await openBulk(page);
    expect(pdfPageCount(await printPdf(page))).toBe(students.length);
  });
});

test.describe("who can see a report card", () => {
  test.use({ storageState: stateFor("student") });

  test("a student sees their own published card, on one page", async ({ page }) => {
    await page.goto("/student/report-card");
    const sheet = page.locator(".rc-embedded .report-card-a4, .rc-embedded .perf-sheet");
    await expect(sheet).toBeVisible();
    expect(pdfPageCount(await printPdf(page))).toBe(1);
  });

  test("a student cannot open the admin report-cards page", async ({ page }) => {
    await page.goto("/admin/report-cards");
    await expect(page).not.toHaveURL(/\/admin\/report-cards/);
  });
});

test.describe("visual baseline @visual", () => {
  // Baselines are approved screenshots of the default design. They are taken on
  // Windows (the owner's machine); see e2e/README.md before updating them.
  test.skip(process.platform !== "win32", "baselines exist for Windows only");

  test("individual card, default design", async ({ page }) => {
    const sheet = await openIndividual(page);
    await expect(sheet).toHaveScreenshot("neb-individual-default.png");
  });

  test("bulk first page, default design", async ({ page }) => {
    const sheets = await openBulk(page);
    await expect(sheets.first()).toHaveScreenshot("neb-bulk-first-default.png");
  });
});
