import { formatAd, formatDate, formatMoney, formatNumber, formatPercent, formatRelativeDay, fullName, initials } from "@/utils/format";
import { resolveAssetUrl } from "@/utils/assets";
import { areasFor, canOpenArea, hasRole, homeAreaFor } from "@/utils/roles";

describe("fullName", () => {
  it("joins first, middle and last, skipping blanks", () => {
    expect(fullName({ firstName: "Ram", middleName: "Bahadur", lastName: "Thapa" })).toBe("Ram Bahadur Thapa");
    expect(fullName({ firstName: "Sita", middleName: null, lastName: "Rai" })).toBe("Sita Rai");
    expect(fullName({ firstName: " Sita ", middleName: "  ", lastName: "Rai" })).toBe("Sita Rai");
    expect(fullName({ user: { firstName: "Hari", lastName: "KC" } })).toBe("Hari KC");
    expect(fullName(null)).toBe("");
  });

  it("makes two-letter initials", () => {
    expect(initials("Ram Bahadur Thapa")).toBe("RT");
    expect(initials("Sita")).toBe("S");
  });
});

describe("money", () => {
  it("uses Rs. and Indian grouping", () => {
    expect(formatMoney(12500)).toBe("Rs. 12,500");
    expect(formatMoney(1234567.5)).toBe("Rs. 12,34,567.50");
    expect(formatMoney("999")).toBe("Rs. 999");
    expect(formatMoney(-2500)).toBe("-Rs. 2,500");
    expect(formatMoney(0)).toBe("Rs. 0");
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney("abc")).toBe("—");
  });

  it("formats plain numbers and percentages", () => {
    expect(formatNumber(1234567)).toBe("12,34,567");
    expect(formatPercent("92.456")).toBe("92.5%");
    expect(formatPercent(100, 0)).toBe("100%");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("dates", () => {
  it("keeps a date-only API value on its calendar day", () => {
    expect(formatAd("2026-11-13T00:00:00.000Z")).toBe("13 Nov 2026");
    expect(formatDate("2026-11-06T00:00:00.000Z")).toBe("21 Kartik 2083 (6 Nov 2026)");
    expect(formatDate("2026-11-06T00:00:00.000Z", "bs")).toBe("21 Kartik 2083");
    expect(formatDate(undefined)).toBe("—");
  });

  it("describes days relative to now", () => {
    const now = new Date(2026, 10, 13, 9, 0);
    expect(formatRelativeDay("2026-11-13T00:00:00.000Z", now)).toBe("today");
    expect(formatRelativeDay("2026-11-14T00:00:00.000Z", now)).toBe("tomorrow");
    expect(formatRelativeDay("2026-11-10T00:00:00.000Z", now)).toBe("3 days ago");
  });
});

describe("assets", () => {
  it("joins relative upload paths to the API origin and keeps absolute URLs", () => {
    expect(resolveAssetUrl("uploads/logo.png", "https://api.test")).toBe("https://api.test/uploads/logo.png");
    expect(resolveAssetUrl("/uploads/a.png", "https://api.test")).toBe("https://api.test/uploads/a.png");
    expect(resolveAssetUrl("uploads\\a.png", "https://api.test")).toBe("https://api.test/uploads/a.png");
    expect(resolveAssetUrl("https://res.cloudinary.com/x.png", "https://api.test")).toBe("https://res.cloudinary.com/x.png");
    expect(resolveAssetUrl(null)).toBeNull();
  });
});

describe("roles", () => {
  it("treats a super admin as an admin", () => {
    expect(hasRole(["SUPER_ADMIN"], "ADMIN")).toBe(true);
    expect(hasRole(["ADMIN"], "SUPER_ADMIN")).toBe(false);
    expect(hasRole(["TEACHER"], "ADMIN")).toBe(false);
  });

  it.each([
    [["STUDENT"], "student"],
    [["PARENT"], "parent"],
    [["TEACHER"], "teacher"],
    [["EXAM_OFFICER"], "exam"],
    [["ACCOUNTANT"], "finance"],
    [["ADMIN"], "admin"],
    [["SUPER_ADMIN"], "admin"],
    [["TEACHER", "PARENT"], "teacher"],
    [["UNKNOWN"], null],
    [[], null],
  ])("roles %j open on %s", (roles, area) => {
    expect(homeAreaFor(roles as string[])).toBe(area);
  });

  it("lists every area a multi-role user may open, and no others", () => {
    expect(areasFor(["PARENT", "TEACHER"])).toEqual(["teacher", "parent"]);
    expect(canOpenArea(["PARENT"], "student")).toBe(false);
    expect(canOpenArea(["STUDENT"], "parent")).toBe(false);
    expect(canOpenArea(["TEACHER"], "admin")).toBe(false);
  });
});
