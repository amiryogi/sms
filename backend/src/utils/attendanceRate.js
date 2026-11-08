/**
 * Attendance percentage with the school's rule for late arrivals.
 *
 * The report-card layout's `countLateAsPresent` (utils/reportCardLayout.js,
 * default true) decides whether a late day counts as attended. Excused days
 * count towards the total but not as attended (unchanged behaviour). The same
 * rule is used everywhere a student's attendance % is shown, so the portal,
 * the report card and staff screens agree.
 */
const { convertADToBS } = require("./dateConverter");

const BS_MONTHS = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Asoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

const emptyCounts = () => ({ total: 0, present: 0, absent: 0, late: 0, excused: 0 });

const tally = (records) =>
  records.reduce((acc, r) => {
    acc.total += 1;
    if (acc[r.status] !== undefined) acc[r.status] += 1;
    return acc;
  }, emptyCounts());

/** { attended, percentage } for counts; percentage has 2 decimals, 0 when there are no days. */
const rateOf = (counts, { countLateAsPresent = true } = {}) => {
  const attended = counts.present + (countLateAsPresent ? counts.late : 0);
  const percentage = counts.total > 0 ? Math.round((attended / counts.total) * 10000) / 100 : 0;
  return { attended, percentage };
};

/** Counts per BS month, newest month first: [{ year, month, label, ...counts, attended, percentage }]. */
const byBsMonth = (records, rule) => {
  const groups = new Map();
  for (const r of records) {
    const bs = convertADToBS(r.attendanceDate);
    if (!bs) continue;
    const key = bs.year * 100 + bs.month;
    if (!groups.has(key)) groups.set(key, { year: bs.year, month: bs.month, records: [] });
    groups.get(key).records.push(r);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, g]) => {
      const counts = tally(g.records);
      return { year: g.year, month: g.month, label: `${BS_MONTHS[g.month - 1]} ${g.year}`, ...counts, ...rateOf(counts, rule) };
    });
};

module.exports = { BS_MONTHS, tally, rateOf, byBsMonth };
