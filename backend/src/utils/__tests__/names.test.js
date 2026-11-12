const { fullName, normalizeMiddleName } = require("../names");

describe("fullName", () => {
  test("joins first, middle and last name", () => {
    expect(fullName({ firstName: "Ram", middleName: "Bahadur", lastName: "Thapa" })).toBe("Ram Bahadur Thapa");
  });

  test("leaves out a missing or empty middle name without a double space", () => {
    expect(fullName({ firstName: "Sita", lastName: "Rai" })).toBe("Sita Rai");
    expect(fullName({ firstName: "Sita", middleName: null, lastName: "Rai" })).toBe("Sita Rai");
    expect(fullName({ firstName: "Sita", middleName: "  ", lastName: "Rai" })).toBe("Sita Rai");
  });

  test("trims each part", () => {
    expect(fullName({ firstName: " Hari ", middleName: " Prasad", lastName: "Sharma " })).toBe("Hari Prasad Sharma");
  });

  test("returns an empty string for nothing", () => {
    expect(fullName(null)).toBe("");
    expect(fullName(undefined)).toBe("");
    expect(fullName({})).toBe("");
  });
});

describe("normalizeMiddleName", () => {
  test("trims a value", () => {
    expect(normalizeMiddleName("  Bahadur ")).toBe("Bahadur");
  });

  test("stores empty, blank, null and non-text values as null", () => {
    expect(normalizeMiddleName("")).toBeNull();
    expect(normalizeMiddleName("   ")).toBeNull();
    expect(normalizeMiddleName(null)).toBeNull();
    expect(normalizeMiddleName(undefined)).toBeNull();
    expect(normalizeMiddleName(42)).toBeNull();
  });
});
