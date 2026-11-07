/**
 * Grade scales: the presets, the in-memory shape the grade calculator uses,
 * and the validator that guards what an admin may save.
 *
 * A school's scale lives in the `grade_scales` / `grade_bands` tables. This file
 * is pure (no Prisma) so it can be unit-tested; loading from the database is in
 * `services/gradeScale.service.js`.
 *
 * In-memory shape (what `normalizeScale` returns and the calculator expects):
 *
 *   {
 *     id: number | null,          // null for a built-in preset
 *     name: string,
 *     passPercent: number,        // a theory or practical component below this fails the subject
 *     bands: [                    // sorted highest first
 *       { min, max, grade, gpa, description, isPassing }
 *     ],
 *     failGrade: string,          // printed when a subject or the whole result fails
 *   }
 *
 * Band boundaries: each band's `max` equals the next band's `min`. Lookup scans
 * from the top, so a score exactly on a boundary lands in the higher band.
 */

/** Letter reserved for absent students. A scale may not use it as a band. */
const ABSENT_GRADE = "AB";

/** Printed for a failure when a scale has no failing band of its own. */
const DEFAULT_FAIL_GRADE = "NG";

/**
 * The current official NEB scale (2078 onwards). Any component below 35% fails
 * the subject, which then prints NG.
 */
const NEB_8_BAND = {
  key: "neb8",
  name: "NEB 2078 (8-band)",
  passPercent: 35,
  bands: [
    { min: 90, max: 100, grade: "A+", gpa: 4.0, description: "Outstanding", isPassing: true },
    { min: 80, max: 90, grade: "A", gpa: 3.6, description: "Excellent", isPassing: true },
    { min: 70, max: 80, grade: "B+", gpa: 3.2, description: "Very Good", isPassing: true },
    { min: 60, max: 70, grade: "B", gpa: 2.8, description: "Good", isPassing: true },
    { min: 50, max: 60, grade: "C+", gpa: 2.4, description: "Satisfactory", isPassing: true },
    { min: 40, max: 50, grade: "C", gpa: 2.0, description: "Acceptable", isPassing: true },
    { min: 35, max: 40, grade: "D", gpa: 1.6, description: "Partially Acceptable", isPassing: true },
    { min: 0, max: 35, grade: "NG", gpa: 0.0, description: "Not Graded", isPassing: false },
  ],
};

/**
 * The older letter-grade scale (SLC/SEE 2072-2077) that SVI still prints on its
 * internal report cards: D+ = 1.6, D = 1.2, E = 0.8, and no failing grade.
 * marksheetformat1.jpeg shows a theory `D` combined with a practical `B` giving
 * a final `C`, so there is no per-component pass floor either.
 */
const LEGACY_SLC_9_BAND = {
  key: "legacy9",
  name: "Legacy SLC (9-band)",
  passPercent: 0,
  bands: [
    { min: 90, max: 100, grade: "A+", gpa: 4.0, description: "Outstanding", isPassing: true },
    { min: 80, max: 90, grade: "A", gpa: 3.6, description: "Excellent", isPassing: true },
    { min: 70, max: 80, grade: "B+", gpa: 3.2, description: "Very Good", isPassing: true },
    { min: 60, max: 70, grade: "B", gpa: 2.8, description: "Good", isPassing: true },
    { min: 50, max: 60, grade: "C+", gpa: 2.4, description: "Satisfactory", isPassing: true },
    { min: 40, max: 50, grade: "C", gpa: 2.0, description: "Acceptable", isPassing: true },
    { min: 30, max: 40, grade: "D+", gpa: 1.6, description: "Partially Acceptable", isPassing: true },
    { min: 20, max: 30, grade: "D", gpa: 1.2, description: "Insufficient", isPassing: true },
    { min: 0, max: 20, grade: "E", gpa: 0.8, description: "Very Insufficient", isPassing: true },
  ],
};

const GRADE_SCALE_PRESETS = {
  [NEB_8_BAND.key]: NEB_8_BAND,
  [LEGACY_SLC_9_BAND.key]: LEGACY_SLC_9_BAND,
};

const num = (v) => (v === null || v === undefined ? NaN : Number(v));

/**
 * Turn a preset or a Prisma row (`GradeScale` with `bands`, Decimal fields) into
 * the calculator's shape. Accepts either `min/max/gpa` or the column names
 * `minPercent/maxPercent/gradePoint`.
 */
const normalizeScale = (raw) => {
  const bands = (raw.bands || [])
    .map((b) => ({
      min: num(b.min ?? b.minPercent),
      max: num(b.max ?? b.maxPercent),
      grade: String(b.grade),
      gpa: num(b.gpa ?? b.gradePoint),
      description: b.description ?? null,
      isPassing: b.isPassing !== false,
    }))
    .sort((a, b) => b.min - a.min);

  // The lowest failing band names a failure; scales with none fall back to NG.
  const failing = bands.filter((b) => !b.isPassing);
  const failGrade = failing.length
    ? failing[failing.length - 1].grade
    : DEFAULT_FAIL_GRADE;

  return {
    id: raw.id ?? null,
    name: raw.name,
    passPercent: num(raw.passPercent) || 0,
    bands,
    failGrade,
  };
};

