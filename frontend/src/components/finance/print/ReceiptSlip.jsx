import React from "react";
import { formatCurrency, formatDate, formatDateTime } from "../../../utils/format";
import { amountInWords, methodLabel, fullName } from "../financeLabels";
import { SchoolHeading, Pair, SignatureLine } from "./SlipParts";

/**
 * A payment receipt or reversal voucher sized for a quarter of A4 (SlipSheet).
 * Same facts as ReceiptSheet (the on-screen receipt), set small for printing.
 */
const ReceiptSlip = ({ receipt: r, school }) => {
  const isReversal = r.type === "REVERSAL";
  const reversed = !isReversal && r.reversedBy;
  const lines = r.allocations || [];
  return (
    <article className="receipt-slip relative text-[8pt] leading-snug text-slate-900">
      {(reversed || isReversal) && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex -rotate-24 items-center justify-center text-[30pt] font-black tracking-widest text-slate-900/10 uppercase select-none">
          {isReversal ? "Reversal" : "Reversed"}
        </div>
      )}
      <SchoolHeading school={school} title={isReversal ? "Reversal voucher" : "Payment receipt"} compact />

      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[9pt] font-bold">{r.receiptNumber}</span>
        <span className="text-right text-[7pt]">
          {formatDate(r.paidOn)}
          {r.paidOnBs && <span className="block">{r.paidOnBs} BS</span>}
        </span>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 rounded border border-slate-300 p-1.5">
        <Pair label={isReversal ? "Student" : "Received from"} className="col-span-2">{fullName(r.student?.user)}</Pair>
        <Pair label="Class">
          {r.studentClass?.class?.name} {r.studentClass?.section?.name}
        </Pair>
        <Pair label="Roll">{r.studentClass?.rollNumber ?? "—"}</Pair>
        <Pair label="Adm. no.">{r.student?.admissionNumber}</Pair>
        <Pair label="Year">{r.academicYear?.name}</Pair>
      </div>

      <table className="mt-1.5 w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-500 text-left text-[7pt] uppercase">
            <th className="py-0.5 font-semibold">Particulars</th>
            <th className="py-0.5 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-slate-200">
              <td className="py-0.5 pr-1">
                {l.installment?.obligation?.feeStructure?.feeType?.name}
                {l.installment?.label && l.installment.label !== "Full amount" && <span className="text-slate-600"> · {l.installment.label}</span>}
              </td>
              <td className="py-0.5 text-right tabular-nums">{formatCurrency(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-700 font-bold">
            <td className="py-1">{isReversal ? "Total reversed" : "Total received"}</td>
            <td className="py-1 text-right tabular-nums">{formatCurrency(r.amount)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-0.5 text-[7pt] italic">{amountInWords(r.amount)}</p>

      <div className="mt-1 text-[7pt]">
        <Pair label="Method">
          {methodLabel(r.method)}
          {r.reference ? ` · ${r.reference}` : ""}
        </Pair>
        {isReversal && r.reverses && (
          <p className="mt-0.5">
            Reverses {r.reverses.receiptNumber} of {formatDate(r.reverses.paidOn)}: {r.reversalReason}
          </p>
        )}
        {reversed && (
          <p className="mt-0.5 font-semibold">
            Reversed by {r.reversedBy.receiptNumber} on {formatDate(r.reversedBy.paidOn)}
          </p>
        )}
        {r.remarks && !isReversal && <p className="mt-0.5">Remarks: {r.remarks}</p>}
      </div>

      <div className="mt-5 flex justify-end text-[7pt]">
        <SignatureLine label="Authorised signature" className="w-32" />
      </div>
      <p className="mt-1.5 text-[6pt] text-slate-600">
        Recorded by {fullName(r.recordedBy)} · {formatDateTime(r.createdAt)}
      </p>
    </article>
  );
};

export default ReceiptSlip;
