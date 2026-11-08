import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgePercent, Plus, CheckCircle2, XCircle, Ban } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DataTable from "../../components/common/DataTable";
import { feeService } from "../../api/feeService";
import { PageHeader, Tabs, Button, IconButton, Badge, toast } from "../../components/ui";
import DiscountDialog from "../../components/finance/DiscountDialog";
import ReasonDialog from "../../components/finance/ReasonDialog";
import { ApprovalBadge } from "../../components/finance/FeeStatusBadge";
import { fullName } from "../../components/finance/financeLabels";
import { formatCurrency, formatDate } from "../../utils/format";

/**
 * Discounts and scholarships across the school. Accountants and admins
 * request; an admin other than the requester approves, rejects or revokes.
 */
const Discounts = () => {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const [status, setStatus] = useState("PENDING");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await feeService.getDiscounts(status ? { status } : {});
      setRows(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load discounts");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const done = (message) => {
    if (message) toast.success(message);
    setDialog(null);
    load();
  };

  const approve = async (d) => {
    try {
      done((await feeService.approveDiscount(d.id, {})).message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not approve");
    }
  };

  const q = search.trim().toLowerCase();
  const visible = q
    ? rows.filter((d) => [fullName(d.student?.user), d.student?.admissionNumber, d.name].some((v) => v?.toLowerCase().includes(q)))
    : rows;

  const columns = [
    {
      header: "Student",
      className: "col-name",
      render: (d) => (
        <Link to={`/finance/accounts/${d.studentId}?year=${d.academicYearId}`} className="min-w-0 hover:text-brand-700">
          <span className="block truncate font-medium text-slate-900">{fullName(d.student?.user)}</span>
          <span className="block text-xs text-slate-500">{d.student?.admissionNumber} · {d.academicYear?.name}</span>
        </Link>
      ),
    },
    {
      header: "Discount",
      render: (d) => (
        <div>
          <p className="font-medium text-slate-900">
            {d.name} <Badge tone={d.category === "SCHOLARSHIP" ? "brand" : "neutral"}>{d.category === "SCHOLARSHIP" ? "Scholarship" : "Discount"}</Badge>
          </p>
          <p className="max-w-xs truncate text-xs text-slate-500" title={d.reason}>{d.reason}</p>
        </div>
      ),
    },
    {
      header: "Value",
      render: (d) => (
        <div>
          <p className="font-semibold tabular-nums">{d.kind === "PERCENT" ? `${Number(d.value)}%` : formatCurrency(d.value)}</p>
          <p className="text-xs text-slate-500">{d.feeType?.name || "All fees"}</p>
        </div>
      ),
    },
    {
      header: <span className="block text-right">Applied</span>,
      render: (d) => <p className="text-right text-emerald-700 tabular-nums">{d.status === "APPROVED" ? formatCurrency(d.appliedAmount) : "—"}</p>,
    },
    {
      header: "Requested",
      render: (d) => (
        <span className="text-sm text-slate-600">
          {fullName(d.requestedBy)}
          <span className="block text-xs text-slate-400">{formatDate(d.createdAt)}</span>
        </span>
      ),
    },
    {
      header: "Status",
      render: (d) => (
        <div>
          <ApprovalBadge status={d.status} />
          {d.approvedBy && d.status !== "PENDING" && <p className="mt-0.5 text-xs text-slate-500">by {fullName(d.approvedBy)}</p>}
        </div>
      ),
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: "190px",
      render: (d) => {
        const own = d.requestedBy?.id === user?.id;
        if (!isAdmin) return null;
        if (d.status === "PENDING" && own) return <span className="text-xs text-slate-500">Another admin must decide</span>;
        if (d.status === "PENDING")
          return (
            <div className="flex justify-end gap-1.5">
              <Button size="sm" icon={CheckCircle2} onClick={() => approve(d)}>Approve</Button>
              <IconButton icon={XCircle} label={`Reject ${d.name}`} onClick={() => setDialog({ kind: "reject", d })} />
            </div>
          );
        if (d.status === "APPROVED")
          return (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" icon={Ban} onClick={() => setDialog({ kind: "revoke", d })}>Revoke</Button>
            </div>
          );
        return null;
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        icon={BadgePercent}
        title="Discounts & scholarships"
        description="Requests wait for an administrator; only approved ones reduce a student's fees."
        actions={<Button icon={Plus} onClick={() => setDialog({ kind: "new" })}>New request</Button>}
      />
      <Tabs
        value={status}
        onChange={setStatus}
        tabs={[
          { value: "PENDING", label: "Waiting" },
          { value: "APPROVED", label: "Approved" },
          { value: "REJECTED", label: "Rejected" },
          { value: "REVOKED", label: "Revoked" },
          { value: "", label: "All" },
        ]}
      />
      <DataTable
        columns={columns}
        data={visible}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Student or discount name…"
        emptyMessage={status === "PENDING" ? "Nothing waiting for approval" : "No discounts"}
        emptyIcon={BadgePercent}
      />

      {dialog?.kind === "new" && <DiscountDialog onClose={() => setDialog(null)} onSaved={() => done()} />}
      {dialog?.kind === "reject" && (
        <ReasonDialog
          title={`Reject ${dialog.d.name}?`}
          label="Note for the requester"
          required={false}
          confirmLabel="Reject"
          onClose={() => setDialog(null)}
          onSubmit={async ({ text }) => done((await feeService.rejectDiscount(dialog.d.id, { note: text || undefined })).message)}
        />
      )}
      {dialog?.kind === "revoke" && (
        <ReasonDialog
          title={`Revoke ${dialog.d.name}?`}
          description="It comes off the student's fees and their balance goes back up."
          confirmLabel="Revoke"
          tone="danger"
          onClose={() => setDialog(null)}
          onSubmit={async ({ text }) => done((await feeService.revokeDiscount(dialog.d.id, { reason: text })).message)}
        />
      )}
    </div>
  );
};

export default Discounts;
