/**
 * School brand colour -> CSS variables used by the Tailwind `brand` palette
 * (styles/app.css). The school's chosen colour becomes brand-600, the shade
 * buttons and active states use; the other shades share its hue on a fixed
 * lightness ladder, so text such as text-brand-700 stays readable on white
 * whatever colour is picked.
 */

export const DEFAULT_BRAND = "#4f46e5";

const HEX = /^#[0-9a-f]{6}$/i;

// Lightness and relative chroma per shade (modelled on Tailwind's palette).
const LADDER = {
  50: [0.97, 0.12],
  100: [0.935, 0.2],
  200: [0.875, 0.34],
  300: [0.79, 0.55],
  400: [0.69, 0.8],
  500: [0.6, 0.95],
  // 600 is the chosen colour itself
  700: [0.47, 0.92],
  800: [0.405, 0.76],
  900: [0.36, 0.58],
  950: [0.265, 0.38],
};

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
};

/** sRGB hex -> OKLCH [L 0..1, C, H degrees] */
const hexToOklch = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return [L, C, H];
};

/** WCAG relative luminance of a hex colour */
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio between two hex colours */
export const contrastRatio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

export const isValidBrandColor = (value) => HEX.test(String(value || ""));

/**
 * CSS variables for a brand colour: { "--brand-50": "oklch(...)", …,
 * "--brand-600": "#rrggbb", "--brand-fg": "#ffffff" | "#0f172a" }.
 */
export const brandVariables = (hex) => {
  const base = isValidBrandColor(hex) ? hex.toLowerCase() : DEFAULT_BRAND;
  const [, chroma, hue] = hexToOklch(base);
  // Greys stay grey; vivid colours are capped so light shades don't glare.
  const c = Math.min(chroma, 0.27);

  const vars = {};
  for (const [shade, [lightness, rel]] of Object.entries(LADDER)) {
    vars[`--brand-${shade}`] = `oklch(${(lightness * 100).toFixed(1)}% ${(c * rel).toFixed(3)} ${hue.toFixed(2)})`;
  }
  vars["--brand-600"] = base;
  // White text on the chosen colour when it passes AA, otherwise near-black.
  vars["--brand-fg"] = contrastRatio(base, "#ffffff") >= 4.5 ? "#ffffff" : "#0f172a";
  return vars;
};

/** Apply a school's brand colour to the whole app (null -> default). */
export const applyBrand = (hex) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [name, value] of Object.entries(brandVariables(hex))) {
    root.style.setProperty(name, value);
  }
};

export default applyBrand;
