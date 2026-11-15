/**
 * The BS/AD date engine (utils/calendar): conversion, validation, formatting,
 * repeating events, calendar settings and working-day rules. No database.
 */
const adapter = require("../calendar/bsDateAdapter");
const { toIsoDate, parseDateOnly, isDateOnly, isWithin, rangeError, toTimeOfDay } = require("../calendar/dateValidation");
const fmt = require("../calendar/dateFormatter");
const { expandOccurrences } = require("../calendar/recurrence");
const { normalizeConfig, validateConfig, DEFAULT_CONFIG } = require("../calendar/calendarConfig");
const { nonWorkingReason, audienceCoversClass, isHolidayCategory } = require("../calendar/calendarRules");
const reference = require("../calendar/referenceDates.json");

const { adToBs, bsToAd, isValidBs, daysInBsMonth, MIN_AD, MAX_AD, MIN_BS_YEAR, MAX_BS_YEAR } = adapter;
const bs = (year, month, day) => ({ year, month, day });

describe("conversion against outside references", () => {
  test.each(reference.pairs)("$ad is $bs ($source)", ({ ad, bs: [year, month, day], weekday }) => {
    expect(adToBs(ad)).toEqual({ year, month, day });
    expect(bsToAd({ year, month, day })).toBe(ad);
    expect(adapter.weekdayOf(ad)).toBe(weekday);
    expect(adapter.bsWeekday({ year, month, day })).toBe(weekday);
  });
});

describe("supported range", () => {
  test("is BS 1975-01-01 to 2100-12-30", () => {
    expect([MIN_BS_YEAR, MAX_BS_YEAR]).toEqual([1975, 2100]);
    expect(adToBs(MIN_AD)).toEqual(bs(1975, 1, 1));
    expect(bsToAd(bs(1975, 1, 1))).toBe("1918-04-13");
    expect(adToBs(MAX_AD)).toEqual(bs(2100, 12, daysInBsMonth(2100, 12)));
    expect(bsToAd(bs(2100, 12, 30))).toBe("2044-04-12");
  });

  test("returns null outside it instead of guessing", () => {
    expect(adToBs("1918-04-12")).toBeNull();
    expect(adToBs("2044-04-13")).toBeNull();
    expect(bsToAd(bs(1974, 12, 30))).toBeNull();
    expect(bsToAd(bs(2101, 1, 1))).toBeNull();
    expect(daysInBsMonth(2101, 1)).toBeNull();
    expect(daysInBsMonth(2083, 13)).toBeNull();
  });
});

describe("round trips over the whole supported range", () => {
  test("AD -> BS -> AD returns the same day, and days are consecutive", () => {
    let previous = null;
    let count = 0;
    for (let iso = MIN_AD; iso && iso <= MAX_AD; iso = adapter.addDays(iso, 1)) {
      const b = adToBs(iso);
      if (bsToAd(b) !== iso) throw new Error(`round trip failed at ${iso}`);
      if (previous) {
        const sameMonth = b.year === previous.year && b.month === previous.month && b.day === previous.day + 1;
        const nextMonth =
          b.day === 1 &&
          previous.day === daysInBsMonth(previous.year, previous.month) &&
          ((b.year === previous.year && b.month === previous.month + 1) ||
            (b.year === previous.year + 1 && b.month === 1 && previous.month === 12));
        if (!sameMonth && !nextMonth) throw new Error(`BS dates are not consecutive at ${iso}`);
      }
      previous = b;
      count += 1;
    }
    expect(count).toBe(adapter.diffDays(MIN_AD, MAX_AD) + 1);
  });

  test("BS -> AD -> BS returns the same day for every day of every month", () => {
    let count = 0;
    for (let year = MIN_BS_YEAR; year <= MAX_BS_YEAR; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const days = daysInBsMonth(year, month);
        expect(days).toBeGreaterThanOrEqual(29);
        expect(days).toBeLessThanOrEqual(32);
        for (let day = 1; day <= days; day += 1) {
          const back = adToBs(bsToAd({ year, month, day }));
          if (!back || back.year !== year || back.month !== month || back.day !== day) {
            throw new Error(`round trip failed at ${year}-${month}-${day}`);
          }
          count += 1;
        }
      }
    }
    expect(count).toBe(adapter.diffDays(MIN_AD, MAX_AD) + 1);
  });
});

