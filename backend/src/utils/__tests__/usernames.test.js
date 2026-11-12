const { normalizeUsername, usernameProblem, suggestUsername, uniqueUsername, parseIdentifier } = require("../usernames");

describe("normalizeUsername / usernameProblem", () => {
  test("trims and lower-cases", () => {
    expect(normalizeUsername("  STU20240001 ")).toBe("stu20240001");
    expect(normalizeUsername("")).toBeNull();
    expect(normalizeUsername(null)).toBeNull();
  });

  test("accepts letters, digits, dot, dash and underscore", () => {
    for (const ok of ["stu20240001", "p.stu20240001", "ram.thapa", "teacher_1", "a-b", "Ram.Thapa"]) expect(usernameProblem(ok)).toBeNull();
  });

  test("refuses empty, too short, too long, spaces, @ and a leading dot", () => {
    expect(usernameProblem("")).toMatch(/required/);
    expect(usernameProblem("ab")).toMatch(/3 to 50/);
    expect(usernameProblem("a".repeat(51))).toMatch(/3 to 50/);
    expect(usernameProblem("ram thapa")).toMatch(/letters/);
    expect(usernameProblem("ram@school")).toMatch(/letters/);
    expect(usernameProblem(".ram")).toMatch(/letters/);
  });
});

describe("suggestUsername", () => {
  test("a student gets the admission number", () => {
    expect(suggestUsername({ kind: "student", admissionNumber: "STU20240001" })).toBe("stu20240001");
    expect(suggestUsername({ kind: "student", admissionNumber: "2081/045" })).toBe("2081045");
  });

  test("a parent gets p. and the child's admission number", () => {
    expect(suggestUsername({ kind: "parent", childAdmissionNumber: "STU20240001" })).toBe("p.stu20240001");
  });

  test("staff get the email's first part, else first.last", () => {
    expect(suggestUsername({ kind: "staff", email: "Teacher1@svi.edu.np" })).toBe("teacher1");
    expect(suggestUsername({ kind: "staff", firstName: "Ram Bahadur", lastName: "Thapa" })).toBe("ram.bahadur.thapa");
  });

  test("always valid, even from odd input", () => {
    for (const s of [
      suggestUsername({ kind: "staff", firstName: "Ö" }),
      suggestUsername({ kind: "staff" }),
      suggestUsername({ kind: "student", admissionNumber: "#" }),
      suggestUsername({ kind: "staff", firstName: "Āshā", lastName: "Śrestha" }),
    ]) {
      expect(usernameProblem(s)).toBeNull();
    }
  });
});

describe("uniqueUsername", () => {
  const dbWith = (names) => ({ user: { findMany: async () => names.map((username) => ({ username })) } });

  test("keeps a free name and numbers a taken one", async () => {
    expect(await uniqueUsername(dbWith([]), 1, "ram.thapa")).toBe("ram.thapa");
    expect(await uniqueUsername(dbWith(["ram.thapa"]), 1, "ram.thapa")).toBe("ram.thapa.2");
    expect(await uniqueUsername(dbWith(["ram.thapa", "ram.thapa.2"]), 1, "ram.thapa")).toBe("ram.thapa.3");
  });
});

describe("parseIdentifier", () => {
  test("an @ makes it an email, otherwise a username; both lower case", () => {
    expect(parseIdentifier(" Admin@SVI.edu.np ")).toEqual({ kind: "email", value: "admin@svi.edu.np" });
    expect(parseIdentifier("STU20240001")).toEqual({ kind: "username", value: "stu20240001" });
    expect(parseIdentifier("  ")).toBeNull();
    expect(parseIdentifier(undefined)).toBeNull();
  });
});
