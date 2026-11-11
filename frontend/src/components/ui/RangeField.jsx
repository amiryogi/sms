import React from "react";
import { cn } from "../../lib/cn";

/**
 * A number chosen with a slider, with an exact-value box beside it.
 * `onChange` gets a number already clamped to min..max.
 */
const RangeField = ({ id, label, value, min, max, step = 1, unit = "", onChange, error, className }) => {
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const commit = (raw) => {
    const n = Number(raw);
    if (raw !== "" && Number.isFinite(n)) onChange(clamp(n));
  };
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <input
            type="number"
            aria-label={`${label} value`}
            className="w-16 px-1.5 py-0.5 text-right text-xs tabular-nums"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => commit(e.target.value)}
          />
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="h-1.5 w-full cursor-pointer accent-brand-600"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => commit(e.target.value)}
      />
      {error && <p className="text-xs font-medium text-red-600" role="alert">{error}</p>}
    </div>
  );
};

export default RangeField;
