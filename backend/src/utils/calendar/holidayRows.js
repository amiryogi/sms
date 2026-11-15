/**
 * Turns a published holiday list into rows the import can preview. Pure.
 *
 * A list row carries the date as published (BS, "2083-07-04"); the AD date is
 * worked out here by the date engine, never typed in. Two kinds of list:
 *  - a built-in dataset (src/data/holidays/<bsYear>.json), transcribed from the
 *    government notice;
 *  - rows the admin pasted (other years, local holidays).
 */
const { bsToAd, weekdayOf, isValidBs } = require("./bsDateAdapter");
const { toLatinDigits } = require("./dateFormatter");
const { HOLIDAY_CATEGORIES } = require("./calendarRules");

const MAX_ROWS = 200;

/** "2083-07-04", "2083/7/4" or "२०८३/०७/०४" -> { year, month, day }, or null. */
const parseBsDate = (value) => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const m = /^\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s*$/.exec(toLatinDigits(String(value)));
  if (!m) return null;
  const bs = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return isValidBs(bs) ? bs : null;
};

const bsText = (bs) => `${bs.year}-${String(bs.month).padStart(2, "0")}-${String(bs.day).padStart(2, "0")}`;

const slug = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/**
 * One preview row from a list entry. `keyPrefix` keeps keys of different lists
 * apart ("moha-2083"). A row that cannot be used carries `error`.
 */
const toRow = (entry, keyPrefix, index) => {
  const title = typeof entry?.title === "string" ? entry.title.trim().slice(0, 255) : "";
  const start = parseBsDate(entry?.bs);
  const end = entry?.bsEnd ? parseBsDate(entry.bsEnd) : start;
  const category = HOLIDAY_CATEGORIES.includes(entry?.category) ? entry.category : "PUBLIC_HOLIDAY";

  const row = {
    key: `${keyPrefix}:${entry?.key ? slug(entry.key) : `${start ? bsText(start) : index}:${slug(title)}`}`.slice(0, 100),
    title,
    titleNe: typeof entry?.titleNe === "string" ? entry.titleNe.trim().slice(0, 255) : null,
    category,
    bsStart: start ? bsText(start) : null,
    bsEnd: end ? bsText(end) : null,
    startDate: start ? bsToAd(start) : null,
    endDate: end ? bsToAd(end) : null,
    weekday: null,
    applicability: typeof entry?.applicability === "string" && entry.applicability.trim() ? entry.applicability.trim().slice(0, 500) : null,
    recommended: entry?.recommended !== false,
    error: null,
  };
  row.weekday = row.startDate ? weekdayOf(row.startDate) : null;

  if (!title) row.error = "The holiday needs a name";
  else if (!start) row.error = "The date is not a real BS date (write it like 2083-07-04)";
  else if (!end) row.error = "The end date is not a real BS date";
  else if (row.endDate < row.startDate) row.error = "The end date is before the start date";
  else if (entry?.weekday !== undefined && entry.weekday !== null && entry.weekday !== row.weekday) {
    row.error = "The weekday in the list does not match the calendar for this date";
  }
  return row;
};

/** Rows of a built-in dataset. */
const datasetRows = (dataset) => (dataset.holidays || []).map((h, i) => toRow(h, `moha-${dataset.bsYear}`, i));

/** Rows from what the admin pasted: [{ title, bs, bsEnd?, category?, applicability? }]. */
const customRows = (entries, bsYear) => {
  if (!Array.isArray(entries)) return [];
  return entries.slice(0, MAX_ROWS).map((e, i) => toRow({ ...e, key: undefined, recommended: true }, `custom-${bsYear}`, i));
};

module.exports = { MAX_ROWS, parseBsDate, bsText, toRow, datasetRows, customRows };
