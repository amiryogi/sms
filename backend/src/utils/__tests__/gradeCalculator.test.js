/**
 * Unit tests for src/utils/gradeCalculator.js — the NEB grade scale that the
 * whole marks-entry -> result -> report-card chain depends on.
 *
 * Pure functions, no DB, no Prisma, no Express.
 *
 * The six bugs this file used to pin with `test.failing` (NaN percentage,
 * unclamped percentage, string-concatenated full marks, the invented 100-mark
 * paper, undefined practical fields, "NaN" GPA) were fixed on 2026-11-11; their
 * tests now run as ordinary regression tests.
 */

const {
  GRADE_THRESHOLDS,
  calculateGradeFromPercentage,
  calculateGradeFromMarks,
  calculateSubjectGrade,
  calculateOverallGPA,
  getGradeColor,
  formatGPA,
  getResultStatus,
} = require('../gradeCalculator');

describe('GRADE_THRESHOLDS (the NEB scale itself)', () => {
  it('has the eight NEB bands with the documented grade/GPA pairs', () => {
    expect(GRADE_THRESHOLDS).toHaveLength(8);
    expect(
      GRADE_THRESHOLDS.map((t) => [t.min, t.grade, t.gpa])
    ).toEqual([
      [90, 'A+', 4.0],
      [80, 'A', 3.6],
      [70, 'B+', 3.2],
      [60, 'B', 2.8],
      [50, 'C+', 2.4],
      [40, 'C', 2.0],
      [35, 'D', 1.6],
      [0, 'NG', 0.0],
    ]);
  });

  // REGRESSION GUARD: the bands used to be written as 0-34.99 / 35-39.99 /
  // 40-49.99 ... 80-89.99, leaving a 0.01-wide hole above every band except
  // A+. A percentage landing in a hole (e.g. 89.995, which calculateOverallGPA
  // can produce from an unrounded average) matched no band and fell through to
  // the NG fallback — printing NG for a student who had passed everything.
  // Each band's max must equal the next band's min. Do not reintroduce .99 caps.
  it('bands are contiguous — each band starts where the one below ends', () => {
    const ascending = [...GRADE_THRESHOLDS].reverse();
    for (let i = 0; i < ascending.length - 1; i++) {
      expect(ascending[i].max).toBe(ascending[i + 1].min);
    }
  });
});

describe('calculateGradeFromPercentage — band boundaries', () => {
  const cases = [
    [0, 'NG', 0.0, false],
    [34.99, 'NG', 0.0, false],
    [35, 'D', 1.6, true],
    [39.99, 'D', 1.6, true],
    [40, 'C', 2.0, true],
    [49.99, 'C', 2.0, true],
    [50, 'C+', 2.4, true],
    [59.99, 'C+', 2.4, true],
    [60, 'B', 2.8, true],
    [69.99, 'B', 2.8, true],
    [70, 'B+', 3.2, true],
    [79.99, 'B+', 3.2, true],
    [80, 'A', 3.6, true],
    [89.99, 'A', 3.6, true],
    [90, 'A+', 4.0, true],
    [100, 'A+', 4.0, true],
  ];

  it.each(cases)('%p%% -> %s (GPA %p, passed=%p)', (pct, grade, gpa, isPassed) => {
    const result = calculateGradeFromPercentage(pct);
    expect(result.grade).toBe(grade);
    expect(result.gpa).toBe(gpa);
    expect(result.isPassed).toBe(isPassed);
  });

  it('treats 35 as the pass mark and 34.99 as a fail', () => {
    expect(calculateGradeFromPercentage(34.99).isPassed).toBe(false);
    expect(calculateGradeFromPercentage(35).isPassed).toBe(true);
  });

  it('returns a description for every band', () => {
    expect(calculateGradeFromPercentage(95).description).toBe('Outstanding');
    expect(calculateGradeFromPercentage(85).description).toBe('Excellent');
    expect(calculateGradeFromPercentage(10).description).toBe('Not Graded');
  });
});

