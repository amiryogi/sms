import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { feeService } from "../../api/feeService";
import { Card, EmptyState, LoadingBlock } from "../../components/ui";
import PrintToolbar from "../../components/finance/print/PrintToolbar";
import { SchoolHeading, SignatureLine } from "../../components/finance/print/SlipParts";
import { methodLabel, fullName } from "../../components/finance/financeLabels";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/format";

/**
 * The printed day book: every payment and reversal in a date range, oldest
 * first, with per-method totals, for closing the cash counter. Opened from the
 * Transactions ledger with its filters (?from=&to=&type=&method=&search=).
 * Every total comes from GET /fees/transactions/daybook.
 */
const Daybook = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const params = Object.fromEntries(searchParams.entries());
  const [state, setState] = useState({ data: null, error: "" });
  const key = searchParams.toString();

  useEffect(() => {
    let alive = true;
    // Opened without dates (a bookmark, a typed URL): today's day book.
    const today = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
    const query = { from: params.from || params.to || today, to: params.to || params.from || today };
    for (const k of ["type", "method", "search"]) if (params[k]) query[k] = params[k];
    feeService
      .getDaybook(query)
      .then((res) => alive && setState({ data: res.data, error: "" }))
      .catch((err) => alive && setState({ data: null, error: err.response?.data?.message || "Could not load the day book" }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const { data, error } = state;
  if (error) return <Card><EmptyState icon={BookOpen} title="Day book not available" description={error} /></Card>;

  const range = data && (data.from === data.to ? formatDate(data.from) : `${formatDate(data.from)} to ${formatDate(data.to)}`);
  const rangeBs = data && (data.from === data.to ? data.fromBs : `${data.fromBs} to ${data.toBs}`);
  const filters = [params.type && (params.type === "REVERSAL" ? "reversals only" : "payments only"), params.method && methodLabel(params.method), params.search && `"${params.search}"`].filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PrintToolbar ready={Boolean(data)} autoPrint={params.print === "1"} printLabel="Print day book" />
      {!data ? (
        <LoadingBlock text="Loading day book…" />
      ) : (
        <article className="daybook-sheet mx-auto w-full max-w-[190mm] bg-white p-8 text-[8.5pt] leading-snug text-slate-900 shadow-card print:max-w-none print:p-0 print:shadow-none">
          <style>{"@media print { @page { size: A4 portrait; margin: 10mm; } .daybook-sheet thead { display: table-header-group; } .daybook-sheet tr { break-inside: avoid; } }"}</style>
          <SchoolHeading school={user?.school} title="Fee collection day book" />
          <p className="mt-2 text-center text-[9pt]">
            <span className="font-semibold">{range}</span>
            {rangeBs && <span className="text-slate-600"> ({rangeBs} BS)</span>}
            {filters.length > 0 && <span className="text-slate-600"> · {filters.join(" · ")}</span>}
          </p>

          {data.rows.length === 0 ? (
            <p className="mt-6 text-center">No payments or reversals in this period.</p>
          ) : (
            <table className="mt-3 w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-700 text-left text-[7.5pt] uppercase">
                  <th className="py-1 pr-1 font-semibold">#</th>
                  <th className="py-1 pr-1 font-semibold">Date</th>
                  <th className="py-1 pr-1 font-semibold">Receipt</th>
                  <th className="py-1 pr-1 font-semibold">Student</th>
                  <th className="py-1 pr-1 font-semibold">Class</th>
                  <th className="py-1 pr-1 font-semibold">Method</th>
                  <th className="py-1 pr-1 text-right font-semibold">Amount</th>
                  <th className="py-1 pl-3 font-semibold">By</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={r.id} className="daybook-row border-b border-slate-200 align-top">
                    <td className="py-0.5 pr-1 text-slate-600 tabular-nums">{i + 1}</td>
                    <td className="py-0.5 pr-1 whitespace-nowrap">{formatDate(r.paidOn)}</td>
                    <td className="py-0.5 pr-1 font-mono text-[7.5pt]">
                      {r.receiptNumber}
                      {r.type === "REVERSAL" && r.reverses && <span className="block font-sans text-slate-600">reverses {r.reverses.receiptNumber}</span>}
                      {r.reversedBy && <span className="block font-sans text-slate-600">reversed by {r.reversedBy.receiptNumber}</span>}
                    </td>
                    <td className="py-0.5 pr-1">
                      {fullName(r.student?.user)}
                      <span className="block text-slate-600">{r.student?.admissionNumber}</span>
                    </td>
                    <td className="py-0.5 pr-1 whitespace-nowrap">
                      {r.studentClass?.class?.name} {r.studentClass?.section?.name}
                    </td>
                    <td className="py-0.5 pr-1">
                      {methodLabel(r.method)}
                      {r.reference && <span className="block font-mono text-[7pt] text-slate-600">{r.reference}</span>}
                    </td>
                    <td className="py-0.5 pr-1 text-right whitespace-nowrap tabular-nums">
                      {r.type === "REVERSAL" ? "−" : ""}
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="py-0.5 pl-3">{fullName(r.recordedBy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Totals and signatures stay together on one page. */}
          <div className="break-inside-avoid">
          <section className="mt-4">
            <h2 className="text-[8pt] font-bold uppercase">Totals</h2>
            <table className="mt-1 w-full max-w-md border-collapse">
              <thead>
                <tr className="border-b border-slate-500 text-left text-[7.5pt]">
                  <th className="py-0.5 font-semibold">Method</th>
                  <th className="py-0.5 text-right font-semibold">Entries</th>
                  <th className="py-0.5 text-right font-semibold">Received</th>
                  <th className="py-0.5 text-right font-semibold">Reversed</th>
                  <th className="py-0.5 text-right font-semibold">Net</th>
                </tr>
              </thead>
              <tbody>
                {data.totals.byMethod.map((m) => (
                  <tr key={m.method} className="border-b border-slate-200">
                    <td className="py-0.5">{methodLabel(m.method)}</td>
                    <td className="py-0.5 text-right tabular-nums">{m.count}</td>
                    <td className="py-0.5 text-right tabular-nums">{formatCurrency(m.payments)}</td>
                    <td className="py-0.5 text-right tabular-nums">{m.reversals ? `−${formatCurrency(m.reversals)}` : "—"}</td>
                    <td className="py-0.5 text-right font-semibold tabular-nums">{formatCurrency(m.net)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 font-bold">
                  <td className="py-1">Total</td>
                  <td className="py-1 text-right tabular-nums">{data.totals.overall.count}</td>
                  <td className="py-1 text-right tabular-nums">{formatCurrency(data.totals.overall.payments)}</td>
                  <td className="py-1 text-right tabular-nums">{data.totals.overall.reversals ? `−${formatCurrency(data.totals.overall.reversals)}` : "—"}</td>
                  <td className="daybook-net py-1 text-right tabular-nums">{formatCurrency(data.totals.overall.net)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <footer className="mt-12 flex items-end justify-between gap-6 text-[8pt]">
            <span className="text-slate-600">Printed {formatDateTime(new Date())} by {fullName(user)}</span>
            <div className="flex gap-8">
              <SignatureLine label="Counted by" className="w-36" />
              <SignatureLine label="Checked by" className="w-36" />
            </div>
          </footer>
          </div>
        </article>
      )}
    </div>
  );
};

export default Daybook;
