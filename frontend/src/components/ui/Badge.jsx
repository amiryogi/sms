import React from "react";
import { cn } from "../../lib/cn";

const TONES = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
};

const DOTS = {
  neutral: "bg-slate-400",
  brand: "bg-brand-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
};

/** Small status pill. `dot` adds a coloured dot before the label. */
const Badge = ({ tone = "neutral", dot = false, icon: Icon, className, children }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
      TONES[tone] || TONES.neutral,
      className,
    )}
  >
    {dot && <span className={cn("size-1.5 rounded-full", DOTS[tone] || DOTS.neutral)} aria-hidden="true" />}
    {Icon && <Icon size={12} aria-hidden="true" />}
    {children}
  </span>
);

export default Badge;
