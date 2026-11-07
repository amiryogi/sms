import React from "react";
import { cn } from "../../lib/cn";

/**
 * Segmented tabs. tabs: [{ value, label, icon?, count? }]; controlled via
 * `value` + `onChange(value)`.
 */
const Tabs = ({ tabs, value, onChange, className, size = "md" }) => (
  <div role="tablist" className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1", className)}>
    {tabs.map((t) => {
      const active = t.value === value;
      const Icon = t.icon;
      return (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(t.value)}
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-all",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          {Icon && <Icon size={15} aria-hidden="true" />}
          {t.label}
          {t.count !== undefined && (
            <span className={cn("rounded-full px-1.5 text-xs", active ? "bg-brand-50 text-brand-700" : "bg-slate-200 text-slate-600")}>
              {t.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default Tabs;
