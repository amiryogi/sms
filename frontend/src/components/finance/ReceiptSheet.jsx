import React from "react";
import { cn } from "../../lib/cn";
import { resolveAssetUrl } from "../../utils/assets";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/format";
import { amountInWords, methodLabel, fullName } from "./financeLabels";

/**
 * A payment or reversal receipt on screen (GET /fees/transactions/:id).
 * Printing uses print/ReceiptSlip.jsx, a quarter-A4 slip with the same facts.
 */
const ReceiptSheet = ({ receipt, school }) => {
  const r = receipt;
  const isReversal = r.type === "REVERSAL";
  const reversed = !isReversal && r.reversedBy;
  const student = r.student;
  const lines = r.allocations || [];

  return (
    <article className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-card border border-slate-300 bg-white p-8 text-slate-900 shadow-card print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      {(reversed || isReversal) && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex -rotate-24 items-center justify-center text-7xl font-black tracking-widest text-red-600/10 uppercase select-none"
        >
          {isReversal ? "Reversal" : "Reversed"}
        </div>
      )}

      <header className="flex items-start gap-4 border-b border-slate-300 pb-4">
        {/* The logo only when the school has one; no placeholder box. */}
        {school?.logoUrl && <img src={resolveAssetUrl(school.logoUrl)} alt="" className="size-16 shrink-0 object-contain" />}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{school?.name}</h1>
          {school?.address && <p className="text-sm text-slate-600">{school.address}</p>}
          <p className="text-xs text-slate-600">{[school?.phone, school?.landlineNumber, school?.email].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right">
          <p className={cn("text-sm font-bold tracking-wide uppercase", isReversal && "text-red-700")}>{isReversal ? "Reversal voucher" : "Payment receipt"}</p>
          <p className="mt-1 font-mono text-base font-semibold">{r.receiptNumber}</p>
          <p className="text-xs text-slate-600">FY {r.fiscalYear}</p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 py-4 text-sm sm:grid-cols-3">
        <div className="col-span-2">
          <dt className="text-xs text-slate-500">Received from</dt>
          <dd className="font-semibold">{fullName(student?.user)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Date</dt>
          <dd className="font-semibold">
            {formatDate(r.paidOn)}
            {r.paidOnBs && <span className="block text-xs font-normal text-slate-600">{r.paidOnBs} BS</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Admission no.</dt>
          <dd className="font-medium">{student?.admissionNumber}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Class</dt>
          <dd className="font-medium">
            {r.studentClass?.class?.name} {r.studentClass?.section?.name}
            {r.studentClass?.rollNumber ? ` · Roll ${r.studentClass.rollNumber}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Academic year</dt>
          <dd className="font-medium">{r.academicYear?.name}</dd>
        </div>
      </dl>

      <table className="w-full border-y border-slate-300 text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 uppercase">
            <th className="py-2 font-medium">Particulars</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {lines.map((l, idx) => (
            <tr key={idx}>
              <td className="py-2">
                {l.installment?.obligation?.feeStructure?.feeType?.name}
                {l.installment?.label && l.installment.label !== "Full amount" && <span className="text-slate-500"> · {l.installment.label}</span>}
              </td>
              <td className="py-2 text-right tabular-nums">{formatCurrency(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-300 font-bold">
            <td className="py-2">{isReversal ? "Total reversed" : "Total received"}</td>
            <td className="py-2 text-right tabular-nums">{formatCurrency(r.amount)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-2 text-sm italic">{amountInWords(r.amount)}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Method</dt>
          <dd className="font-medium">{methodLabel(r.method)}</dd>
        </div>
        {r.reference && (
          <div>
            <dt className="text-xs text-slate-500">Reference</dt>
            <dd className="font-mono">{r.reference}</dd>
          </div>
        )}
        {isReversal && r.reverses && (
          <div className="col-span-2">
            <dt className="text-xs text-slate-500">Reverses</dt>
            <dd className="font-medium">
              {r.reverses.receiptNumber} of {formatDate(r.reverses.paidOn)} · {r.reversalCategory === "REFUND" ? "Refund" : "Correction"}: {r.reversalReason}
            </dd>
          </div>
        )}
        {reversed && (
          <div className="col-span-2 rounded-lg border border-red-300 bg-red-50 p-2 text-red-800 print:bg-white">
            <dt className="text-xs font-semibold uppercase">This payment was reversed</dt>
            <dd className="text-sm">
              by {r.reversedBy.receiptNumber} on {formatDate(r.reversedBy.paidOn)}: {r.reversedBy.reversalReason}
            </dd>
          </div>
        )}
        {r.remarks && !isReversal && (
          <div className="col-span-2">
            <dt className="text-xs text-slate-500">Remarks</dt>
            <dd>{r.remarks}</dd>
          </div>
        )}
      </dl>

      <footer className="mt-14 text-xs text-slate-600">
        <div className="flex justify-end">
          <p className="w-52 border-t border-slate-400 pt-1 text-center whitespace-nowrap">Authorised signature</p>
        </div>
        <p className="mt-6 border-t border-dashed border-slate-200 pt-2">
          Recorded by {fullName(r.recordedBy)} · {formatDateTime(r.createdAt)}. Keep this receipt; payments are never deleted, only reversed.
        </p>
      </footer>
    </article>
  );
};

export default ReceiptSheet;
