import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, FilePlus2, HandCoins, ChevronRight } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { feeService } from "../../api/feeService";
import { academicService } from "../../api/academicService";
import { PageHeader, Tabs, Avatar, Button, DialogActions, Field, SelectInput, Alert, toast } from "../../components/ui";
import { FeeStatusBadge } from "../../components/finance/FeeStatusBadge";
import { formatCurrency } from "../../utils/format";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "pending", label: "Unpaid" },
  { value: "partial", label: "Partly paid" },
  { value: "paid", label: "Paid" },
  { value: "none", label: "No fees" },
];

/** Generate the year's fees for every student of a class, from its fee structures. */
const GenerateDialog = ({ years, classes, defaultYearId, onClose, onDone }) => {
  const [yearId, setYearId] = useState(defaultYearId || "");
  const [classId, setClassId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!yearId || !classId) return setError("Choose the year and the class.");
    setSaving(true);
    setError("");
    try {
      const res = await feeService.bulkGenerateFees({ classId: Number(classId), academicYearId: Number(yearId) });
      toast.success(res.message || "Fees generated");
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate fees");
      setSaving(false);
    }
  };
  return (
    <Modal isOpen onClose={saving ? () => {} : onClose} title="Generate fees for a class" description="Creates each student's fees from the class's fee structures and installment plans. Students who already have a fee are skipped." size="md">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Academic year" htmlFor="gen-year">
          <SelectInput id="gen-year" value={yearId} onChange={(e) => setYearId(e.target.value)}>
            <option value="">Select year</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? " (current)" : ""}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Class" htmlFor="gen-class">
          <SelectInput id="gen-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectInput>
        </Field>
      </div>
      {error && <Alert tone="danger" className="mt-4">{error}</Alert>}
      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button icon={FilePlus2} loading={saving} onClick={submit}>Generate</Button>
      </DialogActions>
    </Modal>
  );
};

/** Every student's fee position for a year, with filters. */
const Accounts = () => {
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({ academicYearId: "", classId: "", sectionId: "", status: "", search: "" });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Promise.all([academicService.getAcademicYears(), academicService.getClasses()])
      .then(([y, c]) => {
        setYears(y.data || []);
        setClasses(c.data || []);
        const current = (y.data || []).find((x) => x.isCurrent);
        if (current) setFilters((f) => ({ ...f, academicYearId: String(current.id) }));
      })
      .catch(() => toast.error("Could not load years and classes"));
  }, []);

  useEffect(() => {
    if (!filters.classId) return;
    academicService
      .getSections(filters.classId)
      .then((res) => setSections(res.data || []))
      .catch(() => setSections([]));
  }, [filters.classId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, page: pagination.page, limit: pagination.limit };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await feeService.getAccounts(params);
      setRows(res.data || []);
      if (res.pagination) setPagination((p) => ({ ...p, total: res.pagination.total, totalPages: res.pagination.totalPages || 1 }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load accounts");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    const t = setTimeout(load, filters.search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, filters.search]);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value, ...(key === "classId" ? { sectionId: "" } : {}) }));
    if (key === "classId" && !value) setSections([]);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const columns = [
    {
      header: "Student",
      className: "col-name",
      render: (r) => (
        <Link to={`/finance/accounts/${r.studentId}`} className="group flex min-w-0 items-center gap-3">
          <Avatar src={r.avatarUrl} name={r.name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-slate-900 group-hover:text-brand-700">{r.name}</span>
            <span className="block text-xs text-slate-500">{r.admissionNumber}</span>
          </span>
        </Link>
      ),
    },
    {
      header: "Class",
      render: (r) => (
        <span className="text-sm whitespace-nowrap text-slate-700">
          {r.class?.name} {r.section?.name}
          {r.rollNumber ? <span className="text-slate-400"> · {r.rollNumber}</span> : null}
        </span>
      ),
    },
    { header: <span className="block text-right">Fees</span>, render: (r) => <p className="text-right tabular-nums">{formatCurrency(r.amount)}</p> },
    { header: <span className="block text-right">Discount</span>, render: (r) => <p className="text-right text-emerald-700 tabular-nums">{r.discount ? formatCurrency(r.discount) : "—"}</p> },
    { header: <span className="block text-right">Paid</span>, render: (r) => <p className="text-right tabular-nums">{r.paid ? formatCurrency(r.paid) : "—"}</p> },
    {
      header: <span className="block text-right">Balance</span>,
      render: (r) => (
        <div className="text-right">
          <p className="font-semibold text-slate-900 tabular-nums">{formatCurrency(r.balance)}</p>
          {r.overdue > 0 && <p className="text-xs text-red-600 tabular-nums">{formatCurrency(r.overdue)} overdue</p>}
        </div>
      ),
    },
    { header: "Status", render: (r) => <FeeStatusBadge status={r.status} /> },
    {
      header: <span className="sr-only">Actions</span>,
      width: "150px",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.balance > 0 && (
            <Link to={`/finance/collect?student=${r.studentId}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50">
              <HandCoins size={15} aria-hidden="true" /> Collect
            </Link>
          )}
          <Link to={`/finance/accounts/${r.studentId}`} aria-label={`Open ${r.name}'s account`} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        icon={Users}
        title="Student accounts"
        description="What each student owes and has paid this year."
        actions={<Button icon={FilePlus2} variant="secondary" onClick={() => setGenerating(true)}>Generate fees</Button>}
      />

      <Tabs value={filters.status} onChange={(v) => setFilter("status", v)} tabs={STATUS_TABS} />

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(r) => r.studentId}
        searchValue={filters.search}
        onSearchChange={(v) => setFilter("search", v)}
        searchPlaceholder="Name or admission no.…"
        toolbar={
          <>
            <div className="w-full sm:w-40">
              <SelectInput aria-label="Academic year" value={filters.academicYearId} onChange={(e) => setFilter("academicYearId", e.target.value)}>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </SelectInput>
            </div>
            <div className="w-full sm:w-36">
              <SelectInput aria-label="Class" value={filters.classId} onChange={(e) => setFilter("classId", e.target.value)}>
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </SelectInput>
            </div>
            {filters.classId && (
              <div className="w-full sm:w-32">
                <SelectInput aria-label="Section" value={filters.sectionId} onChange={(e) => setFilter("sectionId", e.target.value)}>
                  <option value="">All sections</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </SelectInput>
              </div>
            )}
          </>
        }
        pagination={pagination.totalPages > 1 ? pagination : null}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        emptyMessage={filters.search || filters.status ? "No students match" : "No students enrolled"}
        emptyIcon={Users}
      />

      {generating && (
        <GenerateDialog
          years={years}
          classes={classes}
          defaultYearId={filters.academicYearId}
          onClose={() => setGenerating(false)}
          onDone={() => {
            setGenerating(false);
            load();
          }}
        />
      )}
    </div>
  );
};

export default Accounts;
