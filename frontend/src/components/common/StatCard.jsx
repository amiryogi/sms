import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../lib/cn";

const COLORS = {
  primary: "bg-brand-50 text-brand-600 ring-brand-100",
  success: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  warning: "bg-amber-50 text-amber-600 ring-amber-100",
  danger: "bg-red-50 text-red-600 ring-red-100",
  info: "bg-sky-50 text-sky-600 ring-sky-100",
};

/** Headline number with an icon; optional trend line. Props unchanged. */
const StatCard = ({ title, value, icon: Icon, trend = null, trendValue = null, color = "primary", hint, className }) => (
  <div className={cn("flex items-start gap-4 rounded-[var(--radius-card)] border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-card)]", className)}>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value ?? "—"}</p>
      {trend ? (
        <p className={cn("mt-1.5 inline-flex items-center gap-1 text-xs font-medium", trend === "up" ? "text-emerald-600" : "text-red-600")}>
          {trend === "up" ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}
          {trendValue}
        </p>
      ) : hint ? (
        <p className="mt-1.5 truncate text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
    {Icon && (
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1", COLORS[color] || COLORS.primary)}>
        <Icon size={20} aria-hidden="true" />
      </span>
    )}
  </div>
);

export default StatCard;
