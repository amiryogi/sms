import { cn } from "../../lib/cn";

// Class builders shared by ui components (kept out of .jsx for fast refresh).

/*
 * Button variants. A button's colour says how important the action is, not what
 * mood it is in — see frontend/DESIGN.md. Status colours are for status.
 *
 * `success` and `warning` survive only for the marketing site's WhatsApp CTA
 * (pages/public/Contact.jsx), which is outside this design system. Do not reach
 * for them in the app: the main action of a view is `primary`.
 */
export const VARIANTS = {
  primary:
    "bg-brand-600 text-brand-fg shadow-sm hover:bg-brand-700 focus-visible:outline-brand-600",
  secondary:
    "bg-white text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 hover:text-slate-900",
  outline:
    "bg-white text-brand-700 ring-1 ring-inset ring-brand-300 hover:bg-brand-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-risk text-white shadow-sm hover:bg-risk-strong focus-visible:outline-risk",
  "danger-soft":
    "bg-risk-surface text-risk ring-1 ring-inset ring-risk-line hover:bg-risk-surface/70",
  success: "bg-ok text-white shadow-sm hover:bg-ok-strong focus-visible:outline-ok",
  warning: "bg-warn text-white shadow-sm hover:bg-warn-strong focus-visible:outline-warn",
};

/*
 * Radius follows the ladder in DESIGN.md: small controls at 6px, the default
 * control at 8px. The previous ladder ran 6 -> 14 -> 14 -> 12px, so a 36px-tall
 * `md` button carried a 14px radius and read as a lozenge.
 */
const SIZES = {
  xs: "h-7 gap-1 rounded-md px-2 text-xs",
  sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
  md: "h-9 gap-2 rounded-lg px-3.5 text-sm",
  lg: "h-11 gap-2 rounded-lg px-5 text-sm",
};


export const buttonClasses = ({ variant = "primary", size = "md", className } = {}) =>
  cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center font-medium whitespace-nowrap transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    className,
  );

/** Shared look for text inputs, selects and textareas. */
export const controlClasses = (invalid, className) =>
  cn(
    "block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition-colors",
    "placeholder:text-slate-400",
    "focus:outline-none focus:ring-3",
    invalid
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
      : "border-slate-300 hover:border-slate-400 focus:border-brand-500 focus:ring-brand-500/15",
    "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
    className,
  );

