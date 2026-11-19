import React from "react";
import { cn } from "../../lib/cn";

/**
 * A row of mutually exclusive choices — a filter switch, a view switch, an
 * attendance mark. Controlled: `value` + `onChange(value)`.
 *
 * This exists because six places had built their own, with five container radii,
 * three inner paddings and `role` split three ways between `group`, `radiogroup`
 * and `tablist`. The kit had `Tabs`, but tabs switch *panels*; these set a
 * *value*, so the correct semantics are a radio group, not a tablist.
 *
 * Keyboard: arrow keys move between options and select, which is what a radio
 * group is expected to do. Only the selected option is in the tab order.
 *
 *   options: [{ value, label, icon?, tone? }]
 *   tone: "default" | "ok" | "warn" | "risk" — for marks like Present/Absent,
 *         where the selected state should carry the status colour.
 */
const SELECTED_TONES = {
  default: "bg-white text-slate-900 shadow-sm",
  ok: "bg-ok text-white",
  warn: "bg-warn text-white",
  risk: "bg-risk text-white",
};

const SIZES = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

const SegmentedControl = ({
  options,
  value,
  onChange,
  size = "md",
  label,
  className,
}) => {
  const move = (delta) => {
    const i = options.findIndex((o) => o.value === value);
    // Nothing selected yet: → picks the first option, ← the last.
    const next = i < 0 ? options[delta > 0 ? 0 : options.length - 1] : options[(i + delta + options.length) % options.length];
    if (next) onChange(next.value);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1", className)}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        const Icon = o.icon;
        // Roving tabindex: the group is one tab stop, arrows move within it.
        // With nothing selected yet (an undecided row) the first option takes the
        // stop, or the whole group would be unreachable by keyboard.
        const noneSelected = !options.some((opt) => opt.value === value);
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (noneSelected && i === 0) ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600",
              SIZES[size] || SIZES.md,
              selected
                ? SELECTED_TONES[o.tone || "default"] || SELECTED_TONES.default
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            {Icon && <Icon size={size === "sm" ? 13 : 15} aria-hidden="true" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
