import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ReceiptText, Undo2, CheckCircle2, XCircle, Inbox, Printer, BookOpen } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DataTable from "../../components/common/DataTable";
import { feeService } from "../../api/feeService";
import { PageHeader, Tabs, Badge, Button, Card, EmptyState, LoadingBlock, SelectInput, TextInput, toast } from "../../components/ui";
import ReasonDialog from "../../components/finance/ReasonDialog";
import { ApprovalBadge } from "../../components/finance/FeeStatusBadge";
import { PAYMENT_METHODS, methodLabel, fullName } from "../../components/finance/financeLabels";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/format";

const signed = (t) => (
  <span className={`font-semibold tabular-nums ${t.type === "REVERSAL" ? "text-red-600" : "text-slate-900"}`}>
    {t.type === "REVERSAL" ? "−" : ""}
    {formatCurrency(t.amount)}
  </span>
);

/** Every payment and reversal, newest first. The ledger is append-only. */
const Ledger = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ from: "", to: "", type: "", method: "", search: "" });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, page: pagination.page, limit: pagination.limit };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await feeService.getTransactions(params);
      setRows(res.data || []);
      if (res.pagination) setPagination((p) => ({ ...p, total: res.pagination.total, totalPages: res.pagination.totalPages || 1 }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load transactions");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    const t = setTimeout(load, filters.search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, filters.search]);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const columns = [
    {
      header: "Receipt",
      render: (t) => (
        <div>
          <Link to={`/finance/receipts/${t.id}`} className="font-mono text-xs font-medium text-slate-800 hover:text-brand-700">{t.receiptNumber}</Link>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {t.type === "REVERSAL" && <Badge tone="danger">Reversal</Badge>}
            {t.reversedBy && <Badge tone="neutral">Reversed</Badge>}
          </div>
        </div>
      ),
    },
    { header: "Date", render: (t) => <span className="whitespace-nowrap">{formatDate(t.paidOn)}</span> },
    {
      header: "Student",
      className: "col-name",
      render: (t) => (
        <Link to={`/finance/accounts/${t.studentId}`} className="min-w-0 hover:text-brand-700">
          <span className="block truncate font-medium text-slate-900">{fullName(t.student?.user)}</span>
          <span className="block text-xs text-slate-500">
            {t.studentClass?.class?.name} {t.studentClass?.section?.name} · {t.student?.admissionNumber}
          </span>
        </Link>
      ),
    },
    {
      header: "Method",
      render: (t) => (
        <span>
          {methodLabel(t.method)}
          {t.reference && <span className="block font-mono text-xs text-slate-500">{t.reference}</span>}
        </span>
      ),
    },
    { header: <span className="block text-right">Amount</span>, render: (t) => <p className="text-right">{signed(t)}</p> },
    { header: "Recorded by", render: (t) => <span className="text-slate-600">{fullName(t.recordedBy)}</span> },
    {
      header: <span className="sr-only">Print</span>,
      render: (t) => (
        <Link
          to={`/finance/receipts/${t.id}?print=1`}
          aria-label={`Print ${t.receiptNumber}`}
          title="Print receipt"
          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-700"
        >
          <Printer size={16} aria-hidden="true" />
        </Link>
      ),
    },
  ];

  // The day book prints this ledger as filtered; with no dates, today.
  const printDaybook = () => {
    const today = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD (toISOString would be UTC)
    const q = new URLSearchParams({ from: filters.from || filters.to || today, to: filters.to || filters.from || today });
    for (const k of ["type", "method", "search"]) if (filters[k]) q.set(k, filters[k]);
    navigate(`/finance/daybook?${q}`);
  };

  return (
    <DataTable
      columns={columns}
      data={rows}
      loading={loading}
      searchValue={filters.search}
      onSearchChange={(v) => setFilter("search", v)}
      searchPlaceholder="Receipt, reference, student…"
      actions={<Button variant="secondary" icon={BookOpen} onClick={printDaybook}>Print day book</Button>}
      toolbar={
        <>
          <TextInput type="date" aria-label="From date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} wrapperClassName="w-full sm:w-auto" />
          <TextInput type="date" aria-label="To date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} wrapperClassName="w-full sm:w-auto" />
          <div className="w-full sm:w-36">
            <SelectInput aria-label="Type" value={filters.type} onChange={(e) => setFilter("type", e.target.value)}>
              <option value="">All entries</option>
              <option value="PAYMENT">Payments</option>
              <option value="REVERSAL">Reversals</option>
            </SelectInput>
          </div>
          <div className="w-full sm:w-40">
            <SelectInput aria-label="Method" value={filters.method} onChange={(e) => setFilter("method", e.target.value)}>
              <option value="">Any method</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{methodLabel(m.value)}</option>
              ))}
            </SelectInput>
          </div>
        </>
      }
      pagination={pagination.totalPages > 1 ? pagination : null}
      onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
      emptyMessage="No transactions"
      emptyDescription="Payments recorded at the counter appear here."
      emptyIcon={ReceiptText}
    />
  );
};