describe('calculateGradeFromPercentage — bad and out-of-range input', () => {
  it.each([[null], [undefined], [NaN], ['abc'], [{}]])(
    'returns NG for %p instead of throwing',
    (input) => {
      const result = calculateGradeFromPercentage(input);
      expect(result).toEqual({
        grade: 'NG',
        gpa: 0.0,
        description: 'Not Graded',
        isPassed: false,
      });
    }
  );

  it('accepts a numeric string', () => {
    expect(calculateGradeFromPercentage('85').grade).toBe('A');
  });

  it('clamps above 100 down into A+', () => {
    expect(calculateGradeFromPercentage(105).grade).toBe('A+');
    expect(calculateGradeFromPercentage(1000).grade).toBe('A+');
  });

  it('clamps below 0 up into NG', () => {
    expect(calculateGradeFromPercentage(-5).grade).toBe('NG');
    expect(calculateGradeFromPercentage(-1000).gpa).toBe(0.0);
  });
});

describe('calculateGradeFromPercentage — threshold gaps (KNOWN BUG)', () => {
  // Each of these percentages sits in the 0.01-wide hole between two bands
  // (e.g. 89.99 < 89.995 < 90) and therefore matches no threshold, so the
  // function falls through to its NG fallback and a passing student is
  // reported as Not Graded. Reachable in production through
  // calculateOverallGPA, which feeds an UNROUNDED average percentage in.
  const gaps = [
    [34.995, 'NG'], // this one is genuinely NG, included as the control
    [39.995, 'D'],
    [49.995, 'C'],
    [59.995, 'C+'],
    [69.995, 'B'],
    [79.995, 'B+'],
    [89.995, 'A'],
  ];

  it('the control value really is NG', () => {
    expect(calculateGradeFromPercentage(34.995).grade).toBe('NG');
  });

  it.each(gaps.slice(1))(
    '%p%% falls in the %s band',
    (pct, expectedGrade) => {
      expect(calculateGradeFromPercentage(pct).grade).toBe(expectedGrade);
    }
  );

  it('a passing student with an unrounded average is not graded NG', () => {
    // The exact case that reached the report card: two subjects at 90 and 89.99
    // average to 89.995, which used to return NG while isPassed stayed true.
    const r = calculateGradeFromPercentage(89.995);
    expect(r.grade).toBe('A');
    expect(r.isPassed).toBe(true);
  });
});

describe('calculateGradeFromMarks', () => {
  it('converts marks out of full marks into a percentage and grade', () => {
    expect(calculateGradeFromMarks(80, 100)).toEqual({
      grade: 'A',
      gpa: 3.6,
      description: 'Excellent',
      isPassed: true,
      percentage: 80,
    });
  });

  it('handles the common Nepali 75-mark theory paper', () => {
    const result = calculateGradeFromMarks(60, 75);
    expect(result.percentage).toBe(80);
    expect(result.grade).toBe('A');
  });

  it('rounds the percentage to 2 decimal places', () => {
    expect(calculateGradeFromMarks(10, 75).percentage).toBe(13.33);
    expect(calculateGradeFromMarks(1, 3).percentage).toBe(33.33);
  });

  it('is immune to the 1.2/3 floating point case (40%, not 39.999…)', () => {
    const result = calculateGradeFromMarks(1.2, 3);
    expect(result.percentage).toBe(40);
    expect(result.grade).toBe('C');
  });

  it.each([[0], [-1], [-100], [null], [undefined], [NaN]])(
    'returns the Invalid sentinel when fullMarks is %p',
    (fullMarks) => {
      expect(calculateGradeFromMarks(50, fullMarks)).toEqual({
        grade: 'NG',
        gpa: 0.0,
        description: 'Invalid',
        isPassed: false,
        percentage: 0,
      });
    }
  );

  it('grades 0 marks as NG', () => {
    const result = calculateGradeFromMarks(0, 100);
    expect(result.grade).toBe('NG');
    expect(result.percentage).toBe(0);
    expect(result.isPassed).toBe(false);
  });

  it('grades full marks as A+', () => {
    expect(calculateGradeFromMarks(100, 100).grade).toBe('A+');
    expect(calculateGradeFromMarks(75, 75).grade).toBe('A+');
  });

  // BUG: marksObtained is not validated. parseFloat(null) / parseFloat('abc')
  // is NaN, so `percentage` comes back as NaN and that NaN is spread into the
  // result object that controllers persist / serialise.
  test('should not leak NaN into `percentage` for non-numeric marks', () => {
    expect(calculateGradeFromMarks(null, 100).percentage).toBe(0);
    expect(calculateGradeFromMarks('abc', 100).percentage).toBe(0);
  });

  it('non-numeric marks get the fail grade with a 0 percentage', () => {
    for (const marks of [null, undefined, '', 'abc']) {
      const result = calculateGradeFromMarks(marks, 100);
      expect(result.grade).toBe('NG');
      expect(result.isPassed).toBe(false);
      expect(result.percentage).toBe(0);
    }
  });

  // BUG: the grade is computed from a clamped percentage but the RETURNED
  // percentage is unclamped, so a data-entry slip of 150/100 is reported as
  // "150%" and silently graded A+ rather than rejected.
  test('should clamp the reported percentage to 0..100', () => {
    expect(calculateGradeFromMarks(150, 100).percentage).toBe(100);
    expect(calculateGradeFromMarks(-5, 100).percentage).toBe(0);
  });

  it('the clamped percentage and the grade agree', () => {
    expect(calculateGradeFromMarks(150, 100)).toMatchObject({ percentage: 100, grade: 'A+' });
    expect(calculateGradeFromMarks(-5, 100)).toMatchObject({ percentage: 0, grade: 'NG' });
  });
});

