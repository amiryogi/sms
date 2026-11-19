import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, Printer, FileText, CheckCircle2 } from "lucide-react";
import { feeService } from "../../api/feeService";
import { Card, CardHeader, Tabs, Badge, EmptyState, LoadingBlock, IconButton, buttonClasses } from "../ui";
import { Progress } from "../shadcn/progress";
import FeeStatement from "../finance/FeeStatement";
import { FeeStatusBadge } from "../finance/FeeStatusBadge";
import { methodLabel } from "../finance/financeLabels";
import { formatCurrency, formatDate } from "../../utils/format";

/**
 * A student's fees, as the school's ledger has them: what is due by when,
 * what has been paid (with receipts), approved discounts and the balance.
 * Read-only. receiptPath(id) builds the link to a receipt page; printPaths
 * ({ statement, bill }) the links to the printable statement and bill.
 * Shared by the student and parent portals.
 */
const FeesView = ({ studentId, receiptPath, printPaths }) => {
  const [statement, setStatement] = useState(null);
  const [error, setError] = useState("");
  const [yearId, setYearId] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    let alive = true;
    feeService
      .getStatement(studentId)
      .then((res) => alive && setStatement(res.data))
      .catch((err) => alive && setError(err.response?.data?.message || "Could not load fees"));
    return () => {
      alive = false;
    };
  }, [studentId]);

  if (error) return <Card><EmptyState icon={Wallet} title="Fees unavailable" description={error} /></Card>;
  if (!statement) return <Card><LoadingBlock text="Loading fees…" /></Card>;

  const years = statement.years;
  const year = years.find((y) => String(y.academicYear.id) === yearId) || years.find((y) => y.academicYear.isCurrent) || years[0];
  if (!year || year.fees.length === 0) {
    return <Card><EmptyState icon={Wallet} title="No fees yet" description="Fees for this year appear here once the school office sets them up." /></Card>;
  }

  const t = year.totals;
  const due = t.amount - t.discount;
  const paidPct = due > 0 ? Math.round((t.paid / due) * 1000) / 10 : 100;
  const receipts = statement.transactions.filter((x) => x.academicYear?.id === year.academicYear.id);
  const discounts = statement.discounts.filter((d) => d.academicYearId === year.academicYear.id && d.status === "APPROVED");
  const nextDue = year.fees
    .filter((f) => !f.cancelled)
    .flatMap((f) => f.installments.filter((i) => i.balance > 0).map((i) => ({ ...i, feeName: f.feeType?.name })))
    .sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")))[0];

  return (
    <div className="space-y-6">
      {printPaths && (
        <div className="flex flex-wrap justify-end gap-2">
          <Link className={buttonClasses({ variant: "secondary", size: "sm" })} to={printPaths.bill} data-guide="fees.printBill">
            <Printer size={14} aria-hidden="true" /> Print bill
          </Link>
          <Link className={buttonClasses({ variant: "secondary", size: "sm" })} to={printPaths.statement}>
            <FileText size={14} aria-hidden="true" /> Print statement
          </Link>
        </div>
      )}
      {years.length > 1 && (
        <Tabs value={String(year.academicYear.id)} onChange={setYearId} tabs={years.map((y) => ({ value: String(y.academicYear.id), label: y.academicYear.name }))} />
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Balance for {year.academicYear.name}</p>
              {/* Keep the text-3xl class: e2e/tests/smoke.spec.js reads this figure as `main .text-3xl`. */}
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{formatCurrency(t.balance)}</p>
              {t.overdue > 0 && <p className="mt-1 text-sm font-medium text-risk">{formatCurrency(t.overdue)} is overdue</p>}
            </div>
            <FeeStatusBadge status={year.status} />
          </div>
          <Progress value={paidPct} className="mt-4 h-1.5 bg-slate-100" indicatorClassName="bg-slate-700" aria-label={`${paidPct}% paid`} />
          <p className="mt-2 text-sm text-slate-600">
            {formatCurrency(t.paid)} paid of {formatCurrency(due)}
            {t.discount > 0 && <span> (after {formatCurrency(t.discount)} discount)</span>}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Next payment</p>
          {nextDue ? (
            <>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{formatCurrency(nextDue.balance)}</p>
              <p className="mt-1 text-sm text-slate-600">
                {nextDue.feeName}, {nextDue.label}
              </p>
              <p className={nextDue.overdue ? "text-sm font-medium text-risk" : "text-sm text-slate-500"}>
                {nextDue.dueDate ? `${nextDue.overdue ? "Was due" : "Due"} ${formatDate(nextDue.dueDate)}` : "No due date"}
              </p>
            </>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-lg font-semibold text-ok">
              <CheckCircle2 size={18} aria-hidden="true" /> All paid for this year
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">Pay at the school office. You will get a receipt for every payment.</p>
        </Card>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-slate-900">Fees and due dates</h2>
        </div>
        <FeeStatement year={year} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-guide="fees.receipts">
          <CardHeader title="Receipts" />
          {receipts.length === 0 ? (
            <p className="text-sm text-slate-500">No payments recorded for this year. A receipt appears here for each payment made at the school office.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {receipts.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link to={receiptPath(r.id)} className="font-mono text-xs font-medium text-slate-800 hover:text-brand-700">
                      {r.receiptNumber}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {formatDate(r.paidOn)}, {methodLabel(r.method)}
                    </p>
                  </div>
                  {r.type === "REVERSAL" && <Badge tone="danger">Reversal</Badge>}
                  {r.reversedBy && <Badge tone="neutral">Reversed</Badge>}
                  <span className={`text-sm font-semibold tabular-nums ${r.type === "REVERSAL" ? "text-risk" : "text-slate-900"}`}>
                    {r.type === "REVERSAL" ? "−" : ""}
                    {formatCurrency(r.amount)}
                  </span>
                  <IconButton icon={Printer} label={`Print ${r.receiptNumber}`} to={`${receiptPath(r.id)}${receiptPath(r.id).includes("?") ? "&" : "?"}print=1`} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Discounts and scholarships" />
          {discounts.length === 0 ? (
            <p className="text-sm text-slate-500">None for this year. Approved discounts and scholarships appear here.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {discounts.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{d.name}</p>
                    <p className="text-xs text-slate-500">
                      {d.kind === "PERCENT" ? `${Number(d.value)}%` : formatCurrency(d.value)} of {d.feeType?.name || "all fees"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">−{formatCurrency(d.appliedAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default FeesView;
