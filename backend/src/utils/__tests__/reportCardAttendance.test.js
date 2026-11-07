const {
  isValidWorkingDays,
  attendanceWindow,
  attendanceDateFilter,
  tallyAttendance,
  attendanceForCard,
} = require("../reportCardAttendance");

const d = (s) => new Date(`${s}T00:00:00.000Z`);

describe("isValidWorkingDays", () => {
  test.each([1, 70, 366, null])("%p is valid", (v) => {
    expect(isValidWorkingDays(v)).toBe(true);
  });
  test.each([0, -1, 367, 7.5, "70", undefined, NaN])("%p is not", (v) => {
    expect(isValidWorkingDays(v)).toBe(false);
  });
});

describe("attendanceWindow", () => {
  const year = { startDate: d("2026-04-14"), endDate: d("2027-04-13") };

  test("academic year start to exam end", () => {
    expect(attendanceWindow({ startDate: d("2026-08-01"), endDate: d("2026-08-10") }, year)).toEqual({
      from: d("2026-04-14"),
      to: d("2026-08-10"),
    });
  });

  test("exam without an end date uses its start date", () => {
    expect(attendanceWindow({ startDate: d("2026-08-01"), endDate: null }, year).to).toEqual(d("2026-08-01"));
  });

  test("exam without dates uses the academic year end", () => {
    expect(attendanceWindow({}, year).to).toEqual(d("2027-04-13"));
  });

  test("missing year leaves the start open", () => {
    expect(attendanceWindow({ endDate: d("2026-08-10") }, null)).toEqual({ from: null, to: d("2026-08-10") });
  });
});

describe("attendanceDateFilter", () => {
  test("both bounds", () => {
    expect(attendanceDateFilter({ from: d("2026-04-14"), to: d("2026-08-10") })).toEqual({
      gte: d("2026-04-14"),
      lte: d("2026-08-10"),
    });
  });
  test("one bound", () => {
    expect(attendanceDateFilter({ from: null, to: d("2026-08-10") })).toEqual({ lte: d("2026-08-10") });
  });
  test("no bounds means no filter", () => {
    expect(attendanceDateFilter({ from: null, to: null })).toBeUndefined();
  });
});

describe("tallyAttendance", () => {
  test("counts present and late per enrollment; ignores absent and excused", () => {
    const map = tallyAttendance([
      { studentClassId: 1, status: "present", _count: { _all: 58 } },
      { studentClassId: 1, status: "late", _count: { _all: 3 } },
      { studentClassId: 1, status: "absent", _count: { _all: 7 } },
      { studentClassId: 1, status: "excused", _count: { _all: 2 } },
      { studentClassId: 2, status: "present", _count: 40 },
    ]);
    expect(map.get(1)).toEqual({ present: 58, late: 3 });
    expect(map.get(2)).toEqual({ present: 40, late: 0 });
    expect(map.has(3)).toBe(false);
  });

  test("empty input", () => {
    expect(tallyAttendance().size).toBe(0);
  });
});

describe("attendanceForCard", () => {
  const card = { daysPresent: 58, daysLate: 3, totalWorkingDays: 70 };

  test("late counts as present by default (fmt1: 61/70)", () => {
    expect(attendanceForCard(card, { countLateAsPresent: true })).toEqual({
      attendancePresent: 61,
      attendanceTotal: 70,
    });
    expect(attendanceForCard(card, undefined).attendancePresent).toBe(61);
  });

  test("late can be excluded without regenerating", () => {
    expect(attendanceForCard(card, { countLateAsPresent: false }).attendancePresent).toBe(58);
  });

  test("no working days set: present still prints, total is null", () => {
    expect(attendanceForCard({ daysPresent: 10, daysLate: 0, totalWorkingDays: null }, {})).toEqual({
      attendancePresent: 10,
      attendanceTotal: null,
    });
  });

  test("a card generated before attendance existed prints nothing", () => {
    expect(attendanceForCard({ daysPresent: null, totalWorkingDays: null }, {})).toEqual({
      attendancePresent: null,
      attendanceTotal: null,
    });
    expect(attendanceForCard(null, {})).toEqual({ attendancePresent: null, attendanceTotal: null });
  });

  test("zero days present is printed as 0, not blank", () => {
    expect(attendanceForCard({ daysPresent: 0, daysLate: 0, totalWorkingDays: 70 }, {}).attendancePresent).toBe(0);
  });
});
