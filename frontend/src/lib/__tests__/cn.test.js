import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cn, CUSTOM_TEXT_SIZES } from "../cn";

/*
 * Regression: tailwind-merge took the custom `text-display` size for a colour,
 * so cn("text-display", "text-slate-900") returned only the colour and every
 * hero figure rendered at 16px (found in the browser, wave 3).
 */

const css = readFileSync(fileURLToPath(new URL("../../styles/app.css", import.meta.url)), "utf8");

describe("cn", () => {
  it("keeps a custom font size next to a text colour", () => {
    expect(cn("text-display", "text-slate-900").split(" ")).toEqual(["text-display", "text-slate-900"]);
    expect(cn("text-2xs", "text-risk").split(" ")).toEqual(["text-2xs", "text-risk"]);
  });

  it("still lets a later size replace an earlier one", () => {
    expect(cn("text-display", "text-sm")).toBe("text-sm");
    expect(cn("text-sm", "text-2xs")).toBe("text-2xs");
  });

  it("still lets a later colour replace an earlier one", () => {
    expect(cn("text-slate-900", "text-risk")).toBe("text-risk");
  });

  it("knows every size token app.css defines beyond Tailwind's defaults", () => {
    const defaults = new Set(["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"]);
    const defined = [...css.matchAll(/--text-([a-z0-9]+)\s*:/g)].map((m) => m[1]);
    const custom = defined.filter((n) => !defaults.has(n));
    expect(custom.sort()).toEqual([...CUSTOM_TEXT_SIZES].sort());
  });
});