describe('calculateSubjectGrade — theory only', () => {
  it('grades a theory-only subject', () => {
    const result = calculateSubjectGrade({
      theoryMarks: 60,
      theoryFullMarks: 75,
    });
    expect(result.theoryPercentage).toBe(80);
    expect(result.theoryGrade).toBe('A');
    expect(result.totalMarks).toBe(60);
    expect(result.totalFullMarks).toBe(75);
    expect(result.finalPercentage).toBe(80);
    expect(result.finalGrade).toBe('A');
    expect(result.finalGpa).toBe(3.6);
    expect(result.isPassed).toBe(true);
    expect(result.isAbsent).toBe(false);
  });

  it('nulls out every practical field when hasPractical is false', () => {
    const result = calculateSubjectGrade({ theoryMarks: 60, theoryFullMarks: 75 });
    expect(result.practicalMarks).toBeNull();
    expect(result.practicalFullMarks).toBeNull();
    expect(result.practicalPercentage).toBeNull();
    expect(result.practicalGrade).toBeNull();
    expect(result.practicalGpa).toBeNull();
  });

  it('fails the subject and says so when theory is below 35%', () => {
    const result = calculateSubjectGrade({ theoryMarks: 20, theoryFullMarks: 75 });
    expect(result.theoryPercentage).toBe(26.67);
    expect(result.isPassed).toBe(false);
    expect(result.finalGrade).toBe('NG');
    expect(result.finalGpa).toBe(0);
    expect(result.remark).toBe('Theory Failed');
  });

  it('passes a subject sitting exactly on the 35% pass mark', () => {
    const result = calculateSubjectGrade({ theoryMarks: 35, theoryFullMarks: 100 });
    expect(result.isPassed).toBe(true);
    expect(result.finalGrade).toBe('D');
    expect(result.remark).toBe('Partially Acceptable');
  });
});

