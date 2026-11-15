/**
 * The app's colour tokens, light and dark. Screens never use hex or raw
 * palette classes: they use the semantic classes these feed (bg-canvas,
 * text-ink, border-line, bg-ok-soft…), which ThemeProvider sets as CSS
 * variables. Switching theme only swaps these values; nothing else changes.
 *
 * Palette, chosen for a Nepali school rather than a generic dashboard:
 *  - paper / ink   cool exercise-book paper and blue-black ink
 *  - brand         the school's own colour (School.brandColor), see brand.ts
 *  - ok            register green: present, paid, passed
 *  - warn          marigold: due, late, needs doing
 *  - bad           stamp red: absent, overdue, not passed
 *  - info          ink blue: excused, notes
 */
export type Scheme = "light" | "dark";

export const TOKENS = {
  light: {
    canvas: "#F2F4F8",
    surface: "#FFFFFF",
    sunken: "#E9EDF3",
    line: "#DCE2EA",
    "line-strong": "#BFC9D6",
    ink: "#131B2C",
    "ink-muted": "#4E5B73",
    "ink-subtle": "#5F6B80",
    ok: "#17703F",
    "ok-soft": "#E1F2E8",
    warn: "#8A5800",
    "warn-solid": "#F2A900",
    "warn-soft": "#FFF2D3",
    bad: "#B3261E",
    "bad-soft": "#FBE7E6",
    info: "#1D5BA6",
    "info-soft": "#E3EDF9",
  },
  dark: {
    canvas: "#0C111C",
    surface: "#151C2B",
    sunken: "#1C2537",
    line: "#263149",
    "line-strong": "#3A4766",
    ink: "#EDF1F7",
    "ink-muted": "#A9B3C6",
    "ink-subtle": "#8390A8",
    ok: "#5DD08F",
    "ok-soft": "#123222",
    warn: "#FFC94D",
    "warn-solid": "#F2A900",
    "warn-soft": "#382A08",
    bad: "#FF8A84",
    "bad-soft": "#3B1514",
    info: "#86B7F2",
    "info-soft": "#132845",
  },
} as const satisfies Record<Scheme, Record<string, string>>;

export type TokenName = keyof (typeof TOKENS)["light"];

/** "#RRGGBB" -> "r g b" for rgb(var(--x) / alpha) */
export const toTriplet = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** CSS variables for NativeWind's vars(): { "--c-canvas": "242 244 248", … } */
export const tokenVariables = (scheme: Scheme): Record<string, string> =>
  Object.fromEntries(Object.entries(TOKENS[scheme]).map(([k, v]) => [`--c-${k}`, toTriplet(v)]));
