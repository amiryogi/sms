/**
 * Bikram Sambat (BS) dates. Port of backend/src/utils/dateConverter.js: same
 * table (bsCalendarData.ts), same reference point, same results; the tests in
 * tests/utils/nepaliDate.test.ts repeat the backend's cases.
 *
 * Dates are stored and sent in AD. BS is for display only, and for letting
 * someone pick a day by its BS date (bsToAd) before it is sent as AD.
 */
import { BS_YEAR_DATA } from "./bsCalendarData";

export const BS_MONTHS = [
  "Baisakh",
  "Jestha",
  "Asar",
  "Shrawan",
  "Bhadra",
  "Asoj",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
] as const;

export type BsDate = { year: number; month: number; day: number; formatted: string };

const DAY_MS = 24 * 60 * 60 * 1000;
// Reference: 1944-01-01 AD = 2000/09/17 BS (Poush 17).
const REFERENCE_AD = Date.UTC(1944, 0, 1);
const REFERENCE_BS = { year: 2000, month: 9, day: 17 };

export const BS_MIN_YEAR = 2000;
export const BS_MAX_YEAR = 2090;

export const getDaysInBsMonth = (year: number, month: number): number => {
  const row = BS_YEAR_DATA[year];
  if (!row || month < 1 || month > 12) return 30;
  return row[month - 1] ?? 30;
};

export const getTotalDaysInBsYear = (year: number): number => {
  const row = BS_YEAR_DATA[year];
  return row ? row.reduce((sum, d) => sum + d, 0) : 365;
};

const pad = (n: number) => String(n).padStart(2, "0");
const format = (year: number, month: number, day: number): BsDate => ({
  year,
  month,
  day,
  formatted: `${year}/${pad(month)}/${pad(day)}`,
});

/**
 * The calendar day a value stands for, as UTC midnight milliseconds. A value
 * at exactly UTC midnight is a date-only column (Prisma @db.Date) and keeps its
 * UTC day; any other time (a timestamp) means the device's local day, which for
 * the app's users is Nepal time. Same rule as the backend.
 */
const calendarDayUtc = (date: Date): number => {
  const isDateOnly =
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
  return isDateOnly
    ? Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    : Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

const toDate = (value: Date | string | number | null | undefined): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** AD -> BS, or null for an empty or invalid value. */
export const adToBs = (value: Date | string | number | null | undefined): BsDate | null => {
  const date = toDate(value);
  if (!date) return null;

  let totalDays = Math.round((calendarDayUtc(date) - REFERENCE_AD) / DAY_MS);
  let { year, month, day } = REFERENCE_BS;

  while (totalDays > 0) {
    const remaining = getDaysInBsMonth(year, month) - day;
    if (totalDays <= remaining) {
      day += totalDays;
      totalDays = 0;
    } else {
      totalDays -= remaining + 1;
      month += 1;
      day = 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }
  while (totalDays < 0) {
    day -= 1;
    if (day < 1) {
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      day = getDaysInBsMonth(year, month);
    }
    totalDays += 1;
  }
  return format(year, month, day);
};

/** True for a real day of the BS table (2000–2090). */
export const isValidBsDate = (year: number, month: number, day: number): boolean =>
  Number.isInteger(year) &&
  Number.isInteger(month) &&
  Number.isInteger(day) &&
  year >= BS_MIN_YEAR &&
  year <= BS_MAX_YEAR &&
  month >= 1 &&
  month <= 12 &&
  day >= 1 &&
  day <= getDaysInBsMonth(year, month);

/** BS -> AD "YYYY-MM-DD", or null outside the table. Inverse of adToBs. */
export const bsToAd = (year: number, month: number, day: number): string | null => {
  if (!isValidBsDate(year, month, day)) return null;
  // Days from the reference BS date to the wanted one.
  let days = 0;
  let y = REFERENCE_BS.year;
  let m = REFERENCE_BS.month;
  let d = REFERENCE_BS.day;
  const target = year * 10000 + month * 100 + day;
  if (target >= y * 10000 + m * 100 + d) {
    while (y < year) {
      days += getDaysInBsMonth(y, m) - d + 1;
      d = 1;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    while (m < month) {
      days += getDaysInBsMonth(y, m) - d + 1;
      d = 1;
      m += 1;
    }
    days += day - d;
  } else {
    return null; // before the reference day: outside what the app needs
  }
  return new Date(REFERENCE_AD + days * DAY_MS).toISOString().slice(0, 10);
};

/** "27 Kartik 2083" */
export const formatBs = (value: Date | string | number | null | undefined, fallback = "—"): string => {
  const bs = adToBs(value);
  return bs ? `${bs.day} ${BS_MONTHS[bs.month - 1]} ${bs.year}` : fallback;
};

/** "Kartik 2083" for a BS year/month pair. */
export const bsMonthLabel = (year: number, month: number) => `${BS_MONTHS[month - 1] ?? "?"} ${year}`;

const KATHMANDU_OFFSET_MINUTES = 345;

/** Today's date in Nepal as "YYYY-MM-DD", whatever the device's timezone. */
export const kathmanduToday = (now: Date = new Date()): string =>
  new Date(now.getTime() + KATHMANDU_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);
