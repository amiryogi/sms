import React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * Empty state for lists, tables and cards.
 *
 * `compact` is the variant to use *inside* a card or a panel, where the default
 * py-14 is far too tall. Its absence is why ~22 places hand-rolled a bare <p>
 * instead — an empty screen should still say what goes here and how to start.
 */
export const EmptyState = ({ icon: Icon, title, description, action, compact = false, className }) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center text-center",
      compact ? "px-4 py-7" : "px-6 py-14",
      className,
    )}
  >
    {Icon && (
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-slate-100 text-slate-300",
          compact ? "mb-2.5 size-9" : "mb-4 size-12",
        )}
      >
        <Icon size={compact ? 17 : 22} aria-hidden="true" />
      </span>
    )}
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    {description && (
      <p className={cn("mt-1 max-w-sm text-slate-500", compact ? "text-xs" : "text-sm")}>{description}</p>
    )}
    {action && <div className={compact ? "mt-3" : "mt-5"}>{action}</div>}
  </div>
);

/** Grey placeholder bar while data loads. */
export const Skeleton = ({ className }) => (
  <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} aria-hidden="true" />
);

// Status tokens, one definition per meaning — see frontend/DESIGN.md.
const ALERT_TONES = {
  info: ["border-info-line bg-info-surface text-info", Info],
  success: ["border-ok-line bg-ok-surface text-ok", CheckCircle2],
  warning: ["border-warn-line bg-warn-surface text-warn", TriangleAlert],
  danger: ["border-risk-line bg-risk-surface text-risk", AlertCircle],
};

/** Inline message box. */
export const Alert = ({ tone = "info", title, children, action, className }) => {
  const [classes, Icon] = ALERT_TONES[tone] || ALERT_TONES.info;
  return (
    <div className={cn("flex gap-3 rounded-xl border p-3.5 text-sm", classes, className)} role={tone === "danger" ? "alert" : "status"}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {/* No opacity on the body: it silently cuts the measured contrast ratio. */}
        {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
