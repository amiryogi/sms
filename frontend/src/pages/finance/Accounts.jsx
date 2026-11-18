import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, FilePlus2, HandCoins, Printer } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { feeService } from "../../api/feeService";
import { academicService } from "../../api/academicService";
import { PageHeader, PageShell, SegmentedControl, Avatar, Button, DialogActions, Field, SelectInput, Alert, toast, buttonClasses } from "../../components/ui";
import { FeeStatusBadge } from "../../components/finance/FeeStatusBadge";
import { formatCurrency } from "../../utils/format";

const STATUS_OPTIONS = [
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

  // A register row: one line per student. Admission number and roll have their
  // own columns, money columns are right-aligned tabular figures, and only the
  // overdue amount (a state) carries a status colour.
  const columns = [
    {
      header: "Student",
      className: "col-name",
      render: (r) => (
        <Link to={`/finance/accounts/${r.studentId}`} className="group flex min-w-0 items-center gap-2.5">
          <Avatar src={r.avatarUrl} name={r.name} size="xs" />
          <span className="truncate font-medium text-slate-900 group-hover:text-brand-700">{r.name}</span>
        </Link>
      ),
    },
    { header: "Admission no.", render: (r) => <span className="font-mono text-xs text-slate-700">{r.admissionNumber}</span> },
    {
      header: "Class",
      render: (r) => (
        <span className="whitespace-nowrap">
          {r.class?.name} {r.section?.name}
        </span>
      ),
    },
    { header: "Roll", numeric: true, render: (r) => r.rollNumber || "—" },
    { header: "Fees", numeric: true, render: (r) => formatCurrency(r.amount) },
    { header: "Discount", numeric: true, render: (r) => (r.discount ? formatCurrency(r.discount) : "—") },
    { header: "Paid", numeric: true, render: (r) => (r.paid ? formatCurrency(r.paid) : "—") },
    {
      header: "Balance",
      numeric: true,
      // When all of the balance is overdue (the usual case) the figure itself
      // turns risk; a second line appears only when part of it is not yet due,
      // so most rows stay one line instead of repeating the same amount twice.
      render: (r) => {
        const allOverdue = r.overdue > 0 && Number(r.overdue) >= Number(r.balance);
        return (
          <>
            <span className={`block font-semibold ${allOverdue ? "text-risk" : "text-slate-900"}`}>{formatCurrency(r.balance)}</span>
            {r.overdue > 0 && !allOverdue && <span className="block text-xs font-medium text-risk">{formatCurrency(r.overdue)} overdue</span>}
          </>
        );
      },
    },
    { header: "Status", render: (r) => <FeeStatusBadge status={r.status} /> },
    {
      // The name already opens the account, so the row needs only its one action.
      header: <span className="sr-only">Actions</span>,
      action: true,
      render: (r) =>
        r.balance > 0 ? (
          <div className="flex justify-end">
            <Link to={`/finance/collect?student=${r.studentId}`} className={buttonClasses({ variant: "ghost", size: "md" })}>
              <HandCoins size={16} aria-hidden="true" /> Collect
            </Link>
          </div>
        ) : null,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Student accounts"
        description="What each student owes and has paid this year."
        actions={
          <>
            {/* Bills for the class (and section, year) chosen below; the bills page asks for a class if none is. */}
            <Link
              className={buttonClasses({ variant: "secondary" })}
              to={`/finance/bills?${new URLSearchParams(Object.entries({ classId: filters.classId, sectionId: filters.sectionId, academicYearId: filters.academicYearId }).filter(([, v]) => v))}`}
            >
              <Printer size={16} aria-hidden="true" /> Print bills
            </Link>
            <Button icon={FilePlus2} variant="secondary" onClick={() => setGenerating(true)}>Generate fees</Button>
          </>
        }
      />

      {/* A filter that sets a value, so a segmented control rather than tabs. */}
      <SegmentedControl label="Fee status" value={filters.status} onChange={(v) => setFilter("status", v)} options={STATUS_OPTIONS} />

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
    </PageShell>
  );
};

export default Accounts;