describe("month and year boundaries", () => {
  test("month lengths differ from year to year", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => daysInBsMonth(2083, m))).toEqual([31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30]);
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => daysInBsMonth(2081, m))).toEqual([31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31]);
  });

  test("the day after a month's last day is the 1st of the next month", () => {
    const lastOfAsar = bsToAd(bs(2083, 3, 32));
    expect(adToBs(adapter.addDays(lastOfAsar, 1))).toEqual(bs(2083, 4, 1));
    const lastOfChaitra = bsToAd(bs(2082, 12, 30));
    expect(lastOfChaitra).toBe("2026-04-13");
    expect(adToBs(adapter.addDays(lastOfChaitra, 1))).toEqual(bs(2083, 1, 1));
  });

  test("Gregorian leap days convert and come back", () => {
    for (const iso of ["2000-02-29", "2024-02-29", "2028-02-29", "2024-02-28", "2024-03-01"]) {
      expect(bsToAd(adToBs(iso))).toBe(iso);
    }
    expect(adToBs("2024-02-29")).toEqual(bs(2080, 11, 17));
    expect(adapter.diffDays("2024-02-28", "2024-03-01")).toBe(2);
    expect(adapter.diffDays("2023-02-28", "2023-03-01")).toBe(1);
  });

  test("bsMonthRange and bsYearRange give the AD days they cover", () => {
    expect(adapter.bsMonthRange(2083, 7)).toEqual({ from: "2026-10-18", to: "2026-11-16" });
    expect(adapter.bsYearRange(2083)).toEqual({ from: "2026-04-14", to: "2027-04-13" });
    expect(adapter.bsMonthRange(2101, 1)).toBeNull();
  });
});

describe("validation", () => {
  test("rejects BS dates that do not exist", () => {
    expect(isValidBs(bs(2083, 1, 31))).toBe(true);
    expect(isValidBs(bs(2083, 1, 32))).toBe(false);
    expect(isValidBs(bs(2083, 8, 30))).toBe(false); // Mangsir 2083 has 29 days
    expect(isValidBs(bs(2083, 0, 1))).toBe(false);
    expect(isValidBs(bs(2083, 13, 1))).toBe(false);
    expect(isValidBs(bs(2083, 1, 0))).toBe(false);
    expect(isValidBs(bs(2083.5, 1, 1))).toBe(false);
    expect(isValidBs({ year: "2083", month: 1, day: 1 })).toBe(false);
    expect(isValidBs(null)).toBe(false);
    expect(bsToAd(bs(2083, 1, 32))).toBeNull();
  });

  test("rejects AD strings that are not real dates", () => {
    expect(adapter.isIsoDate("2026-04-14")).toBe(true);
    expect(adapter.isIsoDate("2026-02-30")).toBe(false);
    expect(adapter.isIsoDate("2025-02-29")).toBe(false);
    expect(adapter.isIsoDate("2026-4-14")).toBe(false);
    expect(adapter.isIsoDate("2026-04-14T00:00:00Z")).toBe(false);
    expect(adapter.isIsoDate(20260414)).toBe(false);
    expect(adToBs("not a date")).toBeNull();
  });

  test("toIsoDate reads the date's own digits", () => {
    expect(toIsoDate("2026-04-14")).toBe("2026-04-14");
    expect(toIsoDate("2026-04-14T00:00:00.000Z")).toBe("2026-04-14");
    expect(toIsoDate("2026-04-14T23:59:59+05:45")).toBe("2026-04-14");
    expect(toIsoDate(new Date("2026-04-14T00:00:00.000Z"))).toBe("2026-04-14");
    expect(toIsoDate("2026-02-30")).toBeNull();
    expect(toIsoDate("14/04/2026")).toBeNull();
    expect(toIsoDate("2026-04-14x")).toBeNull();
    expect(toIsoDate(undefined)).toBeNull();
    expect(toIsoDate(new Date("nope"))).toBeNull();
  });

  test("parseDateOnly gives UTC midnight of that day, whatever the server timezone", () => {
    expect(process.env.TZ).toBe("Asia/Kathmandu");
    expect(parseDateOnly("2026-04-14").toISOString()).toBe("2026-04-14T00:00:00.000Z");
    expect(parseDateOnly("2026-04-14T10:30:00").toISOString()).toBe("2026-04-14T00:00:00.000Z");
    expect(parseDateOnly("")).toBeNull();
    expect(isDateOnly("2026-04-14")).toBe(true);
    expect(isDateOnly("2026-13-01")).toBe(false);
  });

  test("ranges and times", () => {
    expect(isWithin("2026-04-14", "2026-04-14", "2026-04-14")).toBe(true);
    expect(isWithin("2026-04-13", "2026-04-14", null)).toBe(false);
    expect(isWithin("2026-04-15", null, "2026-04-14")).toBe(false);
    expect(rangeError("2026-04-14", "2026-04-14")).toBeNull();
    expect(rangeError("2026-04-15", "2026-04-14")).toMatch(/before/);
    expect(rangeError("2026-01-01", "2026-12-31", { maxDays: 100 })).toMatch(/100 days/);
    expect(rangeError("x", "2026-12-31")).toMatch(/YYYY-MM-DD/);
    expect(toTimeOfDay("09:30")).toBe("09:30");
    expect(toTimeOfDay("24:00")).toBeNull();
    expect(toTimeOfDay("9:30")).toBeNull();
  });
});

