/**
 * Unit tests for src/utils/gradeScale.js and for the grade calculator running
 * on a scale other than its NEB default. Pure functions, no database.
 */

const {
  NEB_8_BAND,
  LEGACY_SLC_9_BAND,
  GRADE_SCALE_PRESETS,
  normalizeScale,
  toGradeReference,
  validateScale,
} = require('../gradeScale');
const {
  DEFAULT_SCALE,
  calculateGradeFromPercentage,
  calculateGradeFromMarks,
  calculateSubjectGrade,
  calculateOverallGPA,
} = require('../gradeCalculator');

const neb = normalizeScale(NEB_8_BAND);
const legacy = normalizeScale(LEGACY_SLC_9_BAND);

const clone = (preset) => ({
  name: preset.name,
  passPercent: preset.passPercent,
  bands: preset.bands.map((b) => ({ ...b })),
});

describe('presets', () => {
  it.each(Object.values(GRADE_SCALE_PRESETS))('$name passes its own validator', (preset) => {
    expect(validateScale(clone(preset))).toEqual([]);
  });

  it('the calculator default is the NEB 8-band preset', () => {
    expect(DEFAULT_SCALE.bands.map((b) => b.grade)).toEqual(neb.bands.map((b) => b.grade));
    expect(DEFAULT_SCALE.passPercent).toBe(35);
    expect(DEFAULT_SCALE.failGrade).toBe('NG');
  });

  it('the legacy scale has nine bands, no failing band, and no component floor', () => {
    expect(legacy.bands).toHaveLength(9);
    expect(legacy.bands.every((b) => b.isPassing)).toBe(true);
    expect(legacy.passPercent).toBe(0);
  });
});

describe('normalizeScale', () => {
  it('reads Prisma column names and Decimal-like strings', () => {
    const s = normalizeScale({
      id: 7,
      name: 'From DB',
      passPercent: '35.00',
      bands: [
        { minPercent: '0.00', maxPercent: '35.00', grade: 'NG', gradePoint: '0.00', isPassing: false },
        { minPercent: '35.00', maxPercent: '100.00', grade: 'P', gradePoint: '4.00', isPassing: true },
      ],
    });
    expect(s.id).toBe(7);
    expect(s.passPercent).toBe(35);
    expect(s.bands.map((b) => [b.min, b.max, b.grade, b.gpa])).toEqual([
      [35, 100, 'P', 4],
      [0, 35, 'NG', 0],
    ]);
    expect(s.failGrade).toBe('NG');
  });

  it('uses the lowest failing band as the fail grade', () => {
    const s = normalizeScale({
      name: 'Two fails',
      passPercent: 40,
      bands: [
        { min: 40, max: 100, grade: 'P', gpa: 2, isPassing: true },
        { min: 20, max: 40, grade: 'F1', gpa: 0, isPassing: false },
        { min: 0, max: 20, grade: 'F2', gpa: 0, isPassing: false },
      ],
    });
    expect(s.failGrade).toBe('F2');
  });

  it('falls back to NG when no band fails', () => {
    expect(legacy.failGrade).toBe('NG');
  });

  it('toGradeReference keeps the shape the frontend reads', () => {
    expect(toGradeReference(neb)[0]).toEqual({
      min: 90, max: 100, grade: 'A+', gpa: 4, description: 'Outstanding', isPassing: true,
    });
  });
});

describe('legacy 9-band scale boundaries', () => {
  it.each([
    [100, 'A+', 4.0],
    [90, 'A+', 4.0],
    [89.99, 'A', 3.6],
    [40, 'C', 2.0],
    [39.99, 'D+', 1.6],
    [35, 'D+', 1.6],
    [30, 'D+', 1.6],
    [29.99, 'D', 1.2],
    [20, 'D', 1.2],
    [19.99, 'E', 0.8],
    [0, 'E', 0.8],
  ])('%p%% -> %s (%p)', (pct, grade, gpa) => {
    const r = calculateGradeFromPercentage(pct, legacy);
    expect(r.grade).toBe(grade);
    expect(r.gpa).toBe(gpa);
    expect(r.isPassed).toBe(true);
  });

  it('the same 35% is D on the NEB scale and D+ on the legacy one', () => {
    expect(calculateGradeFromPercentage(35, neb).grade).toBe('D');
    expect(calculateGradeFromPercentage(35, legacy).grade).toBe('D+');
  });

  it('marks are graded on the scale passed in', () => {
    expect(calculateGradeFromMarks(25, 100, legacy)).toMatchObject({ grade: 'D', gpa: 1.2 });
    expect(calculateGradeFromMarks(25, 100)).toMatchObject({ grade: 'NG', gpa: 0 });
  });
});

describe('calculateSubjectGrade on the legacy scale', () => {
  // marksheetformat1.jpeg: Social Studies prints theory D, practical B, final C.
  // A 25% theory must not fail the subject on SVI's scale.
  const subject = {
    theoryMarks: 18.75, theoryFullMarks: 75, // 25%  -> D
    practicalMarks: 16, practicalFullMarks: 25, // 64% -> B
    hasPractical: true,
  };

  it('a low theory component does not fail the subject', () => {
    const r = calculateSubjectGrade(subject, legacy);
    expect(r.theoryGrade).toBe('D');
    expect(r.practicalGrade).toBe('B');
    expect(r.isPassed).toBe(true);
    expect(r.finalPercentage).toBe(34.75);
    expect(r.finalGrade).toBe('D+');
    expect(r.finalGpa).toBe(1.6);
  });

  it('the same marks fail the subject on the NEB scale', () => {
    const r = calculateSubjectGrade(subject);
    expect(r.isPassed).toBe(false);
    expect(r.finalGrade).toBe('NG');
    expect(r.remark).toBe('Theory Failed');
  });
});