describe('calculateSubjectGrade — theory + practical (Nepal component rule)', () => {
  const base = {
    theoryFullMarks: 75,
    practicalFullMarks: 25,
    hasPractical: true,
  };

  it('combines theory and practical into one final grade', () => {
    const result = calculateSubjectGrade({
      ...base,
      theoryMarks: 60,
      practicalMarks: 20,
    });
    expect(result.totalMarks).toBe(80);
    expect(result.totalFullMarks).toBe(100);
    expect(result.finalPercentage).toBe(80);
    expect(result.finalGrade).toBe('A');
    expect(result.practicalPercentage).toBe(80);
    expect(result.practicalGrade).toBe('A');
    expect(result.isPassed).toBe(true);
  });

  it('fails the whole subject when only theory is below 35%, even if the total is high', () => {
    const result = calculateSubjectGrade({
      ...base,
      theoryMarks: 10,
      practicalMarks: 25,
    });
    expect(result.finalPercentage).toBe(35);
    expect(result.finalGrade).toBe('NG');
    expect(result.finalGpa).toBe(0);
    expect(result.isPassed).toBe(false);
    expect(result.remark).toBe('Theory Failed');
  });

  it('fails the whole subject when only practical is below 35%', () => {
    const result = calculateSubjectGrade({
      ...base,
      theoryMarks: 70,
      practicalMarks: 5,
    });
    expect(result.finalPercentage).toBe(75); // 75% overall...
    expect(result.theoryGrade).toBe('A+'); // ...theory was excellent...
    expect(result.finalGrade).toBe('NG'); // ...but the subject still fails
    expect(result.isPassed).toBe(false);
    expect(result.remark).toBe('Practical Failed');
  });

  it('reports Practical Failed when both components fail (practical check runs last)', () => {
    const result = calculateSubjectGrade({
      ...base,
      theoryMarks: 5,
      practicalMarks: 1,
    });
    expect(result.isPassed).toBe(false);
    expect(result.remark).toBe('Practical Failed');
  });

  it('accepts numeric strings for marks', () => {
    const result = calculateSubjectGrade({
      theoryMarks: '60',
      theoryFullMarks: 75,
      practicalMarks: '20',
      practicalFullMarks: 25,
      hasPractical: true,
    });
    expect(result.totalMarks).toBe(80);
    expect(result.finalGrade).toBe('A');
  });
});

describe('calculateSubjectGrade — absent', () => {
  it('returns the AB sentinel and ignores any marks passed in', () => {
    const result = calculateSubjectGrade({
      theoryMarks: 60,
      theoryFullMarks: 75,
      isAbsent: true,
    });
    expect(result.isAbsent).toBe(true);
    expect(result.theoryMarks).toBe(0);
    expect(result.theoryGrade).toBe('AB');
    expect(result.finalGrade).toBe('AB');
    expect(result.finalGpa).toBe(0);
    expect(result.isPassed).toBe(false);
    expect(result.remark).toBe('Absent');
  });

  it('marks the practical as AB too when the subject has one', () => {
    const result = calculateSubjectGrade({
      theoryFullMarks: 75,
      practicalFullMarks: 25,
      hasPractical: true,
      isAbsent: true,
    });
    expect(result.practicalGrade).toBe('AB');
    expect(result.practicalGpa).toBe(0);
    expect(result.totalFullMarks).toBe(100);
  });

  // BUG: the absent branch adds the RAW arguments
  // (`theoryFullMarks + practicalFullMarks`) instead of parsed numbers, so
  // string inputs — which is what express-validator / req.body hand over —
  // get string-concatenated. '75' + '25' === '7525'.
  test('should add string full marks numerically for an absent student', () => {
    const result = calculateSubjectGrade({
      theoryFullMarks: '75',
      practicalFullMarks: '25',
      hasPractical: true,
      isAbsent: true,
    });
    expect(result.totalFullMarks).toBe(100);
  });

  it('an absent student gets numeric full marks back, whatever type came in', () => {
    const result = calculateSubjectGrade({
      theoryFullMarks: '75',
      practicalFullMarks: '25',
      hasPractical: true,
      isAbsent: true,
    });
    expect(result.theoryFullMarks).toBe(75);
    expect(result.practicalFullMarks).toBe(25);
    expect(calculateSubjectGrade({ theoryFullMarks: '100', practicalFullMarks: '25', isAbsent: true }).totalFullMarks).toBe(100);
  });
});

