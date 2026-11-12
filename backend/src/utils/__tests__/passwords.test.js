const { generateTemporaryPassword, meetsPolicy } = require("../passwords");

describe("password policy", () => {
  test("needs 8+ characters with upper, lower and a digit", () => {
    expect(meetsPolicy("Password123")).toBe(true);
    expect(meetsPolicy("Ab1defgh")).toBe(true);
    expect(meetsPolicy("password123")).toBe(false);
    expect(meetsPolicy("PASSWORD123")).toBe(false);
    expect(meetsPolicy("Password")).toBe(false);
    expect(meetsPolicy("Ab1")).toBe(false);
    expect(meetsPolicy(undefined)).toBe(false);
  });
});

describe("generateTemporaryPassword", () => {
  const many = Array.from({ length: 500 }, generateTemporaryPassword);

  test("always meets the policy and is 10 characters", () => {
    for (const p of many) {
      expect(p).toHaveLength(10);
      expect(meetsPolicy(p)).toBe(true);
    }
  });

  test("never uses characters people misread on paper", () => {
    for (const p of many) expect(p).not.toMatch(/[0O1lI]/);
  });

  test("is not the same twice", () => {
    expect(new Set(many).size).toBe(many.length);
  });
});
