import { brandCssVariables, brandForeground, brandPalette, contrastRatio, DEFAULT_BRAND, hexToOklch } from "@/theme/brand";

describe("brand palette", () => {
  it("keeps the school's colour as brand-600", () => {
    expect(brandPalette("#0F766E")[600]).toBe("#0f766e");
  });

  it("falls back to the default for missing or invalid colours", () => {
    expect(brandPalette(null)[600]).toBe(DEFAULT_BRAND);
    expect(brandPalette("red")[600]).toBe(DEFAULT_BRAND);
  });

  it("gets lighter towards 50 and darker towards 950, on the same hue", () => {
    const p = brandPalette("#0f766e");
    const [, , hue] = hexToOklch("#0f766e");
    const lightness = [50, 100, 200, 300, 400, 500, 700, 800, 900, 950].map((s) => hexToOklch(p[s as 50])[0]);
    for (let i = 1; i < lightness.length; i += 1) expect(lightness[i]!).toBeLessThan(lightness[i - 1]!);
    expect(Math.abs(hexToOklch(p[200])[2] - hue)).toBeLessThan(6);
  });

  it("keeps text-brand-700 readable on white for a light school colour", () => {
    const p = brandPalette("#facc15"); // yellow
    expect(contrastRatio(p[700], "#ffffff")).toBeGreaterThan(4.5);
  });

  it("chooses readable text on brand-600", () => {
    expect(brandForeground("#4f46e5")).toBe("#ffffff");
    expect(brandForeground("#facc15")).toBe("#0f172a");
  });

  it("exposes r g b triplets for NativeWind", () => {
    const vars = brandCssVariables("#4f46e5");
    expect(vars["--brand-600"]).toBe("79 70 229");
    expect(Object.keys(vars)).toHaveLength(11);
    for (const v of Object.values(vars)) expect(v).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
  });
});
