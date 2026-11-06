/**
 * Unit tests for src/utils/dateConverter.js — AD <-> BS (Bikram Sambat).
 *
 * Used on report cards for the student's date of birth
 * (reportCard.controller.js:688, :881, :1219).
 *
 * The expected BS values below were derived from the canonical BS anchor
 * (1943-04-14 AD = 2000-01-01 BS) walked forward through this file's own
 * BS_YEAR_DATA table, and cross-checked against two real-world anchors:
 *   2080-01-01 BS = 2023-04-14 AD  (Nepali New Year 2080)
 *   2081-01-01 BS = 2024-04-13 AD  (Nepali New Year 2081)
 * The table itself reproduces both anchors exactly, so the table is sound and
 * the discrepancies the `test.failing` cases record come from the conversion
 * code, not the data.
 *
 * `jest.config.js` pins TZ=Asia/Kathmandu, because this module's reference
 * point is a LOCAL-midnight Date and the results therefore move with the
 * machine timezone.
 */

const {
  convertADToBS,
  formatADDate,
  getApproxBSYear,
  getCurrentBSDate,
  getDaysInBSMonth,
  getTotalDaysInBSYear,
} = require('../dateConverter');

describe('test environment', () => {
  it('runs with TZ pinned to Asia/Kathmandu by jest.config.js', () => {
    // -345 minutes == UTC+05:45. If this fails, the TZ-sensitive assertions
    // further down are not meaningful on this machine.
    expect(new Date().getTimezoneOffset()).toBe(-345);
  });
});

describe('getDaysInBSMonth', () => {
  it('reads the month length out of the table', () => {
    // BS 2080 = [31,32,31,32,31,30,30,30,29,29,30,30]
    expect(getDaysInBSMonth(2080, 1)).toBe(31); // Baisakh
    expect(getDaysInBSMonth(2080, 2)).toBe(32); // Jestha
    expect(getDaysInBSMonth(2080, 9)).toBe(29); // Poush
    expect(getDaysInBSMonth(2080, 12)).toBe(30); // Chaitra
  });

  it('falls back to 30 for a month number outside 1..12', () => {
    expect(getDaysInBSMonth(2080, 0)).toBe(30);
    expect(getDaysInBSMonth(2080, 13)).toBe(30);
    expect(getDaysInBSMonth(2080, -1)).toBe(30);
  });

  it('falls back to 30 for a BS year outside the 2000-2090 table', () => {
    expect(getDaysInBSMonth(1999, 1)).toBe(30);
    expect(getDaysInBSMonth(2091, 1)).toBe(30);
    expect(getDaysInBSMonth(9999, 1)).toBe(30);
  });
});

describe('getTotalDaysInBSYear', () => {
  it('sums the table row', () => {
    expect(getTotalDaysInBSYear(2000)).toBe(365);
    expect(getTotalDaysInBSYear(2080)).toBe(365);
    expect(getTotalDaysInBSYear(2081)).toBe(366);
  });

  it('covers the whole documented 2000-2090 range with a plausible year length', () => {
    for (let year = 2000; year <= 2090; year++) {
      const days = getTotalDaysInBSYear(year);
      expect(days).toBeGreaterThanOrEqual(364);
      expect(days).toBeLessThanOrEqual(367);
    }
  });

  it('falls back to 365 outside the table instead of throwing', () => {
    expect(getTotalDaysInBSYear(1999)).toBe(365);
    expect(getTotalDaysInBSYear(2091)).toBe(365);
  });
});

describe('convertADToBS — input handling', () => {
  it.each([[null], [undefined], ['']])('returns null for %p', (input) => {
    expect(convertADToBS(input)).toBeNull();
  });

  it.each([['not-a-date'], ['2024-13-45'], ['hello']])(
    'returns null for the unparseable value %p',
    (input) => {
      expect(convertADToBS(input)).toBeNull();
    }
  );

  it('accepts both an ISO string and a Date object', () => {
    expect(convertADToBS('2024-01-01')).not.toBeNull();
    expect(convertADToBS(new Date('2024-01-01'))).toEqual(
      convertADToBS('2024-01-01')
    );
  });

  it('returns year / month / day plus a zero-padded formatted string', () => {
    const result = convertADToBS('2024-01-01');
    expect(result).toEqual({
      year: expect.any(Number),
      month: expect.any(Number),
      day: expect.any(Number),
      formatted: expect.stringMatching(/^\d{4}\/\d{2}\/\d{2}$/),
    });
    expect(result.formatted).toBe(
      `${result.year}/${String(result.month).padStart(2, '0')}/${String(
        result.day
      ).padStart(2, '0')}`
    );
  });

  it('always produces a month in 1..12 and a day in 1..32', () => {
    ['1950-06-15', '1990-02-28', '2005-11-30', '2024-07-16', '2030-03-01'].forEach(
      (iso) => {
        const result = convertADToBS(iso);
        expect(result.month).toBeGreaterThanOrEqual(1);
        expect(result.month).toBeLessThanOrEqual(12);
        expect(result.day).toBeGreaterThanOrEqual(1);
        expect(result.day).toBeLessThanOrEqual(32);
      }
    );
  });
});

