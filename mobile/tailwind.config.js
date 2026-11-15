/**
 * Design tokens for NativeWind (Tailwind 3 syntax).
 *
 * Colours are CSS variables set at runtime by src/theme/ThemeProvider.tsx:
 *  - semantic tokens (canvas, surface, ink, line, ok, warn, bad, info) swap
 *    between light and dark (src/theme/tokens.ts);
 *  - brand-* is the school's colour (School.brandColor, src/theme/brand.ts).
 * There are no `dark:` classes: the theme is the variables. Screens use these
 * classes and the kit in src/components/ui, never hex or raw palette colours.
 *
 * Type: Mukta (Latin + Devanagari, ready for Nepali). The family per weight
 * is applied by the kit's Text (src/components/ui/Text.tsx); size classes
 * here carry the line height Mukta needs.
 */
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;
const brand = (n) => `rgb(var(--brand-${n}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: v("canvas"),
        surface: v("surface"),
        sunken: v("sunken"),
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        ink: { DEFAULT: v("ink"), muted: v("ink-muted"), subtle: v("ink-subtle") },
        ok: { DEFAULT: v("ok"), soft: v("ok-soft") },
        warn: { DEFAULT: v("warn"), solid: v("warn-solid"), soft: v("warn-soft") },
        bad: { DEFAULT: v("bad"), soft: v("bad-soft") },
        info: { DEFAULT: v("info"), soft: v("info-soft") },
        brand: {
          ...Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [n, brand(n)])),
          // Theme-aware brand tints: soft fills and readable brand text.
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
          ink: "rgb(var(--brand-ink) / <alpha-value>)",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "24px",
        "3xl": "32px",
      },
      fontSize: {
        // [size, line height]: Mukta's tall Devanagari-ready metrics need ~1.45
        xs: ["12px", "18px"],
        sm: ["14px", "21px"],
        base: ["16px", "24px"],
        lg: ["18px", "26px"],
        xl: ["21px", "29px"],
        "2xl": ["26px", "34px"],
        "3xl": ["32px", "40px"],
        "4xl": ["40px", "48px"],
      },
    },
  },
  plugins: [],
};
