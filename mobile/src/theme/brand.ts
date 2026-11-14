/**
 * School brand colour -> the `brand-*` palette (port of frontend/src/lib/brand.js).
 *
 * The chosen colour is brand-600; the other shades share its hue on a fixed
 * OKLCH lightness ladder, so text such as text-brand-700 stays readable whatever
 * the school picks. The web sets oklch() CSS values; React Native cannot parse
 * those, so each shade is converted back to sRGB here.
 */

export const DEFAULT_BRAND = "#4f46e5";

export const BRAND_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type BrandShade = (typeof BRAND_SHADES)[number];
export type BrandPalette = Record<BrandShade, string>;

const HEX = /^#[0-9a-f]{6}$/i;

// Lightness and relative chroma per shade (same ladder as the web).
const LADDER: Record<Exclude<BrandShade, 600>, [number, number]> = {
  50: [0.97, 0.12],
  100: [0.935, 0.2],
  200: [0.875, 0.34],
  300: [0.79, 0.55],
  400: [0.69, 0.8],
  500: [0.6, 0.95],
  700: [0.47, 0.92],
  800: [0.405, 0.76],
  900: [0.36, 0.58],
  950: [0.265, 0.38],
};

type RGB = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

const hexToRgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const rgbToHex = (rgb: RGB) =>
  "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");

/** sRGB hex -> OKLCH [L 0..1, C, H degrees] */
export const hexToOklch = (hex: string): [number, number, number] => {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as RGB;
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

/** OKLCH -> sRGB (0..1, may be out of gamut) */
const oklchToRgb = (L: number, C: number, H: number): RGB => {
  const hr = (H * Math.PI) / 180;
  const A = C * Math.cos(hr);
  const B = C * Math.sin(hr);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

const inGamut = (rgb: RGB) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

/** OKLCH -> hex, lowering chroma until the colour fits sRGB (as browsers do). */
const oklchToHex = (L: number, C: number, H: number) => {
  let c = C;
  let rgb = oklchToRgb(L, c, H);
  while (!inGamut(rgb) && c > 0) {
    c = Math.max(0, c - 0.002);
    rgb = oklchToRgb(L, c, H);
  }
  return rgbToHex(rgb);
};

const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as RGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio between two hex colours */
export const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

export const isValidBrandColor = (value: unknown): value is string => HEX.test(String(value ?? ""));

/** The eleven shades as hex, brand-600 being the school's colour itself. */
export const brandPalette = (hex?: string | null): BrandPalette => {
  const base = isValidBrandColor(hex) ? hex.toLowerCase() : DEFAULT_BRAND;
  const [, chroma, hue] = hexToOklch(base);
  // Greys stay grey; vivid colours are capped so light shades don't glare.
  const c = Math.min(chroma, 0.27);
  const palette = {} as BrandPalette;
  for (const shade of BRAND_SHADES) {
    if (shade === 600) {
      palette[600] = base;
      continue;
    }
    const [lightness, rel] = LADDER[shade];
    palette[shade] = oklchToHex(lightness, c * rel, hue);
  }
  return palette;
};

/** Text colour on brand-600: white when it passes WCAG AA, otherwise near-black. */
export const brandForeground = (hex?: string | null) => {
  const base = isValidBrandColor(hex) ? hex : DEFAULT_BRAND;
  return contrastRatio(base, "#ffffff") >= 4.5 ? "#ffffff" : "#0f172a";
};

/** CSS variables for NativeWind's vars(): { "--brand-50": "238 242 255", … } */
export const brandCssVariables = (hex?: string | null): Record<string, string> => {
  const palette = brandPalette(hex);
  return Object.fromEntries(
    BRAND_SHADES.map((shade) => {
      const [r, g, b] = hexToRgb(palette[shade]).map((v) => Math.round(v * 255));
      return [`--brand-${shade}`, `${r} ${g} ${b}`];
    }),
  );
};
