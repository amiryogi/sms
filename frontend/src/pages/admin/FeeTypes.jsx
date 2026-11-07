import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Input, Button } from "../../components/common/FormElements";
import { PageHeader, IconButton, Checkbox, Switch, DialogActions, toast, confirmDialog } from "../../components/ui";
import { feeService } from "../../api/feeService";
import RoleGuard from "../../components/auth/RoleGuard";

const FeeTypes = () => {
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    fetchFeeTypes();
  }, []);

  const fetchFeeTypes = async () => {
    setLoading(true);
    try {
      const response = await feeService.getFeeTypes();
      setFeeTypes(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load fee types");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (feeType = null) => {
    setEditingFeeType(feeType);
    reset(
      feeType
        ? { name: feeType.name, description: feeType.description || "", isActive: feeType.isActive }
        : { name: "", description: "", isActive: true },
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingFeeType(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingFeeType) {
        await feeService.updateFeeType(editingFeeType.id, data);
      } else {
        await feeService.createFeeType(data);
      }
      toast.success(editingFeeType ? "Fee type updated" : "Fee type created");
      fetchFeeTypes();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save the fee type");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (feeType) => {
    const ok = await confirmDialog({
      title: `Delete ${feeType.name}?`,
      message: "Fee types used in a fee structure cannot be deleted. Make it inactive instead.",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await feeService.deleteFeeType(feeType.id);
      toast.success(`${feeType.name} deleted`);
      fetchFeeTypes();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete the fee type");
    }
  };

  const toggleStatus = async (feeType) => {
    setTogglingId(feeType.id);
    try {
      await feeService.updateFeeType(feeType.id, { isActive: !feeType.isActive });
      setFeeTypes((list) => list.map((f) => (f.id === feeType.id ? { ...f, isActive: !f.isActive } : f)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update the status");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = [
    {
      header: "Fee type",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Tags size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{row.name}</p>
            {row.description && <p className="max-w-md truncate text-xs text-slate-500">{row.description}</p>}
          </div>
        </div>
      ),
    },
    {
      header: "Active",
      width: "120px",
      render: (row) => (
        <Switch
          checked={row.isActive}
          disabled={togglingId === row.id}
          onChange={() => toggleStatus(row)}
          id={`fee-type-active-${row.id}`}
        />
      ),
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: "96px",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Pencil} label={`Edit ${row.name}`} onClick={() => openModal(row)} />
          {/* Delete is admin-only on the backend; accountants never see it. */}
          <RoleGuard roles={["ADMIN"]}>
            <IconButton icon={Trash2} label={`Delete ${row.name}`} variant="danger-soft" onClick={() => handleDelete(row)} />
          </RoleGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Tags}
        title="Fee Types"
        description="Fee categories such as tuition, lab, sports or transport. Inactive types can't be added to new fee structures."
        actions={<Button icon={Plus} onClick={() => openModal()}>Add fee type</Button>}
      />

      <DataTable
        columns={columns}
        data={feeTypes}
        loading={loading}
        emptyMessage="No fee types yet"
        emptyDescription="Create categories like Tuition Fee before setting up fee structures."
        emptyIcon={Tags}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingFeeType ? "Edit fee type" : "Add fee type"} size="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Name"
            name="name"
            placeholder="e.g. Tuition Fee"
            register={register}
            error={errors.name?.message}
            required
          />
          <Input label="Description" name="description" placeholder="Optional" register={register} />
          <Checkbox
            id="isActive"
            label="Active"
            description="Available when creating fee structures."
            {...register("isActive")}
          />
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingFeeType ? "Save changes" : "Create fee type"}</Button>
          </DialogActions>
        </form>
      </Modal>
    </div>
  );
};

export default FeeTypes;
