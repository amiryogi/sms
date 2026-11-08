/**
 * Nepal's fiscal year and receipt numbering.
 *
 * The fiscal year runs from Shrawan 1 (BS month 4) to the end of Ashadh (BS
 * month 3). A payment on 2082/03/32 BS belongs to fiscal year 2081-82; one on
 * 2082/04/01 BS belongs to 2082-83. Receipt numbers restart each fiscal year
 * per school and series (owner's decision, 2026-11-08).
 */
const { convertADToBS } = require("./dateConverter");

const FISCAL_YEAR_START_MONTH = 4; // Shrawan

/** "2082-83" for an AD date (Date or "YYYY-MM-DD"), or null for an invalid date. */
const fiscalYearOf = (adDate) => {
  const bs = convertADToBS(adDate);
  if (!bs) return null;
  const start = bs.month >= FISCAL_YEAR_START_MONTH ? bs.year : bs.year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
};

/** "RCP-2082-83-00042". */
const formatReceiptNumber = (series, fiscalYear, number) =>
  `${series}-${fiscalYear}-${String(number).padStart(5, "0")}`;

const KATHMANDU_OFFSET_MINUTES = 5 * 60 + 45;

/**
 * Today's calendar date in Nepal as "YYYY-MM-DD", whatever the server's own
 * timezone. `now` is injectable for tests.
 */
const kathmanduToday = (now = new Date()) =>
  new Date(now.getTime() + KATHMANDU_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);

/** A "YYYY-MM-DD" string as the UTC-midnight Date Prisma uses for @db.Date. */
const dateOnly = (isoDay) => new Date(`${isoDay}T00:00:00.000Z`);

module.exports = {
  FISCAL_YEAR_START_MONTH,
  fiscalYearOf,
  formatReceiptNumber,
  kathmanduToday,
  dateOnly,
};
