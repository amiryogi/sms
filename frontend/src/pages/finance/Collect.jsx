import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HandCoins, Wallet, Printer, UserRound, ArrowRight, CheckCircle2, ReceiptText, FilePlus2 } from "lucide-react";
import { feeService } from "../../api/feeService";
import { PageHeader, Card, CardHeader, Button, EmptyState, LoadingBlock, Avatar, Badge, toast } from "../../components/ui";
import StudentPicker from "../../components/finance/StudentPicker";
import FeeStatement from "../../components/finance/FeeStatement";
import PaymentDialog from "../../components/finance/PaymentDialog";
import { FeeStatusBadge } from "../../components/finance/FeeStatusBadge";
import { methodLabel } from "../../components/finance/financeLabels";
import { formatCurrency, formatDate } from "../../utils/format";

const Stat = ({ label, value, tone }) => (
  <div>
    <p className="text-xs text-slate-500">{label}</p>
    <p className={`text-lg font-semibold tabular-nums ${tone || "text-slate-900"}`}>{value}</p>
  </div>
);

/**
 * The fee counter: find a student, see what they owe this year, take a payment
 * and print the receipt. ?student=<id> opens a student directly.
 */
const Collect = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get("student");
  const [picked, setPicked] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await feeService.getStatement(studentId);
      setStatement(res.data);
    } catch (err) {
      setStatement(null);
      toast.error(err.response?.data?.message || "Could not load the student's fees");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const choose = (row) => {
    setPicked(row);
    setLastReceipt(null);
    setStatement(null);
    setSearchParams({ student: String(row.studentId) });
  };

  const year = statement?.years?.find((y) => y.academicYear.isCurrent) || statement?.years?.[0];
  const pickerValue =
    picked ||
    (statement && year
      ? { studentId: statement.student.id, name: statement.student.name, admissionNumber: statement.student.admissionNumber, class: year.class, section: year.section }
      : null);
  const recent = (statement?.transactions || []).filter((t) => t.academicYear?.id === year?.academicYear.id).slice(0, 5);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await feeService.generateStudentFees(year.studentClassId);
      toast.success(res.message || "Fees generated");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not generate fees");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader icon={HandCoins} title="Collect fees" description="Find a student, take a payment and print the receipt." />

      <Card>
        <StudentPicker value={pickerValue} onChange={choose} placeholder="Search by name, admission number or roll…" autoFocus={!studentId} />
      </Card>

      {lastReceipt && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-emerald-200 bg-emerald-50 px-5 py-4 animate-fade-in">
          <CheckCircle2 size={22} className="text-emerald-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-emerald-900">
              {formatCurrency(lastReceipt.amount)} received · {lastReceipt.receiptNumber}
            </p>
            <p className="text-sm text-emerald-800">
              {methodLabel(lastReceipt.method)}
              {lastReceipt.reference ? ` · ${lastReceipt.reference}` : ""}
            </p>
          </div>
          <Link
            to={`/finance/receipts/${lastReceipt.id}?print=1`}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Printer size={16} aria-hidden="true" /> Print receipt
          </Link>
        </div>
      )}

      {!studentId ? (
        <Card>
          <EmptyState icon={UserRound} title="Choose a student" description="Their fees for the current year appear here, ready to collect." />
        </Card>
      ) : loading && !statement ? (
        <Card><LoadingBlock text="Loading fees…" /></Card>
      ) : !year ? (
        <Card><EmptyState icon={UserRound} title="No enrolment" description="This student is not enrolled in any class." /></Card>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card padding="none" className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 px-5 py-4">
              <Avatar name={statement.student.name} size="md" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold text-slate-900">{statement.student.name}</h2>
                <p className="text-sm text-slate-500">
                  {year.class.name} {year.section.name}
                  {year.rollNumber ? ` · Roll ${year.rollNumber}` : ""} · {statement.student.admissionNumber} · {year.academicYear.name}
                </p>
              </div>
              <FeeStatusBadge status={year.status} />
            </div>

            {year.fees.length === 0 ? (
              <EmptyState
                icon={FilePlus2}
                title="No fees for this year yet"
                description="Generate them from the class's fee structures."
                action={<Button icon={FilePlus2} loading={generating} onClick={generate}>Generate fees</Button>}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 px-5 py-4 sm:grid-cols-4">
                  <Stat label="Total fees" value={formatCurrency(year.totals.amount)} />
                  <Stat label="Discounts" value={formatCurrency(year.totals.discount)} tone="text-emerald-700" />
                  <Stat label="Paid" value={formatCurrency(year.totals.paid)} />
                  <Stat label="Balance" value={formatCurrency(year.totals.balance)} tone={year.totals.overdue > 0 ? "text-red-600" : "text-slate-900"} />
                </div>
                <FeeStatement year={year} />
              </>
            )}
          </Card>

          <div className="space-y-4 lg:sticky lg:top-20">
            <Card>
              <p className="text-sm text-slate-500">Balance due</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900 tabular-nums">{formatCurrency(year.totals.balance)}</p>
              {year.totals.overdue > 0 && <p className="mt-1 text-sm font-medium text-red-600">{formatCurrency(year.totals.overdue)} overdue</p>}
              <Button className="mt-4 w-full" size="lg" icon={Wallet} disabled={year.totals.balance <= 0} onClick={() => setPaying(true)}>
                Record payment
              </Button>
              <Link
                to={`/finance/accounts/${statement.student.id}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                Full account, discounts and history <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </Card>

            <Card>
              <CardHeader title="Recent receipts" />
              {recent.length === 0 ? (
                <p className="text-sm text-slate-500">No payments this year yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {recent.map((t) => (
                    <li key={t.id} className="flex items-start gap-3 py-2.5">
                      <ReceiptText size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/finance/receipts/${t.id}`} className="block font-mono text-xs font-medium text-slate-800 hover:text-brand-700">
                          {t.receiptNumber}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          {formatDate(t.paidOn)} · {methodLabel(t.method)}
                          {t.reversedBy && <Badge tone="neutral">Reversed</Badge>}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${t.type === "REVERSAL" ? "text-red-600" : "text-slate-900"}`}>
                        {t.type === "REVERSAL" ? "−" : ""}
                        {formatCurrency(t.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {paying && year && (
        <PaymentDialog
          studentId={statement.student.id}
          studentName={statement.student.name}
          year={year}
          onClose={() => setPaying(false)}
          onPaid={(receipt) => {
            setPaying(false);
            setLastReceipt(receipt);
            load();
          }}
        />
      )}
    </div>
  );
};

export default Collect;
