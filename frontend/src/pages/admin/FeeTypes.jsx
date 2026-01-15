import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Input, Button } from "../../components/common/FormElements";
import { feeService } from "../../api/feeService";

const FeeTypes = () => {
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
      console.error("Error fetching fee types:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (feeType = null) => {
    setEditingFeeType(feeType);
    if (feeType) {
      reset({
        name: feeType.name,
        description: feeType.description || "",
        isActive: feeType.isActive,
      });
    } else {
      reset({ name: "", description: "", isActive: true });
    }
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
      fetchFeeTypes();
      closeModal();
    } catch (error) {
      console.error("Error saving fee type:", error);
      alert(error.response?.data?.message || "Error saving fee type");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this fee type?")) return;
    try {
      await feeService.deleteFeeType(id);
      fetchFeeTypes();
    } catch (error) {
      console.error("Error deleting fee type:", error);
      alert(error.response?.data?.message || "Cannot delete fee type");
    }
  };

  const toggleStatus = async (feeType) => {
    try {
      await feeService.updateFeeType(feeType.id, {
        isActive: !feeType.isActive,
      });
      fetchFeeTypes();
    } catch (error) {
      console.error("Error toggling status:", error);
      alert(error.response?.data?.message || "Error updating status");
    }
  };

  const columns = [
    {
      header: "Fee Type",
      render: (row) => (
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-primary" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      header: "Description",
      render: (row) => row.description || "-",
    },
    {
      header: "Status",
      width: "100px",
      render: (row) => (
        <span
          className={`badge ${
            row.isActive ? "badge-success" : "badge-secondary"
          }`}
        >
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      width: "150px",
      render: (row) => (
        <div className="action-buttons">
          <button
            className="btn-icon"
            onClick={() => toggleStatus(row)}
            title={row.isActive ? "Deactivate" : "Activate"}
          >
            {row.isActive ? (
              <ToggleRight size={16} className="text-success" />
            ) : (
              <ToggleLeft size={16} />
            )}
          </button>
          <button
            className="btn-icon"
            onClick={() => openModal(row)}
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            className="btn-icon btn-danger"
            onClick={() => handleDelete(row.id)}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Fee Types</h1>
          <p className="text-muted">
            Manage fee categories (Tuition, Lab, Sports, etc.)
          </p>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={feeTypes}
          loading={loading}
          emptyMessage="No fee types found. Create one to get started."
          actions={
            <Button icon={Plus} onClick={() => openModal()}>
              Add Fee Type
            </Button>
          }
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingFeeType ? "Edit Fee Type" : "Add Fee Type"}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Fee Type Name"
            name="name"
            placeholder="e.g., Tuition Fee, Lab Fee, Sports Fee"
            register={register}
            rules={{ required: "Name is required" }}
            error={errors.name?.message}
          />
          <Input
            label="Description (Optional)"
            name="description"
            placeholder="Brief description of this fee type"
            register={register}
          />
          <div className="form-group" style={{ marginTop: "16px" }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                {...register("isActive")}
                style={{ marginRight: "8px" }}
              />
              Active (visible for fee structure creation)
            </label>
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingFeeType ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FeeTypes;
