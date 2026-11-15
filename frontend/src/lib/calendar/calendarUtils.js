/**
 * Month grids and navigation for the date picker and the school calendar, in
 * either calendar. Pure: month lengths and weekdays come from the date engine.
 *
 * A "view month" is { mode: "bs" | "ad", year, month }.
 */
import {
  adToBs,
  bsToAd,
  bsMonthRange,
  daysInAdMonth,
  weekdayOf,
  addDays,
  diffDays,
  isSupportedAd,
  MIN_AD,
  MAX_AD,
  MIN_BS_YEAR,
  MAX_BS_YEAR,
} from "./bsDateAdapter";
import { bsMonthName, adMonthName, digits } from "./dateFormatter";

const pad = (n) => String(n).padStart(2, "0");
const adIso = (y, m, d) => `${String(y).padStart(4, "0")}-${pad(m)}-${pad(d)}`;

const MIN_AD_YEAR = Number(MIN_AD.slice(0, 4));
const MAX_AD_YEAR = Number(MAX_AD.slice(0, 4));

/** The view month that contains an AD date. */
export const viewOf = (iso, mode = "bs") => {
  if (mode === "ad") {
    const [year, month] = iso.split("-").map(Number);
    return { mode, year, month };
  }
  const bs = adToBs(iso);
  return bs ? { mode: "bs", year: bs.year, month: bs.month } : null;
};

/** First and last AD dates of a view month, clipped to the supported range; null when outside it. */
export const viewRange = ({ mode, year, month }) => {
  if (mode === "bs") return bsMonthRange(year, month);
  const from = adIso(year, month, 1);
  const to = adIso(year, month, daysInAdMonth(year, month));
  if (to < MIN_AD || from > MAX_AD) return null;
  return { from: from < MIN_AD ? MIN_AD : from, to: to > MAX_AD ? MAX_AD : to };
};

/** The view `delta` months away, or null when that leaves the supported range. */
export const shiftView = (view, delta) => {
  const index = view.year * 12 + (view.month - 1) + delta;
  const next = { mode: view.mode, year: Math.floor(index / 12), month: (index % 12) + 1 };
  return viewRange(next) ? next : null;
};

/** The same month shown in the other calendar (the one holding the middle of this month). */
export const switchViewMode = (view, mode) => {
  if (view.mode === mode) return view;
  const range = viewRange(view);
  if (!range) return null;
  return viewOf(addDays(range.from, Math.floor(diffDays(range.from, range.to) / 2)), mode);
};

/** Years a view may show, for the year select. */
export const yearOptions = (mode) => {
  const [min, max] = mode === "bs" ? [MIN_BS_YEAR, MAX_BS_YEAR] : [MIN_AD_YEAR, MAX_AD_YEAR];
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
};

/** "Kartik 2083" / "कार्तिक २०८३" / "November 2026". */
export const viewTitle = ({ mode, year, month }, { language = "en", numerals = "en" } = {}) =>
  `${mode === "bs" ? bsMonthName(month, language) : adMonthName(month, language)} ${digits(year, numerals)}`;

/** The AD months a BS month covers, or the BS months an AD month covers: "Oct / Nov 2026". */
export const viewSubtitle = (view, { language = "en", numerals = "en" } = {}) => {
  const range = viewRange(view);
  if (!range) return "";
  if (view.mode === "bs") {
    const [y1, m1] = range.from.split("-").map(Number);
    const [y2, m2] = range.to.split("-").map(Number);
    const a = adMonthName(m1, language, true);
    const b = adMonthName(m2, language, true);
    if (y1 === y2) return m1 === m2 ? `${a} ${digits(y1, numerals)}` : `${a} / ${b} ${digits(y1, numerals)}`;
    return `${a} ${digits(y1, numerals)} / ${b} ${digits(y2, numerals)}`;
  }
  const a = adToBs(range.from);
  const b = adToBs(range.to);
  if (!a || !b) return "";
  const an = bsMonthName(a.month, language);
  const bn = bsMonthName(b.month, language);
  if (a.year === b.year) return a.month === b.month ? `${an} ${digits(a.year, numerals)}` : `${an} / ${bn} ${digits(a.year, numerals)}`;
  return `${an} ${digits(a.year, numerals)} / ${bn} ${digits(b.year, numerals)}`;
};

/**
 * One cell: { ad, bs, weekday, inMonth, label, altLabel }.
 * `label` is the day number in the view's calendar, `altLabel` in the other one.
 */
const cellOf = (ad, view, range) => {
  const bs = adToBs(ad);
  const adDay = Number(ad.slice(8));
  return {
    ad,
    bs,
    weekday: weekdayOf(ad),
    inMonth: ad >= range.from && ad <= range.to,
    label: view.mode === "bs" ? (bs?.day ?? null) : adDay,
    altLabel: view.mode === "bs" ? adDay : (bs?.day ?? null),
  };
};

/**
 * The weeks of a view month: rows of 7 cells starting on `weekStartsOn`
 * (0 = Sunday), padded with the neighbouring months' days. A padding day
 * outside the supported range is null.
 */
export const monthGrid = (view, weekStartsOn = 0) => {
  const range = viewRange(view);
  if (!range) return [];
  const lead = (weekdayOf(range.from) - weekStartsOn + 7) % 7;
  const total = Math.ceil((lead + diffDays(range.from, range.to) + 1) / 7) * 7;
  const start = addDays(range.from, -lead);
  const cells = [];
  for (let i = 0; i < total; i += 1) {
    const ad = addDays(start, i);
    cells.push(isSupportedAd(ad) ? cellOf(ad, view, range) : null);
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

/** The 7 days of the week containing an AD date, starting on `weekStartsOn`. */
export const weekOf = (iso, weekStartsOn = 0, mode = "bs") => {
  const start = addDays(iso, -((weekdayOf(iso) - weekStartsOn + 7) % 7));
  const view = { mode };
  const range = { from: start, to: addDays(start, 6) };
  return Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((ad) => (isSupportedAd(ad) ? cellOf(ad, view, range) : null));
};

/** Weekday numbers in display order: [0..6] rotated to start on `weekStartsOn`. */
export const weekdayOrder = (weekStartsOn = 0) => Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7);

/** The AD date for a day number of a view month, clamped to the month's length. */
export const dayOfView = ({ mode, year, month }, day) => {
  if (mode === "bs") {
    const range = bsMonthRange(year, month);
    if (!range) return null;
    const last = diffDays(range.from, range.to) + 1;
    return bsToAd({ year, month, day: Math.min(Math.max(day, 1), last) });
  }
  const iso = adIso(year, month, Math.min(Math.max(day, 1), daysInAdMonth(year, month)));
  return isSupportedAd(iso) ? iso : null;
};

/** Moves an AD date by whole months in a calendar, keeping the day number where the month has it. */
export const addMonths = (iso, delta, mode = "bs") => {
  const view = viewOf(iso, mode);
  if (!view) return null;
  const next = shiftView(view, delta);
  if (!next) return null;
  const day = mode === "bs" ? adToBs(iso).day : Number(iso.slice(8));
  return dayOfView(next, day);
};

/** Items (each with AD startDate and endDate) grouped by every day they cover inside [from, to]. */
export const itemsByDay = (items, from, to) => {
  const map = new Map();
  for (const item of items) {
    const start = item.startDate < from ? from : item.startDate;
    const end = item.endDate > to ? to : item.endDate;
    for (let day = start; day && day <= end; day = addDays(day, 1)) {
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(item);
    }
  }
  return map;
};
