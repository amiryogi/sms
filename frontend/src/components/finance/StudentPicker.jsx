import React, { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import * as Popover from "@radix-ui/react-popover";
import { ChevronsUpDown, Search, Loader2, UserRound } from "lucide-react";
import { feeService } from "../../api/feeService";
import { Avatar } from "../ui";
import { cn } from "../../lib/cn";
import { formatCurrency } from "../../utils/format";

/**
 * Find a student by name, admission number or roll. Searches the fee accounts
 * of an academic year (the current one by default) on the server, so the
 * list shows each student's class and balance.
 *
 * value: { studentId, name, class, section, admissionNumber } | null
 * onChange(row) receives the account row from GET /fees/accounts.
 */
const StudentPicker = ({ value, onChange, academicYearId, placeholder = "Find a student…", autoFocus = false, className }) => {
  const [open, setOpen] = useState(autoFocus);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return undefined;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await feeService.getAccounts({ search: query.trim() || undefined, academicYearId, limit: 20 });
        if (id === requestId.current) setRows(res.data || []);
      } catch {
        if (id === requestId.current) setRows([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [open, query, academicYearId]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 text-left text-sm shadow-xs transition-colors hover:border-slate-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:outline-none",
            className,
          )}
          aria-label={value ? `Student: ${value.name}. Change student` : placeholder}
        >
          {value ? (
            <>
              <Avatar name={value.name} src={value.avatarUrl} size="xs" />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-slate-900">{value.name}</span>
                <span className="ml-2 text-slate-500">
                  {value.class?.name} {value.section?.name} · {value.admissionNumber}
                </span>
              </span>
            </>
          ) : (
            <>
              <Search size={16} className="text-slate-400" aria-hidden="true" />
              <span className="flex-1 text-slate-400">{placeholder}</span>
            </>
          )}
          <ChevronsUpDown size={16} className="text-slate-400" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop animate-pop-in"
        >
          <Command shouldFilter={false} label="Find a student">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3">
              <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Name, admission no. or roll…"
                className="h-11 w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400 focus:ring-0"
              />
              {loading && <Loader2 size={16} className="shrink-0 animate-spin text-slate-400" aria-hidden="true" />}
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-1.5">
              {!loading && (
                <Command.Empty className="flex flex-col items-center gap-1 px-3 py-8 text-center text-sm text-slate-500">
                  <UserRound size={20} className="text-slate-300" aria-hidden="true" />
                  No students found
                </Command.Empty>
              )}
              {rows.map((r) => (
                <Command.Item
                  key={r.studentId}
                  value={String(r.studentId)}
                  onSelect={() => {
                    onChange(r);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm data-[selected=true]:bg-brand-50"
                >
                  <Avatar name={r.name} src={r.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{r.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {r.class?.name} {r.section?.name}
                      {r.rollNumber ? ` · Roll ${r.rollNumber}` : ""} · {r.admissionNumber}
                    </span>
                  </span>
                  <span className={cn("text-xs font-medium tabular-nums", r.balance > 0 ? "text-slate-900" : "text-emerald-700")}>
                    {r.status === "none" ? "No fees" : r.balance > 0 ? formatCurrency(r.balance) : "Paid up"}
                  </span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default StudentPicker;
