/**
 * Loading a school's grade scale from the database.
 *
 * Every grade the backend computes should go through a scale returned from
 * here, so that a school on the legacy 9-band scale gets D+ = 1.6 everywhere,
 * not just on the report card. With no scale rows (a school that has never set
 * one up, or a database migrated before seeding) everything falls back to the
 * built-in NEB 8-band scale, which is exactly the behaviour before grade scales
 * existed.
 */
const prisma = require("../config/database");
const { normalizeScale } = require("../utils/gradeScale");
const { DEFAULT_SCALE } = require("../utils/gradeCalculator");

const bandOrder = { orderBy: { minPercent: "desc" } };

/**
 * The school's default scale, normalized for the grade calculator.
 * @param {number} schoolId
 * @param {object} [db] - a Prisma client or transaction client
 */
const getDefaultScale = async (schoolId, db = prisma) => {
  const row = await db.gradeScale.findFirst({
    where: { schoolId, isDefault: true },
    include: { bands: bandOrder },
  });
  return row && row.bands.length ? normalizeScale(row) : DEFAULT_SCALE;
};

/**
 * Load every scale for a school once, and resolve the right one per report
 * card: the scale a card was generated with, else the school default.
 *
 * Use this when one request grades many students, so it is one query rather
 * than one per student.
 *
 * @returns {Promise<{ defaultScale: object, forReportCard: (rc) => object }>}
 */
const getScaleResolver = async (schoolId, db = prisma) => {
  const rows = await db.gradeScale.findMany({
    where: { schoolId },
    include: { bands: bandOrder },
  });

  const byId = new Map();
  let defaultScale = DEFAULT_SCALE;
  for (const row of rows) {
    if (!row.bands.length) continue;
    const scale = normalizeScale(row);
    byId.set(row.id, scale);
    if (row.isDefault) defaultScale = scale;
  }

  return {
    defaultScale,
    /**
     * A report card keeps the scale it was generated with. A card from before
     * grade scales existed has no scale id; it was graded on NEB 8-band, so it
     * stays on NEB 8-band rather than silently moving to a new default.
     */
    forReportCard: (reportCard) => {
      if (!reportCard) return defaultScale;
      if (reportCard.gradeScaleId == null) return DEFAULT_SCALE;
      return byId.get(reportCard.gradeScaleId) || DEFAULT_SCALE;
    },
  };
};

module.exports = {
  getDefaultScale,
  getScaleResolver,
};