describe('calculateSubjectGrade — degenerate full marks', () => {
  // BUG: `parseFloat(theoryFullMarks) || 100` turns a full-marks value of 0
  // (or undefined, or NaN) into 100. A subject configured with 0 full marks is
  // silently graded out of 100 instead of being rejected.
  test('should not invent a 100-mark paper when theoryFullMarks is 0', () => {
    const result = calculateSubjectGrade({ theoryMarks: 40, theoryFullMarks: 0 });
    expect(result.theoryFullMarks).not.toBe(100);
  });

  it('zero or junk theory full marks fail the subject as invalid', () => {
    for (const full of [0, '0', 'abc']) {
      const result = calculateSubjectGrade({ theoryMarks: 40, theoryFullMarks: full });
      expect(result.theoryFullMarks).toBe(0);
      expect(result.theoryPercentage).toBe(0);
      expect(result.finalGrade).toBe('NG');
      expect(result.isPassed).toBe(false);
      expect(result.remark).toBe('Invalid full marks');
    }
  });

  it('full marks default to 100 only when the caller gives none', () => {
    const result = calculateSubjectGrade({ theoryMarks: 40 });
    expect(result.theoryFullMarks).toBe(100);
    expect(result.finalGrade).toBe('C');
  });

  it('negative theory full marks produce a 0% / NG result rather than throwing', () => {
    const result = calculateSubjectGrade({ theoryMarks: 40, theoryFullMarks: -50 });
    expect(result.theoryPercentage).toBe(0);
    expect(result.finalGrade).toBe('NG');
    expect(result.isPassed).toBe(false);
  });

  // BUG: when hasPractical is true but practicalFullMarks is 0, practicalResult
  // stays null, so practicalGrade/practicalGpa come back as `undefined`
  // (every other no-practical path uses null) while practicalPercentage is
  // reported as 0 — three fields disagreeing about the same thing.
  test('practical fields should be null, not undefined, when practicalFullMarks is 0', () => {
    const result = calculateSubjectGrade({
      theoryMarks: 70,
      theoryFullMarks: 100,
      hasPractical: true,
      practicalFullMarks: 0,
    });
    expect(result.practicalGrade).toBeNull();
    expect(result.practicalGpa).toBeNull();
  });

  it('a practical with 0 full marks is not graded and does not fail the subject', () => {
    const result = calculateSubjectGrade({
      theoryMarks: 70,
      theoryFullMarks: 100,
      hasPractical: true,
      practicalFullMarks: 0,
    });
    expect(result.practicalPercentage).toBeNull();
    expect(result.practicalFullMarks).toBe(0);
    expect(result.isPassed).toBe(true);
    expect(result.finalGrade).toBe('B+');
  });
});

