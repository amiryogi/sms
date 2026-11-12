import React from "react";
import { formatCurrency, formatDate } from "../../../utils/format";
import { amountInWords } from "../financeLabels";
import { SchoolHeading, Pair, SignatureLine } from "./SlipParts";

/**
 * One student's fee bill / due notice, sized for a quarter of A4 (SlipSheet).
 * `bill` is one entry of GET /fees/bills (or /fees/bills/student/:id); every
 * amount and the overdue flags come from the API.
 */
const BillSlip = ({ bill, school, billDate, billDateBs, academicYear, dueBy }) => (
  <article className="bill-slip text-[8pt] leading-snug text-slate-900" data-student-id={bill.studentId}>
    <SchoolHeading school={school} title="Fee bill / Due notice" compact />

    <div className="mt-1.5 flex justify-between text-[7pt] text-slate-700">
      <span>
        Date: {formatDate(billDate)}
        {billDateBs && ` (${billDateBs} BS)`}
      </span>
      <span>{academicYear?.name}</span>
    </div>

    <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 rounded border border-slate-300 p-1.5">
      <Pair label="Name" className="col-span-2">{bill.name}</Pair>
      <Pair label="Class">
        {bill.class?.name} {bill.section?.name}
      </Pair>
      <Pair label="Roll">{bill.rollNumber ?? "—"}</Pair>
      <Pair label="Adm. no." className="col-span-2">{bill.admissionNumber}</Pair>
    </div>

    {bill.lines.length === 0 ? (
      <p className="mt-3 text-center font-semibold">Nothing is due. Thank you.</p>
    ) : (
      <table className="mt-1.5 w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-500 text-left text-[7pt] uppercase">
            <th className="py-0.5 font-semibold">Particulars</th>
            <th className="py-0.5 font-semibold">Due</th>
            <th className="py-0.5 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.lines.map((l, i) => (
            <tr key={i} className="border-b border-slate-200 align-top">
              <td className="py-0.5 pr-1">
                {l.feeType}
                {l.label && l.label !== "Full amount" && <span className="text-slate-600"> · {l.label}</span>}
              </td>
              <td className="py-0.5 pr-1 whitespace-nowrap">
                {l.dueDate ? formatDate(l.dueDate) : "Now"}
                {l.overdue && <span className="ml-0.5 font-bold">*</span>}
              </td>
              <td className="py-0.5 text-right whitespace-nowrap tabular-nums">{formatCurrency(l.balance)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-700 font-bold">
            <td className="py-1" colSpan={2}>
              Total due
            </td>
            <td className="bill-total py-1 text-right whitespace-nowrap tabular-nums">{formatCurrency(bill.totals.due)}</td>
          </tr>
        </tfoot>
      </table>
    )}

    {bill.lines.length > 0 && (
      <>
        <p className="mt-0.5 text-[7pt] italic">{amountInWords(bill.totals.due)}</p>
        {bill.totals.overdue > 0 && <p className="mt-0.5 text-[7pt] font-semibold">* Overdue: {formatCurrency(bill.totals.overdue)}</p>}
        <p className="mt-1 text-[7pt]">
          Please pay at the school office
          {bill.earliestDue ? ` by ${formatDate(bill.earliestDue)}` : ""}.
          {dueBy && ` Includes fees due by ${formatDate(dueBy)}.`}
        </p>
      </>
    )}

    <div className="mt-5 flex justify-end text-[7pt]">
      <SignatureLine label="Accounts" className="w-28" />
    </div>
  </article>
);

export default BillSlip;
