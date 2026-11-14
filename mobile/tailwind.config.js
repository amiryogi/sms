/**
 * Design tokens for NativeWind (Tailwind 3 syntax).
 * `brand-*` is the school's colour (School.brandColor), set at runtime as CSS
 * variables by src/theme/BrandProvider.tsx; the defaults below are the web
 * app's indigo. Screens use utilities and the kit in src/components/ui, never hex.
 */
const shade = (n) => `rgb(var(--brand-${n}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [n, shade(n)])),
      },
      borderRadius: {
        // Same pinned radii as the web app (frontend/src/styles/app.css).
        sm: "6px",
        md: "8px",
        lg: "14px",
        xl: "18px",
        "2xl": "24px",
      },
      fontSize: {
        // Slightly larger base for readability on phones.
        xs: ["12px", "16px"],
        sm: ["14px", "20px"],
        base: ["16px", "24px"],
        lg: ["18px", "26px"],
        xl: ["20px", "28px"],
        "2xl": ["24px", "32px"],
        "3xl": ["30px", "36px"],
      },
    },
  },
  plugins: [],
};
