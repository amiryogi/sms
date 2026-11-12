const fs = require("node:fs");
const base = require("@playwright/test");
const { DATA_FILE, stateFor } = require("./roles");

/** What global-setup found in the seeded test database. */
const data = () => JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

/**
 * `test` with one extra guard: a test fails if the page logs a console error
 * or throws, unless the message matches `allowedError` (a RegExp). A page that renders
 * while erroring is not a pass.
 */
const test = base.test.extend({
  allowedError: [null, { option: true }],
  page: async ({ page, allowedError }, use) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (error) => errors.push(String(error)));
    await use(page);
    const unexpected = errors.filter((e) => !(allowedError && allowedError.test(e)));
    base.expect(unexpected, "console errors during the test").toEqual([]);
  },
});

// ---- PDF helpers (no PDF library: page count and page size are enough) ----

/** Number of pages in a PDF buffer. */
const pdfPageCount = (buffer) => (buffer.toString("latin1").match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;

/** Width and height of the first page, in PDF points (A4 portrait is 595 x 842). */
const pdfPageSize = (buffer) => {
  const m = /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(buffer.toString("latin1"));
  return m ? { width: Number(m[3]) - Number(m[1]), height: Number(m[4]) - Number(m[2]) } : null;
};

/** Print the current page the way the browser's Print dialog would. */
const printPdf = (page) => page.pdf({ preferCSSPageSize: true, printBackground: true });

/**
 * Elements inside `sheet` that stick out of it (clipped or overflowing
 * content). Returns a list of descriptions; empty means nothing overflows.
 */
const overflowing = (sheet) =>
  sheet.evaluate((root) => {
    const box = root.getBoundingClientRect();
    const out = [];
    for (const el of root.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > box.right + 1 || r.left < box.left - 1 || r.bottom > box.bottom + 1) {
        out.push(`${el.tagName.toLowerCase()}.${el.className} "${(el.textContent || "").trim().slice(0, 30)}"`);
      }
    }
    return out.slice(0, 5);
  });

module.exports = { test, expect: base.expect, data, stateFor, pdfPageCount, pdfPageSize, printPdf, overflowing };