describe("today in Nepal", () => {
  test("uses Kathmandu time, not UTC", () => {
    // 18:15 UTC is 00:00 the next day in Nepal (UTC+5:45).
    expect(adapter.todayAd(new Date("2026-04-13T18:14:59Z"))).toBe("2026-04-13");
    expect(adapter.todayAd(new Date("2026-04-13T18:15:00Z"))).toBe("2026-04-14");
    expect(adapter.todayBs(new Date("2026-04-13T18:15:00Z"))).toEqual(bs(2083, 1, 1));
  });
});

describe("formatting", () => {
  test("BS dates in English and Nepali", () => {
    expect(fmt.formatBs(bs(2083, 1, 1))).toBe("1 Baisakh 2083");
    expect(fmt.formatBs(bs(2083, 1, 1), { language: "ne", numerals: "ne" })).toBe("१ बैशाख २०८३");
    expect(fmt.formatBs(bs(2083, 1, 1), { language: "ne" })).toBe("1 बैशाख 2083");
    expect(fmt.formatBs(bs(2083, 1, 5), { style: "numeric" })).toBe("2083/01/05");
    expect(fmt.formatBs(bs(2083, 1, 5), { style: "numeric", numerals: "ne" })).toBe("२०८३/०१/०५");
    expect(fmt.formatBs(null)).toBe("");
  });

  test("AD dates", () => {
    expect(fmt.formatAd("2026-04-14")).toBe("14 Apr 2026");
    expect(fmt.formatAd("2026-04-14", { style: "numeric" })).toBe("2026-04-14");
    expect(fmt.formatAd("2026-04-14", { numerals: "ne", style: "numeric" })).toBe("२०२६-०४-१४");
    expect(fmt.formatAd("nope")).toBe("");
    expect(fmt.formatAdAsBs("2026-04-14")).toBe("1 Baisakh 2083");
    expect(fmt.formatAdAsBs("1900-01-01")).toBe("");
  });

  test("digits and names", () => {
    expect(fmt.toNepaliDigits("2083/01/15")).toBe("२०८३/०१/१५");
    expect(fmt.toLatinDigits("२०८३/०१/१५")).toBe("2083/01/15");
    expect(fmt.toLatinDigits(fmt.toNepaliDigits("0123456789"))).toBe("0123456789");
    expect(fmt.BS_MONTHS_EN).toHaveLength(12);
    expect(fmt.BS_MONTHS_NE).toHaveLength(12);
    expect(fmt.bsMonthName(7)).toBe("Kartik");
    expect(fmt.bsMonthName(7, "ne")).toBe("कार्तिक");
    expect(fmt.weekdayNameOf("2026-04-14")).toBe("Tuesday");
    expect(fmt.weekdayNameOf("2026-04-14", "ne")).toBe("मङ्गलबार");
    expect(fmt.weekdayNameOf("2026-04-14", "en", true)).toBe("Tue");
  });
});

