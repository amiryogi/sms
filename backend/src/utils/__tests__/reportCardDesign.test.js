const { DESIGN_SPEC, DESIGN_GROUPS, DEFAULT_DESIGN, validateDesign, normalizeDesign, designSpec } = require("../reportCardDesign");
const { validateLayout, normalizeLayout } = require("../reportCardLayout");

describe("DESIGN_SPEC", () => {
  test("every default is valid for its own spec", () => {
    expect(validateDesign(DEFAULT_DESIGN)).toEqual([]);
    for (const [key, spec] of Object.entries(DESIGN_SPEC)) {
      expect(DESIGN_GROUPS).toContain(spec.group);
      if (spec.type === "number") {
        expect(spec.min).toBeLessThan(spec.max);
        expect(spec.default).toBeGreaterThanOrEqual(spec.min);
        expect(spec.default).toBeLessThanOrEqual(spec.max);
      } else {
        expect(spec.options.map((o) => o.value)).toContain(spec.default);
      }
      expect(DEFAULT_DESIGN[key]).toBe(spec.default);
    }
  });

  test("defaults are the sizes the sheet printed with before designs existed", () => {
    expect(DEFAULT_DESIGN).toMatchObject({ fontFamily: "inter", marginTop: 15, schoolNameSize: 22, schoolNameWeight: 700, titleSize: 16, tableFontSize: 9, infoColumns: 4, footerSize: 8 });
  });

  test("designSpec lists every setting once, grouped in order", () => {
    const spec = designSpec();
    expect(spec.map((g) => g.group)).toEqual(DESIGN_GROUPS);
    const keys = spec.flatMap((g) => g.settings.map((s) => s.key));
    expect(keys.sort()).toEqual(Object.keys(DESIGN_SPEC).sort());
  });
});

describe("validateDesign", () => {
  test("no design, or a partial one, is valid", () => {
    expect(validateDesign(undefined)).toEqual([]);
    expect(validateDesign(null)).toEqual([]);
    expect(validateDesign({ schoolNameSize: 26 })).toEqual([]);
  });

  test("rejects non-objects", () => {
    for (const bad of ["x", 4, [], true]) expect(validateDesign(bad)).toEqual([{ field: "design", message: "Design must be an object" }]);
  });

  test("rejects out-of-range numbers, with the allowed range in the message", () => {
    expect(validateDesign({ schoolNameSize: 80 })).toEqual([{ field: "design.schoolNameSize", message: "Must be a number from 12 to 32 pt" }]);
    expect(validateDesign({ marginTop: 2 })[0].field).toBe("design.marginTop");
    expect(validateDesign({ schoolNameLineHeight: 3 })[0].message).toBe("Must be a number from 1 to 1.6");
  });

  test("rejects wrong types: numeric strings, NaN, Infinity", () => {
    for (const bad of ["22", NaN, Infinity, null, {}]) expect(validateDesign({ schoolNameSize: bad })).toHaveLength(1);
  });

  test("rejects unknown choices and unknown settings", () => {
    expect(validateDesign({ fontFamily: "comic-sans" })[0].message).toMatch(/inter, times, arial/);
    expect(validateDesign({ schoolNameWeight: 750 })).toHaveLength(1);
    expect(validateDesign({ infoColumns: "4" })).toHaveLength(1);
    expect(validateDesign({ background: "url(javascript:1)" })).toEqual([{ field: "design.background", message: "Unknown design setting" }]);
  });

  test("validateLayout reports design errors alongside layout errors", () => {
    const errors = validateLayout({ template: "nebGradeSheet", design: { titleSize: 99 } });
    expect(errors).toEqual([{ field: "design.titleSize", message: "Must be a number from 10 to 22 pt" }]);
  });
});

describe("normalizeDesign", () => {
  test("anything unreadable is the default design", () => {
    for (const bad of [undefined, null, "x", 3, []]) expect(normalizeDesign(bad)).toEqual(DEFAULT_DESIGN);
  });

  test("keeps valid values, replaces invalid and drops unknown ones", () => {
    const out = normalizeDesign({ schoolNameSize: 28, titleSize: 999, fontFamily: "times", logoPosition: "top", evil: "x" });
    expect(out.schoolNameSize).toBe(28);
    expect(out.fontFamily).toBe("times");
    expect(out.titleSize).toBe(DEFAULT_DESIGN.titleSize);
    expect(out.logoPosition).toBe("left");
    expect(out).not.toHaveProperty("evil");
    expect(Object.keys(out).sort()).toEqual(Object.keys(DESIGN_SPEC).sort());
  });

  test("normalizeLayout always carries a complete design, for both templates", () => {
    expect(normalizeLayout({ template: "nebGradeSheet", design: { gpaSize: 20 } }).design).toEqual({ ...DEFAULT_DESIGN, gpaSize: 20 });
    expect(normalizeLayout({ template: "performanceReport" }).design).toEqual(DEFAULT_DESIGN);
  });

  test("does not hand out the shared default object", () => {
    const a = normalizeDesign(null);
    a.titleSize = 1;
    expect(normalizeDesign(null).titleSize).toBe(DEFAULT_DESIGN.titleSize);
  });
});
