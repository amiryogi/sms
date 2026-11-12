import React from "react";
import { formatCurrency, formatDate } from "../../../utils/format";
import { methodLabel } from "../financeLabels";
import { SchoolHeading, SignatureLine } from "./SlipParts";

/**
 * A student's fee statement on A4 portrait (GET /fees/accounts/:studentId):
 * per academic year the fees with their installments, approved discounts, the
 * payments and reversals, and the balance. Every figure comes from the API.
 */
const Money = ({ value }) => <span className="whitespace-nowrap tabular-nums">{value ? formatCurrency(value) : "—"}</span>;

const StatementSheet = ({ statement, school, printedOn = new Date() }) => {
  const latest = statement.years[0];

  return (
    <article className="statement-sheet mx-auto w-full max-w-[190mm] bg-white p-8 text-[9pt] leading-snug text-slate-900 shadow-card print:max-w-none print:p-0 print:shadow-none">
      <style>{"@media print { @page { size: A4 portrait; margin: 12mm; } }"}</style>
      <SchoolHeading school={school} title="Fee statement" />

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
        <div className="col-span-2">
          <span className="text-slate-600">Student: </span>
          <span className="font-semibold">{statement.student.name}</span>
        </div>
        <div>
          <span className="text-slate-600">Adm. no.: </span>
          <span className="font-semibold">{statement.student.admissionNumber}</span>
        </div>
        {latest && (
          <div>
            <span className="text-slate-600">Class: </span>
            <span className="font-semibold">
              {latest.class.name} {latest.section.name}
              {latest.rollNumber ? ` · Roll ${latest.rollNumber}` : ""}
            </span>
          </div>
        )}
      </div>

      {statement.years.length === 0 && <p className="mt-6 text-center">No fees have been set up for this student.</p>}

      {statement.years.map((y) => {
        const payments = statement.transactions.filter((t) => t.academicYear?.id === y.academicYear.id).slice().reverse();
        const discounts = statement.discounts.filter((d) => d.academicYearId === y.academicYear.id && d.status === "APPROVED");
        return (
          <section key={y.academicYear.id} className="statement-year mt-5 break-inside-avoid-page">
            <h2 className="border-b border-slate-700 pb-0.5 text-[10.5pt] font-bold">
              Academic year {y.academicYear.name}
              <span className="font-normal text-slate-600">
                {" "}
                · {y.class.name} {y.section.name}
              </span>
            </h2>

            <table className="mt-1.5 w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-500 text-left text-[8pt] uppercase">
                  <th className="py-1 font-semibold">Fee</th>
                  <th className="py-1 font-semibold">Due date</th>
                  <th className="py-1 text-right font-semibold">Amount</th>
                  <th className="py-1 text-right font-semibold">Discount</th>
                  <th className="py-1 text-right font-semibold">Paid</th>
                  <th className="py-1 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {y.fees.map((f) =>
                  f.cancelled ? (
                    <tr key={f.id} className="border-b border-slate-200 text-slate-500">
                      <td className="py-1 line-through" colSpan={5}>
                        {f.feeType?.name}
                      </td>
                      <td className="py-1 text-right">Waived</td>
                    </tr>
                  ) : (
                    f.installments.map((i, idx) => (
                      <tr key={i.id} className="border-b border-slate-200 align-top">
                        <td className="py-1 pr-2">
                          {idx === 0 ? <span className="font-medium">{f.feeType?.name}</span> : null}
                          {f.installments.length > 1 && <span className="text-slate-600">{idx === 0 ? " · " : ""}{i.label}</span>}
                        </td>
                        <td className="py-1 pr-2 whitespace-nowrap">
                          {i.dueDate ? formatDate(i.dueDate) : "—"}
                          {i.overdue && <span className="ml-1 font-bold">overdue</span>}
                        </td>
                        <td className="py-1 text-right"><Money value={i.amount} /></td>
                        <td className="py-1 text-right"><Money value={i.discount} /></td>
                        <td className="py-1 text-right"><Money value={i.paid} /></td>
                        <td className="py-1 text-right font-semibold"><Money value={i.balance} /></td>
                      </tr>
                    ))
                  ),
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 font-bold">
                  <td className="py-1" colSpan={2}>Total</td>
                  <td className="py-1 text-right"><Money value={y.totals.amount} /></td>
                  <td className="py-1 text-right"><Money value={y.totals.discount} /></td>
                  <td className="py-1 text-right"><Money value={y.totals.paid} /></td>
                  <td className="statement-balance py-1 text-right" data-year={y.academicYear.id}><Money value={y.totals.balance} /></td>
                </tr>
              </tfoot>
            </table>
            {y.totals.overdue > 0 && <p className="mt-0.5 text-[8pt] font-semibold">Overdue: {formatCurrency(y.totals.overdue)}</p>}

            {discounts.length > 0 && (
              <div className="mt-2">
                <h3 className="text-[8pt] font-bold uppercase">Discounts and scholarships</h3>
                <ul className="mt-0.5">
                  {discounts.map((d) => (
                    <li key={d.id} className="flex justify-between gap-3">
                      <span>
                        {d.name} ({d.kind === "PERCENT" ? `${Number(d.value)}%` : formatCurrency(d.value)} of {d.feeType?.name || "all fees"})
                      </span>
                      <Money value={d.appliedAmount} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-2">
              <h3 className="text-[8pt] font-bold uppercase">Payments</h3>
              {payments.length === 0 ? (
                <p className="mt-0.5 text-slate-600">No payments recorded.</p>
              ) : (
                <table className="mt-0.5 w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-400 text-left text-[8pt]">
                      <th className="py-0.5 font-semibold">Date</th>
                      <th className="py-0.5 font-semibold">Receipt</th>
                      <th className="py-0.5 font-semibold">Method</th>
                      <th className="py-0.5 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((t) => (
                      <tr key={t.id} className="border-b border-slate-200">
                        <td className="py-0.5 pr-2 whitespace-nowrap">{formatDate(t.paidOn)}</td>
                        <td className="py-0.5 pr-2 font-mono text-[8pt]">
                          {t.receiptNumber}
                          {t.type === "REVERSAL" && t.reverses && <span className="font-sans"> (reverses {t.reverses.receiptNumber})</span>}
                          {t.reversedBy && <span className="font-sans"> (reversed)</span>}
                        </td>
                        <td className="py-0.5 pr-2">{methodLabel(t.method)}</td>
                        <td className="py-0.5 text-right tabular-nums">
                          {t.type === "REVERSAL" ? "−" : ""}
                          {formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        );
      })}

      <footer className="mt-10 flex items-end justify-between text-[8pt] text-slate-600">
        <span>Printed on {formatDate(printedOn)}. Payments are never deleted, only reversed.</span>
        <SignatureLine label="Accounts" className="w-40 text-slate-900" />
      </footer>
    </article>
  );
};

export default StatementSheet;
