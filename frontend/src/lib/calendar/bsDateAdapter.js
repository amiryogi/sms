/**
 * Bikram Sambat (BS) <-> AD conversion for the browser.
 *
 * The only file that imports the conversion package
 * (@inicrea/bikram-sambat-core, BS 1975-2100). Same functions and behaviour as
 * backend/src/utils/calendar/bsDateAdapter.js, and both are tested against the
 * same reference dates, so the server and the screen never disagree.
 *
 * A calendar date is a "YYYY-MM-DD" string (AD) or { year, month, day } (BS,
 * month 1 = Baisakh). It never passes through a local-time Date. Functions
 * return null for a value that is not a date or is out of range.
 */
import * as core from "@inicrea/bikram-sambat-core";

export const MIN_BS_YEAR = core.MIN_BS_YEAR; // 1975
export const MAX_BS_YEAR = core.MAX_BS_YEAR; // 2100
export const MIN_AD = core.EPOCH_AD_ISO; // "1918-04-13" = 1975-01-01 BS
export const MAX_AD = core.MAX_AD_ISO; // "2044-04-12" = 2100-12-30 BS

const DAY_MS = 86400000;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const KATHMANDU_OFFSET_MINUTES = 5 * 60 + 45;

/** True for a real AD calendar date written "YYYY-MM-DD". */
export const isIsoDate = (value) => {
  if (typeof value !== "string" || !ISO_DAY.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

/** True when the AD date can be converted (inside BS 1975-2100). */
export const isSupportedAd = (iso) => isIsoDate(iso) && iso >= MIN_AD && iso <= MAX_AD;

/** True for a real BS date inside the supported range. */
export const isValidBs = (bs) =>
  !!bs && Number.isInteger(bs.year) && Number.isInteger(bs.month) && Number.isInteger(bs.day) && core.isValidBsDate(bs);

/** AD "YYYY-MM-DD" -> { year, month, day } in BS, or null. */
export const adToBs = (iso) => {
  if (!isSupportedAd(iso)) return null;
  const bs = core.adToBs(iso);
  return { year: bs.year, month: bs.month, day: bs.day };
};

/** BS { year, month, day } -> AD "YYYY-MM-DD", or null. */
export const bsToAd = (bs) => (isValidBs(bs) ? core.bsToAdIso({ year: bs.year, month: bs.month, day: bs.day }) : null);

/** Days in a BS month (29-32), or null outside the table. */
export const daysInBsMonth = (year, month) => {
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (year < MIN_BS_YEAR || year > MAX_BS_YEAR || month < 1 || month > 12) return null;
  return core.daysInBsMonth(year, month);
};

/** Days in an AD month. */
export const daysInAdMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Weekday of an AD date, 0 = Sunday ... 6 = Saturday, or null. */
export const weekdayOf = (iso) => (isIsoDate(iso) ? new Date(`${iso}T00:00:00.000Z`).getUTCDay() : null);

/** Weekday of a BS date, or null. */
export const bsWeekday = (bs) => weekdayOf(bsToAd(bs));

/** The AD date `days` after (or before) an AD date. */
export const addDays = (iso, days) => {
  if (!isIsoDate(iso) || !Number.isInteger(days)) return null;
  return new Date(Date.parse(`${iso}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
};

/** Whole days from one AD date to another. */
export const diffDays = (from, to) => {
  if (!isIsoDate(from) || !isIsoDate(to)) return null;
  return Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS);
};

/** First and last AD dates of a BS month: { from, to }, or null. */
export const bsMonthRange = (year, month) => {
  const days = daysInBsMonth(year, month);
  if (!days) return null;
  return { from: bsToAd({ year, month, day: 1 }), to: bsToAd({ year, month, day: days }) };
};

/** First and last AD dates of a BS year: { from, to }, or null. */
export const bsYearRange = (year) => {
  const first = bsMonthRange(year, 1);
  const last = bsMonthRange(year, 12);
  return first && last ? { from: first.from, to: last.to } : null;
};

/** The Nepal calendar day of an instant, as AD "YYYY-MM-DD". */
export const kathmanduDay = (instant) => new Date(instant.getTime() + KATHMANDU_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);

/** The Nepal clock time of an instant, "HH:mm". */
export const kathmanduTime = (instant) => new Date(instant.getTime() + KATHMANDU_OFFSET_MINUTES * 60000).toISOString().slice(11, 16);

/** Today's calendar date in Nepal as AD "YYYY-MM-DD", whatever the device's timezone. */
export const todayAd = (now = new Date()) => kathmanduDay(now);

/** Today's calendar date in Nepal in BS. */
export const todayBs = (now = new Date()) => adToBs(todayAd(now));
