import React from "react";
import { cn } from "../../lib/cn";

/*
 * Status tones come from the tokens in frontend/DESIGN.md — one definition per
 * meaning. Each text colour clears AA on its own surface, which the old
 * emerald-50/emerald-700 style pairings did not.
 */
const TONES = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-ok-surface text-ok ring-ok-line",
  warning: "bg-warn-surface text-warn ring-warn-line",
  danger: "bg-risk-surface text-risk ring-risk-line",
  info: "bg-info-surface text-info ring-info-line",
};

const DOTS = {
  neutral: "bg-slate-400",
  brand: "bg-brand-500",
  success: "bg-ok",
  warning: "bg-warn",
  danger: "bg-risk",
  info: "bg-info",
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