/** Reversal requests: accountants see their status, admins (not the requester) decide. */
const ReversalQueue = ({ onChanged }) => {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const [status, setStatus] = useState("PENDING");
  const [rows, setRows] = useState(null);
  const [dialog, setDialog] = useState(null);

  const load = useCallback(
    () =>
      feeService
        .getReversalRequests(status ? { status } : {})
        .then((res) => setRows(res.data || []))
        .catch((err) => {
          setRows([]);
          toast.error(err.response?.data?.message || "Could not load reversal requests");
        }),
    [status],
  );

  useEffect(() => {
    load();
  }, [load]);

  const finish = (message) => {
    toast.success(message);
    setDialog(null);
    load();
    onChanged?.();
  };

  return (
    <div className="space-y-4">
      <Tabs
        size="sm"
        value={status}
        onChange={(v) => {
          setRows(null);
          setStatus(v);
        }}
        tabs={[
          { value: "PENDING", label: "Waiting" },
          { value: "APPROVED", label: "Approved" },
          { value: "REJECTED", label: "Rejected" },
          { value: "", label: "All" },
        ]}
      />
      {rows === null ? (
        <Card><LoadingBlock text="Loading requests…" /></Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={Inbox} title="No requests" description="Reversal requests made from a student's account appear here." /></Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const t = r.transaction;
            const own = r.requestedBy?.id === user?.id;
            return (
              <li key={r.id}>
                <Card className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/finance/receipts/${t.id}`} className="font-mono text-sm font-semibold text-slate-900 hover:text-brand-700">{t.receiptNumber}</Link>
                      {signed(t)}
                      <ApprovalBadge status={r.status} />
                      <Badge tone="neutral">{r.category === "REFUND" ? "Refund" : "Correction"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {fullName(t.student?.user)} · {t.studentClass?.class?.name} {t.studentClass?.section?.name} · paid {formatDate(t.paidOn)} by {methodLabel(t.method)}
                    </p>
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">“{r.reason}”</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Requested by {fullName(r.requestedBy)} · {formatDateTime(r.createdAt)}
                      {r.decidedBy && ` · ${r.status === "APPROVED" ? "approved" : "rejected"} by ${fullName(r.decidedBy)}${r.decisionNote ? `: ${r.decisionNote}` : ""}`}
                      {r.reversalTxn && ` · reversal ${r.reversalTxn.receiptNumber}`}
                    </p>
                  </div>
                  {r.status === "PENDING" && isAdmin && !own && (
                    <div className="flex gap-2">
                      <Button size="sm" icon={CheckCircle2} onClick={() => setDialog({ kind: "approve", r })}>Approve</Button>
                      <Button size="sm" variant="secondary" icon={XCircle} onClick={() => setDialog({ kind: "reject", r })}>Reject</Button>
                    </div>
                  )}
                  {r.status === "PENDING" && (own || !isAdmin) && <span className="text-xs text-slate-500">Waiting for {own ? "another" : "an"} administrator</span>}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {dialog && (
        <ReasonDialog
          title={dialog.kind === "approve" ? `Reverse ${dialog.r.transaction.receiptNumber}?` : "Reject this request?"}
          description={
            dialog.kind === "approve"
              ? `${formatCurrency(dialog.r.transaction.amount)} goes back onto the student's balance. A reversal dated today is added to the ledger; nothing is deleted.`
              : undefined
          }
          label="Note"
          required={false}
          confirmLabel={dialog.kind === "approve" ? "Approve and reverse" : "Reject"}
          tone={dialog.kind === "approve" ? "danger" : "primary"}
          onClose={() => setDialog(null)}
          onSubmit={async ({ text }) => {
            const body = { note: text || undefined };
            const res = dialog.kind === "approve" ? await feeService.approveReversal(dialog.r.id, body) : await feeService.rejectReversal(dialog.r.id, body);
            finish(res.message);
          }}
        />
      )}
    </div>
  );
};

const Transactions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "reversals" ? "reversals" : "ledger";
  const [pending, setPending] = useState(null);

  const countPending = useCallback(() => {
    feeService
      .getReversalRequests({ status: "PENDING" })
      .then((res) => setPending((res.data || []).length))
      .catch(() => setPending(null));
  }, []);
  useEffect(() => {
    countPending();
  }, [countPending]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader icon={ReceiptText} title="Transactions" description="The fee ledger: every payment and reversal. Entries are never edited or deleted." />
      <Tabs
        value={tab}
        onChange={(v) => setSearchParams(v === "ledger" ? {} : { tab: v })}
        tabs={[
          { value: "ledger", label: "Ledger", icon: ReceiptText },
          { value: "reversals", label: "Reversal requests", icon: Undo2, count: pending || undefined },
        ]}
      />
      {tab === "ledger" ? <Ledger /> : <ReversalQueue onChanged={countPending} />}
    </div>
  );
};

export default Transactions;
