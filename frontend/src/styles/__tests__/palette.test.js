import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/*
 * The palette's accessibility floor, asserted against app.css itself rather than
 * against a copy of the values — change a token and this test re-reads it.
 *
 * The rules and the reasoning are in frontend/DESIGN.md. In short:
 *   - slate-400 is the lightest value allowed on TEXT. The palette this replaced
 *     used slate-400 (87 call sites) at ~2.7:1 and slate-300 (11) at ~1.8:1, both
 *     failing WCAG 1.4.3. Making the shade itself safe fixes every call site.
 *   - slate-300 is a control boundary, not a decorative line, so it needs 3:1
 *     (WCAG 1.4.11) but not 4.5:1.
 *   - slate-50/100/200 are backgrounds and rules; they carry no text.
 *   - every status colour must clear AA on white, on BOTH neutral fills and on
 *     its own muted surface, because a badge sits on the surface while a figure
 *     sits on paper.
 */

const css = readFileSync(
  fileURLToPath(new URL("../app.css", import.meta.url)),
  "utf8",
);

/** Pull `--token: #rrggbb;` out of the stylesheet. */
const token = (name) => {
  const m = css.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`token --${name} not found in app.css`);
  return m[1];
};

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** WCAG 2.1 relative luminance. */
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 2.1 contrast ratio, 1–21. */
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
};

const PAPER = "#ffffff";
const GROUND = token("color-slate-50"); // the page, and subtle fill inside paper
const FILL = token("color-slate-100"); // tabs track, icon chip, neutral badge
const BACKGROUNDS = { paper: PAPER, ground: GROUND, fill: FILL };