/**
 * The band list as `gradeReference` ships it to the frontend. Keeps the shape
 * the frontend already reads (`min, max, grade, gpa, description`).
 */
const toGradeReference = (scale) =>
  scale.bands.map(({ min, max, grade, gpa, description, isPassing }) => ({
    min,
    max,
    grade,
    gpa,
    description,
    isPassing,
  }));

/**
 * Validate a scale an admin wants to save. Returns a list of
 * `{ field, message }`; empty means valid. `field` uses the request body's
 * names (`bands[3].min`) so the UI can highlight the right cell.
 *
 * The rules exist to stop the 0.01-wide gaps that once printed NG for students
 * who had passed from being typed back in through the settings page.
 */
const validateScale = ({ name, passPercent, bands }) => {
  const errors = [];
  const err = (field, message) => errors.push({ field, message });

  if (!name || !String(name).trim()) err("name", "Name is required");
  else if (String(name).length > 100) err("name", "Name must be 100 characters or fewer");

  const pass = num(passPercent);
  if (!Number.isFinite(pass) || pass < 0 || pass > 100) {
    err("passPercent", "Pass percentage must be between 0 and 100");
  }

  if (!Array.isArray(bands) || bands.length === 0) {
    err("bands", "At least one grade band is required");
    return errors;
  }
  if (bands.length > 20) {
    err("bands", "A scale may have at most 20 bands");
    return errors;
  }

  // Validate each band on its own first, remembering its original index.
  const rows = bands.map((b, i) => ({
    i,
    min: num(b.min),
    max: num(b.max),
    gpa: num(b.gpa),
    grade: b.grade === undefined || b.grade === null ? "" : String(b.grade).trim(),
    description: b.description,
    isPassing: b.isPassing !== false,
  }));

  let rowsValid = true;
  for (const r of rows) {
    const at = `bands[${r.i}]`;
    if (!r.grade) {
      err(`${at}.grade`, "Grade letter is required");
      rowsValid = false;
    } else if (r.grade.length > 5) {
      err(`${at}.grade`, "Grade letter must be 5 characters or fewer");
      rowsValid = false;
    } else if (r.grade.toUpperCase() === ABSENT_GRADE) {
      err(`${at}.grade`, `"${ABSENT_GRADE}" is reserved for absent students`);
      rowsValid = false;
    }
    if (!Number.isFinite(r.min) || r.min < 0 || r.min > 100) {
      err(`${at}.min`, "From % must be between 0 and 100");
      rowsValid = false;
    }
    if (!Number.isFinite(r.max) || r.max < 0 || r.max > 100) {
      err(`${at}.max`, "To % must be between 0 and 100");
      rowsValid = false;
    }
    if (Number.isFinite(r.min) && Number.isFinite(r.max) && r.min >= r.max) {
      err(`${at}.max`, "To % must be greater than From %");
      rowsValid = false;
    }
    if (!Number.isFinite(r.gpa) || r.gpa < 0 || r.gpa > 9.99) {
      err(`${at}.gpa`, "Grade point must be between 0 and 9.99");
      rowsValid = false;
    }
    if (r.description && String(r.description).length > 100) {
      err(`${at}.description`, "Description must be 100 characters or fewer");
      rowsValid = false;
    }
  }

  const seen = new Map();
  for (const r of rows) {
    const key = r.grade.toUpperCase();
    if (!key) continue;
    if (seen.has(key)) {
      err(`bands[${r.i}].grade`, `Grade "${r.grade}" is used twice`);
      rowsValid = false;
    } else seen.set(key, r.i);
  }

  if (!rowsValid) return errors;

  // Whole-scale rules, checked top-down.
  const sorted = [...rows].sort((a, b) => b.min - a.min);

  if (sorted[0].max !== 100) {
    err(`bands[${sorted[0].i}].max`, "The top band must reach 100%");
  }
  const bottom = sorted[sorted.length - 1];
  if (bottom.min !== 0) {
    err(`bands[${bottom.i}].min`, "The bottom band must start at 0%");
  }

  for (let k = 0; k < sorted.length - 1; k++) {
    const upper = sorted[k];
    const lower = sorted[k + 1];
    if (lower.max < upper.min) {
      err(
        `bands[${lower.i}].max`,
        `Gap: nothing covers ${lower.max}%–${upper.min}% (between ${lower.grade} and ${upper.grade})`,
      );
    } else if (lower.max > upper.min) {
      err(
        `bands[${lower.i}].max`,
        `Overlap: ${lower.grade} and ${upper.grade} both cover ${upper.min}%–${lower.max}%`,
      );
    }
    if (lower.gpa > upper.gpa) {
      err(
        `bands[${lower.i}].gpa`,
        `${lower.grade} has a higher grade point than ${upper.grade}, which is above it`,
      );
    }
    if (lower.isPassing && !upper.isPassing) {
      err(
        `bands[${lower.i}].isPassing`,
        `${lower.grade} passes but ${upper.grade}, which is above it, fails`,
      );
    }
  }

  return errors;
};

module.exports = {
  ABSENT_GRADE,
  DEFAULT_FAIL_GRADE,
  NEB_8_BAND,
  LEGACY_SLC_9_BAND,
  GRADE_SCALE_PRESETS,
  normalizeScale,
  toGradeReference,
  validateScale,
};
