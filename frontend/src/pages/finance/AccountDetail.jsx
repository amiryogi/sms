import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Wallet, BadgePercent, ReceiptText, Undo2, CheckCircle2, XCircle, Ban, UserRound, MoreHorizontal, Printer, FileText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { feeService } from "../../api/feeService";
import { PageHeader, Card, CardHeader, Button, IconButton, Tabs, Badge, EmptyState, LoadingBlock, Menu, MenuItem, toast, buttonClasses } from "../../components/ui";
import FeeStatement from "../../components/finance/FeeStatement";
import PaymentDialog from "../../components/finance/PaymentDialog";
import DiscountDialog from "../../components/finance/DiscountDialog";
import ReasonDialog from "../../components/finance/ReasonDialog";
import { FeeStatusBadge, ApprovalBadge } from "../../components/finance/FeeStatusBadge";
import { REVERSAL_CATEGORIES, methodLabel, fullName } from "../../components/finance/financeLabels";
import { formatCurrency, formatDate } from "../../utils/format";

const Stat = ({ label, value, sub, tone = "text-slate-900" }) => (
  <Card padding="sm">
    <p className="text-sm text-slate-500">{label}</p>
    <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
  </Card>
);

/** One student's fee account: fees, payments, reversals and discounts by year. */
const AccountDetail = () => {
  const { studentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const [statement, setStatement] = useState(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null); // { kind, target }

  const load = useCallback(
    () =>
      feeService
        .getStatement(studentId)
        .then((res) => {
          setStatement(res.data);
          setError("");
        })
        .catch((err) => setError(err.response?.data?.message || "Could not load this account")),
    [studentId],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState icon={UserRound} title="Account not available" description={error} />
      </Card>
    );
  }
  if (!statement) return <LoadingBlock text="Loading account…" />;

  const yearParam = searchParams.get("year");
  const year =
    statement.years.find((y) => String(y.academicYear.id) === yearParam) ||
    statement.years.find((y) => y.academicYear.isCurrent) ||
    statement.years[0];
  const yearId = year?.academicYear.id;
  const transactions = statement.transactions.filter((t) => t.academicYear?.id === yearId);
  const discounts = statement.discounts.filter((d) => d.academicYearId === yearId);
  const close = () => setDialog(null);
  const done = (message) => {
    if (message) toast.success(message);
    close();
    load();
  };

  const decideDiscount = async (d, action) => {
    const res = await feeService[action === "approve" ? "approveDiscount" : "rejectDiscount"](d.id, {});
    done(res.message);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        icon={UserRound}
        title={statement.student.name}
        description={
          year
            ? `${year.class.name} ${year.section.name}${year.rollNumber ? ` · Roll ${year.rollNumber}` : ""} · ${statement.student.admissionNumber}`
            : statement.student.admissionNumber
        }
        actions={
          year && (
            <>
              <Link className={buttonClasses({ variant: "secondary" })} to={`/finance/accounts/${studentId}/statement`}>
                <FileText size={16} aria-hidden="true" /> Print statement
              </Link>
              <Link className={buttonClasses({ variant: "secondary" })} to={`/finance/accounts/${studentId}/bill`}>
                <Printer size={16} aria-hidden="true" /> Print bill
              </Link>
              <Button variant="secondary" icon={BadgePercent} onClick={() => setDialog({ kind: "discount" })}>Request discount</Button>
              <Button icon={Wallet} disabled={year.totals.balance <= 0} onClick={() => setDialog({ kind: "pay" })}>Record payment</Button>
            </>
          )
        }
      />

      {statement.years.length > 1 && (
        <Tabs
          value={String(yearId)}
          onChange={(v) => setSearchParams({ year: v })}
          tabs={statement.years.map((y) => ({ value: String(y.academicYear.id), label: y.academicYear.name }))}
        />
      )}

      {!year ? (
        <Card><EmptyState icon={UserRound} title="Not enrolled" description="This student has no enrolment yet." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Stat label="Total fees" value={formatCurrency(year.totals.amount)} sub={`${year.fees.filter((f) => !f.cancelled).length} fee${year.fees.filter((f) => !f.cancelled).length === 1 ? "" : "s"} · ${year.academicYear.name}`} />
            <Stat label="Discounts" value={formatCurrency(year.totals.discount)} tone="text-emerald-700" sub={`${discounts.filter((d) => d.status === "APPROVED").length} approved`} />
            <Stat label="Paid" value={formatCurrency(year.totals.paid)} sub={`${transactions.filter((t) => t.type === "PAYMENT" && !t.reversedBy).length} payments`} />
            <Stat
              label="Balance"
              value={formatCurrency(year.totals.balance)}
              tone={year.totals.overdue > 0 ? "text-red-600" : "text-slate-900"}
              sub={year.totals.overdue > 0 ? `${formatCurrency(year.totals.overdue)} overdue` : year.totals.balance > 0 ? "Nothing overdue" : "Settled"}
            />
          </div>

          <Card padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Fees</h2>
              <FeeStatusBadge status={year.status} />
            </div>
            {year.fees.length ? (
              <FeeStatement year={year} onCancelFee={isAdmin ? (fee) => setDialog({ kind: "cancel", target: fee }) : undefined} />
            ) : (
              <EmptyState title="No fees for this year" description="Generate them from Student accounts → Generate fees." />
            )}
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Payments and reversals</h2>
            </div>
            {transactions.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-slate-500">Nothing recorded for this year.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Receipt</th>
                      <th className="px-4 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 font-medium">Method</th>
                      <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                      <th className="px-4 py-2.5 font-medium">Recorded by</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((t) => {
                      const reversal = t.type === "REVERSAL";
                      return (
                        <tr key={t.id} className={reversal ? "bg-red-50/40" : ""}>
                          <td className="px-5 py-3">
                            <Link to={`/finance/receipts/${t.id}`} className="font-mono text-xs font-medium text-slate-800 hover:text-brand-700">
                              {t.receiptNumber}
                            </Link>
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {reversal && <Badge tone="danger">Reversal of {t.reverses?.receiptNumber}</Badge>}
                              {t.reversedBy && <Badge tone="neutral">Reversed by {t.reversedBy.receiptNumber}</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(t.paidOn)}</td>
                          <td className="px-4 py-3">
                            {methodLabel(t.method)}
                            {t.reference && <span className="block font-mono text-xs text-slate-500">{t.reference}</span>}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold tabular-nums ${reversal ? "text-red-600" : "text-slate-900"}`}>
                            {reversal ? "−" : ""}
                            {formatCurrency(t.amount)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{fullName(t.recordedBy)}</td>
                          <td className="px-2 py-3 text-right">
                            <Menu
                              trigger={({ toggle, ...aria }) => (
                                <button
                                  type="button"
                                  onClick={toggle}
                                  {...aria}
                                  aria-label={`Actions for ${t.receiptNumber}`}
                                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                >
                                  <MoreHorizontal size={18} aria-hidden="true" />
                                </button>
                              )}
                            >
                              <MenuItem icon={ReceiptText} as={Link} to={`/finance/receipts/${t.id}`}>View receipt</MenuItem>
                              <MenuItem icon={Printer} as={Link} to={`/finance/receipts/${t.id}?print=1`}>Print receipt</MenuItem>
                              {!reversal && !t.reversedBy && (
                                <MenuItem icon={Undo2} onClick={() => setDialog({ kind: "reverse", target: t })}>
                                  {isAdmin ? "Reverse payment" : "Request reversal"}
                                </MenuItem>
                              )}
                            </Menu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Discounts and scholarships" description="Only approved ones reduce the balance." />
            {discounts.length === 0 ? (
              <p className="text-sm text-slate-500">None for this year.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {discounts.map((d) => {
                  const own = d.requestedBy?.id === user?.id;
                  return (
                    <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">
                          {d.name}{" "}
                          <span className="font-normal text-slate-500">
                            · {d.kind === "PERCENT" ? `${Number(d.value)}%` : formatCurrency(d.value)} of {d.feeType?.name || "all fees"}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {d.category === "SCHOLARSHIP" ? "Scholarship" : "Discount"} · requested by {fullName(d.requestedBy)} · {d.reason}
                        </p>
                        {d.status === "APPROVED" && <p className="text-xs text-emerald-700">Applied {formatCurrency(d.appliedAmount)}</p>}
                        {d.status === "REVOKED" && <p className="text-xs text-slate-500">Revoked: {d.revokeReason}</p>}
                      </div>
                      <ApprovalBadge status={d.status} />
                      {isAdmin && d.status === "PENDING" && !own && (
                        <>
                          <Button size="sm" icon={CheckCircle2} onClick={() => decideDiscount(d, "approve").catch((e) => toast.error(e.response?.data?.message || "Could not approve"))}>Approve</Button>
                          <Button size="sm" variant="secondary" icon={XCircle} onClick={() => setDialog({ kind: "rejectDiscount", target: d })}>Reject</Button>
                        </>
                      )}
                      {isAdmin && d.status === "PENDING" && own && <span className="text-xs text-slate-500">Another admin must approve</span>}
                      {isAdmin && d.status === "APPROVED" && (
                        <IconButton icon={Ban} label={`Revoke ${d.name}`} onClick={() => setDialog({ kind: "revokeDiscount", target: d })} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      {dialog?.kind === "pay" && (
        <PaymentDialog studentId={statement.student.id} studentName={statement.student.name} year={year} onClose={close} onPaid={() => done()} />
      )}
      {dialog?.kind === "discount" && (
        <DiscountDialog
          student={{ studentId: statement.student.id, name: statement.student.name }}
          academicYearId={yearId}
          onClose={close}
          onSaved={() => done()}
        />
      )}
      {dialog?.kind === "reverse" && (
        <ReasonDialog
          title={isAdmin ? `Reverse ${dialog.target.receiptNumber}?` : `Request reversal of ${dialog.target.receiptNumber}`}
          description={`${formatCurrency(dialog.target.amount)} paid on ${formatDate(dialog.target.paidOn)}. ${
            isAdmin ? "The payment stays on record; a reversal entry dated today cancels it." : "An administrator must approve it."
          }`}
          categories={REVERSAL_CATEGORIES}
          confirmLabel={isAdmin ? "Reverse payment" : "Send request"}
          tone="danger"
          onClose={close}
          onSubmit={async ({ text, category }) => {
            const body = { reason: text, category };
            const res = isAdmin ? await feeService.reverseTransaction(dialog.target.id, body) : await feeService.requestReversal(dialog.target.id, body);
            done(res.message);
          }}
        />
      )}
      {dialog?.kind === "cancel" && (
        <ReasonDialog
          title={`Cancel ${dialog.target.feeType?.name}?`}
          description="The fee stops counting towards what the student owes. Allowed only while nothing has been paid on it."
          confirmLabel="Cancel fee"
          tone="danger"
          onClose={close}
          onSubmit={async ({ text }) => done((await feeService.cancelObligation(dialog.target.id, { reason: text })).message)}
        />
      )}
      {dialog?.kind === "rejectDiscount" && (
        <ReasonDialog
          title={`Reject ${dialog.target.name}?`}
          label="Note for the requester"
          required={false}
          confirmLabel="Reject"
          onClose={close}
          onSubmit={async ({ text }) => done((await feeService.rejectDiscount(dialog.target.id, { note: text || undefined })).message)}
        />
      )}
      {dialog?.kind === "revokeDiscount" && (
        <ReasonDialog
          title={`Revoke ${dialog.target.name}?`}
          description="The discount comes off the student's fees and their balance goes back up."
          confirmLabel="Revoke"
          tone="danger"
          onClose={close}
          onSubmit={async ({ text }) => done((await feeService.revokeDiscount(dialog.target.id, { reason: text })).message)}
        />
      )}
    </div>
  );
};

export default AccountDetail;
