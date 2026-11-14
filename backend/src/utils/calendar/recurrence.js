/**
 * Repeating calendar events. An event is stored once, with its first
 * occurrence in startDate/endDate; the occurrences inside a window are worked
 * out here when the calendar is read. Pure, no database.
 *
 *   NONE        once
 *   WEEKLY      every 7 days
 *   MONTHLY_BS  the same BS day every BS month
 *   YEARLY_BS   the same BS month and day every BS year (a festival on a fixed BS date)
 *   YEARLY_AD   the same AD month and day every AD year (1 May)
 *
 * A day a shorter month does not have moves to that month's last day (the 32nd
 * becomes the 31st; 29 February becomes 28 February).
 */
const { adToBs, bsToAd, daysInBsMonth, addDays, diffDays, isIsoDate, MAX_AD } = require("./bsDateAdapter");

const RECURRENCES = ["NONE", "WEEKLY", "MONTHLY_BS", "YEARLY_BS", "YEARLY_AD"];
const MAX_OCCURRENCES = 500;

const bsClamped = (year, month, day) => {
  const days = daysInBsMonth(year, month);
  return days ? bsToAd({ year, month, day: Math.min(day, days) }) : null;
};

const adClamped = (year, month, day) => {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
};

/** The start date of occurrence number `n` (0 = the first), or null when there is none. */
const nthStart = (first, recurrence, n) => {
  if (n === 0) return first;
  switch (recurrence) {
    case "WEEKLY":
      return addDays(first, 7 * n);
    case "MONTHLY_BS": {
      const bs = adToBs(first);
      if (!bs) return null;
      const index = bs.month - 1 + n;
      return bsClamped(bs.year + Math.floor(index / 12), (index % 12) + 1, bs.day);
    }
    case "YEARLY_BS": {
      const bs = adToBs(first);
      return bs ? bsClamped(bs.year + n, bs.month, bs.day) : null;
    }
    case "YEARLY_AD": {
      const [y, m, d] = first.split("-").map(Number);
      return adClamped(y + n, m, d);
    }
    default:
      return null;
  }
};

/**
 * Occurrences of an event that touch [from, to], oldest first:
 * [{ startDate, endDate }] as AD "YYYY-MM-DD".
 *
 * `event` is { startDate, endDate, recurrence, recurrenceUntil } with AD
 * "YYYY-MM-DD" dates. An occurrence starting after `recurrenceUntil` is left out.
 */
const expandOccurrences = (event, from, to) => {
  const { startDate, recurrence = "NONE", recurrenceUntil = null } = event;
  const endDate = event.endDate || startDate;
  if (!isIsoDate(startDate) || !isIsoDate(endDate) || !isIsoDate(from) || !isIsoDate(to)) return [];
  if (endDate < startDate || to < from) return [];

  const length = diffDays(startDate, endDate);
  const lastStart = [to, recurrenceUntil, MAX_AD].filter(isIsoDate).sort()[0];
  const out = [];

  const count = RECURRENCES.includes(recurrence) && recurrence !== "NONE" ? MAX_OCCURRENCES * 12 : 1;
  for (let n = 0; n < count && out.length < MAX_OCCURRENCES; n += 1) {
    const start = nthStart(startDate, recurrence, n);
    if (!start || start > lastStart) break;
    const end = addDays(start, length);
    if (end >= from) out.push({ startDate: start, endDate: end });
  }
  return out;
};

module.exports = { RECURRENCES, MAX_OCCURRENCES, expandOccurrences };