describe("repeating events", () => {
  const once = { startDate: "2026-04-14", endDate: "2026-04-15", recurrence: "NONE" };

  test("a single event appears when it touches the window", () => {
    expect(expandOccurrences(once, "2026-04-01", "2026-04-30")).toEqual([{ startDate: "2026-04-14", endDate: "2026-04-15" }]);
    expect(expandOccurrences(once, "2026-04-15", "2026-04-30")).toHaveLength(1);
    expect(expandOccurrences(once, "2026-04-16", "2026-04-30")).toEqual([]);
    expect(expandOccurrences(once, "2026-01-01", "2026-04-13")).toEqual([]);
  });

  test("weekly", () => {
    const e = { startDate: "2026-04-17", endDate: "2026-04-17", recurrence: "WEEKLY", recurrenceUntil: "2026-05-08" };
    expect(expandOccurrences(e, "2026-04-01", "2026-06-30").map((o) => o.startDate)).toEqual(["2026-04-17", "2026-04-24", "2026-05-01", "2026-05-08"]);
    expect(expandOccurrences(e, "2026-04-25", "2026-05-01").map((o) => o.startDate)).toEqual(["2026-05-01"]);
  });

  test("yearly on a BS date follows the BS calendar, not the AD one", () => {
    const newYear = { startDate: "2024-04-13", endDate: "2024-04-13", recurrence: "YEARLY_BS" };
    expect(expandOccurrences(newYear, "2024-01-01", "2026-12-31").map((o) => o.startDate)).toEqual(["2024-04-13", "2025-04-14", "2026-04-14"]);
  });

  test("yearly on an AD date", () => {
    const mayDay = { startDate: "2024-05-01", endDate: "2024-05-01", recurrence: "YEARLY_AD" };
    expect(expandOccurrences(mayDay, "2025-01-01", "2026-12-31").map((o) => o.startDate)).toEqual(["2025-05-01", "2026-05-01"]);
    const leap = { startDate: "2024-02-29", endDate: "2024-02-29", recurrence: "YEARLY_AD" };
    expect(expandOccurrences(leap, "2025-01-01", "2028-12-31").map((o) => o.startDate)).toEqual(["2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]);
  });

  test("monthly on a BS day moves to the month's last day when the month is shorter", () => {
    const first = bsToAd(bs(2083, 3, 32)); // Asar 32
    const e = { startDate: first, endDate: first, recurrence: "MONTHLY_BS" };
    const starts = expandOccurrences(e, first, bsToAd(bs(2083, 8, 29))).map((o) => adToBs(o.startDate));
    expect(starts).toEqual([bs(2083, 3, 32), bs(2083, 4, 31), bs(2083, 5, 31), bs(2083, 6, 31), bs(2083, 7, 30), bs(2083, 8, 29)]);
  });

  test("a multi-day occurrence keeps its length and counts when it overlaps the window", () => {
    const e = { startDate: "2026-04-17", endDate: "2026-04-19", recurrence: "WEEKLY" };
    expect(expandOccurrences(e, "2026-04-26", "2026-04-26")).toEqual([{ startDate: "2026-04-24", endDate: "2026-04-26" }]);
  });

  test("bad input gives nothing, and a long rule stops at the range end", () => {
    expect(expandOccurrences({ startDate: "x", recurrence: "NONE" }, "2026-01-01", "2026-12-31")).toEqual([]);
    expect(expandOccurrences(once, "2026-12-31", "2026-01-01")).toEqual([]);
    const forever = { startDate: "2040-01-01", endDate: "2040-01-01", recurrence: "YEARLY_AD" };
    expect(expandOccurrences(forever, "2040-01-01", "2099-12-31").map((o) => o.startDate)).toEqual(["2040-01-01", "2041-01-01", "2042-01-01", "2043-01-01", "2044-01-01"]);
  });
});

describe("calendar settings", () => {
  test("defaults: BS, English, Sunday first, Saturday off, attendance blocked", () => {
    expect(normalizeConfig(null)).toEqual({
      defaultCalendar: "bs",
      defaultLanguage: "en",
      defaultNumerals: "en",
      weekStartsOn: 0,
      weeklyHolidayDays: [6],
      blockAttendanceOnNonWorkingDays: true,
      timezone: "Asia/Kathmandu",
    });
    expect(normalizeConfig("junk")).toEqual(normalizeConfig(null));
    expect(Object.isFrozen(DEFAULT_CONFIG)).toBe(true);
  });

  test("keeps valid values, drops invalid ones, never changes the timezone", () => {
    const out = normalizeConfig({
      defaultCalendar: "both",
      defaultLanguage: "ne",
      defaultNumerals: "xx",
      weekStartsOn: 9,
      weeklyHolidayDays: [6, 5, 5, 12],
      blockAttendanceOnNonWorkingDays: false,
      timezone: "UTC",
    });
    expect(out).toMatchObject({
      defaultCalendar: "both",
      defaultLanguage: "ne",
      defaultNumerals: "en",
      weekStartsOn: 0,
      weeklyHolidayDays: [5, 6],
      blockAttendanceOnNonWorkingDays: false,
      timezone: "Asia/Kathmandu",
    });
    expect(normalizeConfig({ weeklyHolidayDays: [] }).weeklyHolidayDays).toEqual([]);
    expect(normalizeConfig({ weeklyHolidayDays: [0, 1, 2, 3, 4, 5, 6] }).weeklyHolidayDays).toEqual([6]);
  });

  test("validateConfig names each bad field", () => {
    expect(validateConfig({})).toEqual([]);
    expect(validateConfig({ weeklyHolidayDays: [0, 6], defaultCalendar: "ad" })).toEqual([]);
    expect(validateConfig([]).map((e) => e.field)).toEqual(["config"]);
    const fields = validateConfig({
      defaultCalendar: "x",
      defaultLanguage: "x",
      defaultNumerals: "x",
      weekStartsOn: 7,
      weeklyHolidayDays: [0, 1, 2, 3, 4, 5, 6],
      blockAttendanceOnNonWorkingDays: "yes",
    }).map((e) => e.field);
    expect(fields).toEqual(["defaultCalendar", "defaultLanguage", "defaultNumerals", "weekStartsOn", "weeklyHolidayDays", "blockAttendanceOnNonWorkingDays"]);
    expect(validateConfig({ weeklyHolidayDays: "6" })[0].field).toBe("weeklyHolidayDays");
  });
});

describe("working days", () => {
  const config = normalizeConfig(null); // Saturday off
  const schoolHoliday = { title: "Dashain", audienceType: "ALL", audiences: [] };
  const classHoliday = { title: "Grade 5 trip rest day", audienceType: "CLASS", audiences: [{ classId: 5, sectionId: null }] };
  const sectionHoliday = { title: "5B only", audienceType: "CLASS", audiences: [{ classId: 5, sectionId: 2 }] };

  test("the weekly holiday comes from the settings, not from a fixed Saturday", () => {
    expect(nonWorkingReason("2026-11-14", config)).toEqual({ type: "WEEKLY_HOLIDAY", reason: "Saturday is a weekly holiday" });
    expect(nonWorkingReason("2026-11-13", config)).toBeNull();
    const friday = normalizeConfig({ weeklyHolidayDays: [5] });
    expect(nonWorkingReason("2026-11-13", friday).type).toBe("WEEKLY_HOLIDAY");
    expect(nonWorkingReason("2026-11-14", friday)).toBeNull();
    expect(nonWorkingReason("2026-11-14", normalizeConfig({ weeklyHolidayDays: [] }))).toBeNull();
  });

  test("a school-wide holiday closes every class", () => {
    expect(nonWorkingReason("2026-10-21", config, [schoolHoliday])).toEqual({ type: "HOLIDAY", reason: "Holiday: Dashain" });
    expect(nonWorkingReason("2026-10-21", config, [schoolHoliday], { classId: 3, sectionId: 1 }).type).toBe("HOLIDAY");
  });

  test("a class holiday closes only that class or section", () => {
    expect(nonWorkingReason("2026-11-12", config, [classHoliday])).toBeNull();
    expect(nonWorkingReason("2026-11-12", config, [classHoliday], { classId: 5, sectionId: 9 }).type).toBe("HOLIDAY");
    expect(nonWorkingReason("2026-11-12", config, [classHoliday], { classId: 6, sectionId: 9 })).toBeNull();
    expect(nonWorkingReason("2026-11-12", config, [sectionHoliday], { classId: 5, sectionId: 2 }).type).toBe("HOLIDAY");
    expect(nonWorkingReason("2026-11-12", config, [sectionHoliday], { classId: 5, sectionId: 3 })).toBeNull();
  });

  test("a holiday addressed to a role does not close a class", () => {
    expect(audienceCoversClass("ROLE", [{ roleId: 2 }], 5, 1)).toBe(false);
    expect(isHolidayCategory("PUBLIC_HOLIDAY")).toBe(true);
    expect(isHolidayCategory("EXAMINATION")).toBe(false);
  });
});

describe("the old month table (utils/dateConverter.js)", () => {
  // Recorded, not endorsed: the old table disagrees with the verified data in
  // five BS years. See docs/calendar/calendar-implementation-audit.md section 6.
  const { getDaysInBSMonth } = require("../dateConverter");

  test("differs from the verified data only in BS 2062, 2081, 2082, 2083 and 2087", () => {
    const differing = [];
    for (let year = 2000; year <= 2090; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        if (getDaysInBSMonth(year, month) !== daysInBsMonth(year, month)) {
          if (!differing.includes(year)) differing.push(year);
        }
      }
    }
    expect(differing).toEqual([2062, 2081, 2082, 2083, 2087]);
  });
});
