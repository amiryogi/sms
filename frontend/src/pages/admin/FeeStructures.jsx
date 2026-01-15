import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Plus, Edit2, Trash2, DollarSign, Filter } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Input, Select, Button } from "../../components/common/FormElements";
import { feeService } from "../../api/feeService";
import { academicService } from "../../api/academicService";

const FeeStructures = () => {
  const [feeStructures, setFeeStructures] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterClassId, setFilterClassId] = useState("");
  const [filterYearId, setFilterYearId] = useState("");

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

      // Set default filter to current year if available
      const currentYear = (yearsRes.data || []).find((y) => y.isCurrent);
      if (currentYear) {
        setFilterYearId(currentYear.id.toString());
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
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
      console.error("Error fetching fee structures:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (structure = null) => {
    setEditingStructure(structure);
    if (structure) {
      reset({
        feeTypeId: structure.feeTypeId,
        classId: structure.classId,
        academicYearId: structure.academicYearId,
        amount: structure.amount,
      });
    } else {
      reset({
        feeTypeId: "",
        classId: filterClassId || "",
        academicYearId: filterYearId || "",
        amount: "",
      });
    }
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
        await feeService.updateFeeStructure(editingStructure.id, {
          amount: payload.amount,
        });
      } else {
        await feeService.createFeeStructure(payload);
      }
      fetchFeeStructures();
      closeModal();
    } catch (error) {
      console.error("Error saving fee structure:", error);
      alert(error.response?.data?.message || "Error saving fee structure");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this fee structure?")) return;
    try {
      await feeService.deleteFeeStructure(id);
      fetchFeeStructures();
    } catch (error) {
      console.error("Error deleting fee structure:", error);
      alert(error.response?.data?.message || "Cannot delete fee structure");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals per class
  const totalsByClass = feeStructures.reduce((acc, fs) => {
    const key = `${fs.classId}-${fs.academicYearId}`;
    if (!acc[key]) {
      acc[key] = {
        class: fs.class?.name,
        year: fs.academicYear?.name,
        total: 0,
      };
    }
    acc[key].total += parseFloat(fs.amount);
    return acc;
  }, {});

  const columns = [
    {
      header: "Fee Type",
      render: (row) => (
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-primary" />
          <span>{row.feeType?.name}</span>
        </div>
      ),
    },
    {
      header: "Class",
      render: (row) => row.class?.name || "-",
    },
    {
      header: "Academic Year",
      render: (row) => row.academicYear?.name || "-",
    },
    {
      header: "Amount",
      render: (row) => (
        <span className="font-medium text-primary">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: "Actions",
      width: "120px",
      render: (row) => (
        <div className="action-buttons">
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
          <h1>Fee Structures</h1>
          <p className="text-muted">
            Define fee amounts per class per academic year
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "1rem", padding: "1rem" }}>
        <div className="flex items-center gap-4 flex-wrap">
          <Filter size={18} className="text-muted" />
          <div style={{ minWidth: "200px" }}>
            <Select
              label=""
              value={filterYearId}
              onChange={(e) => setFilterYearId(e.target.value)}
              options={[
                { value: "", label: "All Academic Years" },
                ...academicYears.map((y) => ({
                  value: y.id,
                  label: y.name + (y.isCurrent ? " (Current)" : ""),
                })),
              ]}
            />
          </div>
          <div style={{ minWidth: "200px" }}>
            <Select
              label=""
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              options={[
                { value: "", label: "All Classes" },
                ...classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {Object.keys(totalsByClass).length > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{ marginBottom: "1rem" }}
        >
          {Object.values(totalsByClass).map((item, idx) => (
            <div key={idx} className="card stat-card">
              <div className="stat-label">
                {item.class} - {item.year}
              </div>
              <div className="stat-value">{formatCurrency(item.total)}</div>
              <div className="stat-sublabel">Total Fees</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <DataTable
          columns={columns}
          data={feeStructures}
          loading={loading}
          emptyMessage="No fee structures found. Create one to get started."
          actions={
            <Button icon={Plus} onClick={() => openModal()}>
              Add Fee Structure
            </Button>
          }
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingStructure ? "Edit Fee Structure" : "Add Fee Structure"}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Select
            label="Fee Type"
            name="feeTypeId"
            register={register}
            rules={{ required: "Fee type is required" }}
            error={errors.feeTypeId?.message}
            disabled={!!editingStructure}
            options={[
              { value: "", label: "Select Fee Type" },
              ...feeTypes.map((ft) => ({ value: ft.id, label: ft.name })),
            ]}
          />
          <Select
            label="Class"
            name="classId"
            register={register}
            rules={{ required: "Class is required" }}
            error={errors.classId?.message}
            disabled={!!editingStructure}
            options={[
              { value: "", label: "Select Class" },
              ...classes.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            label="Academic Year"
            name="academicYearId"
            register={register}
            rules={{ required: "Academic year is required" }}
            error={errors.academicYearId?.message}
            disabled={!!editingStructure}
            options={[
              { value: "", label: "Select Academic Year" },
              ...academicYears.map((y) => ({
                value: y.id,
                label: y.name + (y.isCurrent ? " (Current)" : ""),
              })),
            ]}
          />
          <Input
            label="Amount (₹)"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 5000"
            register={register}
            rules={{
              required: "Amount is required",
              min: { value: 0, message: "Amount must be positive" },
            }}
            error={errors.amount?.message}
          />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingStructure ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FeeStructures;
