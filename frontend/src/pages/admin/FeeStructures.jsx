import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2, ReceiptText, CalendarRange } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Input, Select, Button, FormRow } from "../../components/common/FormElements";
import { PageHeader, IconButton, SelectInput, DialogActions, Badge, toast, confirmDialog } from "../../components/ui";
import InstallmentPlanDialog from "../../components/finance/InstallmentPlanDialog";
import { feeService } from "../../api/feeService";
import { academicService } from "../../api/academicService";
import RoleGuard from "../../components/auth/RoleGuard";
import { formatCurrency } from "../../utils/format";

const FeeStructures = () => {
  const [feeStructures, setFeeStructures] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterClassId, setFilterClassId] = useState("");
  const [filterYearId, setFilterYearId] = useState("");
  const [planFor, setPlanFor] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchFeeStructures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterClassId, filterYearId]);

  const fetchInitialData = async () => {
    try {
      const [feeTypesRes, classesRes, yearsRes] = await Promise.all([
        feeService.getFeeTypes({ isActive: "true" }),
        academicService.getClasses(),
        academicService.getAcademicYears(),
      ]);
      setFeeTypes(feeTypesRes.data || []);
      setClasses(classesRes.data || []);
      setAcademicYears(yearsRes.data || []);
      const currentYear = (yearsRes.data || []).find((y) => y.isCurrent);
      if (currentYear) setFilterYearId(currentYear.id.toString());
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load fee types and classes");
    }
  };

  const fetchFeeStructures = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClassId) params.classId = filterClassId;
      if (filterYearId) params.academicYearId = filterYearId;
      const response = await feeService.getFeeStructures(params);
      setFeeStructures(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load fee structures");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (structure = null) => {
    setEditingStructure(structure);
    reset(
      structure
        ? {
            feeTypeId: structure.feeTypeId,
            classId: structure.classId,
            academicYearId: structure.academicYearId,
            amount: structure.amount,
          }
        : { feeTypeId: "", classId: filterClassId || "", academicYearId: filterYearId || "", amount: "" },
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingStructure(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        feeTypeId: parseInt(data.feeTypeId),
        classId: parseInt(data.classId),
        academicYearId: parseInt(data.academicYearId),
        amount: parseFloat(data.amount),
      };
      if (editingStructure) {
        await feeService.updateFeeStructure(editingStructure.id, { amount: payload.amount });
        toast.success("Amount updated");
      } else {
        await feeService.createFeeStructure(payload);
        toast.success("Fee added to the class");
      }
      fetchFeeStructures();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save the fee structure");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirmDialog({
      title: `Remove ${row.feeType?.name} from ${row.class?.name}?`,
      message: "Fee structures with recorded payments cannot be deleted.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await feeService.deleteFeeStructure(row.id);
      toast.success("Fee structure removed");
      fetchFeeStructures();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete the fee structure");
    }
  };

  // Total fees per class (and year), for the summary cards.
  const totalsByClass = useMemo(() => {
    const acc = {};
    feeStructures.forEach((fs) => {
      const key = `${fs.classId}-${fs.academicYearId}`;
      acc[key] ??= { key, className: fs.class?.name, year: fs.academicYear?.name, total: 0, items: 0 };
      acc[key].total += parseFloat(fs.amount) || 0;
      acc[key].items += 1;
    });
    return Object.values(acc);
  }, [feeStructures]);

  const columns = [
    {
      header: "Fee",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{row.feeType?.name}</p>
          <p className="text-xs text-slate-500">{row.academicYear?.name}</p>
        </div>
      ),
    },
    { header: "Class", render: (row) => row.class?.name || "—" },
    {
      header: "Paid in",
      render: (row) =>
        row._count?.installmentPlan ? (
          <Badge tone="brand">{row._count.installmentPlan} installments</Badge>
        ) : (
          <span className="text-sm text-slate-500">One payment</span>
        ),
    },
    {
      header: <span className="block text-right">Amount</span>,
      render: (row) => <p className="text-right font-semibold text-slate-900 tabular-nums">{formatCurrency(row.amount)}</p>,
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: "132px",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <IconButton icon={CalendarRange} label="Installment plan" onClick={() => setPlanFor(row)} />
          <IconButton icon={Pencil} label="Edit amount" onClick={() => openModal(row)} />
          {/* Delete is admin-only on the backend; accountants never see it. */}
          <RoleGuard roles={["ADMIN"]}>
            <IconButton icon={Trash2} label="Delete fee structure" variant="danger-soft" onClick={() => handleDelete(row)} />
          </RoleGuard>
        </div>
      ),
    },
  ];

  const yearOptions = academicYears.map((y) => ({ value: y.id, label: y.name + (y.isCurrent ? " (current)" : "") }));
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        icon={ReceiptText}
        title="Fee Structures"
        description="How much each class pays for each fee type in a year."
        actions={<Button icon={Plus} onClick={() => openModal()}>Add fee structure</Button>}
      />

      {totalsByClass.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {totalsByClass.map((item) => (
            <div key={item.key} className="rounded-card border border-slate-200/80 bg-white p-4 shadow-card">
              <p className="text-sm font-medium text-slate-500">
                {item.className} <span className="text-slate-400">· {item.year}</span>
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{formatCurrency(item.total)}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {item.items} fee{item.items === 1 ? "" : "s"} per student
              </p>
            </div>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        data={feeStructures}
        loading={loading}
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
            <div className="w-full sm:w-44">
              <SelectInput aria-label="Class" value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}>
                <option value="">All classes</option>
                {classOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </SelectInput>
            </div>
          </>
        }
        emptyMessage="No fee structures for this selection"
        emptyDescription="Add how much a class pays for a fee type this year."
        emptyIcon={ReceiptText}
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingStructure ? "Edit amount" : "Add fee structure"}
        description={editingStructure ? `${editingStructure.feeType?.name} · ${editingStructure.class?.name} · ${editingStructure.academicYear?.name}` : undefined}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {!editingStructure && (
            <>
              <Select
                label="Fee type"
                name="feeTypeId"
                register={register}
                rules={{ required: "Choose a fee type" }}
                error={errors.feeTypeId?.message}
                options={feeTypes.map((ft) => ({ value: ft.id, label: ft.name }))}
                placeholder="Select fee type"
              />
              <FormRow>
                <Select
                  label="Class"
                  name="classId"
                  register={register}
                  rules={{ required: "Choose a class" }}
                  error={errors.classId?.message}
                  options={classOptions}
                  placeholder="Select class"
                />
                <Select
                  label="Academic year"
                  name="academicYearId"
                  register={register}
                  rules={{ required: "Choose an academic year" }}
                  error={errors.academicYearId?.message}
                  options={yearOptions}
                  placeholder="Select year"
                />
              </FormRow>
            </>
          )}
          <Input
            label="Amount (Rs.)"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 5000"
            register={register}
            rules={{ required: "Enter an amount", min: { value: 0, message: "Amount can't be negative" } }}
            error={errors.amount?.message}
          />
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingStructure ? "Save amount" : "Add fee structure"}</Button>
          </DialogActions>
        </form>
      </Modal>

      {planFor && (
        <InstallmentPlanDialog
          structure={planFor}
          onClose={() => setPlanFor(null)}
          onSaved={() => {
            setPlanFor(null);
            fetchFeeStructures();
          }}
        />
      )}
    </div>
  );
};

export default FeeStructures;
