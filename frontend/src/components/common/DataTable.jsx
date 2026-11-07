import React from "react";
import { ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import { cn } from "../../lib/cn";
import { Skeleton, EmptyState } from "../ui/Feedback";

/**
 * Card-wrapped table with optional search, toolbar actions and pagination.
 * Props are unchanged from the original:
 *   columns [{ header, accessor, render(row), width, className }]
 *   data, loading, pagination { page, limit, total, totalPages }, onPageChange,
 *   searchValue, onSearchChange, emptyMessage, actions
 * New, optional: searchPlaceholder, emptyIcon, emptyDescription, toolbar
 * (extra filters next to search), bare (no card chrome).
 */
const DataTable = ({
  columns,
  data = [],
  loading = false,
  pagination = null,
  onPageChange = null,
  searchValue = "",
  onSearchChange = null,
  emptyMessage = "No records found",
  emptyDescription,
  emptyIcon = Inbox,
  searchPlaceholder = "Search…",
  actions = null,
  toolbar = null,
  bare = false,
  rowKey = (row, i) => row.id ?? i,
  className,
}) => {
  const hasToolbar = onSearchChange || actions || toolbar;
  const from = pagination ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const to = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  return (
    <div className={cn(!bare && "overflow-hidden rounded-[var(--radius-card)] border border-slate-200/80 bg-white shadow-[var(--shadow-card)]", className)}>
      {hasToolbar && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {onSearchChange && (
              <div className="relative w-full sm:max-w-xs">
                <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none"
                />
              </div>
            )}
            {toolbar}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={cn("border-b border-slate-200 px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase", col.headerClassName)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }, (_, r) => (
                <tr key={`sk-${r}`}>
                  {columns.map((_, c) => (
                    <td key={c} className="px-4 py-3.5">
                      <Skeleton className={cn("h-4", c === 0 ? "w-3/4" : "w-1/2")} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState icon={emptyIcon} title={emptyMessage} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowKey(row, rowIndex)} className="transition-colors hover:bg-slate-50/70">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className={cn("px-4 py-3 align-middle text-slate-700", col.className)}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row">
          <span>
            Showing <span className="font-medium text-slate-700">{from}</span>–<span className="font-medium text-slate-700">{to}</span> of{" "}
            <span className="font-medium text-slate-700">{pagination.total}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 ring-1 ring-slate-200 ring-inset hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="min-w-16 text-center text-xs">
              Page <span className="font-semibold text-slate-700">{pagination.page}</span> of {Math.max(1, pagination.totalPages || 1)}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={pagination.page >= (pagination.totalPages || 1)}
              onClick={() => onPageChange?.(pagination.page + 1)}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 ring-1 ring-slate-200 ring-inset hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
