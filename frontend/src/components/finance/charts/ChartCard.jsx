import React, { useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Card } from "../../ui";
import { cn } from "../../../lib/cn";

/**
 * A titled chart with a "table" view of the same numbers, so nothing is
 * conveyed by colour or shape alone. `table` is [{ label, values: [..] }] with
 * `columns` naming the values.
 */
const ChartCard = ({ title, description, legend, columns, table, empty = false, emptyText = "Nothing to show yet", className, children }) => {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {!empty && table && (
          <div className="flex shrink-0 rounded-lg bg-slate-100 p-0.5" role="group" aria-label={`${title}: view`}>
            {[
              { v: false, icon: BarChart3, label: "Chart" },
              { v: true, icon: Table2, label: "Table" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={asTable === o.v}
                aria-label={`Show as ${o.label.toLowerCase()}`}
                onClick={() => setAsTable(o.v)}
                className={cn(
                  "inline-flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors",
                  asTable === o.v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <o.icon size={15} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>
      {legend && !asTable && !empty && <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">{legend}</div>}
      <div className="min-h-0 flex-1">
        {empty ? (
          <div className="flex h-full min-h-40 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">{emptyText}</div>
        ) : asTable ? (
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  {columns.map((c, i) => (
                    <th key={c} className={cn("px-3 py-2 font-medium", i > 0 && "text-right")}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.map((row) => (
                  <tr key={row.label}>
                    <td className="px-3 py-1.5 text-slate-700">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="px-3 py-1.5 text-right text-slate-900 tabular-nums">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
};

/** A legend entry: a colour swatch beside text in normal ink. */
export const LegendItem = ({ color, children }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="size-2.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
    {children}
  </span>
);

export default ChartCard;
