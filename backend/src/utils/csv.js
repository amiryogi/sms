/**
 * CSV for report downloads. Every cell is quoted; cells that a spreadsheet
 * would run as a formula (=, +, -, @, tab, CR) get a leading apostrophe, so a
 * student name like "=HYPERLINK(...)" stays text (CSV injection).
 */
const FORMULA = /^[=+\-@\t\r]/;

const cell = (value) => {
  if (value === null || value === undefined) return '""';
  let s = typeof value === "number" ? String(value) : String(value);
  if (typeof value !== "number" && FORMULA.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** columns: [{ key, label }]; rows: objects. Returns CSV text with a BOM so Excel reads UTF-8. */
const toCsv = (columns, rows) =>
  "﻿" + [columns.map((c) => cell(c.label)).join(","), ...rows.map((r) => columns.map((c) => cell(r[c.key])).join(","))].join("\r\n") + "\r\n";

module.exports = { toCsv };
