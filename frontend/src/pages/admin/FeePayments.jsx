import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Wallet, CreditCard, CheckCircle2, Clock, AlertCircle, Sparkles, Banknote, TrendingUp } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import { Input, Select, Button, FormRow } from "../../components/common/FormElements";
import { PageHeader, Badge, Tabs, SelectInput, Alert, DialogActions, toast } from "../../components/ui";
import { feeService } from "../../api/feeService";
import { academicService } from "../../api/academicService";
import { formatCurrency } from "../../utils/format";

const STATUS = {
  paid: { tone: "success", icon: CheckCircle2, label: "Paid" },
  partial: { tone: "warning", icon: Clock, label: "Partial" },
  pending: { tone: "danger", icon: AlertCircle, label: "Pending" },
};

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "Mobile wallet / UPI" },
  { value: "card", label: "Card" },
];

const balanceOf = (p) => (parseFloat(p.amountDue) || 0) - (parseFloat(p.amountPaid) || 0);
const studentName = (p) => {
  const u = p.studentClass?.student?.user;
  return `${u?.firstName || ""} ${u?.lastName || ""}`.trim();
};

const FeePayments = () => {
  const [payments, setPayments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterClassId, setFilterClassId] = useState("");
  const [filterYearId, setFilterYearId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const {
    register: registerGen,
    handleSubmit: handleSubmitGen,
    reset: resetGen,
    formState: { errors: errorsGen },
  } = useForm();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterClassId, filterYearId]);

  const fetchInitialData = async () => {
    try {
      const [classesRes, yearsRes] = await Promise.all([academicService.getClasses(), academicService.getAcademicYears()]);
      setClasses(classesRes.data || []);
      setAcademicYears(yearsRes.data || []);
      const currentYear = (yearsRes.data || []).find((y) => y.isCurrent);
      if (currentYear) setFilterYearId(currentYear.id.toString());
    } catch {
      // Filters stay empty; the list still loads.
    }
  };

  // Status is filtered on the client so the counts on the tabs stay correct.
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClassId) params.classId = filterClassId;
      if (filterYearId) params.academicYearId = filterYearId;
      const response = await feeService.getFeePayments(params);
      setPayments(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load fee records");
    } finally {
      setLoading(false);
    }
  };

  const openPayModal = (payment) => {
    setSelectedPayment(payment);
    reset({ amountPaid: balanceOf(payment), paymentMethod: "cash", remarks: "" });
    setPayModalOpen(true);
  };

  const closePayModal = () => {
    setPayModalOpen(false);
    setSelectedPayment(null);
    reset();
  };

  const onPaySubmit = async (data) => {
    setSubmitting(true);
    try {
      await feeService.recordPayment(selectedPayment.id, {
        amountPaid: parseFloat(data.amountPaid),
        paymentMethod: data.paymentMethod,
        remarks: data.remarks,
        paymentDate: new Date().toISOString(),
      });
      toast.success(`Recorded ${formatCurrency(data.amountPaid)} from ${studentName(selectedPayment)}`);
      fetchPayments();
      closePayModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not record the payment");
    } finally {
      setSubmitting(false);
    }
  };

  const openGenerateModal = () => {
    resetGen({ classId: filterClassId || "", academicYearId: filterYearId || "" });
    setGenerateModalOpen(true);
  };

  const closeGenerateModal = () => {
    setGenerateModalOpen(false);
    resetGen();
  };

  const onGenerateSubmit = async (data) => {
    setSubmitting(true);
    try {
      await feeService.bulkGenerateFees({ classId: parseInt(data.classId), academicYearId: parseInt(data.academicYearId) });
      toast.success("Fee records created for every active student in the class");
      fetchPayments();
      closeGenerateModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not generate fees");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(
    () =>
      payments.reduce(
        (acc, p) => {
          acc.totalDue += parseFloat(p.amountDue) || 0;
          acc.totalPaid += parseFloat(p.amountPaid) || 0;
          acc[p.status === "paid" ? "paid" : p.status === "partial" ? "partial" : "pending"] += 1;
          return acc;
        },
        { totalDue: 0, totalPaid: 0, paid: 0, partial: 0, pending: 0 },
      ),
    [payments],
  );
  const collectedPct = stats.totalDue > 0 ? Math.round((stats.totalPaid / stats.totalDue) * 100) : 0;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter(
      (p) =>
        (!filterStatus || p.status === filterStatus) &&
        (!q || `${studentName(p)} ${p.feeStructure?.feeType?.name || ""}`.toLowerCase().includes(q)),
    );
  }, [payments, filterStatus, search]);

  const columns = [
    {
      header: "Student",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{studentName(row) || "—"}</p>
          <p className="text-xs text-slate-500">
            {row.studentClass?.class?.name} · {row.studentClass?.section?.name}
          </p>
        </div>
      ),
    },
    { header: "Fee", render: (row) => row.feeStructure?.feeType?.name || "—" },
    {
      header: <span className="block text-right">Due</span>,
      render: (row) => <p className="text-right tabular-nums">{formatCurrency(row.amountDue)}</p>,
    },
    {
      header: <span className="block text-right">Paid</span>,
      render: (row) => (
        <p className={`text-right tabular-nums ${parseFloat(row.amountPaid) > 0 ? "text-emerald-700" : "text-slate-400"}`}>
          {formatCurrency(row.amountPaid)}
        </p>
      ),
    },
    {
      header: <span className="block text-right">Balance</span>,
      render: (row) => {
        const b = balanceOf(row);
        return <p className={`text-right font-medium tabular-nums ${b > 0 ? "text-red-600" : "text-slate-400"}`}>{formatCurrency(b)}</p>;
      },
    },
    {
      header: "Status",
      render: (row) => {
        const s = STATUS[row.status] || STATUS.pending;
        return <Badge tone={s.tone} icon={s.icon}>{s.label}</Badge>;
      },
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: "100px",
      render: (row) =>
        balanceOf(row) > 0 ? (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" icon={CreditCard} onClick={() => openPayModal(row)}>Record</Button>
          </div>
        ) : null,
    },
  ];

  const yearOptions = academicYears.map((y) => ({ value: y.id, label: y.name + (y.isCurrent ? " (current)" : "") }));
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));
  const selBalance = selectedPayment ? balanceOf(selectedPayment) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        icon={Wallet}
        title="Fee Payments"
        description="Record payments and track what each student still owes."
        actions={<Button icon={Sparkles} onClick={openGenerateModal}>Generate fees</Button>}
        className="mb-0"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total due" value={loading ? "…" : formatCurrency(stats.totalDue)} icon={Banknote} color="info" />
        <StatCard title="Collected" value={loading ? "…" : formatCurrency(stats.totalPaid)} icon={CheckCircle2} color="success" hint={`${stats.paid} paid in full`} />
        <StatCard title="Outstanding" value={loading ? "…" : formatCurrency(stats.totalDue - stats.totalPaid)} icon={AlertCircle} color="danger" hint={`${stats.pending + stats.partial} records unpaid`} />
        <div className="rounded-card border border-slate-200/80 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Collection rate</p>
            <TrendingUp size={18} className="text-brand-500" aria-hidden="true" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums">{loading ? "…" : `${collectedPct}%`}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={collectedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Collected">
            <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${collectedPct}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Tabs
          value={filterStatus}
          onChange={setFilterStatus}
          tabs={[
            { value: "", label: "All", count: payments.length },
            { value: "pending", label: "Pending", count: stats.pending },
            { value: "partial", label: "Partial", count: stats.partial },
            { value: "paid", label: "Paid", count: stats.paid },
          ]}
        />
        <DataTable
          columns={columns}
          data={visible}
          loading={loading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search student or fee…"
          toolbar={
            <>
              <div className="w-full sm:w-48">
                <SelectInput aria-label="Academic year" value={filterYearId} onChange={(e) => setFilterYearId(e.target.value)}>
                  <option value="">All academic years</option>
                  {yearOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </SelectInput>
              </div>
              <div className="w-full sm:w-40">
                <SelectInput aria-label="Class" value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}>
                  <option value="">All classes</option>
                  {classOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </SelectInput>
              </div>
            </>
          }
          emptyMessage={payments.length ? "Nothing matches these filters" : "No fee records yet"}
          emptyDescription={payments.length ? undefined : "Use Generate fees to create records for a class from its fee structure."}
          emptyIcon={Wallet}
        />
      </div>

      <Modal isOpen={payModalOpen} onClose={closePayModal} title="Record payment" size="md">
        {selectedPayment && (
          <form onSubmit={handleSubmit(onPaySubmit)}>
            <div className="mb-5 rounded-xl bg-slate-50 p-4">
              <p className="font-medium text-slate-900">{studentName(selectedPayment)}</p>
              <p className="text-sm text-slate-500">
                {selectedPayment.feeStructure?.feeType?.name} · {selectedPayment.studentClass?.class?.name}{" "}
                {selectedPayment.studentClass?.section?.name}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                {[
                  ["Due", formatCurrency(selectedPayment.amountDue), "text-slate-900"],
                  ["Paid", formatCurrency(selectedPayment.amountPaid), "text-emerald-700"],
                  ["Balance", formatCurrency(selBalance), "text-red-600"],
                ].map(([k, val, color]) => (
                  <div key={k} className="rounded-lg bg-white p-2.5 ring-1 ring-slate-200">
                    <dt className="text-xs text-slate-500">{k}</dt>
                    <dd className={`font-semibold tabular-nums ${color}`}>{val}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <FormRow>
              <Input
                label="Amount received (Rs.)"
                name="amountPaid"
                type="number"
                step="0.01"
                min="0.01"
                max={selBalance}
                register={register}
                rules={{
                  required: "Enter the amount received",
                  min: { value: 0.01, message: "Must be more than 0" },
                  max: { value: selBalance, message: `Can't be more than the balance (${formatCurrency(selBalance)})` },
                }}
                error={errors.amountPaid?.message}
              />
              <Select label="Method" name="paymentMethod" register={register} options={METHODS} placeholder={null} />
            </FormRow>
            <Input label="Remarks" name="remarks" placeholder="Optional, e.g. receipt number" register={register} />
            <DialogActions>
              <Button type="button" variant="secondary" onClick={closePayModal}>Cancel</Button>
              <Button type="submit" loading={submitting} icon={CreditCard}>Record payment</Button>
            </DialogActions>
          </form>
        )}
      </Modal>

      <Modal isOpen={generateModalOpen} onClose={closeGenerateModal} title="Generate fee records" size="md">
        <form onSubmit={handleSubmitGen(onGenerateSubmit)}>
          <Alert tone="info" className="mb-5">
            Creates a fee record for every active student in the class, from the class's fee structure. Fees a student already has are skipped.
          </Alert>
          <FormRow>
            <Select
              label="Academic year"
              name="academicYearId"
              register={registerGen}
              rules={{ required: "Choose a year" }}
              error={errorsGen.academicYearId?.message}
              options={yearOptions}
              placeholder="Select year"
            />
            <Select
              label="Class"
              name="classId"
              register={registerGen}
              rules={{ required: "Choose a class" }}
              error={errorsGen.classId?.message}
              options={classOptions}
              placeholder="Select class"
            />
          </FormRow>
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeGenerateModal}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={Sparkles}>Generate fees</Button>
          </DialogActions>
        </form>
      </Modal>
    </div>
  );
};

export default FeePayments;
