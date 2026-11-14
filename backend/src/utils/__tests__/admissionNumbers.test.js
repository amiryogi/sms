const { schoolInitials, admissionPrefix, nextAdmissionNumber } = require("../admissionNumbers");
const { suggestUsername, usernameProblem } = require("../usernames");

describe("schoolInitials", () => {
  test("takes the first letter of each word", () => {
    expect(schoolInitials("Siddhartha Vanasthali Institute")).toBe("SVI");
    expect(schoolInitials("learning secondary school")).toBe("LSS");
    expect(schoolInitials("Shree Vidhya International School")).toBe("SVIS");
  });

  test("skips small words and punctuation", () => {
    expect(schoolInitials("School of the Arts & Science")).toBe("SAS");
    expect(schoolInitials("St. Xavier's School")).toBe("SXS");
  });

  test("a one-word name gives its first three letters", () => {
    expect(schoolInitials("Budhanilkantha")).toBe("BUD");
  });

  test("is never longer than six letters", () => {
    expect(schoolInitials("A B C D E F G H")).toBe("ABCDEF");
  });

  test("falls back to STU when the name gives nothing usable", () => {
    expect(schoolInitials("")).toBe("STU");
    expect(schoolInitials(null)).toBe("STU");
    expect(schoolInitials("X")).toBe("STU");
  });
});

describe("nextAdmissionNumber", () => {
  const prefix = admissionPrefix("Siddhartha Vanasthali Institute");

  test("starts at 0001", () => {
    expect(prefix).toBe("SVI-");
    expect(nextAdmissionNumber([], prefix)).toBe("SVI-0001");
    expect(nextAdmissionNumber(undefined, prefix)).toBe("SVI-0001");
  });

  test("continues after the highest number", () => {
    expect(nextAdmissionNumber(["SVI-0001", "SVI-042", "SVI-007"], prefix)).toBe("SVI-0043");
  });

  test("ignores hand-typed numbers and other shapes", () => {
    expect(nextAdmissionNumber(["STU20240160", "2081/045", "SVI-A1", "SVI-", "SVIS-900", null], prefix)).toBe("SVI-0001");
  });

  test("ignores case and spaces", () => {
    expect(nextAdmissionNumber([" svi-004 "], prefix)).toBe("SVI-0005");
  });

  test("grows past four digits", () => {
    expect(nextAdmissionNumber(["SVI-9999"], prefix)).toBe("SVI-10000");
  });

  test("skips ahead on a retry", () => {
    expect(nextAdmissionNumber(["SVI-0001"], prefix, 2)).toBe("SVI-0004");
  });

  test("a generated number is a valid sign-in name", () => {
    const username = suggestUsername({ kind: "student", admissionNumber: nextAdmissionNumber([], prefix) });
    expect(username).toBe("svi-0001");
    expect(usernameProblem(username)).toBeNull();
  });
});
