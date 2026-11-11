import React from "react";
import { RotateCcw } from "lucide-react";
import { Button, Field, SelectInput, RangeField } from "../ui";

/**
 * The "Design" part of the report-card settings: sizes, weights, spacing and
 * margins of the printed sheet. The controls are generated from the spec the
 * API sends (backend utils/reportCardDesign.js), so ranges live in one place.
 *
 * `design` is the complete design of the draft; `onChange(nextDesign)` replaces it.
 */
const ReportCardDesignFields = ({ spec, design, errors = {}, onChange }) => {
  const set = (key, value) => onChange({ ...design, [key]: value });
  const resetGroup = (settings) => onChange({ ...design, ...Object.fromEntries(settings.map((s) => [s.key, s.default])) });
  const resetAll = () => onChange(Object.fromEntries(spec.flatMap((g) => g.settings.map((s) => [s.key, s.default]))));
  const changed = (settings) => settings.some((s) => design[s.key] !== s.default);
  const anyChanged = spec.some((g) => changed(g.settings));

  return (
    <fieldset className="rc-design rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">Design</legend>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Sizes, spacing and margins of the printed sheet. A card that grows too long is shrunk to stay on one page.
        </p>
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={resetAll} disabled={!anyChanged}>
          Restore default design
        </Button>
      </div>
      <div className="space-y-2">
        {spec.map(({ group, settings }) => (
          <details key={group} className="group rounded-lg border border-slate-200 bg-white open:pb-3">
            <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-slate-800 select-none">
              <span>
                {group}
                {changed(settings) && (
                  <span className="ml-2 rounded-full bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700">changed</span>
                )}
              </span>
              <span className="text-xs text-slate-400 group-open:hidden">Show</span>
            </summary>
            <div className="grid gap-x-5 gap-y-3 px-3 pt-1 sm:grid-cols-2">
              {settings.map((s) =>
                s.type === "choice" ? (
                  <Field key={s.key} label={s.label} htmlFor={`rcd-${s.key}`} error={errors[`design.${s.key}`]}>
                    <SelectInput
                      id={`rcd-${s.key}`}
                      value={String(design[s.key])}
                      onChange={(e) => set(s.key, s.options.find((o) => String(o.value) === e.target.value)?.value ?? s.default)}
                    >
                      {s.options.map((o) => (
                        <option key={o.value} value={String(o.value)}>{o.label}</option>
                      ))}
                    </SelectInput>
                  </Field>
                ) : (
                  <RangeField
                    key={s.key}
                    id={`rcd-${s.key}`}
                    label={s.label}
                    value={design[s.key]}
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    unit={s.unit}
                    error={errors[`design.${s.key}`]}
                    onChange={(v) => set(s.key, v)}
                  />
                ),
              )}
            </div>
            {changed(settings) && (
              <div className="px-3 pt-3">
                <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => resetGroup(settings)}>
                  Reset {group.toLowerCase()}
                </Button>
              </div>
            )}
          </details>
        ))}
      </div>
    </fieldset>
  );
};

export default ReportCardDesignFields;
