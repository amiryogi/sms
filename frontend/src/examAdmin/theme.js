import { defaultTheme } from "react-admin";

/** Any CSS colour (incl. oklch from the brand tokens) as an rgb() string MUI can work with. */
const toRgb = (cssColor, fallback) => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return fallback;
  }
};

// First defined variable wins: --brand-* is set at runtime from School.brandColor.
const token = (names, fallback) => {
  const style = getComputedStyle(document.documentElement);
  for (const name of names) {
    const value = style.getPropertyValue(name).trim();
    if (value) return toRgb(value, fallback);
  }
  return fallback;
};

/**
 * A Material UI theme that mirrors the app's Tailwind tokens (styles/app.css):
 * Inter, slate neutrals, the school's brand colour, the card radius and border.
 * Built at mount time so it picks up the current brand colour.
 */
export const buildTheme = () => {
  const brand = token(["--brand-600", "--color-brand-600"], "rgb(79, 70, 229)");
  const brandDark = token(["--brand-700", "--color-brand-700"], "rgb(67, 56, 202)");
  const slate = { 50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 500: "#64748b", 700: "#334155", 900: "#0f172a" };

  return {
    ...defaultTheme,
    palette: {
      mode: "light",
      primary: { main: brand, dark: brandDark, contrastText: "#fff" },
      secondary: { main: brand, contrastText: "#fff" },
      background: { default: slate[50], paper: "#fff" },
      text: { primary: slate[900], secondary: slate[500] },
      divider: slate[200],
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: 14,
      button: { textTransform: "none", fontWeight: 500 },
    },
    components: {
      ...defaultTheme.components,
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { border: `1px solid ${slate[200]}`, borderRadius: 14, boxShadow: "0 1px 2px 0 rgb(15 23 42 / 0.04)" } },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { backgroundColor: slate[50], color: slate[500], fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.025em" },
          root: { borderBottomColor: slate[100] },
        },
      },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
      MuiTextField: { defaultProps: { variant: "outlined", size: "small" } },
      MuiFormControl: { defaultProps: { variant: "outlined", size: "small" } },
    },
  };
};

export default buildTheme;
