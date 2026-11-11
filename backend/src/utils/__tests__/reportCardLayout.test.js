const {
  TEMPLATE_FIELDS,
  NEB_GRADE_SHEET,
  PERFORMANCE_REPORT,
  DEFAULT_LAYOUT,
  validateLayout,
  normalizeLayout,
  classWithNumeral,
  issueDateBS,
  listPresets,
} = require("../reportCardLayout");
const { DEFAULT_DESIGN } = require("../reportCardDesign");

describe("normalizeLayout", () => {
  test("null (a school that never chose) is the original NEB grade sheet", () => {
    // with the default design: the sizes the sheet has always printed with
    expect(normalizeLayout(null)).toEqual({ ...NEB_GRADE_SHEET, signatures: [...NEB_GRADE_SHEET.signatures], design: DEFAULT_DESIGN });
    expect(DEFAULT_LAYOUT.template).toBe("nebGradeSheet");
  });

  test("non-objects fall back to the default instead of throwing", () => {
    for (const bad of [undefined, "x", 42, [], true]) {
      expect(normalizeLayout(bad).template).toBe("nebGradeSheet");
    }
  });

  test("a partial layout is filled from its own template, not from NEB", () => {
    const out = normalizeLayout({ template: "performanceReport", title: "Progress Report" });
    expect(out.title).toBe("Progress Report");
    expect(out.remarkColumn).toBe("blank");
    expect(out.signatures).toEqual(["Class Teacher", "Principal"]);
    expect(out.minTableRows).toBe(PERFORMANCE_REPORT.minTableRows);
  });

  test("an unknown template falls back to NEB", () => {
    expect(normalizeLayout({ template: "fancy" }).template).toBe("nebGradeSheet");
  });

  test("bad values are dropped, good ones kept", () => {
    const out = normalizeLayout({
      template: "performanceReport",
      mode: "both",
      remarkColumn: "sideways",
      showRank: "yes",
      showPercentage: true,
      minTableRows: 99,
      title: "   ",
    });
    expect(out.mode).toBe("both");
    expect(out.remarkColumn).toBe("blank");
    expect(out.showRank).toBe(false);
    expect(out.showPercentage).toBe(true);
    expect(out.minTableRows).toBe(10);
    expect(out.title).toBe("Performance Report");
  });

  test("signatures are trimmed, blanks removed, capped at four", () => {
    const out = normalizeLayout({
      template: "performanceReport",
      signatures: [" Class Teacher ", "", 7, "A", "B", "C", "D"],
    });
    expect(out.signatures).toEqual(["Class Teacher", "A", "B", "C"]);
  });

  test("an empty signature list is allowed", () => {
    expect(normalizeLayout({ template: "performanceReport", signatures: [] }).signatures).toEqual([]);
  });

  test("never shares the preset's signature array", () => {
    const a = normalizeLayout(null);
    a.signatures.push("X");
    expect(normalizeLayout(null).signatures).toHaveLength(3);
  });

  test("ignores keys it does not know", () => {
    expect(normalizeLayout({ template: "nebGradeSheet", hack: 1 })).not.toHaveProperty("hack");
  });
});

describe("validateLayout", () => {
  test("both presets are valid", () => {
    expect(validateLayout({ ...NEB_GRADE_SHEET })).toEqual([]);
    expect(validateLayout({ ...PERFORMANCE_REPORT })).toEqual([]);
  });

  test("template is required", () => {
    expect(validateLayout({ title: "x" })).toContainEqual({
      field: "template",
      message: "Choose a template",
    });
  });

  test("rejects a non-object", () => {
    expect(validateLayout(null)[0].field).toBe("config");
    expect(validateLayout([])[0].field).toBe("config");
  });

  test("reports each bad field by name", () => {
    const fields = validateLayout({
      template: "performanceReport",
      mode: "letters",
      showSeal: "true",
      title: "",
      footerText: 5,
      signatures: ["Principal", " "],
      minTableRows: 2.5,
    }).map((e) => e.field);
    expect(fields).toEqual(
      expect.arrayContaining([
        "mode",
        "showSeal",
        "title",
        "footerText",
        "signatures[1]",
        "minTableRows",
      ]),
    );
    expect(fields).not.toContain("signatures[0]");
  });

  test("length limits", () => {
    const long = validateLayout({
      template: "performanceReport",
      title: "x".repeat(81),
      footerText: "x".repeat(601),
      signatures: ["a", "b", "c", "d", "e"],
    }).map((e) => e.field);
    expect(long).toEqual(expect.arrayContaining(["title", "footerText", "signatures"]));
  });
});

describe("classWithNumeral", () => {
  test.each([
    [9, "Nine [9]"],
    [10, "Ten [10]"],
    [1, "One [1]"],
    ["7", "Seven [7]"],
  ])("grade level %p prints %p", (level, text) => {
    expect(classWithNumeral(level)).toBe(text);
  });

  test.each([0, null, undefined, 13, 2.5, "KG"])(
    "%p has no numeral form, so the class name prints instead",
    (level) => {
      expect(classWithNumeral(level)).toBeNull();
    },
  );
});

describe("issueDateBS", () => {
  test("prints the BS date dash-separated, zero-padded", () => {
    // 2026-08-22 AD is 2083-05-06 BS (the date on marksheetformat1).
    expect(issueDateBS("2026-08-22T00:00:00.000Z")).toBe("2083-05-06");
  });

  test.each([null, undefined, "", "not a date"])("%p gives null", (v) => {
    expect(issueDateBS(v)).toBeNull();
  });
});

describe("presets and template fields", () => {
  test("presets are returned complete", () => {
    const presets = listPresets();
    expect(presets.map((p) => p.key)).toEqual(["nebGradeSheet", "performanceReport"]);
    presets.forEach((p) => expect(validateLayout(p.config)).toEqual([]));
  });

  test("every field a template lists exists in the layout", () => {
    for (const fields of Object.values(TEMPLATE_FIELDS)) {
      fields.forEach((f) => expect(PERFORMANCE_REPORT).toHaveProperty(f));
    }
  });

  test("the performance template uses every setting", () => {
    expect(TEMPLATE_FIELDS.performanceReport).toHaveLength(
      Object.keys(PERFORMANCE_REPORT).length - 1,
    );
  });
});