describe("neutral ladder", () => {
  // 400 is the lightest text-safe shade; everything darker must stay safe too.
  for (const shade of [400, 500, 600, 700, 800, 900, 950]) {
    for (const [bgName, bg] of Object.entries(BACKGROUNDS)) {
      it(`slate-${shade} clears AA (4.5:1) on ${bgName}`, () => {
        expect(contrast(token(`color-slate-${shade}`), bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  // 300 bounds interactive controls (inputs, checkboxes, the secondary button
  // ring), so it needs non-text contrast, not text contrast.
  for (const [bgName, bg] of Object.entries(BACKGROUNDS)) {
    it(`slate-300 clears non-text 3:1 on ${bgName}`, () => {
      expect(contrast(token("color-slate-300"), bg)).toBeGreaterThanOrEqual(3);
    });
  }

  it("gets lighter to darker monotonically", () => {
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    const ls = shades.map((s) => luminance(token(`color-slate-${s}`)));
    for (let i = 1; i < ls.length; i += 1) {
      expect(ls[i], `slate-${shades[i]} must be darker than slate-${shades[i - 1]}`)
        .toBeLessThan(ls[i - 1]);
    }
  });

  it("is warm, not the cool blue-grey it replaced", () => {
    // Warm means red channel >= blue channel on every shade.
    for (const s of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      const n = parseInt(token(`color-slate-${s}`).slice(1), 16);
      expect((n >> 16) & 255, `slate-${s}`).toBeGreaterThanOrEqual(n & 255);
    }
  });
});

describe("status colours", () => {
  for (const name of ["ok", "warn", "risk", "info"]) {
    const fg = () => token(`color-${name}`);
    const surface = () => token(`color-${name}-surface`);

    for (const [bgName, bg] of Object.entries(BACKGROUNDS)) {
      it(`${name} clears AA (4.5:1) on ${bgName}`, () => {
        expect(contrast(fg(), bg)).toBeGreaterThanOrEqual(4.5);
      });
    }

    it(`${name} clears AA on its own muted surface`, () => {
      expect(contrast(fg(), surface())).toBeGreaterThanOrEqual(4.5);
    });

    it(`${name} surface stays a tint, not a fill`, () => {
      // A badge surface must read as paper with a wash of colour, so it stays
      // close to white; otherwise it competes with the status text on it.
      expect(contrast(surface(), PAPER)).toBeLessThan(1.4);
    });
  }

  it("keeps the four meanings visually distinct from each other", () => {
    const names = ["ok", "warn", "risk", "info"];
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const [a, b] = [token(`color-${names[i]}`), token(`color-${names[j]}`)];
        expect(a, `${names[i]} and ${names[j]} must not be the same colour`).not.toBe(b);
      }
    }
  });
});

describe("shape and depth", () => {
  it("has a radius ladder that only goes up", () => {
    const rem = (name) => {
      const m = css.match(new RegExp(`--radius-${name}\\s*:\\s*([0-9.]+)rem\\s*;`));
      if (!m) throw new Error(`--radius-${name} not found`);
      return parseFloat(m[1]);
    };
    // The ladder this replaced was non-monotonic: --radius-lg and --radius-card
    // were both 14px while rounded-xl was Tailwind's unpinned 12px, so
    // rounded-xl rendered SMALLER than rounded-lg.
    const ladder = ["sm", "md", "lg", "xl", "2xl"].map(rem);
    for (let i = 1; i < ladder.length; i += 1) {
      expect(ladder[i]).toBeGreaterThan(ladder[i - 1]);
    }
    expect(rem("card"), "rounded-card is an alias of rounded-xl").toBe(rem("xl"));
  });

  it("reserves shadow for things that float", () => {
    // Surfaces are defined by their 1px rule. Only overlays get a drop shadow.
    expect(css).toMatch(/--shadow-card:\s*0 0 #0000\s*;/);
    expect(css).toMatch(/--shadow-pop:\s*0 10px/);
  });
});

describe("print surfaces stay pinned", () => {
  /*
   * The printed report card and the fee slips must not move when the app's
   * design changes: the NEB sheet's page count is verified by two Playwright
   * pixel baselines, and the slips are laid out four to an A4 page.
   *
   * This is easy to break by accident, because nothing under reportcard/ or
   * finance/print/ has to be edited for it to happen — the sheet resolves
   * var(--font-sans) and the slips use Tailwind slate utilities, so a change to
   * either token reaches them. app.css shadows both back, scoped to the sheets.
   */
  /*
   * There are several `:where(.report-card-a4, …)` rules in app.css — the base
   * layer gives the sheets their browser defaults back. The one we want is the
   * rule that shadows the tokens, so find it by its contents, not by position.
   */
  const pinRule = () => {
    const rules = [...css.matchAll(/(:where\([^{]*?\))\s*\{([\s\S]*?)\n\s*\}/g)];
    const hit = rules.find(([, , body]) => body.includes("--font-sans"));
    if (!hit) throw new Error("the print-pinning block in app.css is gone");
    return { selector: hit[1], body: hit[2] };
  };

  const pinBlock = () => pinRule().body;

  it("covers every print surface", () => {
    const { selector } = pinRule();
    for (const sel of [
      ".report-card-a4",
      ".report-a4",
      ".perf-sheet",
      ".rc-grade-legend",
      ".bill-slip",
      ".receipt-slip",
      // The A4 statement and day book (finance/print/StatementSheet, pages/finance/Daybook).
      ".statement-sheet",
      ".daybook-sheet",
      // The printed school calendar (pages/calendar/Print.jsx).
      ".calendar-sheet",
    ]) {
      expect(selector, `${sel} must stay pinned`).toContain(sel);
    }
  });

  it("keeps Tailwind's default type scale inside print surfaces", () => {
    // The app's scale uses fixed line heights; print was laid out against
    // Tailwind's ratio line heights, and a 0.73px change in the sheet's title
    // block moved the whole NEB sheet (caught by the pixel baselines).
    const block = pinBlock().replace(/\s+/g, " ");
    const DEFAULTS = {
      xs: ["0.75rem", "calc(1 / 0.75)"],
      sm: ["0.875rem", "calc(1.25 / 0.875)"],
      base: ["1rem", "calc(1.5 / 1)"],
      lg: ["1.125rem", "calc(1.75 / 1.125)"],
      xl: ["1.25rem", "calc(1.75 / 1.25)"],
      "2xl": ["1.5rem", "calc(2 / 1.5)"],
      "3xl": ["1.875rem", "calc(2.25 / 1.875)"],
    };
    for (const [size, [fontSize, lineHeight]] of Object.entries(DEFAULTS)) {
      expect(block, `--text-${size} in print`).toContain(`--text-${size}: ${fontSize};`);
      expect(block, `--text-${size}--line-height in print`).toContain(`--text-${size}--line-height: ${lineHeight};`);
    }
  });

  it("pins every type token the app scale redefines", () => {
    // If someone adds or changes a --text-* size in @theme, print must be pinned for it too.
    const theme = css.slice(css.indexOf("@theme"), css.indexOf("}", css.indexOf("@theme")));
    const appSizes = [...theme.matchAll(/--text-([a-z0-9]+):/g)].map((m) => m[1]);
    const pinned = new Set([...pinBlock().matchAll(/--text-([a-z0-9]+):/g)].map((m) => m[1]));
    // 2xs and display are new sizes the print code cannot be using.
    for (const s of appSizes.filter((s) => !["2xs", "display"].includes(s))) {
      expect(pinned.has(s), `--text-${s} is redefined by the app but not pinned for print`).toBe(true);
    }
  });

  it("keeps the report card on Inter, whatever the app font becomes", () => {
    expect(pinBlock()).toMatch(/--font-sans:\s*"Inter"/);
    // …and Inter must still actually be fetched.
    const html = readFileSync(
      fileURLToPath(new URL("../../../index.html", import.meta.url)),
      "utf8",
    );
    expect(html, "index.html must still load Inter for the print sheets").toMatch(/family=Inter|Inter:wght/);
  });

  it("keeps the pre-redesign cool slate inside print surfaces", () => {
    const block = pinBlock();
    // The values the slips and sheets were laid out and print-checked against.
    const OLD = {
      200: "#e2e8f0",
      300: "#cbd5e1",
      500: "#64748b",
      700: "#334155",
      900: "#0f172a",
    };
    for (const [shade, hex] of Object.entries(OLD)) {
      expect(block.toLowerCase(), `slate-${shade} must stay ${hex} in print`).toContain(
        `--color-slate-${shade}: ${hex}`,
      );
    }
  });
});

describe("motion", () => {
  it("disables animation under prefers-reduced-motion", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});

describe("typography", () => {
  it("ships a Devanagari companion for the Nepali text the app renders", () => {
    // The app renders real Nepali UI strings and १२३ numerals across ~113 files.
    // Inter, which this replaced, has no Devanagari coverage at all.
    expect(css).toMatch(/--font-sans:[^;]*IBM Plex Sans Devanagari/s);
  });

  it("defines a display size for the hero number", () => {
    expect(css).toMatch(/--text-display\s*:/);
  });
});