describe('calculateOverallGPA', () => {
  const subject = (finalGpa, finalPercentage, isPassed = true, creditHours) => ({
    finalGpa,
    finalPercentage,
    isPassed,
    ...(creditHours === undefined ? {} : { creditHours }),
  });

  it.each([[[]], [null], [undefined]])('returns the empty result for %p', (input) => {
    expect(calculateOverallGPA(input)).toEqual({
      gpa: 0,
      grade: 'NG',
      isPassed: false,
      totalSubjects: 0,
      passedSubjects: 0,
      failedSubjects: 0,
      averagePercentage: 0,
      totalCredits: 0,
    });
  });

  it('averages subject GPAs for K-10 (no credit weighting)', () => {
    const result = calculateOverallGPA([
      subject(4.0, 95),
      subject(3.2, 75),
    ]);
    expect(result.gpa).toBe(3.6);
    expect(result.averagePercentage).toBe(85);
    expect(result.grade).toBe('A');
    expect(result.isPassed).toBe(true);
    expect(result.totalSubjects).toBe(2);
    expect(result.passedSubjects).toBe(2);
    expect(result.failedSubjects).toBe(0);
  });

  it('fails the whole result if any single subject failed (Nepal NG rule)', () => {
    const result = calculateOverallGPA([
      subject(4.0, 95),
      subject(0, 20, false),
    ]);
    expect(result.isPassed).toBe(false);
    expect(result.grade).toBe('NG');
    expect(result.failedSubjects).toBe(1);
    expect(result.gpa).toBe(2); // the numeric GPA is still averaged
  });

  it('defaults a subject to 3 credit hours', () => {
    expect(calculateOverallGPA([subject(4.0, 95)]).totalCredits).toBe(3);
    expect(calculateOverallGPA([subject(4.0, 95), subject(4.0, 95)]).totalCredits).toBe(6);
  });

  it('credit-weights the GPA when asked', () => {
    const result = calculateOverallGPA(
      [subject(4.0, 95, true, 5), subject(2.0, 45, true, 1)],
      { useCreditWeighting: true }
    );
    // (4.0*5 + 2.0*1) / 6 = 3.666… -> 3.67
    expect(result.gpa).toBe(3.67);
    expect(result.totalCredits).toBe(6);
  });

  it('ignores credit weighting by default even when creditHours are present', () => {
    const result = calculateOverallGPA([
      subject(4.0, 95, true, 5),
      subject(2.0, 45, true, 1),
    ]);
    expect(result.gpa).toBe(3); // plain average
  });

  it('rounds the GPA to 2 decimals and the average percentage to 2 decimals', () => {
    const result = calculateOverallGPA([
      subject(4.0, 90),
      subject(3.6, 80),
      subject(3.2, 70.555),
    ]);
    expect(result.gpa).toBe(3.6);
    expect(result.averagePercentage).toBe(80.19);
  });

  it('treats a 0 GPA across the board as a fail', () => {
    const result = calculateOverallGPA([subject(0, 0, true)]);
    expect(result.gpa).toBe(0);
    expect(result.isPassed).toBe(false); // roundedGpa > 0 is required
  });

  // REGRESSION GUARD (this is the bug that actually reached a report card):
  // the display grade is derived from the UNROUNDED average percentage, which
  // used to land in one of the GRADE_THRESHOLDS gaps. Two subjects at 90% and
  // 89.99% average to 89.995%, which matched no band, so a student who had
  // passed everything with a 3.8 GPA was shown grade "NG".
  it('a passing student is never shown grade NG', () => {
    const result = calculateOverallGPA([subject(4.0, 90), subject(3.6, 89.99)]);
    expect(result.isPassed).toBe(true);
    expect(result.grade).not.toBe('NG');
  });

  it('grades the unrounded 89.995% average as A, not NG', () => {
    const result = calculateOverallGPA([subject(4.0, 90), subject(3.6, 89.99)]);
    expect(result.isPassed).toBe(true);
    expect(result.gpa).toBe(3.8);
    expect(result.grade).toBe('A');
  });
});

describe('getGradeColor', () => {
  it('returns a bg/text pair for every grade in the scale plus AB', () => {
    ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'NG', 'AB'].forEach((grade) => {
      const color = getGradeColor(grade);
      expect(color).toEqual({
        bg: expect.stringMatching(/^#[0-9a-f]{6}$/),
        text: expect.stringMatching(/^#[0-9a-f]{6}$/),
      });
    });
  });

  it('falls back to the NG colour for an unknown grade', () => {
    expect(getGradeColor('Z')).toEqual(getGradeColor('NG'));
    expect(getGradeColor(undefined)).toEqual(getGradeColor('NG'));
  });
});

describe('formatGPA', () => {
  it.each([
    [4, '4.00'],
    [3.456, '3.46'],
    [0, '0.00'],
    ['2', '2.00'],
    [null, '0.00'],
    [undefined, '0.00'],
  ])('formats %p as %p', (input, expected) => {
    expect(formatGPA(input)).toBe(expected);
  });

  // BUG: only null/undefined are guarded, so a non-numeric value renders the
  // literal string "NaN" onto the report card.
  test('should render 0.00 rather than "NaN" for a non-numeric GPA', () => {
    expect(formatGPA('abc')).toBe('0.00');
  });

  it('never renders "NaN"', () => {
    for (const input of ['abc', NaN, '', {}]) expect(formatGPA(input)).toBe('0.00');
  });
});

describe('getResultStatus', () => {
  it('maps the boolean to the printed status', () => {
    expect(getResultStatus(true)).toBe('PASSED');
    expect(getResultStatus(false)).toBe('FAILED');
    expect(getResultStatus(undefined)).toBe('FAILED');
  });
});