describe('a custom scale whose failing band is not called NG', () => {
  const custom = normalizeScale({
    name: 'Pass/Fail E',
    passPercent: 40,
    bands: [
      { min: 40, max: 100, grade: 'P', gpa: 2.0, description: 'Pass', isPassing: true },
      { min: 0, max: 40, grade: 'E', gpa: 0, description: 'Fail', isPassing: false },
    ],
  });

  it('marks the bottom band as failed (the old `grade !== "NG"` test passed it)', () => {
    expect(calculateGradeFromPercentage(10, custom)).toMatchObject({ grade: 'E', isPassed: false });
  });

  it('a failed component prints E, not NG', () => {
    const r = calculateSubjectGrade({ theoryMarks: 30, theoryFullMarks: 100 }, custom);
    expect(r.isPassed).toBe(false);
    expect(r.finalGrade).toBe('E');
  });

  it('an overall failure prints E', () => {
    const r = calculateOverallGPA(
      [{ finalGpa: 2, finalPercentage: 80, isPassed: true }, { finalGpa: 0, finalPercentage: 10, isPassed: false }],
      { scale: custom },
    );
    expect(r.isPassed).toBe(false);
    expect(r.grade).toBe('E');
  });

  it('uses the scale pass percentage, not 35', () => {
    const r = calculateSubjectGrade({ theoryMarks: 38, theoryFullMarks: 100 }, custom);
    expect(r.isPassed).toBe(false);
  });
});

describe('GPA on the legacy scale matches the printed samples', () => {
  const asSubjects = (gps) => gps.map((g) => ({ finalGpa: g, finalPercentage: 50, isPassed: true }));

  it('fmt1 prints 2.45', () => {
    const r = calculateOverallGPA(asSubjects([3.2, 2.4, 2.4, 2.0, 2.8, 1.6, 3.6, 1.6]), { scale: legacy });
    expect(r.gpa).toBe(2.45);
  });

  it('fmt3 prints 2.11 (two subjects at D = 1.2)', () => {
    const r = calculateOverallGPA(asSubjects([2.4, 2.8, 2.8, 2.4, 2.0, 1.2, 1.2]), { scale: legacy });
    expect(r.gpa).toBe(2.11);
    expect(r.isPassed).toBe(true);
  });
});

describe('validateScale', () => {
  const fields = (errors) => errors.map((e) => e.field);

  it('rejects a gap between bands', () => {
    const s = clone(NEB_8_BAND);
    s.bands[1].max = 89.99; // A stops short of A+
    const errors = validateScale(s);
    expect(fields(errors)).toContain('bands[1].max');
    expect(errors[0].message).toMatch(/Gap/);
  });

  it('rejects an overlap between bands', () => {
    const s = clone(NEB_8_BAND);
    s.bands[1].max = 92;
    expect(validateScale(s)[0].message).toMatch(/Overlap/);
  });

  it('accepts bands in any order', () => {
    const s = clone(LEGACY_SLC_9_BAND);
    s.bands.reverse();
    expect(validateScale(s)).toEqual([]);
  });

  it('requires the scale to cover 0 to 100', () => {
    const top = clone(NEB_8_BAND);
    top.bands[0].max = 99;
    expect(fields(validateScale(top))).toContain('bands[0].max');

    const bottom = clone(NEB_8_BAND);
    bottom.bands[7].min = 1;
    expect(fields(validateScale(bottom))).toContain('bands[7].min');
  });

  it('rejects duplicate letters, case-insensitively', () => {
    const s = clone(NEB_8_BAND);
    s.bands[1].grade = 'a+';
    expect(fields(validateScale(s))).toContain('bands[1].grade');
  });

  it('reserves AB for absent students', () => {
    const s = clone(NEB_8_BAND);
    s.bands[7].grade = 'AB';
    expect(fields(validateScale(s))).toContain('bands[7].grade');
  });

  it('rejects a lower band with a higher grade point', () => {
    const s = clone(NEB_8_BAND);
    s.bands[2].gpa = 3.9;
    expect(fields(validateScale(s))).toContain('bands[2].gpa');
  });

  it('rejects a passing band below a failing one', () => {
    const s = clone(NEB_8_BAND);
    s.bands[6].isPassing = false; // D fails ...
    // ... while NG below it is still marked failing: fine. Flip NG to passing:
    s.bands[7].isPassing = true;
    expect(fields(validateScale(s))).toContain('bands[7].isPassing');
  });

  it('rejects min >= max, bad numbers, and an out-of-range pass percentage', () => {
    const s = clone(NEB_8_BAND);
    s.bands[0].min = 100;
    s.bands[3].gpa = 'x';
    s.passPercent = 120;
    const f = fields(validateScale(s));
    expect(f).toEqual(expect.arrayContaining(['bands[0].max', 'bands[3].gpa', 'passPercent']));
  });

  it('requires a name and at least one band', () => {
    expect(fields(validateScale({ name: '', passPercent: 35, bands: [] }))).toEqual(['name', 'bands']);
  });
});
