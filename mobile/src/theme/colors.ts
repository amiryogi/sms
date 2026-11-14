/**
 * Neutral and status colours as hex, for places className cannot reach (icon
 * colours, charts, the status bar). They match the Tailwind slate/red/emerald/
 * amber shades the kit uses, so screens and icons agree.
 */
export const neutral = {
  light: {
    text: "#0f172a", // slate-900
    muted: "#64748b", // slate-500
    subtle: "#94a3b8", // slate-400
    background: "#f8fafc", // slate-50
    surface: "#ffffff",
    border: "#e2e8f0", // slate-200
    danger: "#dc2626", // red-600
    success: "#059669", // emerald-600
    warning: "#d97706", // amber-600
    info: "#0284c7", // sky-600
  },
  dark: {
    text: "#f1f5f9", // slate-100
    muted: "#94a3b8", // slate-400
    subtle: "#64748b", // slate-500
    background: "#020617", // slate-950
    surface: "#0f172a", // slate-900
    border: "#1e293b", // slate-800
    danger: "#f87171", // red-400
    success: "#34d399", // emerald-400
    warning: "#fbbf24", // amber-400
    info: "#38bdf8", // sky-400
  },
} as const;

/** Attendance status colours (same meaning as the web register). */
export const attendanceTone = {
  present: "success",
  late: "warning",
  absent: "danger",
  excused: "info",
} as const;
