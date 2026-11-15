/**
 * The mobile BS converter must give exactly the backend's answers: these cases
 * are copied from backend/src/utils/__tests__/dateConverter.test.js.
 */
import { BS_YEAR_DATA } from "@/utils/bsCalendarData";
import {
  adToBs,
  bsToAd,
  formatBs,
  getDaysInBsMonth,
  getTotalDaysInBsYear,
  isValidBsDate,
  kathmanduToday,
} from "@/utils/nepaliDate";

describe("test environment", () => {
  it("runs with TZ pinned to Asia/Kathmandu", () => {
    expect(new Date().getTimezoneOffset()).toBe(-345);
  });
});

describe("table", () => {
  it("covers BS 2000-2090 with plausible year lengths", () => {
    for (let y = 2000; y <= 2090; y += 1) {
      expect(BS_YEAR_DATA[y]).toHaveLength(12);
      expect(getTotalDaysInBsYear(y)).toBeGreaterThanOrEqual(364);
      expect(getTotalDaysInBsYear(y)).toBeLessThanOrEqual(367);
    }
  });

  it("reads month lengths and falls back like the backend", () => {
    expect(getDaysInBsMonth(2080, 1)).toBe(31);
    expect(getDaysInBsMonth(2080, 2)).toBe(32);
    expect(getDaysInBsMonth(2080, 9)).toBe(29);
    expect(getDaysInBsMonth(2080, 13)).toBe(30);
    expect(getDaysInBsMonth(2091, 1)).toBe(30);
    expect(getTotalDaysInBsYear(2081)).toBe(366);
    expect(getTotalDaysInBsYear(1999)).toBe(365);
  });
});

describe("adToBs", () => {
  it.each([
    ["1944-01-01", "2000/09/17"],
    ["1943-12-31", "2000/09/16"],
    ["2000-01-01", "2056/09/17"],
    ["2023-04-14", "2080/01/01"],
    ["2024-01-01", "2080/09/16"],
    ["2024-04-13", "2081/01/01"],
    ["2026-11-06", "2083/07/21"],
  ])("%s AD is %s BS", (ad, bs) => {
    expect(adToBs(ad)?.formatted).toBe(bs);
  });

  it.each([
    ["1999-04-14", 2056],
    ["2000-04-13", 2057],
    ["2010-04-14", 2067],
    ["2020-04-13", 2077],
    ["2025-04-14", 2082],
    ["2026-04-14", 2083],
  ])("%s AD is Baisakh 1 of %i BS", (ad, year) => {
    expect(adToBs(ad)?.formatted).toBe(`${year}/01/01`);
  });

  it("rolls the month over (2081 Baisakh has 31 days)", () => {
    expect(adToBs("2024-05-13")?.formatted).toBe("2081/01/31");
    expect(adToBs("2024-05-14")?.formatted).toBe("2081/02/01");
  });

  it("treats a UTC-midnight API date as that calendar day, and a timestamp as the local day", () => {
    expect(adToBs("2024-01-01T00:00:00.000Z")?.formatted).toBe("2080/09/16");
    expect(adToBs(new Date(2024, 0, 1, 12))?.formatted).toBe("2080/09/16");
    // 20:00 UTC on 31 Dec is 01:45 on 1 Jan in Kathmandu.
    expect(adToBs("2023-12-31T20:00:00.000Z")?.formatted).toBe("2080/09/16");
  });

  it("walks backwards before the reference point", () => {
    expect(adToBs("1943-04-13")?.formatted).toBe("1999/12/30");
  });

  it.each([null, undefined, "", "not a date"])("returns null for %p", (v) => {
    expect(adToBs(v as never)).toBeNull();
  });
});

describe("bsToAd", () => {
  it("inverts the known dates", () => {
    expect(bsToAd(2080, 1, 1)).toBe("2023-04-14");
    expect(bsToAd(2081, 1, 1)).toBe("2024-04-13");
    expect(bsToAd(2083, 7, 21)).toBe("2026-11-06");
    expect(bsToAd(2000, 9, 17)).toBe("1944-01-01");
  });

  it("round-trips every day of 2079-2084", () => {
    let ad = new Date(Date.UTC(2022, 3, 14));
    const end = Date.UTC(2028, 3, 1);
    while (ad.getTime() < end) {
      const iso = ad.toISOString().slice(0, 10);
      const bs = adToBs(iso)!;
      expect(bsToAd(bs.year, bs.month, bs.day)).toBe(iso);
      ad = new Date(ad.getTime() + 86400000);
    }
  });

  it("refuses days that do not exist", () => {
    expect(isValidBsDate(2080, 9, 30)).toBe(false); // Poush 2080 has 29 days
    expect(bsToAd(2080, 9, 30)).toBeNull();
    expect(bsToAd(2080, 13, 1)).toBeNull();
    expect(bsToAd(2091, 1, 1)).toBeNull();
  });
});

describe("display helpers", () => {
  it("formats a BS date with the month name", () => {
    expect(formatBs("2026-11-06")).toBe("21 Kartik 2083");
    expect(formatBs(null)).toBe("—");
  });

  it("gives today in Nepal whatever the clock's timezone", () => {
    expect(kathmanduToday(new Date("2026-11-12T18:30:00.000Z"))).toBe("2026-11-13"); // 00:15 NPT
    expect(kathmanduToday(new Date("2026-11-12T18:00:00.000Z"))).toBe("2026-11-12"); // 23:45 NPT
  });
});