describe('convertADToBS — known-good conversions', () => {
  // REGRESSION GUARD: REFERENCE_BS used to be declared as 2000/09/18 for
  // 1944-01-01 AD, but 1944-01-01 AD is 2000/09/17 BS (Poush 17). Every BS
  // date the backend printed was therefore one day late, including the student
  // date of birth on the report card.
  const knownGood = [
    ['1944-01-01', '2000/09/17'], // the module's own reference point
    ['1943-12-31', '2000/09/16'], // one day before the reference point
    ['2000-01-01', '2056/09/17'],
    ['2023-04-14', '2080/01/01'], // Nepali New Year 2080
    ['2024-01-01', '2080/09/16'],
    ['2024-04-13', '2081/01/01'], // Nepali New Year 2081
    ['2026-11-06', '2083/07/21'],
  ];

  it.each(knownGood)('%s AD is %s BS', (adIso, expectedBs) => {
    expect(convertADToBS(adIso).formatted).toBe(expectedBs);
  });

  // Independent cross-check: Baisakh 1 (Nepali New Year) across three decades.
  // These anchors are public knowledge and do not depend on the Poush reasoning
  // above, so they validate the day table as well as the reference point.
  it.each([
    ['1999-04-14', 2056], ['2000-04-13', 2057], ['2001-04-14', 2058],
    ['2010-04-14', 2067], ['2020-04-13', 2077], ['2023-04-14', 2080],
    ['2024-04-13', 2081], ['2025-04-14', 2082], ['2026-04-14', 2083],
  ])('%s AD is Baisakh 1 of %i BS', (adIso, bsYear) => {
    expect(convertADToBS(adIso).formatted).toBe(bsYear + '/01/01');
  });

  it('is at least internally consistent: consecutive AD days are consecutive BS days', () => {
    const a = convertADToBS('2024-07-10');
    const b = convertADToBS('2024-07-11');
    expect(b.day - a.day).toBe(1);
    expect(b.month).toBe(a.month);
    expect(b.year).toBe(a.year);
  });

  it('rolls the BS month over correctly (2081 Baisakh has 31 days)', () => {
    // The last day of Baisakh 2081 is day 31, and the next day is 2081/02/01.
    expect(convertADToBS('2024-05-12').formatted).toBe('2081/01/30');
    expect(convertADToBS('2024-05-13').formatted).toBe('2081/01/31');
    expect(convertADToBS('2024-05-14').formatted).toBe('2081/02/01');
  });
});

describe('convertADToBS — timezone sensitivity', () => {
  // REGRESSION GUARD: REFERENCE_AD used to be `new Date(1944, 0, 1)` -- LOCAL
  // midnight -- while inputs arriving as 'YYYY-MM-DD' or as a Prisma DATE
  // column are UTC midnight. Subtracting and flooring the two made the answer
  // depend on the server timezone and on that zone's historical 1944 offset
  // (Asia/Kathmandu was +05:30 then, +05:45 now -- enough to cross a day
  // boundary). The input's calendar day is now resolved before any arithmetic.
  it('the same calendar day converts identically however it is constructed', () => {
    const fromIsoString = convertADToBS('2024-01-01').formatted;
    const fromLocalMidnight = convertADToBS(new Date(2024, 0, 1)).formatted;
    const fromLocalNoon = convertADToBS(new Date(2024, 0, 1, 12)).formatted;
    expect(fromLocalMidnight).toBe(fromIsoString);
    expect(fromLocalNoon).toBe(fromIsoString);
  });

  it('agrees for a date-only string, a local midnight and a local noon', () => {
    expect(convertADToBS('2024-01-01').formatted).toBe('2080/09/16');
    expect(convertADToBS(new Date(2024, 0, 1)).formatted).toBe('2080/09/16');
    expect(convertADToBS(new Date(2024, 0, 1, 12)).formatted).toBe('2080/09/16');
  });
});

