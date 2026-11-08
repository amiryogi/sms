import React from "react";
import { Ban, CalendarClock } from "lucide-react";
import { IconButton } from "../ui";
import { cn } from "../../lib/cn";
import { formatCurrency, formatDate } from "../../utils/format";
import { FeeStatusBadge } from "./FeeStatusBadge";

/**
 * One academic year of a student's fees, from GET /fees/accounts/:studentId
 * (`years[n]`). Each fee shows its installments when it has a schedule.
 * Read-only unless onCancelFee is given (admins waive an unpaid fee).
 */
const Money = ({ value, muted = false, className }) => (
  <span className={cn("whitespace-nowrap tabular-nums", muted && !value ? "text-slate-300" : "", className)}>{value ? formatCurrency(value) : "—"}</span>
);

const FeeStatement = ({ year, onCancelFee }) => {
  if (!year) return null;
  const hasSchedule = (fee) => fee.installments.length > 1 || fee.installments.some((i) => i.dueDate);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-2.5 font-medium">Fee</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount</th>
            <th className="px-4 py-2.5 text-right font-medium">Discount</th>
            <th className="px-4 py-2.5 text-right font-medium">Paid</th>
            <th className="px-4 py-2.5 text-right font-medium">Balance</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            {onCancelFee && <th className="w-12 px-2 py-2.5"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {year.fees.map((fee) => (
            <React.Fragment key={fee.id}>
              <tr className={cn("border-t border-slate-100", fee.cancelled && "text-slate-400")}>
                <td className="px-4 py-3">
                  <p className={cn("font-medium text-slate-900", fee.cancelled && "text-slate-400 line-through")}>{fee.feeType?.name}</p>
                  {fee.cancelled && fee.cancelReason && <p className="text-xs text-slate-500">Cancelled: {fee.cancelReason}</p>}
                  {!hasSchedule(fee) && !fee.cancelled && <p className="text-xs text-slate-500">One payment, no due date</p>}
                </td>
                <td className="px-4 py-3 text-right"><Money value={fee.amount} /></td>
                <td className="px-4 py-3 text-right text-emerald-700"><Money value={fee.discount} muted /></td>
                <td className="px-4 py-3 text-right"><Money value={fee.paid} muted /></td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900"><Money value={fee.balance} muted /></td>
                <td className="px-4 py-3"><FeeStatusBadge status={fee.status} overdue={fee.overdue} /></td>
                {onCancelFee && (
                  <td className="px-2 py-3 text-right">
                    {!fee.cancelled && fee.paid === 0 && (
                      <IconButton icon={Ban} size="sm" label={`Cancel ${fee.feeType?.name}`} onClick={() => onCancelFee(fee)} />
                    )}
                  </td>
                )}
              </tr>
              {hasSchedule(fee) &&
                !fee.cancelled &&
                fee.installments.map((i) => (
                  <tr key={i.id} className="text-xs text-slate-600">
                    <td className="py-1.5 pr-4 pl-8">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock size={13} className={i.overdue ? "text-red-500" : "text-slate-400"} aria-hidden="true" />
                        {i.label}
                        {i.dueDate && <span className={cn("text-slate-400", i.overdue && "font-medium text-red-600")}>· due {formatDate(i.dueDate)}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-right"><Money value={i.amount} /></td>
                    <td className="px-4 py-1.5 text-right text-emerald-700"><Money value={i.discount} muted /></td>
                    <td className="px-4 py-1.5 text-right"><Money value={i.paid} muted /></td>
                    <td className="px-4 py-1.5 text-right font-medium text-slate-800"><Money value={i.balance} muted /></td>
                    <td className="px-4 py-1.5"><FeeStatusBadge status={i.status} overdue={i.overdue} /></td>
                    {onCancelFee && <td />}
                  </tr>
                ))}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-slate-50/60 font-semibold text-slate-900">
            <td className="px-4 py-3">Total</td>
            <td className="px-4 py-3 text-right"><Money value={year.totals.amount} /></td>
            <td className="px-4 py-3 text-right text-emerald-700"><Money value={year.totals.discount} muted /></td>
            <td className="px-4 py-3 text-right"><Money value={year.totals.paid} muted /></td>
            <td className="px-4 py-3 text-right"><Money value={year.totals.balance} muted /></td>
            <td className="px-4 py-3" colSpan={onCancelFee ? 2 : 1}>
              {year.totals.overdue > 0 && <span className="text-xs font-medium text-red-600">{formatCurrency(year.totals.overdue)} overdue</span>}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default FeeStatement;
