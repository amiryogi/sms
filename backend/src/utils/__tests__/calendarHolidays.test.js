/**
 * The built-in holiday list, the rows an import previews, and the check on a
 * calendar event sent by a form. No database.
 */
const fs = require("fs");
const path = require("path");
const { adToBs, bsToAd, bsWeekday, daysInBsMonth } = require("../calendar/bsDateAdapter");
const { parseBsDate, datasetRows, customRows, toRow } = require("../calendar/holidayRows");
const { readEventInput } = require("../calendar/eventInput");
const { HOLIDAY_CATEGORIES } = require("../calendar/calendarRules");

const DATA_DIR = path.join(__dirname, "..", "..", "data", "holidays");
const datasets = fs
  .readdirSync(DATA_DIR)
  .filter((f) => /^\d{4}\.json$/.test(f))
  .map((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")));

describe.each(datasets)("holiday list for $bsYear", (dataset) => {
  const rows = datasetRows(dataset);

  test("names its source", () => {
    expect(dataset.source).toBeTruthy();
    expect(dataset.sourceDocument).toBeTruthy();
    expect(rows.length).toBeGreaterThan(0);
  });

  test("every row is a real date in that BS year, with the weekday the notice prints", () => {
    for (const row of rows) {
      expect(row.error).toBeNull();
      expect(row.bsStart.startsWith(`${dataset.bsYear}-`)).toBe(true);
      expect(HOLIDAY_CATEGORIES).toContain(row.category);
      expect(row.endDate >= row.startDate).toBe(true);
    }
    for (const h of dataset.holidays) {
      const [year, month, day] = h.bs.split("-").map(Number);
      expect(bsWeekday({ year, month, day })).toBe(h.weekday);
      if (h.bsEnd) {
        const [y, m, d] = h.bsEnd.split("-").map(Number);
        expect(bsWeekday({ year: y, month: m, day: d })).toBe(h.weekdayEnd);
      }
    }
  });

  test("keys are unique", () => {
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });

  test("the Saturdays the notice lists are the Saturdays of the calendar data", () => {
    if (!dataset.saturdays) return;
    for (const [month, published] of Object.entries(dataset.saturdays)) {
      const found = [];
      for (let day = 1; day <= daysInBsMonth(dataset.bsYear, Number(month)); day += 1) {
        if (bsWeekday({ year: dataset.bsYear, month: Number(month), day }) === 6) found.push(day);
      }
      expect(found).toEqual(published);
    }
  });
});

describe("the 2083 list against dates fixed in the AD calendar", () => {
  const rows = datasetRows(datasets.find((d) => d.bsYear === 2083));
  const ad = (key) => rows.find((r) => r.key === `moha-2083:${key}`).startDate;

  test("holidays the notice also dates in AD convert to exactly that day", () => {
    expect(ad("labour-day")).toBe("2026-05-01");
    expect(ad("disability-day")).toBe("2026-12-03");
    expect(ad("christmas")).toBe("2026-12-25");
    expect(ad("womens-day")).toBe("2027-03-08");
  });

  test("Dashain and Tihar ranges", () => {
    const dashain = rows.find((r) => r.key === "moha-2083:dashain");
    expect([dashain.startDate, dashain.endDate]).toEqual(["2026-10-17", "2026-10-23"]);
    const tihar = rows.find((r) => r.key === "moha-2083:tihar");
    expect([tihar.startDate, tihar.endDate]).toEqual(["2026-11-08", "2026-11-12"]);
  });

  test("holidays limited to a group are not pre-selected", () => {
    const teej = rows.find((r) => r.key === "moha-2083:teej");
    expect(teej).toMatchObject({ recommended: false, category: "LOCAL_HOLIDAY", applicability: "Women employees only" });
    expect(rows.find((r) => r.key === "moha-2083:basanta-panchami").recommended).toBe(true);
  });
});

describe("pasted rows", () => {
  test("BS dates are read in several spellings, including Nepali digits", () => {
    expect(parseBsDate("2083-07-04")).toEqual({ year: 2083, month: 7, day: 4 });
    expect(parseBsDate("2083/7/4")).toEqual({ year: 2083, month: 7, day: 4 });
    expect(parseBsDate("२०८३/०७/०४")).toEqual({ year: 2083, month: 7, day: 4 });
    expect(parseBsDate("2083-08-30")).toBeNull(); // Mangsir 2083 has 29 days
    expect(parseBsDate("04-07-2083")).toBeNull();
    expect(parseBsDate(null)).toBeNull();
  });

  test("the AD date is computed, never taken from the row", () => {
    const [row] = customRows([{ title: "Local fair", bs: "2083-07-04", startDate: "1999-01-01", category: "LOCAL_HOLIDAY" }], 2083);
    expect(row).toMatchObject({ startDate: bsToAd({ year: 2083, month: 7, day: 4 }), endDate: "2026-10-21", category: "LOCAL_HOLIDAY", error: null });
    expect(adToBs(row.startDate)).toEqual({ year: 2083, month: 7, day: 4 });
  });

  test("unusable rows say why", () => {
    const rows = customRows(
      [
        { title: "", bs: "2083-01-01" },
        { title: "No date" },
        { title: "Backwards", bs: "2083-01-05", bsEnd: "2083-01-02" },
        { title: "Odd category", bs: "2083-01-05", category: "EXAMINATION" },
      ],
      2083,
    );
    expect(rows[0].error).toMatch(/name/);
    expect(rows[1].error).toMatch(/BS date/);
    expect(rows[2].error).toMatch(/before/);
    expect(rows[3]).toMatchObject({ error: null, category: "PUBLIC_HOLIDAY" });
    expect(customRows("nope", 2083)).toEqual([]);
  });

  test("a weekday that contradicts the calendar is reported", () => {
    expect(toRow({ title: "X", bs: "2083-01-01", weekday: 2 }, "t", 0).error).toBeNull();
    expect(toRow({ title: "X", bs: "2083-01-01", weekday: 3 }, "t", 0).error).toMatch(/weekday/);
  });
});

describe("event input", () => {
  const ok = { title: " Sports day ", category: "SPORTS_EVENT", startDate: "2026-12-01" };

  test("fills the defaults", () => {
    const { errors, data } = readEventInput(ok);
    expect(errors).toEqual([]);
    expect(data).toMatchObject({
      title: "Sports day",
      startDate: "2026-12-01",
      endDate: "2026-12-01",
      isAllDay: true,
      startTime: null,
      recurrence: "NONE",
      audienceType: "ALL",
      status: "PUBLISHED",
      isActive: true,
      source: null,
    });
  });

  test("keeps source details only for holidays", () => {
    const source = { source: "MoHA", sourceDocument: "Gazette", sourcePublishedDate: "2083-08-15", applicability: "All" };
    expect(readEventInput({ ...ok, ...source }).data.source).toBeNull();
    expect(readEventInput({ ...ok, ...source, category: "PUBLIC_HOLIDAY" }).data).toMatchObject(source);
  });

  test("times are needed only when the event is not all day", () => {
    expect(readEventInput({ ...ok, isAllDay: false }).errors.map((e) => e.field)).toEqual(["startTime"]);
    expect(readEventInput({ ...ok, isAllDay: false, startTime: "10:00", endTime: "09:00" }).errors.map((e) => e.field)).toEqual(["endTime"]);
    const timed = readEventInput({ ...ok, isAllDay: false, startTime: "10:00", endTime: "12:30" });
    expect(timed.errors).toEqual([]);
    expect(timed.data).toMatchObject({ startTime: "10:00", endTime: "12:30" });
    // Overnight: the end time may be earlier when the event ends on a later day.
    expect(readEventInput({ ...ok, endDate: "2026-12-02", isAllDay: false, startTime: "20:00", endTime: "06:00" }).errors).toEqual([]);
    expect(readEventInput({ ...ok, startTime: "10:00" }).data.startTime).toBeNull();
  });

  test("audiences are tidied and checked", () => {
    const cls = readEventInput({ ...ok, audienceType: "CLASS", classTargets: [{ classId: "3", sectionId: 2 }, { classId: 3, sectionId: "2" }, { classId: 4 }] });
    expect(cls.errors).toEqual([]);
    expect(cls.data.classTargets).toEqual([{ classId: 3, sectionId: 2 }, { classId: 4, sectionId: null }]);
    expect(readEventInput({ ...ok, audienceType: "CLASS", classTargets: [{ classId: "abc" }] }).errors[0].field).toBe("classTargets[0]");
    expect(readEventInput({ ...ok, audienceType: "CLASS", classTargets: [{ classId: 1, sectionId: "x" }] }).errors[0].field).toBe("classTargets[0]");
    const roles = readEventInput({ ...ok, audienceType: "ROLE", roles: ["teacher", "TEACHER", " parent "] });
    expect(roles.data.roles).toEqual(["TEACHER", "PARENT"]);
    expect(readEventInput({ ...ok, audienceType: "EVERYONE" }).errors[0].field).toBe("audienceType");
    // Targets sent with an ALL event are dropped.
    expect(readEventInput({ ...ok, classTargets: [{ classId: 3 }], roles: ["TEACHER"] }).data).toMatchObject({ classTargets: [], roles: [] });
  });

  test("dates, repeats and length", () => {
    const fields = (body) => readEventInput(body).errors.map((e) => e.field);
    expect(fields({ ...ok, startDate: "2026-02-30" })).toEqual(["startDate"]);
    expect(fields({ ...ok, startDate: "1900-01-01" })).toEqual(["startDate"]);
    expect(fields({ ...ok, endDate: "2026-11-30" })).toEqual(["endDate"]);
    expect(fields({ ...ok, endDate: "2028-01-01" })).toEqual(["endDate"]);
    expect(fields({ ...ok, endDate: "garbage" })).toEqual(["endDate"]);
    expect(fields({ ...ok, recurrence: "YEARLY_BS", recurrenceUntil: "2026-11-01" })).toEqual(["recurrenceUntil"]);
    expect(readEventInput({ ...ok, recurrence: "NONE", recurrenceUntil: "2027-01-01" }).data.recurrenceUntil).toBeNull();
    expect(readEventInput({ ...ok, recurrence: "WEEKLY", recurrenceUntil: "2027-01-01" }).data.recurrenceUntil).toBe("2027-01-01");
    expect(fields(null)).toEqual(expect.arrayContaining(["title", "category", "startDate"]));
    expect(fields({ ...ok, title: "x".repeat(256) })).toEqual(["title"]);
    expect(fields({ ...ok, status: "LIVE" })).toEqual(["status"]);
  });
});
