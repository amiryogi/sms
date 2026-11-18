import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { statValueSize, clampProgress, STAT_TONES, STAT_BARS, HERO_MIN_WIDTH_REM } from "../statValue";

/*
 * The stat tile's sizing rule (see statValue.js). The point being protected: a
 * hero money figure must never be set at 40px in a tile too narrow for it.
 * Each tier's text-display threshold must be wide enough for its longest value
 * at 0.62em per character.
 */

const REM = 16;
const DISPLAY_PX = 40;
const THREEXL_PX = 30;
const EM_PER_CHAR = 0.62;

/** The container width (px) at which a tier switches to a given size class. */
const thresholdFor = (classes, sizeClass) => {
  // Unconditional: the tile is only guaranteed its minimum width.
  if (classes.split(" ").includes(sizeClass)) return HERO_MIN_WIDTH_REM * REM;
  const m = classes.match(new RegExp(`@min-\\[(\\d+(?:\\.\\d+)?)rem\\]:${sizeClass}(?:\\s|$)`));
  return m ? Number(m[1]) * REM : null;
};

describe("statValueSize", () => {
  it("sets short hero figures at text-display unconditionally", () => {
    expect(statValueSize("92.7%")).toBe("text-display");
    expect(statValueSize(1240)).toBe("text-display");
    expect(statValueSize("61/70")).toBe("text-display");
  });

  it("steps long hero figures down by the tile's width", () => {
    expect(statValueSize("Rs. 47,200")).toContain("@min-");
    expect(statValueSize("Rs. 12,34,567")).toMatch(/^text-2xl /);
  });

  it("never sets a hero figure at 40px or 30px in a tile narrower than it", () => {
    for (let len = 1; len <= 17; len++) {
      const value = "8".repeat(len);
      const classes = statValueSize(value);
      const display = thresholdFor(classes, "text-display");
      expect(display, `len ${len}: ${classes}`).not.toBeNull();
      expect(display, `len ${len}: display threshold`).toBeGreaterThanOrEqual(len * EM_PER_CHAR * DISPLAY_PX);
      const threeXl = thresholdFor(classes, "text-3xl");
      if (threeXl !== null) {
        expect(threeXl, `len ${len}: 3xl threshold`).toBeGreaterThanOrEqual(len * EM_PER_CHAR * THREEXL_PX);
      }
    }
  });

  it("uses fixed sizes off the hero", () => {
    expect(statValueSize("Rs. 12,34,567", "md")).toBe("text-2xl");
    expect(statValueSize("4", "sm")).toBe("text-lg");
  });

  it("treats an unmeasurable value as ten characters", () => {
    expect(statValueSize({ type: "span" })).toBe(statValueSize("x".repeat(10)));
  });
});

describe("clampProgress", () => {
  it("clamps to 0–100 and drops what is not a number", () => {
    expect(clampProgress(42.5)).toBe(42.5);
    expect(clampProgress(140)).toBe(100);
    expect(clampProgress(-3)).toBe(0);
    expect(clampProgress("73")).toBe(73);
    expect(clampProgress(null)).toBeNull();
    expect(clampProgress(undefined)).toBeNull();
    expect(clampProgress("")).toBeNull();
    expect(clampProgress("n/a")).toBeNull();
  });
});

describe("stat colours come from tokens", () => {
  const css = readFileSync(fileURLToPath(new URL("../../../styles/app.css", import.meta.url)), "utf8");

  it("uses only ink and the status tokens, never a raw palette or chart colour", () => {
    for (const cls of [...Object.values(STAT_TONES), ...Object.values(STAT_BARS)]) {
      expect(cls).toMatch(/^(text|bg)-(slate-(700|900)|ok|warn|risk)$/);
    }
    for (const t of ["ok", "warn", "risk"]) expect(css).toContain(`--color-${t}:`);
  });
});
