/**
 * The browser's date library: conversion against the same reference dates as
 * the server, month grids, typed input, and the page formatters.
 *   npm test
 */
import { describe, test, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as adapter from "../bsDateAdapter";
import { formatBs, formatAd, formatByPrefs, formatSecondary, formatTime, toNepaliDigits, toLatinDigits, weekdayNameOf } from "../dateFormatter";
import { toIsoDate, isDateOnlyValue, parseBsInput, parseAdInput, bsInputProblem, isWithin } from "../dateValidation";
import { monthGrid, viewOf, viewRange, shiftView, switchViewMode, viewTitle, viewSubtitle, weekOf, weekdayOrder, dayOfView, addMonths, itemsByDay, yearOptions } from "../calendarUtils";
import { getDatePrefs, setSchoolDatePrefs, setPersonalDatePrefs, clearPersonalDatePrefs, subscribeDatePrefs } from "../datePrefs";
import { formatDate, formatDateTime, formatRelative, toDateInput, todayAd } from "../../../utils/format";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendCalendar = path.resolve(here, "../../../../../backend/src/utils/calendar");
const reference = JSON.parse(fs.readFileSync(path.join(backendCalendar, "referenceDates.json"), "utf8"));
const gazette = JSON.parse(fs.readFileSync(path.resolve(backendCalendar, "../../data/holidays/2083.json"), "utf8"));

const { adToBs, bsToAd, daysInBsMonth, MIN_AD, MAX_AD } = adapter;
const bs = (year, month, day) => ({ year, month, day });

describe("conversion", () => {
  test.each(reference.pairs)("$ad is $bs", ({ ad, bs: [year, month, day], weekday }) => {
    expect(adToBs(ad)).toEqual({ year, month, day });
    expect(bsToAd({ year, month, day })).toBe(ad);
    expect(adapter.weekdayOf(ad)).toBe(weekday);
  });

  test("every gazette holiday of 2083 falls on the weekday the notice prints", () => {
    for (const h of gazette.holidays) {
      const [year, month, day] = h.bs.split("-").map(Number);
      expect(adapter.bsWeekday({ year, month, day })).toBe(h.weekday);
    }
  });

  test("round trips over the whole supported range", () => {
    let count = 0;
    for (let iso = MIN_AD; iso && iso <= MAX_AD; iso = adapter.addDays(iso, 1)) {
      if (bsToAd(adToBs(iso)) !== iso) throw new Error(`round trip failed at ${iso}`);
      count += 1;
    }
    expect(count).toBe(adapter.diffDays(MIN_AD, MAX_AD) + 1);
    expect([adapter.MIN_BS_YEAR, adapter.MAX_BS_YEAR]).toEqual([1975, 2100]);
  });

  test("nothing outside the range or unreal is converted", () => {
    expect(adToBs("2044-04-13")).toBeNull();
    expect(adToBs("2026-02-30")).toBeNull();
    expect(bsToAd(bs(2083, 8, 30))).toBeNull();
    expect(bsToAd(bs(2101, 1, 1))).toBeNull();
    expect(daysInBsMonth(2083, 13)).toBeNull();
  });

  test("today is the Nepal day, whatever the device clock's zone", () => {
    expect(adapter.todayAd(new Date("2026-04-13T18:14:59Z"))).toBe("2026-04-13");
    expect(adapter.todayAd(new Date("2026-04-13T18:15:00Z"))).toBe("2026-04-14");
    expect(adapter.kathmanduTime(new Date("2026-04-13T18:15:00Z"))).toBe("00:00");
    expect(todayAd()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("reading values", () => {
  test("a calendar day keeps its digits; a timestamp is its Nepal day", () => {
    expect(toIsoDate("2026-04-14")).toBe("2026-04-14");
    expect(toIsoDate("2026-04-14T00:00:00.000Z")).toBe("2026-04-14");
    expect(isDateOnlyValue("2026-04-14T00:00:00.000Z")).toBe(true);
    expect(isDateOnlyValue("2026-04-14T00:00:01.000Z")).toBe(false);
    // 20:00 UTC on the 13th is already the 14th in Nepal.
    expect(toIsoDate("2026-04-13T20:00:00.000Z")).toBe("2026-04-14");
    expect(toIsoDate(new Date("2026-04-13T20:00:00.000Z"))).toBe("2026-04-14");
    expect(toIsoDate("2026-04-14 10:30")).toBe("2026-04-14");
    expect(toIsoDate("2026-02-30")).toBeNull();
    expect(toIsoDate("")).toBeNull();
    expect(toIsoDate(null)).toBeNull();
    expect(toIsoDate("rubbish")).toBeNull();
    expect(toDateInput("2026-04-14T00:00:00.000Z")).toBe("2026-04-14");
    expect(toDateInput(undefined)).toBe("");
  });

  test("typed BS and AD dates", () => {
    expect(parseBsInput("2083-01-15")).toEqual(bs(2083, 1, 15));
    expect(parseBsInput("2083/1/15")).toEqual(bs(2083, 1, 15));
    expect(parseBsInput("२०८३/०१/१५")).toEqual(bs(2083, 1, 15));
    expect(parseBsInput("2083-01-32")).toBeNull();
    expect(parseBsInput("15-01-2083")).toBeNull();
    expect(parseAdInput("2026/4/14")).toBe("2026-04-14");
    expect(parseAdInput("2026-02-30")).toBeNull();
    expect(bsInputProblem("hello")).toMatch(/year-month-day/);
    expect(bsInputProblem("3000-01-01")).toMatch(/between 1975 and 2100/);
    expect(bsInputProblem("2083-13-01")).toMatch(/month/);
    expect(bsInputProblem("2083-08-30")).toMatch(/does not have/);
    expect(isWithin("2026-04-14", "2026-04-14", "2026-04-14")).toBe(true);
    expect(isWithin("2026-04-15", null, "2026-04-14")).toBe(false);
  });
});

describe("formatting", () => {
  test("BS and AD text, both languages and numerals", () => {
    expect(formatBs(bs(2083, 1, 1))).toBe("1 Baisakh 2083");
    expect(formatBs(bs(2083, 1, 1), { language: "ne", numerals: "ne" })).toBe("१ बैशाख २०८३");
    expect(formatBs(bs(2083, 1, 5), { style: "numeric", numerals: "ne" })).toBe("२०८३/०१/०५");
    expect(formatAd("2026-04-14")).toBe("14 Apr 2026");
    expect(toLatinDigits(toNepaliDigits("2083/01/15"))).toBe("2083/01/15");
    expect(weekdayNameOf("2026-04-14")).toBe("Tuesday");
    expect(weekdayNameOf("2026-04-14", "ne")).toBe("मङ्गलबार");
    expect(formatTime("00:05")).toBe("12:05 AM");
    expect(formatTime("13:30")).toBe("1:30 PM");
    expect(formatTime("13:30", "ne")).toBe("१:३० PM");
    expect(formatTime("bad")).toBe("");
  });

  test("the three display choices", () => {
    expect(formatByPrefs("2026-04-14", { calendar: "bs" })).toBe("1 Baisakh 2083");
    expect(formatByPrefs("2026-04-14", { calendar: "ad" })).toBe("14 Apr 2026");
    expect(formatByPrefs("2026-04-14", { calendar: "both" })).toBe("1 Baisakh 2083 (14 Apr 2026)");
    expect(formatByPrefs("2026-04-14", { calendar: "both", language: "ne", numerals: "ne" })).toBe("१ बैशाख २०८३ (१४ अप्रिल २०२६)");
    expect(formatByPrefs("2026-04-14", { calendar: "bs" }, { style: "numeric" })).toBe("2083/01/01");
    expect(formatSecondary("2026-04-14", { calendar: "bs" })).toBe("14 Apr 2026");
    expect(formatSecondary("2026-04-14", { calendar: "ad" })).toBe("1 Baisakh 2083");
    // Outside the BS table the AD date is shown rather than nothing.
    expect(formatByPrefs("1900-01-01", { calendar: "bs" })).toBe("1 Jan 1900");
    expect(formatByPrefs("nope", { calendar: "bs" })).toBe("");
  });
});

describe("preferences and the page formatters", () => {
  beforeEach(() => {
    clearPersonalDatePrefs();
    setSchoolDatePrefs(null);
  });

  test("BS is the default; the school sets defaults; a person's choice wins", () => {
    expect(getDatePrefs()).toMatchObject({ calendar: "bs", language: "en", numerals: "en", weekStartsOn: 0, weeklyHolidayDays: [6] });
    expect(formatDate("2026-04-14T00:00:00.000Z")).toBe("1 Baisakh 2083");

    setSchoolDatePrefs({ defaultCalendar: "both", defaultLanguage: "ne", defaultNumerals: "ne", weeklyHolidayDays: [5, 6], weekStartsOn: 1 });
    expect(getDatePrefs()).toMatchObject({ calendar: "both", language: "ne", weeklyHolidayDays: [5, 6], weekStartsOn: 1 });

    setPersonalDatePrefs({ calendar: "ad", language: "en", numerals: "en" });
    expect(formatDate("2026-04-14")).toBe("14 Apr 2026");
    expect(getDatePrefs().weeklyHolidayDays).toEqual([5, 6]);

    clearPersonalDatePrefs();
    expect(getDatePrefs().calendar).toBe("both");
    setPersonalDatePrefs({ calendar: "nonsense" });
    expect(getDatePrefs().calendar).toBe("both");
  });

  test("subscribers hear a change, and the snapshot is stable between changes", () => {
    let calls = 0;
    const off = subscribeDatePrefs(() => (calls += 1));
    const before = getDatePrefs();
    expect(getDatePrefs()).toBe(before);
    setPersonalDatePrefs({ calendar: "ad" });
    expect(calls).toBe(1);
    expect(getDatePrefs()).not.toBe(before);
    setSchoolDatePrefs(null); // unchanged school defaults: no notification
    expect(calls).toBe(1);
    off();
    setPersonalDatePrefs({ calendar: "bs" });
    expect(calls).toBe(1);
  });

  test("formatDate, formatDateTime and formatRelative", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("", "n/a")).toBe("n/a");
    expect(formatDate("2026-04-14", "—", { calendar: "ad" })).toBe("14 Apr 2026");
    expect(formatDate("2026-04-14", "—", { calendar: "both" })).toBe("1 Baisakh 2083 (14 Apr 2026)");
    // 20:00 UTC on 13 April is 01:45 on 14 April in Nepal: 1 Baisakh.
    expect(formatDateTime("2026-04-13T20:00:00.000Z")).toBe("1 Baisakh 2083, 1:45 AM");
    expect(formatDateTime("2026-04-14T00:00:00.000Z")).toBe("1 Baisakh 2083");
    expect(formatDateTime(undefined)).toBe("—");

    const today = todayAd();
    expect(formatRelative(today)).toBe("today");
    expect(formatRelative(adapter.addDays(today, 1))).toBe("tomorrow");
    expect(formatRelative(adapter.addDays(today, -1))).toBe("yesterday");
    expect(formatRelative(adapter.addDays(today, 5))).toBe("in 5 days");
    expect(formatRelative(adapter.addDays(today, -3))).toBe("3 days ago");
    expect(formatRelative("")).toBe("");
    const date = new Date();
    const stamp = date.getTime();
    formatRelative(date);
    expect(date.getTime()).toBe(stamp); // the caller's Date is not changed
  });
});

describe("month grids", () => {
  const kartik = { mode: "bs", year: 2083, month: 7 };

  test("Kartik 2083 starts on a Sunday and has 30 days", () => {
    const weeks = monthGrid(kartik, 0);
    const days = weeks.flat().filter((c) => c.inMonth);
    expect(days).toHaveLength(30);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0]).toMatchObject({ ad: "2026-10-18", label: 1, altLabel: 18, weekday: 0, inMonth: true });
    expect(days.at(-1)).toMatchObject({ ad: "2026-11-16", label: 30, weekday: 1 });
    expect(weeks).toHaveLength(5);
  });

  test("the grid's Saturdays are the gazette's Saturdays, for every month of 2083", () => {
    for (const [month, published] of Object.entries(gazette.saturdays)) {
      const cells = monthGrid({ mode: "bs", year: 2083, month: Number(month) }, 0).flat().filter((c) => c.inMonth);
      expect(cells.filter((c) => c.weekday === 6).map((c) => c.label)).toEqual(published);
      expect(cells).toHaveLength(daysInBsMonth(2083, Number(month)));
    }
  });

  test("each row starts on the chosen weekday and neighbouring days pad it", () => {
    const sunday = monthGrid({ mode: "bs", year: 2083, month: 1 }, 0); // Baisakh 1 is a Tuesday
    expect(sunday[0].map((c) => c.inMonth)).toEqual([false, false, true, true, true, true, true]);
    expect(sunday[0][0].ad).toBe("2026-04-12");
    expect(sunday.every((w) => w[0].weekday === 0)).toBe(true);
    const monday = monthGrid({ mode: "bs", year: 2083, month: 1 }, 1);
    expect(monday.every((w) => w[0].weekday === 1)).toBe(true);
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  test("AD months work the same way", () => {
    const feb = monthGrid({ mode: "ad", year: 2028, month: 2 }, 0);
    const days = feb.flat().filter((c) => c.inMonth);
    expect(days).toHaveLength(29);
    expect(days[0]).toMatchObject({ ad: "2028-02-01", label: 1 });
    expect(days[0].altLabel).toBe(adToBs("2028-02-01").day);
  });

  test("navigation", () => {
    expect(shiftView(kartik, 1)).toEqual({ mode: "bs", year: 2083, month: 8 });
    expect(shiftView({ mode: "bs", year: 2083, month: 12 }, 1)).toEqual({ mode: "bs", year: 2084, month: 1 });
    expect(shiftView({ mode: "bs", year: 2083, month: 1 }, -1)).toEqual({ mode: "bs", year: 2082, month: 12 });
    expect(shiftView(kartik, 12)).toEqual({ mode: "bs", year: 2084, month: 7 });
    expect(shiftView({ mode: "bs", year: 2100, month: 12 }, 1)).toBeNull();
    expect(shiftView({ mode: "bs", year: 1975, month: 1 }, -1)).toBeNull();
    expect(viewOf("2026-11-15", "bs")).toEqual(kartik);
    expect(viewOf("2026-11-15", "ad")).toEqual({ mode: "ad", year: 2026, month: 11 });
    expect(viewRange(kartik)).toEqual({ from: "2026-10-18", to: "2026-11-16" });
    expect(switchViewMode(kartik, "ad")).toEqual({ mode: "ad", year: 2026, month: 11 });
    expect(switchViewMode(kartik, "bs")).toBe(kartik);
    expect(viewTitle(kartik)).toBe("Kartik 2083");
    expect(viewTitle(kartik, { language: "ne", numerals: "ne" })).toBe("कार्तिक २०८३");
    expect(viewSubtitle(kartik)).toBe("Oct / Nov 2026");
    expect(viewSubtitle({ mode: "bs", year: 2083, month: 9 })).toBe("Dec 2026 / Jan 2027");
    expect(viewSubtitle({ mode: "ad", year: 2026, month: 11 })).toBe("Kartik / Mangsir 2083");
    expect(yearOptions("bs")).toHaveLength(126);
    expect(yearOptions("ad")[0]).toBe(1918);
  });

  test("days and months", () => {
    expect(dayOfView(kartik, 30)).toBe("2026-11-16");
    expect(dayOfView(kartik, 32)).toBe("2026-11-16");
    expect(addMonths(bsToAd(bs(2083, 3, 32)), 1, "bs")).toBe(bsToAd(bs(2083, 4, 31)));
    expect(addMonths("2026-01-31", 1, "ad")).toBe("2026-02-28");
    expect(weekOf("2026-11-15", 0).map((c) => c.ad)).toEqual(["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]);
    expect(weekOf("2026-11-15", 1)[0].ad).toBe("2026-11-09");
  });

  test("items are listed on every day they cover inside the window", () => {
    const items = [
      { key: "a", startDate: "2026-10-17", endDate: "2026-10-19" },
      { key: "b", startDate: "2026-10-19", endDate: "2026-10-19" },
    ];
    const map = itemsByDay(items, "2026-10-18", "2026-11-16");
    expect([...map.keys()]).toEqual(["2026-10-18", "2026-10-19"]);
    expect(map.get("2026-10-19").map((i) => i.key)).toEqual(["a", "b"]);
  });
});