describe('convertADToBS — range boundaries', () => {
  it('handles the first supported AD date (the reference point) without looping', () => {
    const result = convertADToBS('1944-01-01');
    expect(result.year).toBe(2000);
    expect(result.month).toBe(9);
  });

  it('walks backwards for dates before the reference point', () => {
    // 1943-04-14 AD is 2000/01/01 BS, so the day before falls in BS 1999,
    // below the table -- it extrapolates rather than throwing.
    expect(convertADToBS('1943-04-13').formatted).toBe('1999/12/30');
    expect(convertADToBS('1943-12-31').formatted).toBe('2000/09/16');
  });

  it('silently extrapolates below BS 2000, where the table has no data', () => {
    const result = convertADToBS('1930-01-01');
    expect(result).not.toBeNull();
    expect(result.year).toBeLessThan(2000); // no error, no flag -- just wrong
  });

  // The table stops at BS 2090 (~AD 2033/2034). Past that, getDaysInBSMonth
  // silently returns 30 for every month, so the output keeps incrementing but
  // is no longer a real BS date. There is no error and no flag on the result.
  it('does not fail, and does not warn, once past the end of the BS table', () => {
    const inRange = convertADToBS('2030-01-01');
    expect(inRange.year).toBeLessThanOrEqual(2090);

    const outOfRange = convertADToBS('2100-01-01');
    expect(outOfRange).not.toBeNull();
    expect(outOfRange.year).toBeGreaterThan(2090); // silently extrapolated
  });

  it('extrapolates with uniform 30-day months beyond the table', () => {
    // Two dates 30 AD days apart, both past BS 2090, land exactly one
    // "BS month" apart -- the signature of the 30-day fallback.
    const a = convertADToBS('2120-01-01');
    const b = convertADToBS('2120-01-31');
    expect(a.year).toBeGreaterThan(2090);
    expect(b.day).toBe(a.day);
    expect(b.month - a.month === 1 || b.month - a.month === -11).toBe(true);
  });
});

describe('formatADDate', () => {
  it('formats to YYYY/MM/DD with zero padding', () => {
    expect(formatADDate(new Date(2024, 2, 5))).toBe('2024/03/05');
    expect(formatADDate(new Date(2024, 11, 25))).toBe('2024/12/25');
  });

  it.each([[null], [undefined], [''], ['garbage']])('returns null for %p', (input) => {
    expect(formatADDate(input)).toBeNull();
  });

  it('uses local calendar fields, so a UTC-midnight string can shift a day', () => {
    // Documented, not endorsed: TZ is Asia/Kathmandu (UTC+05:45), so
    // 2024-01-01T00:00Z is still 2024-01-01 locally, but the pattern bites
    // for negative-offset zones.
    expect(formatADDate('2024-01-01')).toBe('2024/01/01');
  });
});

describe('getApproxBSYear', () => {
  it('adds the conventional 57 years', () => {
    expect(getApproxBSYear(2024)).toBe(2081);
    expect(getApproxBSYear(2023)).toBe(2080);
    expect(getApproxBSYear(1943)).toBe(2000);
  });

  it('does not validate its input (documented sharp edge)', () => {
    expect(getApproxBSYear(0)).toBe(57);
    // It is a bare `adYear + 57`, so a string argument concatenates.
    expect(getApproxBSYear('abc')).toBe('abc57');
    expect(getApproxBSYear('2024')).toBe('202457');
  });
});

describe('getCurrentBSDate', () => {
  it('returns a usable BS date for today', () => {
    const result = getCurrentBSDate();
    expect(result).not.toBeNull();
    expect(result.year).toBeGreaterThanOrEqual(2080);
    expect(result.month).toBeGreaterThanOrEqual(1);
    expect(result.month).toBeLessThanOrEqual(12);
  });

  it('agrees with convertADToBS(new Date())', () => {
    expect(getCurrentBSDate().year).toBe(convertADToBS(new Date()).year);
  });
});
