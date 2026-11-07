import React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/cn";

/** Friendly empty state for lists and tables. */
export const EmptyState = ({ icon: Icon, title, description, action, className }) => (
  <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
    {Icon && (
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon size={22} aria-hidden="true" />
      </span>
    )}
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/** Grey placeholder bar while data loads. */
export const Skeleton = ({ className }) => (
  <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} aria-hidden="true" />
);

const ALERT_TONES = {
  info: ["border-sky-200 bg-sky-50 text-sky-800", Info],
  success: ["border-emerald-200 bg-emerald-50 text-emerald-800", CheckCircle2],
  warning: ["border-amber-200 bg-amber-50 text-amber-900", TriangleAlert],
  danger: ["border-red-200 bg-red-50 text-red-800", AlertCircle],
};

/** Inline message box. */
export const Alert = ({ tone = "info", title, children, action, className }) => {
  const [classes, Icon] = ALERT_TONES[tone] || ALERT_TONES.info;
  return (
    <div className={cn("flex gap-3 rounded-xl border p-3.5 text-sm", classes, className)} role={tone === "danger" ? "alert" : "status"}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
